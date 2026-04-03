const ProgramModel = require('../models/ProgramModel');
const ContactModel = require('../models/ContactModel');

const DownloadController = {
  async index(req, res) {
    try {
      const programs = await ProgramModel.getAll();
      const pauseStatus = await ProgramModel.getDownloadPauseStatus();
      const settings = await ContactModel.getSettings();

      const grades = programs.length > 0 ? await ProgramModel.getDownloads(programs[0].id) : [];

      res.render('download/index', {
        title: 'Tải xuống — ' + (res.locals.siteName || 'EduVenture'),
        page: 'download',
        pageCSS: 'download',
        pageJS: 'download',
        programs,
        grades,
        downloadPaused: pauseStatus.paused,
        downloadPauseMessage: pauseStatus.message,
        sysreq_os: settings.sysreq_os || 'Windows 10 / 11',
        sysreq_cpu: settings.sysreq_cpu || 'Intel Core i3 trở lên',
        sysreq_ram: settings.sysreq_ram || 'Tối thiểu 4 GB',
        sysreq_disk: settings.sysreq_disk || '10 GB trống / lớp',
        sysreq_screen: settings.sysreq_screen || '1280 × 720 trở lên',
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

      const validRows = rows.filter(r => r.is_active && r.grade_active !== 0 && r.grade_active !== false);

      if (validRows.length === 0) {
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