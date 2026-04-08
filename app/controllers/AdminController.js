const AdminModel = require('../models/AdminModel');
const NewsModel = require('../models/NewsModel');
const AboutModel = require('../models/AboutModel');
const DownloadModel = require('../models/DownloadModel');
const ContactModel = require('../models/ContactModel');
const ProgramModel = require('../models/ProgramModel');
const XLSX = require('xlsx');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { uploadToR2, deleteFromR2, listFilesFromR2 } = require('../../config/r2');

// Tất cả file đều giữ trong RAM, rồi đẩy lên R2
const memStorage = multer.memoryStorage();

const uploadNews = multer({
  storage: memStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    allowed.includes(ext) ? cb(null, true) : cb(new Error('Chỉ chấp nhận file ảnh!'));
  }
}).single('image_file');

const uploadMedia = multer({
  storage: memStorage,
  limits: { fileSize: 50 * 1024 * 1024, fieldSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg','.jpeg','.png','.webp','.gif','.mp4','.webm','.mov','.ogg'];
    const ext = path.extname(file.originalname).toLowerCase();
    allowed.includes(ext) ? cb(null, true) : cb(new Error('Định dạng file không được hỗ trợ!'));
  }
}).fields([
  { name: 'banner_file',      maxCount: 1 },
  { name: 'logo_file',        maxCount: 1 },
  { name: 'logoBeside_file',  maxCount: 1 },
  { name: 'event_file',       maxCount: 1 },
  { name: 'favicon_file',     maxCount: 1 },
  { name: 'og_image_file',    maxCount: 1 }
]);
// Helper tạo slug từ tiêu đề
function makeSlug(title) {
  return title
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim().replace(/\s+/g, '-')
    + '-' + Date.now();
}

