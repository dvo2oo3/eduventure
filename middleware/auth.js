function requireAuth(req, res, next) {
  if (req.session && req.session.adminId) {
    return next();
  }
  req.flash('error', 'Vui lòng đăng nhập để tiếp tục.');
  res.redirect('/admin/login');
}

// Kiểm tra quyền cụ thể — superadmin luôn qua
function requirePermission(perm) {
  return function(req, res, next) {
    if (!req.session || !req.session.adminId) {
      req.flash('error', 'Vui lòng đăng nhập.');
      return res.redirect('/admin/login');
    }
    if (req.session.adminRole === 'superadmin') return next();
    const perms = req.session.adminPermissions || [];
    if (perms.includes(perm)) return next();
    req.flash('error', 'Bạn không có quyền truy cập tính năng này.');
    return res.redirect('/admin/dashboard');
  };
}

// Chỉ superadmin mới vào được
function requireSuperAdmin(req, res, next) {
  if (req.session && req.session.adminRole === 'superadmin') return next();
  req.flash('error', 'Chỉ Super Admin mới có thể thực hiện thao tác này.');
  return res.redirect('/admin/dashboard');
}

module.exports = { requireAuth, requirePermission, requireSuperAdmin };