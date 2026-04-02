const ProgramModel = require('../models/ProgramModel');

const DownloadController = {
  async index(req, res) {
    try {
      const programs = await ProgramModel.getAll();
      const pauseStatus = await ProgramModel.getDownloadPauseStatus();
      res.render('download/index', {
        title: 'Tải xuống — ' + (res.locals.siteName || 'EduVenture'),
        page: 'download',
        pageCSS: 'download',
        pageJS: 'download',
        programs,
        downloadPaused: pauseStatus.paused,
        downloadPauseMessage: pauseStatus.message,
        error: req.flash('error')
      });
    } catch (err) {
      console.error(err);
      res.status(500).render('error', { message: 'Lỗi tải trang' });
    }
  },

  async verify(req, res) {
    try {
      const pauseStatus = await ProgramModel.getDownloadPauseStatus();
      if (pauseStatus.paused) {
        req.flash('error', pauseStatus.message);
        return res.redirect('/tai-xuong');
      }
      const { phone } = req.body;
      const clean = phone.replace(/\s/g, '');
      const result = await ProgramModel.checkPhone(clean);
      if (!result) {
        req.flash('error', 'Số điện thoại không có trong danh sách. Vui lòng liên hệ EduVenture.');
        return res.redirect('/tai-xuong');
      }
      if (!result.is_active) {
        req.flash('error', 'Chương trình này hiện đang tạm dừng tải xuống. Vui lòng liên hệ EduVenture.');
        return res.redirect('/tai-xuong');
      }
      if (result.grade_active === 0 || result.grade_active === false) {
        req.flash('error', 'Khối lớp này hiện đang tạm dừng tải xuống. Vui lòng liên hệ EduVenture.');
        return res.redirect('/tai-xuong');
      }
      res.render('download/success', {
        title: 'Tải xuống — ' + (res.locals.siteName || 'EduVenture'),
        page: 'download',
        pageCSS: 'download',
        result
      });
    } catch (err) {
      console.error(err);
      res.status(500).render('error', { message: 'Lỗi xác thực' });
    }
  }
};

module.exports = DownloadController;