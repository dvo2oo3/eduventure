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
