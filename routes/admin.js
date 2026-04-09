const express = require('express');
const router = express.Router();
const AdminController = require('../app/controllers/AdminController');
const { uploadMedia } = require('../app/controllers/AdminController');
const { requireAuth, requirePermission, requireSuperAdmin } = require('../middleware/auth');

// Auth
router.get('/login', AdminController.loginPage);
router.post('/login', AdminController.loginPost);
router.get('/logout', AdminController.logout);

// Dashboard (tất cả route bên dưới cần đăng nhập)
router.use(requireAuth);

router.get('/', (req, res) => res.redirect('/admin/dashboard'));
router.get('/dashboard', AdminController.dashboard);

// Quản lý tin tức / chương trình
router.get('/news', requirePermission('news'), AdminController.newsList);
router.get('/news/create', requirePermission('news'), AdminController.newsCreatePage);
router.post('/news/create', requirePermission('news'), AdminController.newsCreate);
router.get('/news/:id/edit', requirePermission('news'), AdminController.newsEditPage);
router.post('/news/:id/edit', requirePermission('news'), AdminController.newsUpdate);
router.post('/news/:id/delete', requirePermission('news'), AdminController.newsDelete);
router.post('/news/:id/toggle-visible', requirePermission('news'), AdminController.newsToggleVisible);
router.post('/news/:id/toggle-pin', requirePermission('news'), AdminController.newsTogglePin);
router.post('/news/display-settings', requirePermission('news'), AdminController.newsDisplaySettingSave);

// Về chúng tôi
router.get('/about', requirePermission('about'), AdminController.aboutPage);

// Link tải xuống
router.get('/download', requirePermission('download'), AdminController.downloadPage);
router.post('/download', AdminController.downloadUpdate);
router.post('/download/phones/add', AdminController.downloadAddPhone);
router.post('/download/phones/bulk-delete', AdminController.downloadDeleteBulk);
router.post('/download/phones/delete-by-filter', AdminController.downloadDeleteByFilter);
router.get('/download/phones/schools', AdminController.downloadGetSchools);
router.get('/download/phones', requirePermission('phones'), AdminController.phonesPage);
router.post('/download/phones/:id/delete', AdminController.downloadDeletePhone);
router.get('/download/program/:id/links', AdminController.downloadGetProgram);
router.post('/download/programs/add', AdminController.downloadAddProgram);
router.post('/download/programs/:id/delete', AdminController.downloadDeleteProgram);
router.post('/download/programs/:id/edit', AdminController.downloadEditProgram);
router.post('/download/programs/:id/toggle', AdminController.downloadToggleProgram);
router.post('/download/programs/:id/grade/:grade/toggle', AdminController.downloadToggleGrade);
router.post('/download/pause/toggle', AdminController.downloadToggleGlobalPause);
router.post('/download/pause-message', AdminController.downloadUpdatePauseMessage);
router.post('/download/sysreq', AdminController.downloadUpdateSysreq);

const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const uploadAbout = multer({ storage: multer.memoryStorage(), limits: { fieldSize: 20 * 1024 * 1024 } }).none();
router.post('/about', requirePermission('about'), uploadAbout, AdminController.aboutUpdate);

router.get('/download/import', AdminController.downloadImportPage);
router.post('/download/import', upload.single('file'), AdminController.downloadImport);
router.post('/download/phones/:id/edit', AdminController.downloadEditPhone);
// Liên hệ
router.get('/contact', requirePermission('contact'), AdminController.contactSettingPage);
router.post('/contact/settings', AdminController.contactSettingUpdate);
router.post('/contact/messages/:id/read', AdminController.contactMessageRead);
router.post('/contact/messages/:id/delete', AdminController.contactMessageDelete)
router.post('/contact/messages/bulk-delete', express.json(), AdminController.contactMessageBulkDelete);
router.get('/settings/profile', AdminController.profilePage);
router.post('/settings/profile', AdminController.profileUpdate);
router.get('/settings/password', AdminController.changePasswordPage);
router.post('/settings/password', AdminController.changePasswordPost);

router.get('/media', requirePermission('media'), AdminController.mediaPage);
router.post('/media', uploadMedia, AdminController.mediaUpdate);
router.post('/media/clear-image', AdminController.mediaClearImage);


// Upload ảnh cho TinyMCE → R2
const multerContent = require('multer');
const uploadContentMiddleware = multerContent({
  storage: multerContent.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg','.jpeg','.png','.webp','.gif'];
    allowed.includes(require('path').extname(file.originalname).toLowerCase()) ? cb(null, true) : cb(new Error('Chỉ chấp nhận ảnh!'));
  }
}).single('file');

router.post('/upload-image', (req, res) => {
  uploadContentMiddleware(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Không có file' });
    try {
      const { uploadToR2 } = require('../config/r2');
      const url = await uploadToR2(req.file.buffer, req.file.originalname, 'content');
      res.json({ location: url });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
});

// Upload video cho TinyMCE → R2
const uploadVideoMiddleware = multerContent({
  storage: multerContent.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.mp4', '.webm', '.ogg', '.mov'];
    allowed.includes(require('path').extname(file.originalname).toLowerCase())
      ? cb(null, true)
      : cb(new Error('Chỉ chấp nhận file video (mp4, webm, ogg, mov)!'));
  }
}).single('file');

router.post('/upload-video', (req, res) => {
  uploadVideoMiddleware(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Không có file' });
    try {
      const { uploadToR2 } = require('../config/r2');
      const url = await uploadToR2(req.file.buffer, req.file.originalname, 'content');
      res.json({ location: url });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
});

// Quản lý Uploads
router.get('/uploads', requirePermission('uploads'), AdminController.uploadsPage);
router.get('/uploads/list', AdminController.uploadsListApi);
router.get('/uploads/used-urls', AdminController.uploadsUsedUrlsApi);
router.post('/uploads/delete', express.json(), AdminController.uploadsDeleteApi);

// Quản lý tài khoản (chỉ superadmin)
router.get('/accounts', requireSuperAdmin, AdminController.accountsPage);
router.post('/accounts/create', requireSuperAdmin, AdminController.accountCreate);
router.post('/accounts/:id/update', requireSuperAdmin, AdminController.accountUpdate);
router.post('/accounts/:id/reset-password', requireSuperAdmin, AdminController.accountResetPassword);
router.post('/accounts/:id/delete', requireSuperAdmin, AdminController.accountDelete);

// Proxy ảnh từ R2 để tránh lỗi CORS khi dùng r2.dev
router.get('/proxy-image', async (req, res) => {
  const { url } = req.query;
  const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || '';
  if (!url || !url.startsWith(R2_PUBLIC_URL)) {
    return res.status(400).send('Invalid URL');
  }
  try {
    const https = require('https');
    const http = require('http');
    const client = url.startsWith('https') ? https : http;
    client.get(url, (r2res) => {
      res.set('Content-Type', r2res.headers['content-type'] || 'image/jpeg');
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Cache-Control', 'public, max-age=86400');
      r2res.pipe(res);
    }).on('error', () => res.status(500).send('Proxy error'));
  } catch(e) {
    res.status(500).send(e.message);
  }
});

module.exports = router;