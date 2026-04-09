/* ============================================================
   contact.js — Trang Liên hệ
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {

  const form = document.querySelector('.contact-form');
  if (!form) return;

  // ── Toast notification ─────────────────────────────────────
  function showToast(ok, text) {
    const old = document.getElementById('_contact_toast');
    if (old) old.remove();
    const toast = document.createElement('div');
    toast.id = '_contact_toast';
    toast.textContent = text;
    Object.assign(toast.style, {
      position: 'fixed', top: '80px', left: '50%',
      transform: 'translateX(-50%) translateY(0)',
      zIndex: '9999', padding: '.875rem 1.5rem',
      borderRadius: '8px', fontWeight: '600', fontSize: '.9rem',
      boxShadow: '0 4px 16px rgba(0,0,0,.12)',
      background: ok ? '#e8f5ee' : '#fef2f2',
      color: ok ? '#1a7f5a' : '#dc2626',
      border: ok ? '1px solid #c1e3d0' : '1px solid #fca5a5',
      transition: 'opacity .4s',
      whiteSpace: 'nowrap',
    });
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 400);
    }, 5000);
  }

  // ── Client-side validation ─────────────────────────────────
  function validate() {
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

    if (email && email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
      email.style.borderColor = '#e24b4a';
      valid = false;
    }

    if (!valid) {
      const firstError = form.querySelector('[style*="border-color"]');
      if (firstError) firstError.focus();
    }
    return valid;
  }

  // ── AJAX Submit ────────────────────────────────────────────
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (!validate()) return;

    const btn = form.querySelector('button[type="submit"]');
    const origText = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Đang gửi...'; }

    try {
      const res = await fetch('/lien-he/gui', {
        method: 'POST',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        body: new URLSearchParams(new FormData(form))
      });
      const data = await res.json();

      if (data.ok) {
        showToast(true, data.message || 'Yêu cầu đã được gửi thành công! Chúng tôi sẽ phản hồi trong 24h.');
        form.reset();
      } else {
        showToast(false, data.message || 'Có lỗi xảy ra, vui lòng thử lại.');
      }
    } catch (err) {
      showToast(false, 'Lỗi kết nối, vui lòng thử lại.');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = origText; }
    }
  });

  // ── Reset border khi user gõ lại ──────────────────────────
  form.querySelectorAll('.form-input').forEach(function (input) {
    input.addEventListener('input', function () {
      this.style.borderColor = '';
    });
  });

});