function requireAuth(req, res, next) {
  if (req.session && req.session.adminId) {
    return next();
  }
  req.flash('error', 'Vui lòng đăng nhập để tiếp tục.');
  res.redirect('/admin/login');
}

module.exports = { requireAuth };
