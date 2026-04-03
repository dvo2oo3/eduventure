const db = require('../../config/database');

const ProgramModel = {
  // Lấy tất cả chương trình
  async getAll() {
    const [rows] = await db.query('SELECT * FROM programs ORDER BY tiet');
    return rows;
  },

  async getById(id) {
    const [rows] = await db.query('SELECT * FROM programs WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async create(name, tiet) {
    const [result] = await db.query('INSERT INTO programs (name, tiet) VALUES (?, ?)', [name, tiet]);
    const programId = result.insertId;
    // Tự động tạo 5 lớp cho chương trình mới
    const grades = ['lop1', 'lop2', 'lop3', 'lop4', 'lop5'];
    const gradeNames = { lop1: 'Lớp 1', lop2: 'Lớp 2', lop3: 'Lớp 3', lop4: 'Lớp 4', lop5: 'Lớp 5' };
    for (const grade of grades) {
      await db.query(
        'INSERT INTO program_downloads (program_id, grade, label, version, file_size) VALUES (?, ?, ?, ?, ?)',
        [programId, grade, `${name} — ${gradeNames[grade]}`, 'v1.0', '10 GB']
      );
    }
    return programId;
  },

  async delete(id) {
    await db.query('DELETE FROM programs WHERE id = ?', [id]);
  },

  // Lấy links theo chương trình
  async getDownloads(programId) {
    const [rows] = await db.query(
      'SELECT * FROM program_downloads WHERE program_id = ? ORDER BY grade',
      [programId]
    );
    return rows;
  },

  async updateDownload(programId, grade, data) {
    await db.query(
      `UPDATE program_downloads SET
        label=?, version=?, file_size=?,
        url_main=?, label_main=?,
        url_mirror1=?, label_mirror1=?,
        url_mirror2=?, label_mirror2=?,
        url_mirror3=?, label_mirror3=?
       WHERE program_id=? AND grade=?`,
      [
        data.label, data.version, data.file_size,
        data.url_main || null, data.label_main || 'Link chính',
        data.url_mirror1 || null, data.label_mirror1 || 'Link dự phòng 1',
        data.url_mirror2 || null, data.label_mirror2 || 'Link dự phòng 2',
        data.url_mirror3 || null, data.label_mirror3 || 'Link dự phòng 3',
        programId, grade
      ]
    );
  },

  // SĐT
  async checkPhone(phone) {
    const [rows] = await db.query(
      `SELECT ap.*, pd.*, p.name as program_name, p.tiet, p.is_active
       FROM authorized_phones ap
       JOIN programs p ON ap.program_id = p.id
       JOIN program_downloads pd ON pd.program_id = p.id AND pd.grade = ap.grade
       WHERE ap.phone = ?
       ORDER BY ap.grade`,
      [phone]
    );
    return rows;
  },

  async getAllPhones({ search = '', grade = '', program_id = '' } = {}) {
    let query = `
    SELECT ap.*, p.name as program_name, p.tiet
    FROM authorized_phones ap
    JOIN programs p ON ap.program_id = p.id
    WHERE 1=1
  `;
    const params = [];

    if (search) {
      query += ` AND (ap.name LIKE ? OR ap.phone LIKE ? OR ap.school LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (grade) {
      query += ` AND ap.grade = ?`;
      params.push(grade);
    }
    if (program_id) {
      query += ` AND ap.program_id = ?`;
      params.push(program_id);
    }

    query += ` ORDER BY p.tiet, ap.grade, ap.name`;
    const [rows] = await db.query(query, params);
    return rows;
  },

  async addPhone(phone, grade, programId, name, school) {
    await db.query(
      'INSERT INTO authorized_phones (phone, grade, program_id, name, school) VALUES (?, ?, ?, ?, ?)',
      [phone, grade, programId, name, school || null]
    );
  },

  async deletePhone(id) {
    await db.query('DELETE FROM authorized_phones WHERE id = ?', [id]);
  },

  async importPhones(rows) {
    let success = 0, errors = [];
    for (const row of rows) {
      try {
        await db.query(
          'INSERT INTO authorized_phones (phone, grade, program_id, name, school) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), school=VALUES(school)',
          [row.phone, row.grade, row.program_id, row.name, row.school || null]
        );
        success++;
      } catch (err) {
        errors.push(`${row.name} (${row.phone}): ${err.message}`);
      }
    }
    return { success, errors };
  },
  async updateProgram(id, name, tiet) {
    await db.query('UPDATE programs SET name=?, tiet=? WHERE id=?', [name, tiet, id]);
  },

  // Tạm dừng/kích hoạt toàn bộ chương trình
  async toggleActive(id) {
    await db.query('UPDATE programs SET is_active = NOT is_active WHERE id=?', [id]);
  },

  // Tạm dừng/kích hoạt theo khối lớp
  async toggleGradeActive(programId, grade) {
    await db.query(
      'UPDATE program_downloads SET grade_active = NOT grade_active WHERE program_id=? AND grade=?',
      [programId, grade]
    );
  },

  async updatePhone(id, data) {
    await db.query(
      'UPDATE authorized_phones SET name=?, phone=?, grade=?, program_id=?, school=? WHERE id=?',
      [data.name, data.phone, data.grade, data.program_id, data.school || null, id]
    );
  },

  async getPhoneById(id) {
    const [rows] = await db.query(
      'SELECT ap.*, p.name as program_name FROM authorized_phones ap JOIN programs p ON ap.program_id = p.id WHERE ap.id = ?',
      [id]
    );
    return rows[0] || null;
  },

  // ---- GLOBAL DOWNLOAD PAUSE ----
  async getDownloadPauseStatus() {
    const [rows] = await db.query(
      "SELECT setting_key, setting_value FROM contact_settings WHERE setting_key IN ('download_paused', 'download_pause_message')"
    );
    // Trả về object { paused: bool, message: string }
    const map = {};
    rows.forEach(r => { map[r.setting_key] = r.setting_value; });
    return {
      paused: map['download_paused'] === '1',
      message: map['download_pause_message'] || 'Chức năng tải xuống đang tạm dừng để bảo trì. Vui lòng liên hệ EduVenture để biết thêm thông tin.'
    };
  },

  async toggleDownloadPause() {
    await db.query(
      "UPDATE contact_settings SET setting_value = IF(setting_value='1','0','1') WHERE setting_key='download_paused'"
    );
  },


  async deletePhonesById(ids) {
    if (!ids || !ids.length) return;
    const placeholders = ids.map(() => '?').join(',');
    await db.query(`DELETE FROM authorized_phones WHERE id IN (${placeholders})`, ids);
  },

  async getDistinctSchools() {
    const [rows] = await db.query(
      'SELECT DISTINCT school FROM authorized_phones WHERE school IS NOT NULL AND school != "" ORDER BY school'
    );
    return rows.map(r => r.school);
  },

  async deletePhonesByFilter({ search = '', grade = '', program_id = '', school = '' } = {}) {
    let query = 'DELETE FROM authorized_phones WHERE 1=1';
    const params = [];
    if (search) {
      query += ' AND (name LIKE ? OR phone LIKE ? OR school LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (grade) { query += ' AND grade = ?'; params.push(grade); }
    if (program_id) { query += ' AND program_id = ?'; params.push(program_id); }
    if (school) { query += ' AND school = ?'; params.push(school); }
    const [result] = await db.query(query, params);
    return result.affectedRows;
  },
  async updateDownloadPauseMessage(message) {
    await db.query(
      "UPDATE contact_settings SET setting_value=? WHERE setting_key='download_pause_message'",
      [message]
    );
  }
};

module.exports = ProgramModel;;