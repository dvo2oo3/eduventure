const db = require('../../config/database');

const DownloadModel = {
  async getAll() {
    const [rows] = await db.query('SELECT * FROM downloads ORDER BY grade');
    return rows;
  },

  async updateLink(grade, data) {
    await db.query(
      `UPDATE downloads SET 
        label=?, version=?, file_size=?,
        url_main=?, label_main=?,
        url_mirror1=?, label_mirror1=?,
        url_mirror2=?, label_mirror2=?,
        url_mirror3=?, label_mirror3=?
       WHERE grade=?`,
      [
        data.label, data.version, data.file_size,
        data.url_main, data.label_main,
        data.url_mirror1, data.label_mirror1,
        data.url_mirror2, data.label_mirror2,
        data.url_mirror3, data.label_mirror3,
        grade
      ]
    );
  },

  async checkPhone(phone) {
    const [rows] = await db.query(
      'SELECT ap.*, d.* FROM authorized_phones ap JOIN downloads d ON ap.grade = d.grade WHERE ap.phone = ?',
      [phone]
    );
    return rows[0] || null;
  },

  async getAllPhones() {
    const [rows] = await db.query('SELECT * FROM authorized_phones ORDER BY grade, name');
    return rows;
  },

  async addPhone(phone, grade, name) {
    await db.query('INSERT INTO authorized_phones (phone, grade, name) VALUES (?, ?, ?)', [phone, grade, name]);
  },

  async deletePhone(id) {
    await db.query('DELETE FROM authorized_phones WHERE id = ?', [id]);
  }
};

module.exports = DownloadModel;