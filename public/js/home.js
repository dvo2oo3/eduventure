/* ============================================================
   home.js — Trang chủ
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {

  // ── Animate stats khi scroll vào ──────────────────────────
  const statNums = document.querySelectorAll('.stat-item__num');

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('stat-animate');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });

    statNums.forEach(function (el) { observer.observe(el); });
  }

  // ── News card hover effect ─────────────────────────────────
  document.querySelectorAll('.news-card').forEach(function (card) {
    card.addEventListener('mouseenter', function () {
      this.style.transform = 'translateY(-4px)';
    });
    card.addEventListener('mouseleave', function () {
      this.style.transform = 'translateY(0)';
    });
  });

});
