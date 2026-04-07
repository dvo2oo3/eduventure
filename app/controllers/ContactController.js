const ContactModel = require('../models/ContactModel');
// const transporter = require('../../config/mail');
const transporter = require('../../config/mail');
// const transporter = require('../config/mail');
require('dotenv').config();

const ContactController = {
  async index(req, res) {
    try {
      const settings = await ContactModel.getSettings();
      res.render('contact/index', {
        title: 'Liên hệ — ' + (res.locals.siteName || 'EduVenture'),
        page: 'contact',
        pageCSS: 'contact',
        pageJS: 'contact',
        settings,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (err) {
      console.error(err);
      res.status(500).render('error', { message: 'Lỗi tải trang liên hệ' });
    }
  },

  async send(req, res) {
    try {
      const { full_name, email, phone, message } = req.body;
      if (!full_name || !email || !message) {
        req.flash('error', 'Vui lòng điền đầy đủ thông tin bắt buộc.');
        return res.redirect('/lien-he');
      }

      await ContactModel.saveMessage({ full_name, email, phone, message });

      transporter.sendMail({
        from: `"EduVenture Website" <${process.env.MAIL_USER}>`,
        to: process.env.MAIL_TO,
        subject: `[EduVenture] Yêu cầu hỗ trợ từ ${full_name}`,
        html: `
          <h2>Yêu cầu hỗ trợ mới</h2>
          <p><strong>Họ tên:</strong> ${full_name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Điện thoại:</strong> ${phone || 'Không cung cấp'}</p>
          <hr/>
          <p><strong>Nội dung:</strong></p>
          <p>${message.replace(/\n/g, '<br>')}</p>
        `
      }).catch(mailErr => {
        console.error('Lỗi gửi mail (không ảnh hưởng):', mailErr.message);
      });

      req.flash('success', 'Yêu cầu của bạn đã được gửi thành công! Chúng tôi sẽ phản hồi trong vòng 24h.');
      res.redirect('/lien-he');
    } catch (err) {
      console.error(err);
      req.flash('error', 'Có lỗi xảy ra, vui lòng thử lại.');
      res.redirect('/lien-he');
    }
  }
};

module.exports = ContactController;