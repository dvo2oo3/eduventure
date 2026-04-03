/* ============================================================
   admin.js — Admin Panel
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {

  // ── Highlight active sidebar link ──────────────────────────
  const currentPath = window.location.pathname;
  document.querySelectorAll('.sidebar__link').forEach(function (link) {
    const href = link.getAttribute('href');
    // if (href && (currentPath === href || (currentPath.startsWith(href) && currentPath[href.length] === '/')) && href !== '/admin/') {
    if (href && currentPath === href) {
      link.classList.add('active');
    } else if (href === '/admin/dashboard' && currentPath === '/admin/dashboard') {
      link.classList.add('active');
    }
  });

  // ── Toggle visible/pin cho tin tức (AJAX) ─────────────────
  window.toggleField = function (id, field, btn) {
    const endpoint = field === 'visible'
      ? '/admin/news/' + id + '/toggle-visible'
      : '/admin/news/' + id + '/toggle-pin';

    fetch(endpoint, { method: 'POST' })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data.ok) return;

        if (field === 'visible') {
          const isOn = btn.classList.contains('toggle-btn--on');
          btn.classList.toggle('toggle-btn--on', !isOn);
          btn.classList.toggle('toggle-btn--off', isOn);
          btn.textContent = isOn ? 'Ẩn' : 'Hiện';
          btn.title = isOn ? 'Nhấn để hiện' : 'Nhấn để ẩn';
        } else {
          const isPinned = btn.classList.contains('toggle-btn--pin');
          btn.classList.toggle('toggle-btn--pin', !isPinned);
          btn.classList.toggle('toggle-btn--off', isPinned);
          btn.textContent = isPinned ? 'Không ghim' : '📌 Ghim';
          btn.title = isPinned ? 'Ghim trang chủ' : 'Bỏ ghim';
        }
      })
      .catch(function (err) {
        console.error('Toggle error:', err);
        alert('Có lỗi xảy ra, vui lòng thử lại.');
      });
  };

  // ── Đánh dấu đã đọc tin nhắn (AJAX) ──────────────────────
  window.markRead = function (id) {
    fetch('/admin/contact/messages/' + id + '/read', { method: 'POST' })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data.ok) return;
        const item = document.getElementById('msg-' + id);
        if (item) {
          item.classList.remove('msg-item--unread');
          const btn = item.querySelector('.btn--outline');
          if (btn) btn.remove();
        }
        // Cập nhật badge unread nếu có
        updateUnreadCount();
      })
      .catch(function (err) { console.error(err); });
  };

  function updateUnreadCount() {
    const unreadItems = document.querySelectorAll('.msg-item--unread').length;
    const badge = document.querySelector('.admin-stat-card__num');
    // Chỉ update badge nếu đang ở trang dashboard
    const unreadBadge = document.querySelector('.badge--amber');
    if (unreadBadge) {
      if (unreadItems === 0) {
        unreadBadge.remove();
      } else {
        unreadBadge.textContent = unreadItems + ' chưa đọc';
      }
    }
  }

  // ── Preview ảnh khi nhập URL ────────────────────────────────
  const imageInput = document.querySelector('input[name="image"]');
  if (imageInput) {
    let previewEl = document.createElement('img');
    previewEl.style.cssText = 'max-width:100%;max-height:120px;border-radius:8px;margin-top:.5rem;display:none;border:1px solid #e8e8e4;';
    imageInput.parentNode.appendChild(previewEl);

    imageInput.addEventListener('input', function () {
      const url = this.value.trim();
      if (url) {
        previewEl.src = url;
        previewEl.style.display = 'block';
        previewEl.onerror = function () { previewEl.style.display = 'none'; };
      } else {
        previewEl.style.display = 'none';
      }
    });

    // Trigger nếu đã có giá trị sẵn (edit mode)
    if (imageInput.value.trim()) {
      previewEl.src = imageInput.value.trim();
      previewEl.style.display = 'block';
      previewEl.onerror = function () { previewEl.style.display = 'none'; };
    }
  }

  // ── Confirm trước khi xóa (bổ sung cho form delete) ───────
  document.querySelectorAll('form[action*="/delete"]').forEach(function (form) {
    if (!form.hasAttribute('onsubmit')) {
      form.addEventListener('submit', function (e) {
        if (!confirm('Bạn có chắc muốn xóa không? Thao tác này không thể hoàn tác.')) {
          e.preventDefault();
        }
      });
    }
  });

  // ── Auto-resize textarea ───────────────────────────────────
  document.querySelectorAll('.form-textarea').forEach(function (el) {
    el.addEventListener('input', function () {
      this.style.height = 'auto';
      this.style.height = this.scrollHeight + 'px';
    });
  });

  // ── Flash auto-dismiss trong admin ────────────────────────
  document.querySelectorAll('.flash--admin').forEach(function (el) {
    setTimeout(function () {
      el.style.opacity = '0';
      el.style.transition = 'opacity .4s';
      setTimeout(function () { el.remove(); }, 400);
    }, 4000);
  });

});

// ── AJAX Form helper ─────────────────────────────────────────
// Dùng chung cho tất cả form admin không cần reload
async function ajaxForm(formEl, opts = {}) {
  const btn = opts.btn || formEl.querySelector('[type=submit]');
  const msgEl = opts.msgEl || null;
  const origText = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = 'Đang lưu...'; }
  try {
    const res = await fetch(formEl.action, {
      method: formEl.method.toUpperCase() || 'POST',
      body: new URLSearchParams(new FormData(formEl))
    });
    const data = await res.json();
    showAdminMsg(data.ok, data.message, msgEl || formEl);
    if (data.ok && opts.onSuccess) opts.onSuccess(data);
    return data;
  } catch (err) {
    showAdminMsg(false, 'Lỗi kết nối', msgEl || formEl);
    return { ok: false };
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = origText; }
  }
}

function showAdminMsg(ok, text, anchor) {
  // Xóa toast cũ nếu có
  const old = document.getElementById('_admin_toast');
  if (old) old.remove();
  const toast = document.createElement('div');
  toast.id = '_admin_toast';
  toast.textContent = text;
  Object.assign(toast.style, {
    position: 'fixed', top: '18px', right: '24px', zIndex: '9999',
    padding: '.6rem 1.25rem', borderRadius: '8px', fontWeight: '600',
    fontSize: '.9rem', boxShadow: '0 4px 16px rgba(0,0,0,.12)',
    background: ok ? '#e8f5ee' : '#fef2f2',
    color: ok ? '#1a7f5a' : '#dc2626',
    border: ok ? '1px solid #c1e3d0' : '1px solid #fca5a5',
    transition: 'opacity .4s',
  });
  document.body.appendChild(toast);
  clearTimeout(window._adminToastTimer);
  window._adminToastTimer = setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 400);
  }, 5000);
}