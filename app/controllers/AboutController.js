const AboutModel = require('../models/AboutModel');

const AboutController = {
  async index(req, res) {
    try {
      const about = await AboutModel.getAll();
      res.render('about/index', {
        title: 'Về chúng tôi — ' + (res.locals.siteName || 'EduVenture'),
        page: 'about',
        pageCSS: 'about',
        about
      });
    } catch (err) {
      console.error(err);
      res.status(500).render('error', { message: 'Lỗi tải trang giới thiệu' });
    }
  }
};

module.exports = AboutController;