const AdminController = {
  // ---- AUTH ----
  loginPage(req, res) {
    if (req.session.adminId) return res.redirect('/admin/dashboard');
    res.render('admin/login', {
      layout: 'login',
      title: 'Đăng nhập Admin',
      error: req.flash('error')
    });
  },

  async loginPost(req, res) {
    const { email, password } = req.body;
    const admin = await AdminModel.findByEmail(email);
    if (!admin || !(await AdminModel.verifyPassword(password, admin.password))) {
      req.flash('error', 'Email hoặc mật khẩu không đúng.');
      return res.redirect('/admin/login');
    }
    req.session.adminId = admin.id;
    req.session.adminName = admin.name;
    req.session.adminEmail = admin.email;
    req.session.adminRole = admin.role || 'staff';
    const rawPerms = admin.permissions || '';
    req.session.adminPermissions = admin.role === 'superadmin' ? require('../models/AdminModel').ALL_PERMISSIONS : rawPerms.split(',').filter(Boolean);
    res.redirect('/admin/dashboard');
  },

  logout(req, res) {
    req.session.destroy();
    res.redirect('/admin/login');
  },

  // ---- DASHBOARD ----
  async dashboard(req, res) {
    const { rows: allNews, total: totalNews } = await NewsModel.getAll({ limit: 5 });
    const { unread } = await ContactModel.getMessages({ limit: 1 });
    res.render('admin/dashboard', {
      layout: 'admin',
      title: 'Dashboard — Admin',
      admin: { name: req.session.adminName, email: req.session.adminEmail },
      activeMenu: 'dashboard',
      totalNews,
      unread,
      recentNews: allNews
    });
  },

  // ---- TIN NỔI BẬT / CHƯƠNG TRÌNH ----
  async newsList(req, res) {
    const { page = 1, category = '', q = '', status = '', date_from = '', date_to = '' } = req.query;
    const data = await NewsModel.getAll({ page: parseInt(page), category, q, status, date_from, date_to });
    const settings = await ContactModel.getSettings();
    res.render('admin/news', {
      layout: 'admin',
      title: 'Quản lý tin tức — Admin',
      admin: { name: req.session.adminName },
      activeMenu: 'news',
      ...data,
      filter: { category, q, status, date_from, date_to },
      hasFilter: !!(category || q || status || date_from || date_to),
      news_per_page: settings.news_per_page || '6',
      program_per_page: settings.program_per_page || '8',
      success: req.flash('success'),
      error: req.flash('error')
    });
  },

  newsCreatePage(req, res) {
    res.render('admin/news-form', {
      layout: 'admin',
      title: 'Thêm tin mới — Admin',
      admin: { name: req.session.adminName },
      activeMenu: 'news',
      item: null,
      error: req.flash('error')
    });
  },

  newsCreate(req, res) {
    uploadNews(req, res, async (err) => {
      if (err) { req.flash('error', err.message); return res.redirect('/admin/news/create'); }
      try {
        const { title, summary, content, category, location, grade_level, event_date, is_visible, is_pinned, image_in_article } = req.body;
        const slug = makeSlug(title);
        // Ưu tiên file upload, nếu không có thì dùng URL nhập tay
        let image = req.body.image || null;
        if (req.file) image = await uploadToR2(req.file.buffer, req.file.originalname, 'news');
        await NewsModel.create({ title, slug, summary, content, image, image_in_article: !!image_in_article, category, location, grade_level, event_date, is_visible: !!is_visible, is_pinned: !!is_pinned });
        req.flash('success', 'Thêm tin thành công!');
        res.redirect('/admin/news');
      } catch (err) {
        console.error(err);
        req.flash('error', 'Lỗi khi thêm tin: ' + err.message);
        res.redirect('/admin/news/create');
      }
    });
  },

  async newsEditPage(req, res) {
    const item = await NewsModel.getById(req.params.id);
    if (!item) { req.flash('error', 'Không tìm thấy tin.'); return res.redirect('/admin/news'); }
    res.render('admin/news-form', {
      layout: 'admin',
      title: 'Sửa tin — Admin',
      admin: { name: req.session.adminName },
      activeMenu: 'news',
      item,
      error: req.flash('error')
    });
  },

  newsUpdate(req, res) {
    uploadNews(req, res, async (err) => {
      if (err) { req.flash('error', err.message); return res.redirect(`/admin/news/${req.params.id}/edit`); }
      try {
        const { title, summary, content, category, location, grade_level, event_date, is_visible, is_pinned, image_in_article } = req.body;
        const item = await NewsModel.getById(req.params.id);
        const slug = title !== item.title ? makeSlug(title) : item.slug;
        // Nếu upload file mới thì dùng file, không thì dùng URL nhập tay, không thì giữ ảnh cũ
        let image;
        if (req.file) {
          image = await uploadToR2(req.file.buffer, req.file.originalname, 'news');
        } else if (req.body.image !== undefined && req.body.image !== '') {
          image = req.body.image;
        } else {
          image = item.image;
        }
        await NewsModel.update(req.params.id, { title, slug, summary, content, image, image_in_article: !!image_in_article, category, location, grade_level, event_date, is_visible: !!is_visible, is_pinned: !!is_pinned });
        req.flash('success', 'Cập nhật thành công!');
        res.redirect('/admin/news');
      } catch (err) {
        console.error(err);
        req.flash('error', 'Lỗi cập nhật: ' + err.message);
        res.redirect(`/admin/news/${req.params.id}/edit`);
      }
    });
  },

  async newsDelete(req, res) {
    await NewsModel.delete(req.params.id);
    req.flash('success', 'Đã xóa tin.');
    res.redirect('/admin/news');
  },

  async newsToggleVisible(req, res) {
    await NewsModel.toggleVisible(req.params.id);
    res.json({ ok: true });
  },

  async newsTogglePin(req, res) {
    await NewsModel.togglePin(req.params.id);
    res.json({ ok: true });
  },

  // ---- VỀ CHÚNG TÔI ----
  async aboutPage(req, res) {
    const about = await AboutModel.getAll();
    res.render('admin/about', {
      layout: 'admin',
      title: 'Về chúng tôi — Admin',
      admin: { name: req.session.adminName },
      activeMenu: 'about',
      about,
      success: req.flash('success'),
      error: req.flash('error')
    });
  },

  async aboutUpdate(req, res) {
    try {
      const textFields = ['mission', 'vision', 'about_text'];
      const statsFields = ['stats_schools', 'stats_students', 'stats_grades', 'stats_years'];

      // Text fields: chỉ lưu khi có trong request
      for (const key of textFields) {
        if (req.body[key] !== undefined) {
          await AboutModel.upsert(key, { title: req.body[`${key}_title`] || null, content: req.body[key] });
        }
      }

      // Stats fields: luôn upsert khi _title hoặc content có trong request (kể cả rỗng)
      for (const key of statsFields) {
        const titleKey = `${key}_title`;
        if (req.body[titleKey] !== undefined || req.body[key] !== undefined) {
          await AboutModel.upsert(key, {
            title: req.body[titleKey] !== undefined ? req.body[titleKey] : null,
            content: req.body[key] !== undefined ? req.body[key] : null
          });
        }
      }

      res.json({ ok: true, message: 'Cập nhật giới thiệu thành công!' });
    } catch (err) {
      console.error(err);
      res.json({ ok: false, message: err.message });
    }
  },

  // ---- DOWNLOAD ----
  async downloadPage(req, res) {
    const programs = await ProgramModel.getAll();
    const downloads = programs.length > 0 ? await ProgramModel.getDownloads(programs[0].id) : [];
    const pauseStatus = await ProgramModel.getDownloadPauseStatus();
    const settings = await ContactModel.getSettings();
    res.render('admin/download', {
      layout: 'admin',
      title: 'Link tải xuống — Admin',
      admin: { name: req.session.adminName },
      activeMenu: 'download',
      programs,
      downloads,
      downloadPaused: pauseStatus.paused,
      downloadPauseMessage: pauseStatus.message,
      sysreq_os: settings.sysreq_os || 'Windows 10 / 11',
      sysreq_cpu: settings.sysreq_cpu || 'Intel Core i3 trở lên',
      sysreq_ram: settings.sysreq_ram || 'Tối thiểu 4 GB',
      sysreq_disk: settings.sysreq_disk || '10 GB trống / lớp',
      sysreq_screen: settings.sysreq_screen || '1280 × 720 trở lên',
      success: req.flash('success'),
      error: req.flash('error')
    });
  },

  async downloadUpdateSysreq(req, res) {
    try {
      const { sysreq_os, sysreq_cpu, sysreq_ram, sysreq_disk, sysreq_screen } = req.body;
      await ContactModel.updateSetting('sysreq_os', sysreq_os || 'Windows 10 / 11');
      await ContactModel.updateSetting('sysreq_cpu', sysreq_cpu || 'Intel Core i3 trở lên');
      await ContactModel.updateSetting('sysreq_ram', sysreq_ram || 'Tối thiểu 4 GB');
      await ContactModel.updateSetting('sysreq_disk', sysreq_disk || '10 GB trống / lớp');
      await ContactModel.updateSetting('sysreq_screen', sysreq_screen || '1280 × 720 trở lên');
      res.json({ ok: true, message: 'Đã cập nhật yêu cầu hệ thống!' });
    } catch (err) {
      res.json({ ok: false, message: err.message });
    }
  },

  async downloadToggleGlobalPause(req, res) {
    try {
      await ProgramModel.toggleDownloadPause();
      res.json({ ok: true });
    } catch (err) {
      res.json({ ok: false, message: err.message });
    }
  },

  async downloadUpdatePauseMessage(req, res) {
    try {
      const { message } = req.body;
      if (!message || !message.trim()) {
        return res.json({ ok: false, message: 'Nội dung thông báo không được để trống.' });
      }
      await ProgramModel.updateDownloadPauseMessage(message.trim());
      res.json({ ok: true, message: 'Đã cập nhật nội dung thông báo!' });
    } catch (err) {
      res.json({ ok: false, message: err.message });
    }
  },

  async downloadGetProgram(req, res) {
    try {
      const downloads = await ProgramModel.getDownloads(req.params.id);
      res.json({ ok: true, downloads });
    } catch (err) {
      res.json({ ok: false });
    }
  },

  async downloadUpdate(req, res) {
    try {
      const { program_id, grade } = req.body;
      if (!program_id || !grade) {
        return res.json({ ok: false, message: 'Thiếu program_id hoặc grade' });
      }
      await ProgramModel.updateDownload(program_id, grade, {
        label:         req.body[`label_${grade}`],
        version:       req.body[`version_${grade}`],
        file_size:     req.body[`size_${grade}`],
        url_main:      req.body[`url_main_${grade}`],
        label_main:    req.body[`label_main_${grade}`],
        url_mirror1:   req.body[`url_mirror1_${grade}`],
        label_mirror1: req.body[`label_mirror1_${grade}`],
        url_mirror2:   req.body[`url_mirror2_${grade}`],
        label_mirror2: req.body[`label_mirror2_${grade}`],
        url_mirror3:   req.body[`url_mirror3_${grade}`],
        label_mirror3: req.body[`label_mirror3_${grade}`],
      });
      res.json({ ok: true, message: 'Đã lưu link thành công!' });
    } catch (err) {
      console.error(err);
      res.json({ ok: false, message: err.message });
    }
  },

  async downloadAddProgram(req, res) {
    try {
      const { name, tiet } = req.body;
      const newProgram = await ProgramModel.create(name, parseInt(tiet));
      res.json({ ok: true, message: `Đã thêm chương trình ${name}!`, id: newProgram });
    } catch (err) {
      res.json({ ok: false, message: err.message });
    }
  },

  async downloadDeleteProgram(req, res) {
    try {
      await ProgramModel.delete(req.params.id);
      res.json({ ok: true, message: 'Đã xóa chương trình!' });
    } catch (err) {
      res.json({ ok: false, message: err.message });
    }
  },

  async downloadAddPhone(req, res) {
    try {
      const { phone, grade, program_id, name, school } = req.body;
      await ProgramModel.addPhone(phone.replace(/\s/g, ''), grade, program_id, name, school);
      req.flash('success', 'Đã thêm số điện thoại!');
      // res.redirect('/admin/download');
      res.redirect('/admin/download/phones');
    } catch (err) {
      req.flash('error', err.code === 'ER_DUP_ENTRY' ? 'SĐT đã tồn tại!' : 'Lỗi: ' + err.message);
      // res.redirect('/admin/download');
      res.redirect('/admin/download/phones');
    }
  },

  async downloadDeletePhone(req, res) {
    await ProgramModel.deletePhone(req.params.id);
    req.flash('success', 'Đã xóa số điện thoại!');
    res.redirect('/admin/download/phones');
  },

  async downloadDeleteBulk(req, res) {
    try {
      const { ids } = req.body;
      if (!ids || !ids.length) return res.json({ ok: false, message: "Không có ID nào được chọn" });
      const idArr = Array.isArray(ids) ? ids : [ids];
      await ProgramModel.deletePhonesById(idArr);
      res.json({ ok: true, count: idArr.length });
    } catch (err) {
      res.json({ ok: false, message: err.message });
    }
  },

  async downloadDeleteByFilter(req, res) {
    try {
      const { search = "", grade = "", program_id = "", school = "" } = req.body;
      const count = await ProgramModel.deletePhonesByFilter({ search, grade, program_id, school });
      res.json({ ok: true, count });
    } catch (err) {
      res.json({ ok: false, message: err.message });
    }
  },

  async downloadGetSchools(req, res) {
    try {
      const schools = await ProgramModel.getDistinctSchools();
      res.json({ ok: true, schools });
    } catch (err) {
      res.json({ ok: false, message: err.message });
    }
  },

  async downloadEditProgram(req, res) {
    try {
      const { name, tiet } = req.body;
      await ProgramModel.updateProgram(req.params.id, name, parseInt(tiet));
      res.json({ ok: true, message: 'Đã cập nhật chương trình!' });
    } catch (err) {
      res.json({ ok: false, message: err.message });
    }
  },

  async downloadToggleProgram(req, res) {
    try {
      await ProgramModel.toggleActive(req.params.id);
      res.json({ ok: true });
    } catch (err) {
      res.json({ ok: false, message: err.message });
    }
  },

  async downloadToggleGrade(req, res) {
    try {
      const { id, grade } = req.params;
      await ProgramModel.toggleGradeActive(id, grade);
      res.json({ ok: true });
    } catch (err) {
      res.json({ ok: false, message: err.message });
    }
  },

  async phonesPage(req, res) {
  const programs = await ProgramModel.getAll();
  const { search = '', grade = '', program_id = '' } = req.query;
  const phones = await ProgramModel.getAllPhones({ search, grade, program_id });
  res.render('admin/phones', {
    layout: 'admin',
    title: 'Danh sách SĐT — Admin',
    admin: { name: req.session.adminName },
    activeMenu: 'phones',
    programs,
    phones,
    totalPhones: phones.length,
    filter: { search, grade, program_id },
    success: req.flash('success'),
    error: req.flash('error')
  });
},

  // ---- CONTACT SETTINGS ----
  async contactSettingPage(req, res) {
    const settings = await ContactModel.getSettings();
    const q = (req.query.q || '').trim();
    const page = parseInt(req.query.page) || 1;
    const { rows: messages, unread, total, totalPages } = q
      ? await ContactModel.searchMessages({ q, page })
      : await ContactModel.getMessages({ page });
    // Tạo map id -> message đầy đủ cho modal (bao gồm nội dung gốc)
    const msgMap = {};
    messages.forEach(m => {
      msgMap[m.id] = {
        full_name: m.full_name,
        email: m.email,
        phone: m.phone || '',
        message: m.message,
        is_read: m.is_read ? true : false,
        created_at_fmt: new Date(m.created_at).toLocaleString('vi-VN')
      };
    });
    res.render('admin/contact', {
      layout: 'admin',
      title: 'Liên hệ — Admin',
      admin: { name: req.session.adminName },
      activeMenu: 'contact',
      settings,
      messages,
      unread,
      total,
      totalPages,
      page,
      q,
      msgJson: JSON.stringify(msgMap),
      success: req.flash('success'),
      error: req.flash('error')
    });
  },

  async contactSettingUpdate(req, res) {
    try {
      const keys = ['address', 'email', 'phone', 'working_hours', 'map_embed'];
      for (const key of keys) {
        if (req.body[key] !== undefined) {
          await ContactModel.updateSetting(key, req.body[key]);
        }
      }
      res.json({ ok: true, message: 'Cập nhật thông tin liên hệ thành công!' });
    } catch (err) {
      console.error(err);
      res.json({ ok: false, message: err.message });
    }
  },

  async contactMessageRead(req, res) {
    await ContactModel.markRead(req.params.id);
    res.json({ ok: true });
  },

  async contactMessageDelete(req, res) {
    await ContactModel.deleteMessage(req.params.id);
    req.flash('success', 'Đã xóa tin nhắn.');
    res.redirect('/admin/contact');
  },

  async contactMessageBulkDelete(req, res) {
    try {
      const { ids } = req.body;
      if (!ids || !ids.length) return res.json({ ok: false, message: 'Không có tin nhắn nào được chọn.' });
      const count = await ContactModel.deleteMany(ids.map(Number));
      res.json({ ok: true, message: `Đã xóa ${count} tin nhắn.` });
    } catch (e) {
      res.json({ ok: false, message: e.message });
    }
  },
  async profilePage(req, res) {
    const admin = await AdminModel.findById(req.session.adminId);
    res.render('admin/profile', {
      layout: 'admin',
      title: 'Tài khoản của tôi — Admin',
      admin: { name: admin.name, email: admin.email },
      isSuperAdmin: req.session.adminRole === 'superadmin',
      activeMenu: 'profile',
      successInfo: req.flash('successInfo'),
      errorInfo: req.flash('errorInfo'),
      successPw: req.flash('successPw'),
      errorPw: req.flash('errorPw'),
    });
  },

  async profileUpdate(req, res) {
    try {
      const { name, email } = req.body;
      if (!name || !email) {
        req.flash('errorInfo', 'Vui lòng điền đầy đủ họ tên và email.');
        return res.redirect('/admin/settings/profile');
      }
      // Kiểm tra email trùng với tài khoản khác
      const existing = await AdminModel.findByEmail(email);
      if (existing && existing.id !== req.session.adminId) {
        req.flash('errorInfo', 'Email này đã được sử dụng bởi tài khoản khác.');
        return res.redirect('/admin/settings/profile');
      }
      await AdminModel.updateProfile(req.session.adminId, { name, email });
      // Cập nhật session
      req.session.adminName = name;
      req.session.adminEmail = email;
      req.flash('successInfo', 'Cập nhật thông tin thành công!');
      res.redirect('/admin/settings/profile');
    } catch (err) {
      console.error(err);
      req.flash('errorInfo', 'Lỗi: ' + err.message);
      res.redirect('/admin/settings/profile');
    }
  },

  changePasswordPage(req, res) {
    res.redirect('/admin/settings/profile');
  },

  async changePasswordPost(req, res) {
    try {
      const { current_password, new_password, confirm_password } = req.body;
      if (new_password !== confirm_password) {
        req.flash('errorPw', 'Mật khẩu mới không khớp!');
        return res.redirect('/admin/settings/profile');
      }
      if (new_password.length < 6) {
        req.flash('errorPw', 'Mật khẩu mới phải ít nhất 6 ký tự!');
        return res.redirect('/admin/settings/profile');
      }
      const admin = await AdminModel.findByEmail(req.session.adminEmail);
      const ok = await AdminModel.verifyPassword(current_password, admin.password);
      if (!ok) {
        req.flash('errorPw', 'Mật khẩu hiện tại không đúng!');
        return res.redirect('/admin/settings/profile');
      }
      await AdminModel.changePassword(admin.id, new_password);
      req.flash('successPw', 'Đổi mật khẩu thành công!');
      res.redirect('/admin/settings/profile');
    } catch (err) {
      console.error(err);
      req.flash('errorPw', 'Lỗi: ' + err.message);
      res.redirect('/admin/settings/profile');
    }
  },
  async downloadImportPage(req, res) {
    const programs = await ProgramModel.getAll();
    res.render('admin/download-import', {
      layout: 'admin',
      title: 'Import danh sách — Admin',
      admin: { name: req.session.adminName },
      activeMenu: 'phones',
      programs,
      success: req.flash('success'),
      error: req.flash('error')
    });
  },

  async downloadImport(req, res) {
    try {
      if (!req.file) {
        req.flash('error', 'Chưa chọn file!');
        return res.redirect('/admin/download/import');
      }

      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(sheet);

      // Lấy danh sách chương trình để map số tiết → id
      const programs = await ProgramModel.getAll();
      const programMap = {};
      programs.forEach(p => programMap[String(p.tiet)] = p.id);

      const rows = [];
      const parseErrors = [];

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const name = String(row['Họ tên'] || '').trim();
        const phone = String(row['Số điện thoại'] || '').trim().replace(/\s/g, '');
        let lopNum = String(row['Khối lớp'] || '').trim();
        // Chuẩn hóa: chấp nhận "lớp 1", "Lớp 1", "LỚP 1", "lop1", "1", v.v.
        // Dùng normalize NFC rồi chỉ giữ lại số - an toàn nhất với mọi encoding
        lopNum = lopNum.normalize('NFC').replace(/[^\d]/g, '').trim();
        const tiet = String(row['Số tiết'] || '').trim();

        if (!name || !phone || !lopNum || !tiet) {
          parseErrors.push(`Dòng ${i + 2}: Thiếu dữ liệu`);
          continue;
        }

        const grade = `lop${lopNum}`;
        if (!['lop1', 'lop2', 'lop3', 'lop4', 'lop5'].includes(grade)) {
          parseErrors.push(`Dòng ${i + 2}: Khối lớp "${lopNum}" không hợp lệ (dùng 1-5)`);
          continue;
        }

        const program_id = programMap[tiet];
        if (!program_id) {
          parseErrors.push(`Dòng ${i + 2}: Không tìm thấy chương trình ${tiet} tiết`);
          continue;
        }

        const school = String(row['Tên trường'] || '').trim();
        rows.push({ name, phone, grade, program_id, school });
      }

      const { success, errors } = await ProgramModel.importPhones(rows);
      const allErrors = [...parseErrors, ...errors];

      if (allErrors.length > 0) {
        req.flash('error', `Đã import ${success} người. ${allErrors.length} lỗi: ${allErrors.slice(0, 3).join('; ')}${allErrors.length > 3 ? '...' : ''}`);
      } else {
        req.flash('success', `Import thành công ${success} số điện thoại!`);
      }
      return res.redirect('/admin/download/import');
    } catch (err) {
      console.error(err);
      req.flash('error', 'Lỗi đọc file: ' + err.message);
      res.redirect('/admin/download/import');
    }
  },

  async downloadEditPhone(req, res) {
    try {
      const { name, phone, grade, program_id, school } = req.body;
      await ProgramModel.updatePhone(req.params.id, { name, phone, grade, program_id, school });
      res.json({ ok: true });
    } catch (err) {
      res.json({ ok: false, message: err.message });
    }
  },

  // ---- QUẢN LÝ TÀI KHOẢN ----
  async accountsPage(req, res) {
    const accounts = await AdminModel.getAll();
    res.render('admin/accounts', {
      layout: 'admin',
      title: 'Quản lý tài khoản — Admin',
      admin: { name: req.session.adminName, email: req.session.adminEmail },
      activeMenu: 'accounts',
      currentId: req.session.adminId,
      accounts,
      allPermissions: AdminModel.ALL_PERMISSIONS,
      success: req.flash('success'),
      error: req.flash('error')
    });
  },

  async accountCreate(req, res) {
    try {
      const { name, email, password, role } = req.body;
      const permissions = Array.isArray(req.body.permissions) ? req.body.permissions : (req.body.permissions ? [req.body.permissions] : []);
      if (!name || !email || !password) {
        req.flash('error', 'Vui lòng điền đầy đủ họ tên, email và mật khẩu.');
        return res.redirect('/admin/accounts');
      }
      const existing = await AdminModel.findByEmail(email);
      if (existing) {
        req.flash('error', 'Email này đã được sử dụng.');
        return res.redirect('/admin/accounts');
      }
      await AdminModel.create({ name, email, password, role, permissions });
      req.flash('success', 'Tạo tài khoản thành công!');
      res.redirect('/admin/accounts');
    } catch (e) {
      req.flash('error', 'Lỗi: ' + e.message);
      res.redirect('/admin/accounts');
    }
  },

  async accountUpdate(req, res) {
    try {
      const { id } = req.params;
      const { name, email, role } = req.body;
      // Nếu form gửi lên (_permsSubmitted=1) mà không check checkbox nào
      // thì req.body.permissions là undefined → permissions = []
      let permissions = [];
      if (req.body.permissions) {
        permissions = Array.isArray(req.body.permissions)
          ? req.body.permissions
          : [req.body.permissions];
      }
      await AdminModel.update(id, { name, email, role, permissions });
      req.flash('success', 'Cập nhật tài khoản thành công!');
      res.redirect('/admin/accounts');
    } catch (e) {
      req.flash('error', 'Lỗi: ' + e.message);
      res.redirect('/admin/accounts');
    }
  },

  async accountResetPassword(req, res) {
    try {
      const { id } = req.params;
      const { new_password } = req.body;
      if (!new_password || new_password.length < 6) {
        return res.json({ ok: false, message: 'Mật khẩu phải có ít nhất 6 ký tự.' });
      }
      await AdminModel.resetPassword(id, new_password);
      res.json({ ok: true, message: 'Đặt lại mật khẩu thành công!' });
    } catch (e) {
      res.json({ ok: false, message: e.message });
    }
  },

  async accountDelete(req, res) {
    try {
      const { id } = req.params;
      if (parseInt(id) === req.session.adminId) {
        req.flash('error', 'Không thể xóa tài khoản đang đăng nhập.');
        return res.redirect('/admin/accounts');
      }
      await AdminModel.delete(id);
      req.flash('success', 'Đã xóa tài khoản.');
      res.redirect('/admin/accounts');
    } catch (e) {
      req.flash('error', 'Lỗi: ' + e.message);
      res.redirect('/admin/accounts');
    }
  },

  async newsDisplaySettingSave(req, res) {
    try {
      const { news_per_page, program_per_page } = req.body;
      if (news_per_page) await ContactModel.updateSetting('news_per_page', parseInt(news_per_page) || 6);
      if (program_per_page) await ContactModel.updateSetting('program_per_page', parseInt(program_per_page) || 8);
      req.flash('success', 'Cập nhật số bài hiển thị thành công!');
      res.redirect('/admin/news');
    } catch (err) {
      req.flash('error', 'Lỗi: ' + err.message);
      res.redirect('/admin/news');
    }
  }
};

