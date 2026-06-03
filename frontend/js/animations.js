// ============================================
// SENTINEL VMS - Subtle GSAP Animations
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // Check if GSAP is loaded
  if (typeof gsap === 'undefined') {
    console.warn('GSAP not loaded, animations skipped');
    return;
  }

  gsap.defaults({
    ease: 'power2.out',
    duration: 0.6
  });

  // Detect page type
  const hasAside   = document.querySelector('aside') !== null;
  const hasMain    = document.querySelector('main') !== null;
  const isLogin    = document.querySelector('#start-btn, #auth-form') !== null;
  const isBadge    = document.querySelector('.scanner-line') !== null;

  // ── Login / Badge: center-focused reveal ──
  if (isLogin) {
    gsap.from('header', { y: -20, opacity: 0, duration: 0.5 });
    gsap.from('main > *', { y: 40, opacity: 0, duration: 0.8, stagger: 0.15, delay: 0.2, clearProps: 'all' });
    gsap.from('footer', { y: 20, opacity: 0, duration: 0.5, delay: 0.6 });
    return;
  }

  if (isBadge) {
    gsap.from('header', { y: -20, opacity: 0, duration: 0.5 });
    gsap.from('aside',  { x: -30, opacity: 0, duration: 0.5, delay: 0.1 });
    gsap.from('section > div', { scale: 0.97, opacity: 0, duration: 0.7, stagger: 0.15, delay: 0.3, clearProps: 'all' });
    return;
  }

  // ── All other pages: sidebar + main layout ──

  // 1. Sidebar slide-in from left
  if (hasAside) {
    gsap.from('aside', { x: -30, opacity: 0, duration: 0.5 });
  }

  // 2. Header slide-in from top
  if (hasMain) {
    gsap.from('header', { y: -20, opacity: 0, duration: 0.5, delay: 0.1 });
  }

  // 3. Stats / summary cards staggered pop-in
  const cards = document.querySelectorAll(
    '.bg-surface-container-lowest, .bg-surface-container-low.border'
  );
  if (cards.length) {
    gsap.from(cards, {
      y: 24,
      opacity: 0,
      scale: 0.97,
      duration: 0.6,
      stagger: 0.07,
      delay: 0.25,
      clearProps: 'all'
    });
  }

  // 4. Table rows left-slide
  const tableRows = document.querySelectorAll('tbody tr');
  if (tableRows.length) {
    gsap.from(tableRows, {
      x: -12,
      opacity: 0,
      duration: 0.45,
      stagger: 0.03,
      delay: 0.5,
      clearProps: 'all'
    });
  }

  // 5. Form fields cascade
  const formFields = document.querySelectorAll(
    'input:not([type="checkbox"]):not([type="radio"]), select, textarea'
  );
  if (formFields.length) {
    gsap.from(formFields, {
      y: 12,
      opacity: 0,
      duration: 0.45,
      stagger: 0.05,
      delay: 0.4,
      clearProps: 'all'
    });
  }

  // 6. Canvas charts fade + scale
  const charts = document.querySelectorAll('canvas');
  if (charts.length) {
    gsap.from(charts, {
      scale: 0.92,
      opacity: 0,
      duration: 0.8,
      stagger: 0.12,
      delay: 0.5,
      clearProps: 'all'
    });
  }

  // 7. Sidebar nav links stagger
  const navLinks = document.querySelectorAll('aside nav a');
  if (navLinks.length) {
    gsap.from(navLinks, {
      x: -16,
      opacity: 0,
      duration: 0.4,
      stagger: 0.06,
      delay: 0.2,
      clearProps: 'all'
    });
  }

  // 8. Subtle hover lift on interactive cards
  const interactiveCards = document.querySelectorAll(
    '.bg-surface-container-lowest, section.bg-surface'
  );
  interactiveCards.forEach(card => {
    card.addEventListener('mouseenter', function() {
      gsap.to(this, { y: -2, boxShadow: '0 8px 24px -8px rgba(0,0,0,0.10)', duration: 0.25 });
    });
    card.addEventListener('mouseleave', function() {
      gsap.to(this, { y: 0, boxShadow: 'none', duration: 0.25 });
    });
  });

  // 9. Primary action buttons pop on hover
  const primaryBtns = document.querySelectorAll(
    'button.bg-primary, button[type="submit"]'
  );
  primaryBtns.forEach(btn => {
    btn.addEventListener('mouseenter', function() {
      gsap.to(this, { scale: 1.03, duration: 0.18 });
    });
    btn.addEventListener('mouseleave', function() {
      gsap.to(this, { scale: 1, duration: 0.18 });
    });
  });

  // 10. Scroll-reveal for items below the fold
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          gsap.fromTo(entry.target,
            { y: 20, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.55, ease: 'power2.out', clearProps: 'all' }
          );
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.grid > div:nth-child(n+7)').forEach(el => io.observe(el));
  }
});
