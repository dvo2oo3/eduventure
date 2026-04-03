const db = require('../../config/database');
const bcrypt = require('bcryptjs');

// Danh sách tất cả quyền trong hệ thống
const ALL_PERMISSIONS = [
  'news',       // Viết & quản lý tin tức
  'about',      // Chỉnh trang Về chúng tôi
  'media',      // Quản lý Banner & Logo
  'uploads',    // Quản lý Uploads
  'download',   // Quản lý Link tải xuống
  'phones',     // Quản lý Danh sách SĐT
  'contact',    // Xem & quản lý tin nhắn
];

const AdminModel = {
  ALL_PERMISSIONS,

  async findByEmail(email) {
    const [rows] = await db.query('SELECT * FROM admin_users WHERE email = ?', [email]);
    return rows[0] || null;
  },

  async findById(id) {
    const [rows] = await db.query('SELECT * FROM admin_users WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async getAll() {
    const [rows] = await db.query('SELECT id, name, email, role, permissions, created_at FROM admin_users ORDER BY id ASC');
    return rows.map(r => ({
      ...r,
      permissions: r.role === 'superadmin' ? ALL_PERMISSIONS : (r.permissions ? r.permissions.split(',').filter(Boolean) : [])
    }));
  },

  async create({ name, email, password, role = 'staff', permissions = [] }) {
    const hash = await bcrypt.hash(password, 10);
    const permStr = role === 'superadmin' ? '' : permissions.join(',');
    const [result] = await db.query(
      'INSERT INTO admin_users (name, email, password, role, permissions) VALUES (?, ?, ?, ?, ?)',
      [name, email, hash, role, permStr]
    );
    return result.insertId;
  },

  async update(id, { name, email, role, permissions = [] }) {
    const permStr = role === 'superadmin' ? '' : permissions.join(',');
    await db.query(
      'UPDATE admin_users SET name = ?, email = ?, role = ?, permissions = ? WHERE id = ?',
      [name, email, role, permStr, id]
    );
  },

  async resetPassword(id, newPassword) {
    const hash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE admin_users SET password = ? WHERE id = ?', [hash, id]);
  },

  async delete(id) {
    await db.query('DELETE FROM admin_users WHERE id = ?', [id]);
  },

  async verifyPassword(plain, hash) {
    return bcrypt.compare(plain, hash);
  },

  async updateProfile(id, { name, email }) {
    await db.query(
      'UPDATE admin_users SET name = ?, email = ? WHERE id = ?',
      [name, email, id]
    );
  },

  async changePassword(id, newPassword) {
    const hash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE admin_users SET password = ? WHERE id = ?', [hash, id]);
  },

  // Kiểm tra tài khoản có quyền không
  hasPermission(admin, perm) {
    if (!admin) return false;
    if (admin.role === 'superadmin') return true;
    const perms = typeof admin.permissions === 'string'
      ? admin.permissions.split(',').filter(Boolean)
      : (admin.permissions || []);
    return perms.includes(perm);
  }
};

module.exports = AdminModel;