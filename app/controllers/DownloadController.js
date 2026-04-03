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
      const rows = await ProgramModel.checkPhone(clean);

      if (!rows || rows.length === 0) {
        req.flash('error', 'Số điện thoại không có trong danh sách. Vui lòng liên hệ EduVenture.');
        return res.redirect('/tai-xuong');
      }

      // Lọc chỉ lấy các khối hợp lệ (chương trình active + khối active)
      const validRows = rows.filter(r => r.is_active && r.grade_active !== 0 && r.grade_active !== false);

      if (validRows.length === 0) {
        // Tất cả khối đều bị tạm dừng
        req.flash('error', 'Chương trình hiện đang tạm dừng tải xuống. Vui lòng liên hệ EduVenture.');
        return res.redirect('/tai-xuong');
      }

      const gradeNames = { lop1: 'Lớp 1', lop2: 'Lớp 2', lop3: 'Lớp 3', lop4: 'Lớp 4', lop5: 'Lớp 5' };

      res.render('download/success', {
        title: 'Tải xuống — ' + (res.locals.siteName || 'EduVenture'),
        page: 'download',
        pageCSS: 'download',
        name: validRows[0].name,
        grades: validRows.map(r => ({
          grade: r.grade,
          gradeName: gradeNames[r.grade] || r.grade,
          label: r.label,
          url_main: r.url_main,
          label_main: r.label_main,
          url_mirror1: r.url_mirror1,
          label_mirror1: r.label_mirror1,
          url_mirror2: r.url_mirror2,
          label_mirror2: r.label_mirror2,
          url_mirror3: r.url_mirror3,
          label_mirror3: r.label_mirror3,
        })),
        multiGrade: validRows.length > 1
      });
    } catch (err) {
      console.error(err);
      res.status(500).render('error', { message: 'Lỗi xác thực' });
    }
  }
};

module.exports = DownloadController;