module.exports = AdminController;
// Patch: add mediaPage and mediaUpdate
const AdminControllerExtension = {
  async mediaPage(req, res) {
    const about = await require('../models/AboutModel').getAll();
    const data = {};
    Object.values(about).forEach(r => data[r.section_key] = r.content);
    res.render('admin/media', {
      layout: 'admin',
      title: 'Banner & Logo — Admin',
      admin: { name: req.session.adminName },
      activeMenu: 'media',
      data,
      success: req.flash('success'),
      error: req.flash('error')
    });
  },
  async mediaUpdate(req, res) {
    try {
      const AboutModel = require('../models/AboutModel');

      // ── Helper: decode base64 data URL → Buffer ──────────────
      function base64ToBuffer(dataUrl) {
        // format: "data:image/jpeg;base64,<data>"
        const matches = dataUrl.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) throw new Error('Invalid base64 image data');
        return Buffer.from(matches[2], 'base64');
      }

      // ── Lưu các field text thông thường ─────────────────────
      for (const key of [
        'site_name', 'banner_title', 'banner_subtitle',
        'logo_mode', 'logo_text', 'logo_size',
        'logo_beside_mode',
        'banner_position', 'banner_zoom',
        'logo_position', 'logo_zoom',
        'event_position', 'event_zoom',
        'event_banner_title', 'event_banner_link',
        'banner_text_color', 'event_text_color',
        'banner_badge_text', 'banner_badge_color', 'banner_badge_text_color', 'banner_badge_bg_opacity',
        'favicon_shape', 'favicon_position',
        'og_title', 'og_description',
        'facebook_url', 'zalo_url',
        'banner_overlay_opacity'
      ]) {
        if (req.body[key] !== undefined) {
          await AboutModel.upsert(key, { title: null, content: req.body[key] });
        }
      }
      await AboutModel.upsert('banner_active',       { title: null, content: req.body.banner_active       === '1' ? '1' : '0' });
      await AboutModel.upsert('event_banner_active', { title: null, content: req.body.event_banner_active === '1' ? '1' : '0' });

      // ── Upload ảnh từ crop modal (base64) → R2 ────────────────
      // Banner
      const bannerData = req.body.banner_cropped_data;
      if (bannerData && bannerData.startsWith('data:')) {
        const buf = base64ToBuffer(bannerData);
        const url = await uploadToR2(buf, 'banner_cropped.jpg', 'media');
        await AboutModel.upsert('banner_url', { title: null, content: url });
      }

      // Logo chính
      const logoData = req.body.logo_cropped_data;
      if (logoData && logoData.startsWith('data:')) {
        const buf = base64ToBuffer(logoData);
        const url = await uploadToR2(buf, 'logo_cropped.jpg', 'media');
        await AboutModel.upsert('logo_url', { title: null, content: url });
      }

      // Ảnh phụ cạnh logo
      const logoBesideData = req.body.logo_beside_cropped_data;
      if (logoBesideData && logoBesideData.startsWith('data:')) {
        const buf = base64ToBuffer(logoBesideData);
        const url = await uploadToR2(buf, 'logo_beside_cropped.jpg', 'media');
        await AboutModel.upsert('logo_beside_url', { title: null, content: url });
      }

      // Banner sự kiện
      const eventData = req.body.event_cropped_data;
      if (eventData && eventData.startsWith('data:')) {
        const buf = base64ToBuffer(eventData);
        const url = await uploadToR2(buf, 'event_banner_cropped.jpg', 'media');
        await AboutModel.upsert('event_banner_url', { title: null, content: url });
      }

      // ── Upload favicon (cropped base64 ưu tiên, fallback file upload) ──
      const faviconCropped = req.body.favicon_cropped_data;
      if (faviconCropped && faviconCropped.startsWith('data:')) {
        const buf = base64ToBuffer(faviconCropped);
        const url = await uploadToR2(buf, 'favicon_cropped.png', 'media');
        await AboutModel.upsert('favicon_url', { title: null, content: url });
      } else if (req.files?.favicon_file?.[0]) {
        const f = req.files.favicon_file[0];
        await AboutModel.upsert('favicon_url', { title: null, content: await uploadToR2(f.buffer, f.originalname, 'media') });
      }

      // ── Upload OG image (cropped base64 ưu tiên, fallback file upload) ──
      const ogCropped = req.body.og_image_cropped_data;
      if (ogCropped && ogCropped.startsWith('data:')) {
        const buf = base64ToBuffer(ogCropped);
        const url = await uploadToR2(buf, 'og_image_cropped.jpg', 'media');
        await AboutModel.upsert('og_image_url', { title: null, content: url });
      } else if (req.files?.og_image_file?.[0]) {
        const f = req.files.og_image_file[0];
        await AboutModel.upsert('og_image_url', { title: null, content: await uploadToR2(f.buffer, f.originalname, 'media') });
      }

      const wantsJson = req.headers['x-requested-with'] === 'XMLHttpRequest' || req.headers['accept']?.includes('application/json');
      if (wantsJson) {
        res.json({ ok: true, message: 'Cập nhật thành công!' });
      } else {
        req.flash('success', 'Cập nhật thành công!');
        res.redirect('/admin/media');
      }
    } catch (e) {
      const wantsJson = req.headers['x-requested-with'] === 'XMLHttpRequest' || req.headers['accept']?.includes('application/json');
      if (wantsJson) {
        res.json({ ok: false, message: e.message });
      } else {
        req.flash('error', 'Lỗi: ' + e.message);
        res.redirect('/admin/media');
      }
    }
  }
