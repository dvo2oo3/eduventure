const NewsModel = require('../models/NewsModel');
const ContactModel = require('../models/ContactModel');

const ProgramController = {
  async index(req, res) {
    try {
      const { page = 1, q = '', location = '', year = '' } = req.query;
      const settings = await ContactModel.getSettings();
      const limit = parseInt(settings.program_per_page) || 8;
      const data = await NewsModel.getPrograms({ page: parseInt(page), limit, q, location, year });
      const allLocations = await NewsModel.getDistinctLocations('program');
      const allYears = await NewsModel.getDistinctYears('program');
      res.render('programs/index', {
        title: 'Chương trình & Sự kiện - ' + (res.locals.siteName || 'EduVenture'),
        page: 'programs',
        pageCSS: 'programs',
        rows: data.rows,
        total: data.total,
        totalPages: data.totalPages,
        currentPage: data.page,
        filter: { q, location, year },
        hasFilter: !!(q || location || year),
        allLocations,
        allYears
      });
    } catch (err) {
      console.error(err);
      res.status(500).render('error', { message: 'Lỗi tải trang chương trình' });
    }
  },

  async detail(req, res) {
    try {
      const news = await NewsModel.getBySlug(req.params.slug);
      if (!news) return res.status(404).render('error', { message: 'Bài viết không tồn tại' });
      const settings = await ContactModel.getSettings();
      const relatedLimit = parseInt(settings.program_related_count) || parseInt(settings.related_count) || 4;
      const relatedNews = await NewsModel.getRelated({ id: news.id, category: news.category, limit: relatedLimit });
      const siteName = res.locals.siteName || 'EduVenture';
      const siteUrl = process.env.SITE_URL || '';
      const desc = news.summary ? news.summary.substring(0, 160) : `${siteName} — Chương trình kỹ năng sống cho học sinh tiểu học`;
      res.render('programs/detail', {
        title: news.title + ' — ' + siteName,
        page: 'programs',
        pageCSS: 'programs',
        news,
        relatedNews,
        siteUrl,
        extraHead: `
<meta name="description" content="${desc.replace(/"/g, '&quot;')}" />
<meta property="og:title" content="${(news.title + ' — ' + siteName).replace(/"/g, '&quot;')}" />
<meta property="og:description" content="${desc.replace(/"/g, '&quot;')}" />
<meta property="og:type" content="article" />
${news.image ? `<meta property="og:image" content="${news.image}" />` : ''}
${siteUrl ? `<meta property="og:url" content="${siteUrl}/chuong-trinh/${news.slug}" />` : ''}
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${(news.title + ' — ' + siteName).replace(/"/g, '&quot;')}" />
${news.image ? `<meta name="twitter:image" content="${news.image}" />` : ''}
${siteUrl ? `<link rel="canonical" href="${siteUrl}/chuong-trinh/${news.slug}" />` : ''}
        `.trim()
      });
    } catch (err) {
      console.error(err);
      res.status(500).render('error', { message: 'Lỗi tải bài viết' });
    }
  }
};

module.exports = ProgramController;