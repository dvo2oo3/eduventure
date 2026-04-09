const express = require('express');
const router = express.Router();

const HomeController = require('../app/controllers/HomeController');
const AboutController = require('../app/controllers/AboutController');
const ProgramController = require('../app/controllers/ProgramController');
const DownloadController = require('../app/controllers/DownloadController');
const ContactController = require('../app/controllers/ContactController');
const NewsController = require('../app/controllers/NewsController');
const NewsModel = require('../app/models/NewsModel');

// Trang chủ
router.get('/', HomeController.index);

// Về chúng tôi
router.get('/ve-chung-toi', AboutController.index);

// Chương trình & Sự kiện
router.get('/chuong-trinh', ProgramController.index);
router.get('/chuong-trinh/:slug', ProgramController.detail);

// Tải xuống
router.get('/tai-xuong', DownloadController.index);
router.post('/tai-xuong/verify', DownloadController.verify);

// Tin tức
router.get('/tin-tuc', NewsController.index);
router.get('/tin-tuc/:slug', NewsController.detail);

// Liên hệ
router.get('/lien-he', ContactController.index);
router.post('/lien-he/gui', ContactController.send);

// ── Sitemap XML ──────────────────────────────────────────
router.get('/sitemap.xml', async (req, res) => {
  try {
    const siteUrl = process.env.SITE_URL || `${req.protocol}://${req.get('host')}`;
    const now = new Date().toISOString().split('T')[0];

    // Lấy tất cả bài tin tức và chương trình đã public
    const [newsData, programData] = await Promise.all([
      NewsModel.getHighlights({ page: 1, limit: 1000, q: '', location: '', year: '' }),
      NewsModel.getPrograms({ page: 1, limit: 1000, q: '', location: '', year: '' })
    ]);

    const staticPages = [
      { url: '/', priority: '1.0', changefreq: 'weekly' },
      { url: '/ve-chung-toi', priority: '0.8', changefreq: 'monthly' },
      { url: '/chuong-trinh', priority: '0.9', changefreq: 'weekly' },
      { url: '/tin-tuc', priority: '0.9', changefreq: 'daily' },
      { url: '/tai-xuong', priority: '0.7', changefreq: 'monthly' },
      { url: '/lien-he', priority: '0.6', changefreq: 'monthly' },
    ];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // Trang tĩnh
    for (const p of staticPages) {
      xml += `  <url>\n`;
      xml += `    <loc>${siteUrl}${p.url}</loc>\n`;
      xml += `    <lastmod>${now}</lastmod>\n`;
      xml += `    <changefreq>${p.changefreq}</changefreq>\n`;
      xml += `    <priority>${p.priority}</priority>\n`;
      xml += `  </url>\n`;
    }

    // Tin tức
    for (const item of (newsData.rows || [])) {
      const lastmod = item.updated_at
        ? new Date(item.updated_at).toISOString().split('T')[0]
        : now;
      xml += `  <url>\n`;
      xml += `    <loc>${siteUrl}/tin-tuc/${item.slug}</loc>\n`;
      xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += `    <changefreq>monthly</changefreq>\n`;
      xml += `    <priority>0.7</priority>\n`;
      xml += `  </url>\n`;
    }

    // Chương trình
    for (const item of (programData.rows || [])) {
      const lastmod = item.updated_at
        ? new Date(item.updated_at).toISOString().split('T')[0]
        : now;
      xml += `  <url>\n`;
      xml += `    <loc>${siteUrl}/chuong-trinh/${item.slug}</loc>\n`;
      xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += `    <changefreq>monthly</changefreq>\n`;
      xml += `    <priority>0.7</priority>\n`;
      xml += `  </url>\n`;
    }

    xml += `</urlset>`;

    res.setHeader('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err) {
    console.error('Sitemap error:', err);
    res.status(500).send('Error generating sitemap');
  }
});

module.exports = router;