const NewsModel = require('../models/NewsModel');

const HomeController = {
  async index(req, res) {
    try {
      const pinnedNews = await NewsModel.getPinned();
      res.render('home/index', {
        title: 'Trang chủ — ' + (res.locals.siteName || 'EduVenture'),
        page: 'home',
        pageCSS: 'home',
        pageJS: 'home',
        pinnedNews
      });
    } catch (err) {
      console.error(err);
      res.status(500).render('error', { message: 'Lỗi tải trang chủ' });
    }
  }
};

module.exports = HomeController;