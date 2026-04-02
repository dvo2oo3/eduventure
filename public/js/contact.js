/* ============================================================
   contact.js — Trang Liên hệ
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {

  const form = document.querySelector('.contact-form');
  if (!form) return;

  // ── Client-side validation ─────────────────────────────────
  form.addEventListener('submit', function (e) {
    const name = form.querySelector('[name="full_name"]');
    const email = form.querySelector('[name="email"]');
    const message = form.querySelector('[name="message"]');
    let valid = true;

    [name, email, message].forEach(function (field) {
      if (field && !field.value.trim()) {
        field.style.borderColor = '#e24b4a';
        valid = false;
      } else if (field) {
        field.style.borderColor = '';
      }
    });

    // Kiểm tra email format
    if (email && email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
      email.style.borderColor = '#e24b4a';
      valid = false;
    }

    if (!valid) {
      e.preventDefault();
      const firstError = form.querySelector('[style*="border-color"]');
      if (firstError) firstError.focus();
    } else {
      // Disable nút submit để tránh double-submit
      const btn = form.querySelector('button[type="submit"]');
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Đang gửi...';
      }
    }
  });

  // ── Reset border khi user gõ lại ──────────────────────────
  form.querySelectorAll('.form-input').forEach(function (input) {
    input.addEventListener('input', function () {
      this.style.borderColor = '';
    });
  });

});
