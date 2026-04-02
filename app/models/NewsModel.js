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
  async getPrograms({ page = 1, limit = 8, year = null, location = null } = {}) {
    const offset = (page - 1) * limit;
    let where = "WHERE category = 'program' AND is_visible = 1";
    const params = [];

    if (year) {
      where += ' AND YEAR(event_date) = ?';
      params.push(year);
    }
    if (location) {
      where += ' AND location LIKE ?';
      params.push(`%${location}%`);
    }

    const [rows] = await db.query(
      `SELECT * FROM news ${where} ORDER BY event_date DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) as total FROM news ${where}`,
      params
    );
    return { rows, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  // Lấy tất cả tin nổi bật (category = highlight)
  async getHighlights({ page = 1, limit = 6 } = {}) {
    const offset = (page - 1) * limit;
    const [rows] = await db.query(
      "SELECT * FROM news WHERE category = 'highlight' AND is_visible = 1 ORDER BY created_at DESC LIMIT ? OFFSET ?",
      [limit, offset]
    );
    const [[{ total }]] = await db.query(
      "SELECT COUNT(*) as total FROM news WHERE category = 'highlight' AND is_visible = 1"
    );
    return { rows, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  // Lấy chi tiết bài viết theo slug
  async getBySlug(slug) {
    const [rows] = await db.query('SELECT * FROM news WHERE slug = ? AND is_visible = 1', [slug]);
    return rows[0] || null;
  },

  // ---- Admin ----
  async getAll({ page = 1, limit = 10 } = {}) {
    const offset = (page - 1) * limit;
    const [rows] = await db.query(
      'SELECT * FROM news ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );
    const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM news');
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

  async delete(id) {
    await db.query('DELETE FROM news WHERE id = ?', [id]);
  },

  async toggleVisible(id) {
    await db.query('UPDATE news SET is_visible = NOT is_visible WHERE id = ?', [id]);
  },

  async togglePin(id) {
    await db.query('UPDATE news SET is_pinned = NOT is_pinned WHERE id = ?', [id]);
  }
};

module.exports = NewsModel;