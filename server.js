const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const { engine } = require('express-handlebars');
const Handlebars = require('handlebars');
const path = require('path');
require('dotenv').config();

const webRoutes = require('./routes/web');
const adminRoutes = require('./routes/admin');

const app = express();

// ── View engine: Handlebars ──────────────────────────────
app.engine('html', engine({
  extname: '.html',
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'app/views/layouts'),
  partialsDir: path.join(__dirname, 'app/views/partials'),
  helpers: {
    eq: (a, b) => a === b,
    ne: (a, b) => a !== b,
    or: (a, b) => a || b,
    and: (a, b) => a && b,
    inc: (n) => parseInt(n) + 1,
    dec: (n) => parseInt(n) - 1,
    range: (from, to) => {
      const arr = [];
      for (let i = from; i <= to; i++) arr.push(i);
      return arr;
    },
    formatDate: (date) => {
      if (!date) return '';
      const d = new Date(date);
      return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
    },
    formatDateInput: (date) => {
      if (!date) return '';
      return new Date(date).toISOString().split('T')[0];
    },
    truncate: (str, len) => {
      if (!str) return '';
      return str.length > len ? str.substring(0, len) + '...' : str;
    },
    json: (obj) => new Handlebars.SafeString(JSON.stringify(obj)),
    activeMenu: (current, target) => current === target ? 'active' : '',
    gradeNum: (g) => g ? g.replace('lop', '') : '',
    length: (arr) => (arr && arr.length) ? arr.length : 0,
    gt: (a, b) => a > b,
    includes: (arr, val) => Array.isArray(arr) ? arr.includes(val) : false,
    canAccess: function(perms, perm) { return Array.isArray(perms) && perms.includes(perm); },
    permLabel: function(perm) {
      const labels = { news:'📝 Viết tin tức', about:'ℹ️ Về chúng tôi', media:'🖼️ Banner & Logo', uploads:'📁 Uploads', download:'📥 Link tải xuống', phones:'📋 Danh sách SĐT', contact:'💬 Tin nhắn' };
      return labels[perm] || perm;
    }
  }
}));
app.set('view engine', 'html');
app.set('views', path.join(__dirname, 'app/views'));

// ── Middleware ───────────────────────────────────────────
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'eduventure_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 8 } // 8 giờ
}));
app.use(flash());

// Truyền flash và session vào tất cả views
app.use(async (req, res, next) => {
  res.locals.flashSuccess = req.flash('success')[0] || null;
  res.locals.flashError = req.flash('error')[0] || null;
  res.locals.isAdmin = !!req.session.adminId;
  res.locals.adminRole = req.session.adminRole || 'staff';
  res.locals.isSuperAdmin = req.session.adminRole === 'superadmin';
  res.locals.adminPermissions = req.session.adminPermissions || [];
  res.locals.activeMenu = '';
  try {
    const AboutModel = require('./app/models/AboutModel');
    const about = await AboutModel.getAll();
    res.locals.siteLogoUrl = about?.logo_url?.content || null;
    res.locals.siteBannerUrl = about?.banner_url?.content || null;
    res.locals.siteBannerTitle = about?.banner_title?.content || null;
    res.locals.siteBannerSubtitle = about?.banner_subtitle?.content || null;
    res.locals.siteBannerActive = about?.banner_active?.content === '1';
    res.locals.siteBannerPosition = about?.banner_position?.content || '50% 50%';
    res.locals.siteBannerZoom = about?.banner_zoom?.content || '100';
    res.locals.siteLogoMode = about?.logo_mode?.content || 'image';
    res.locals.siteLogoText = about?.logo_text?.content !== undefined ? about.logo_text.content : 'EduVenture';
    const _sn = about?.site_name?.content;
    res.locals.siteName = (_sn && _sn.trim()) ? _sn.trim() : (about?.logo_text?.content || 'EduVenture');
    res.locals.siteFaviconUrl = about?.favicon_url?.content || null;
    res.locals.siteFaviconShape = about?.favicon_shape?.content || 'square';
    res.locals.siteFaviconPosition = about?.favicon_position?.content || 'center';
    res.locals.siteOgImageUrl = about?.og_image_url?.content || null;
    res.locals.siteOgTitle = about?.og_title?.content || null;
    res.locals.siteOgDescription = about?.og_description?.content || null;
    res.locals.siteLogoSize = about?.logo_size?.content || '36';
    res.locals.siteLogoPosition = about?.logo_position?.content || '50% 50%';
    res.locals.siteLogoZoom = about?.logo_zoom?.content || '100';
    res.locals.siteEventBannerActive = about?.event_banner_active?.content === '1';
    res.locals.siteEventBannerUrl = about?.event_banner_url?.content || null;
    res.locals.siteEventBannerTitle = about?.event_banner_title?.content || '';
    res.locals.siteEventBannerSubtitle = about?.event_banner_subtitle?.content || '';
    res.locals.siteEventBannerLink = about?.event_banner_link?.content || '';
    res.locals.siteEventPosition = about?.event_position?.content || '50% 50%';
    res.locals.siteEventZoom = about?.event_zoom?.content || '100';
    res.locals.siteBannerTextColor = about?.banner_text_color?.content || '#ffffff';
    res.locals.siteEventTextColor = about?.event_text_color?.content || '#ffffff';
    res.locals.siteFacebookUrl = about?.facebook_url?.content || '';
    res.locals.siteZaloUrl = about?.zalo_url?.content || '';
    res.locals.siteBannerOverlayOpacity = about?.banner_overlay_opacity?.content || '45';
  } catch(e) {}
  next();
});

// ── Routes ───────────────────────────────────────────────
app.use('/', webRoutes);
app.use('/admin', adminRoutes);

// 404
app.use((req, res) => {
  res.status(404).render('error', { title: '404 — Không tìm thấy', message: 'Trang bạn tìm không tồn tại.' });
});

// ── Start ────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ EduVenture đang chạy tại http://localhost:${PORT}`);
});