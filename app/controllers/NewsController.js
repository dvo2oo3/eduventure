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
      res.render('news/detail', {
        title: news.title + ' - ' + (res.locals.siteName || 'EduVenture'),
        page: 'news',
        news
      });
    } catch (err) {
      console.error(err);
      res.status(500).render('error', { message: 'Loi tai bai viet' });
    }
  }
};

module.exports = NewsController;