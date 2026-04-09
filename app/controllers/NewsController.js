const NewsModel = require('../models/NewsModel');
const ContactModel = require('../models/ContactModel');

const NewsController = {
  async index(req, res) {
    try {
      const { page = 1, q = '', location = '', year = '' } = req.query;
      const settings = await ContactModel.getSettings();
      const limit = parseInt(settings.news_per_page) || 6;
      const data = await NewsModel.getHighlights({ page: parseInt(page), limit, q, location, year });
      const allLocations = await NewsModel.getDistinctLocations('highlight');
      const allYears = await NewsModel.getDistinctYears('highlight');
      res.render('news/index', {
        title: 'Tin tức - ' + (res.locals.siteName || 'EduVenture'),
        page: 'news',
        pageCSS: 'news',
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
      res.status(500).render('error', { message: 'Loi tai trang tin tuc' });
    }
  },

  async detail(req, res) {
    try {
      const news = await NewsModel.getBySlug(req.params.slug);
      if (!news) return res.status(404).render('error', { message: 'Bai viet khong ton tai' });
      const settings = await ContactModel.getSettings();
      const relatedLimit = parseInt(settings.news_related_count) || parseInt(settings.related_count) || 4;
      const relatedNews = await NewsModel.getRelated({ id: news.id, category: news.category, limit: relatedLimit });
      const siteName = res.locals.siteName || 'EduVenture';
      const siteUrl = process.env.SITE_URL || '';
      const desc = news.summary ? news.summary.substring(0, 160) : `${siteName} — Chương trình kỹ năng sống cho học sinh tiểu học`;
      res.render('news/detail', {
        title: news.title + ' — ' + siteName,
        page: 'news',
        pageCSS: 'news',
        news,
        relatedNews,
        siteUrl,
        extraHead: `
<meta name="description" content="${desc.replace(/"/g, '&quot;')}" />
<meta property="og:title" content="${(news.title + ' — ' + siteName).replace(/"/g, '&quot;')}" />
<meta property="og:description" content="${desc.replace(/"/g, '&quot;')}" />
<meta property="og:type" content="article" />
${news.image ? `<meta property="og:image" content="${news.image}" />` : ''}
${siteUrl ? `<meta property="og:url" content="${siteUrl}/tin-tuc/${news.slug}" />` : ''}
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${(news.title + ' — ' + siteName).replace(/"/g, '&quot;')}" />
${news.image ? `<meta name="twitter:image" content="${news.image}" />` : ''}
${siteUrl ? `<link rel="canonical" href="${siteUrl}/tin-tuc/${news.slug}" />` : ''}
        `.trim()
      });
    } catch (err) {
      console.error(err);
      res.status(500).render('error', { message: 'Loi tai bai viet' });
    }
  }
};

module.exports = NewsController;