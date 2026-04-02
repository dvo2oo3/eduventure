const NewsModel = require('../models/NewsModel');

const NewsController = {
  async index(req, res) {
    try {
      const { page = 1 } = req.query;
      const data = await NewsModel.getHighlights({ page: parseInt(page) });
      res.render('news/index', {
        title: 'Tin tức - ' + (res.locals.siteName || 'EduVenture'),
        page: 'news',
        pageCSS: 'news',
        rows: data.rows,
        total: data.total,
        totalPages: data.totalPages,
        currentPage: data.page
      });
    } catch (err) {
      console.error(err);
      res.status(500).render('error', { message: 'Lỗi tải trang tin tức' });
    }
  },

  async detail(req, res) {
    try {
      const news = await NewsModel.getBySlug(req.params.slug);
      if (!news) return res.status(404).render('error', { message: 'Bài viết không tồn tại' });
      res.render('news/detail', {
        title: news.title + ' - ' + (res.locals.siteName || 'EduVenture'),
        page: 'news',
        news
      });
    } catch (err) {
      console.error(err);
      res.status(500).render('error', { message: 'Lỗi tải bài viết' });
    }
  }
};

module.exports = NewsController;