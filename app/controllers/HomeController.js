const NewsModel = require('../models/NewsModel');
const AboutModel = require('../models/AboutModel');

const HomeController = {
  async index(req, res) {
    try {
      const pinnedNews = await NewsModel.getPinned();
      const about = await AboutModel.getAll();
      res.render('home/index', {
        title: 'Trang chủ — ' + (res.locals.siteName || 'EduVenture'),
        page: 'home',
        pageCSS: 'home',
        pageJS: 'home',
        pinnedNews,
        about
      });
    } catch (err) {
      console.error(err);
      res.status(500).render('error', { message: 'Lỗi tải trang chủ' });
    }
  }
};

module.exports = HomeController;