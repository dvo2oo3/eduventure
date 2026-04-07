const NewsModel = require('../models/NewsModel');
const ContactModel = require('../models/ContactModel');

const ProgramController = {
  async index(req, res) {
    try {
      const { page = 1, q = '', location = '', year = '' } = req.query;
      const settings = await ContactModel.getSettings();
      const limit = parseInt(settings.news_per_page) || 6;
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
      res.render('programs/detail', {
        title: news.title + ' - ' + (res.locals.siteName || 'EduVenture'),
        page: 'programs',
        news
      });
    } catch (err) {
      console.error(err);
      res.status(500).render('error', { message: 'Lỗi tải bài viết' });
    }
  }
};

module.exports = ProgramController;