,

  async mediaClearImage(req, res) {
    try {
      const AboutModel = require('../models/AboutModel');
      const { key } = req.body;
      const allowed = ['favicon_url', 'og_image_url', 'logo_beside_url'];
      if (!allowed.includes(key)) {
        req.flash('error', 'Key không hợp lệ.');
        return res.redirect('/admin/media');
      }
      await AboutModel.upsert(key, { title: null, content: '' });
      req.flash('success', 'Đã xóa ảnh thành công!');
      res.redirect('/admin/media#seo');
    } catch (e) {
      req.flash('error', 'Lỗi: ' + e.message);
      res.redirect('/admin/media');
    }
  },

  // ---- QUẢN LÝ UPLOADS ----
  async uploadsPage(req, res) {
    res.render('admin/uploads', {
      layout: 'admin',
      title: 'Quản lý Uploads — Admin',
      admin: { name: req.session.adminName },
      activeMenu: 'uploads',
    });
  },

  async uploadsListApi(req, res) {
    try {
      const files = await listFilesFromR2();
      const totalSize = files.reduce((s, f) => s + f.size, 0);
      res.json({ ok: true, files, stats: { totalFiles: files.length, totalSize } });
    } catch (e) {
      res.json({ ok: false, message: e.message });
    }
  },

  async uploadsUsedUrlsApi(req, res) {
    try {
      const db = require('../../config/database');
      const usedUrls = new Set();

      // 1. Lấy tất cả URL từ bảng about (banner, logo, favicon, og_image, ...)
      const [aboutRows] = await db.query("SELECT content FROM about WHERE content LIKE 'http%'");
      aboutRows.forEach(r => { if (r.content) usedUrls.add(r.content.trim()); });

      // 2. Lấy tất cả URL ảnh từ bảng news
      const [newsRows] = await db.query("SELECT image FROM news WHERE image IS NOT NULL AND image LIKE 'http%'");
      newsRows.forEach(r => { if (r.image) usedUrls.add(r.image.trim()); });

      // 3. Tìm thêm URL trong nội dung HTML của news (content field)
      const [newsContent] = await db.query("SELECT content FROM news WHERE content IS NOT NULL");
      const urlRegex = /https?:\/\/[^\s"'<>]+/g;
      newsContent.forEach(r => {
        if (!r.content) return;
        const matches = r.content.match(urlRegex);
        if (matches) matches.forEach(u => usedUrls.add(u.trim()));
      });

      res.json({ ok: true, usedUrls: Array.from(usedUrls) });
    } catch (e) {
      res.json({ ok: false, message: e.message });
    }
  },

  async uploadsDeleteApi(req, res) {
    try {
      const { files } = req.body;
      if (!files || !files.length) return res.json({ ok: false, message: 'Không có file nào' });
      let deleted = 0;
      const errors = [];
      for (const file of files) {
        try {
          // File R2: có url bắt đầu bằng http
          if (file.url && file.url.startsWith('http')) {
            await deleteFromR2(file.url);
            deleted++;
          }
          // File local cũ: có id dạng "folder__filename"
          else if (file.id && file.id.includes('__')) {
            const [folder, ...nameParts] = file.id.split('__');
            const name = nameParts.join('__');
            const UPLOAD_FOLDERS = {
              news:    require('path').join(__dirname, '../../public/uploads/news'),
              media:   require('path').join(__dirname, '../../public/uploads/media'),
              content: require('path').join(__dirname, '../../public/uploads/content'),
            };
            if (UPLOAD_FOLDERS[folder]) {
              const filePath = require('path').join(UPLOAD_FOLDERS[folder], name);
              if (require('fs').existsSync(filePath)) { require('fs').unlinkSync(filePath); deleted++; }
            }
          }
        } catch (e) {
          errors.push(e.message);
        }
      }
      res.json({ ok: true, deleted, errors });
    } catch (e) {
      res.json({ ok: false, message: e.message });
    }
  },
};

Object.assign(module.exports, AdminControllerExtension);
module.exports.uploadMedia = uploadMedia;