const db = require('../../config/database');

const ContactModel = {
  async getSettings() {
    const [rows] = await db.query('SELECT * FROM contact_settings');
    const result = {};
    rows.forEach(r => { result[r.setting_key] = r.setting_value; });
    return result;
  },

  async updateSetting(key, value) {
    await db.query(
      'INSERT INTO contact_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
      [key, value, value]
    );
  },

  async saveMessage({ full_name, email, phone, message }) {
    const [result] = await db.query(
      'INSERT INTO contact_messages (full_name, email, phone, message) VALUES (?, ?, ?, ?)',
      [full_name, email, phone || null, message]
    );
    return result.insertId;
  },

  async getMessages({ page = 1, limit = 15 } = {}) {
    const offset = (page - 1) * limit;
    const [rows] = await db.query(
      'SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );
    const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM contact_messages');
    const [[{ unread }]] = await db.query('SELECT COUNT(*) as unread FROM contact_messages WHERE is_read = 0');
    return { rows, total, unread, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async markRead(id) {
    await db.query('UPDATE contact_messages SET is_read = 1 WHERE id = ?', [id]);
  },

  async deleteMessage(id) {
    await db.query('DELETE FROM contact_messages WHERE id = ?', [id]);
  },

  async deleteMany(ids) {
    if (!ids || !ids.length) return 0;
    const placeholders = ids.map(() => '?').join(',');
    const [result] = await db.query(`DELETE FROM contact_messages WHERE id IN (${placeholders})`, ids);
    return result.affectedRows;
  },

  async searchMessages({ q = '', page = 1, limit = 15 } = {}) {
    const offset = (page - 1) * limit;
    const like = `%${q}%`;
    const [rows] = await db.query(
      'SELECT * FROM contact_messages WHERE full_name LIKE ? OR email LIKE ? OR phone LIKE ? OR message LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [like, like, like, like, limit, offset]
    );
    const [[{ total }]] = await db.query(
      'SELECT COUNT(*) as total FROM contact_messages WHERE full_name LIKE ? OR email LIKE ? OR phone LIKE ? OR message LIKE ?',
      [like, like, like, like]
    );
    const [[{ unread }]] = await db.query('SELECT COUNT(*) as unread FROM contact_messages WHERE is_read = 0');
    return { rows, total, unread, page, limit, totalPages: Math.ceil(total / limit) };
  }
};

module.exports = ContactModel;