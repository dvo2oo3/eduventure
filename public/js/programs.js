/* ============================================================
   programs.js — Trang Chương trình
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {

  // ── Highlight active filter pill từ URL params ─────────────
  const params = new URLSearchParams(window.location.search);
  const year = params.get('year');
  const location = params.get('location');

  if (year || location) {
    document.querySelectorAll('.pill').forEach(function (pill) {
      const href = pill.getAttribute('href') || '';
      if (
        (year && href.includes('year=' + year)) ||
        (location && href.includes('location=' + encodeURIComponent(location)))
      ) {
        pill.classList.add('pill--active');
      }
    });
  }

});
