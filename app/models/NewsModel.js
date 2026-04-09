const db = require('../../config/database');

const NewsModel = {
  // Lấy tin nổi bật ghim cho trang chủ
  async getPinned() {
    const [rows] = await db.query(
      'SELECT * FROM news WHERE is_visible = 1 AND is_pinned = 1 ORDER BY event_date DESC'
    );
    return rows;
  },

  // Lấy tất cả chương trình (category = program)
  async getPrograms({ page = 1, limit = 8, year = null, location = null, q = '' } = {}) {
    const offset = (page - 1) * limit;
    let where = "WHERE category = 'program' AND is_visible = 1";
    const params = [];

    if (year) { where += ' AND YEAR(event_date) = ?'; params.push(year); }
    if (location) { where += ' AND location LIKE ?'; params.push(`%${location}%`); }
    if (q) { where += ' AND (title LIKE ? OR summary LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }

    const [rows] = await db.query(
      `SELECT * FROM news ${where} ORDER BY event_date DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [[{ total }]] = await db.query(`SELECT COUNT(*) as total FROM news ${where}`, params);
    return { rows, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  // Lấy tất cả tin nổi bật (category = highlight)
  async getHighlights({ page = 1, limit = 6, q = '', location = '', year = '' } = {}) {
    const offset = (page - 1) * limit;
    let where = "WHERE category = 'highlight' AND is_visible = 1";
    const params = [];

    if (q) { where += ' AND (title LIKE ? OR summary LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
    if (location) { where += ' AND location LIKE ?'; params.push(`%${location}%`); }
    if (year) { where += ' AND YEAR(event_date) = ?'; params.push(year); }

    const [rows] = await db.query(
      `SELECT * FROM news ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [[{ total }]] = await db.query(`SELECT COUNT(*) as total FROM news ${where}`, params);
    return { rows, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  // Lấy danh sách location distinct theo category
  async getDistinctLocations(category) {
    const [rows] = await db.query(
      "SELECT DISTINCT location FROM news WHERE category = ? AND is_visible = 1 AND location IS NOT NULL AND location != '' ORDER BY location",
      [category]
    );
    return rows.map(r => r.location);
  },

  // Lấy danh sách năm distinct theo category
  async getDistinctYears(category) {
    const [rows] = await db.query(
      "SELECT DISTINCT YEAR(event_date) as yr FROM news WHERE category = ? AND is_visible = 1 AND event_date IS NOT NULL ORDER BY yr DESC",
      [category]
    );
    return rows.map(r => r.yr).filter(Boolean);
  },

  // Lấy chi tiết bài viết theo slug
  async getBySlug(slug) {
    const [rows] = await db.query('SELECT * FROM news WHERE slug = ? AND is_visible = 1', [slug]);
    return rows[0] || null;
  },

  // ---- Admin ----
  async getAll({ page = 1, limit = 10, category = '', q = '', status = '', date_from = '', date_to = '' } = {}) {
    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];
    if (category) { conditions.push('category = ?'); params.push(category); }
    if (q) { conditions.push('(title LIKE ? OR summary LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
    if (status === 'visible') { conditions.push('is_visible = 1'); }
    else if (status === 'hidden') { conditions.push('is_visible = 0'); }
    else if (status === 'pinned') { conditions.push('is_pinned = 1'); }
    if (date_from) { conditions.push('DATE(created_at) >= ?'); params.push(date_from); }
    if (date_to) { conditions.push('DATE(created_at) <= ?'); params.push(date_to); }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const [rows] = await db.query(
      `SELECT * FROM news ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [[{ total }]] = await db.query(`SELECT COUNT(*) as total FROM news ${where}`, params);
    return { rows, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getById(id) {
    const [rows] = await db.query('SELECT * FROM news WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async create(data) {
    const { title, slug, summary, content, image, category, location, grade_level, event_date, is_visible, is_pinned } = data;
    const [result] = await db.query(
      'INSERT INTO news (title, slug, summary, content, image, category, location, grade_level, event_date, is_visible, is_pinned) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [title, slug, summary, content, image || null, category, location || null, grade_level || null, event_date || null, is_visible ? 1 : 0, is_pinned ? 1 : 0]
    );
    return result.insertId;
  },

  async update(id, data) {
    const { title, slug, summary, content, image, category, location, grade_level, event_date, is_visible, is_pinned } = data;
    await db.query(
      'UPDATE news SET title=?, slug=?, summary=?, content=?, image=?, category=?, location=?, grade_level=?, event_date=?, is_visible=?, is_pinned=? WHERE id=?',
      [title, slug, summary, content, image || null, category, location || null, grade_level || null, event_date || null, is_visible ? 1 : 0, is_pinned ? 1 : 0, id]
    );
  },

  async delete(id) { await db.query('DELETE FROM news WHERE id = ?', [id]); },
  async toggleVisible(id) { await db.query('UPDATE news SET is_visible = NOT is_visible WHERE id = ?', [id]); },
  async togglePin(id) { await db.query('UPDATE news SET is_pinned = NOT is_pinned WHERE id = ?', [id]); },

  // Lấy tin đề xuất cùng category, loại trừ bài hiện tại
  async getRelated({ id, category, limit = 4 }) {
    const [rows] = await db.query(
      'SELECT id, title, slug, image, summary, event_date, category, location FROM news WHERE is_visible = 1 AND category = ? AND id != ? ORDER BY created_at DESC LIMIT ?',
      [category, id, limit]
    );
    return rows;
  },
};

module.exports = NewsModel;