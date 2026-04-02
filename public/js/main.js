/* ============================================================
   main.js — EduVenture Global JS
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {

  // ── Mobile nav toggle ──────────────────────────────────────
  const navToggle = document.getElementById('navToggle');
  const navMobile = document.getElementById('navMobile');

  if (navToggle && navMobile) {
    navToggle.addEventListener('click', function () {
      navMobile.classList.toggle('open');
      const isOpen = navMobile.classList.contains('open');
      navToggle.setAttribute('aria-expanded', isOpen);
    });

    // Đóng khi click ngoài
    document.addEventListener('click', function (e) {
      if (!navToggle.contains(e.target) && !navMobile.contains(e.target)) {
        navMobile.classList.remove('open');
      }
    });
  }

  // ── Flash auto-dismiss sau 5 giây ─────────────────────────
  const flashes = document.querySelectorAll('.flash:not(.flash--admin)');
  flashes.forEach(function (el) {
    setTimeout(function () {
      el.style.opacity = '0';
      el.style.transform = 'translateX(-50%) translateY(-8px)';
      el.style.transition = 'opacity .4s, transform .4s';
      setTimeout(function () { el.remove(); }, 400);
    }, 5000);
  });

  // ── Smooth scroll cho anchor links ────────────────────────
  document.querySelectorAll('a[href^="#"]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      const target = document.querySelector(el.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

});
