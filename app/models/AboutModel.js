const db = require('../../config/database');

const AboutModel = {
  async getAll() {
    const [rows] = await db.query('SELECT * FROM about ORDER BY id ASC');
    // Trả về dạng object key -> value để dễ dùng trong view
    const result = {};
    rows.forEach(r => { result[r.section_key] = r; });
    return result;
  },

  async getByKey(key) {
    const [rows] = await db.query('SELECT * FROM about WHERE section_key = ?', [key]);
    return rows[0] || null;
  },

  async update(key, { title, content }) {
    await db.query(
      'UPDATE about SET title = ?, content = ? WHERE section_key = ?',
      [title, content, key]
    );
  },

  async upsert(key, { title, content }) {
    await db.query(
      'INSERT INTO about (section_key, title, content) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE title = ?, content = ?',
      [key, title, content, title, content]
    );
  }
};

module.exports = AboutModel;
