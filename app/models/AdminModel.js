const db = require('../../config/database');
const bcrypt = require('bcryptjs');

const AdminModel = {
  async findByEmail(email) {
    const [rows] = await db.query('SELECT * FROM admin_users WHERE email = ?', [email]);
    return rows[0] || null;
  },

  async verifyPassword(plain, hash) {
    return bcrypt.compare(plain, hash);
  },

  async changePassword(id, newPassword) {
    const hash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE admin_users SET password = ? WHERE id = ?', [hash, id]);
  }
};

module.exports = AdminModel;
