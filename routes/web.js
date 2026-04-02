const express = require('express');
const router = express.Router();

const HomeController = require('../app/controllers/HomeController');
const AboutController = require('../app/controllers/AboutController');
const ProgramController = require('../app/controllers/ProgramController');
const DownloadController = require('../app/controllers/DownloadController');
const ContactController = require('../app/controllers/ContactController');
const NewsController = require('../app/controllers/NewsController');

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

module.exports = router;