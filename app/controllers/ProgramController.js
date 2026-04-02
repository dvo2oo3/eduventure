const NewsModel = require('../models/NewsModel');

const ProgramController = {
  
  async index(req, res) {
    try {
      const { page = 1, year = null, location = null } = req.query;
      const data = await NewsModel.getPrograms({ page: parseInt(page), year, location });
      const years = [...new Set(
        data.rows
          .map(r => r.event_date ? new Date(r.event_date).getFullYear() : null)
          .filter(Boolean)
      )].sort((a, b) => b - a);

      res.render('programs/index', {
        title: 'Chương trình & Sự kiện - EduVenture',
        page: 'programs',
        pageCSS: 'programs',
        pageJS: 'programs',
        rows: data.rows,
        total: data.total,
        totalPages: data.totalPages,
        currentPage: data.page,
        years,
        currentYear: year,
        currentLocation: location
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