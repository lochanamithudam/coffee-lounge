/* ===============================================
   COFFEE LOUNGE — JavaScript
   Scroll Animations, Parallax, Nav, Interactions
   =============================================== */

(function () {
  'use strict';

  /* ─── Utility ─────────────────────────────────── */
  const qs  = (s, c = document) => c.querySelector(s);
  const qsa = (s, c = document) => [...c.querySelectorAll(s)];

  /* ─── Navbar Scroll Behavior ──────────────────── */
  const navbar = qs('#navbar');

  function handleNavScroll() {
    if (window.scrollY > 80) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', handleNavScroll, { passive: true });
  handleNavScroll();

  /* ─── Mobile Nav ──────────────────────────────── */
  const hamburger    = qs('.nav-hamburger');
  const mobileNav    = qs('.mobile-nav');
  const mobileClose  = qs('.mobile-nav-close');
  const mobileOverlay = qs('.mobile-overlay');

  function openMobileNav() {
    mobileNav.classList.add('open');
    mobileOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeMobileNav() {
    mobileNav.classList.remove('open');
    mobileOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  hamburger?.addEventListener('click', openMobileNav);
  mobileClose?.addEventListener('click', closeMobileNav);
  mobileOverlay?.addEventListener('click', closeMobileNav);
  qsa('.mobile-nav-links a').forEach(a => a.addEventListener('click', closeMobileNav));

  /* ─── Scroll Reveal ───────────────────────────── */
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
  );

  qsa('.reveal, .reveal-left, .reveal-right').forEach(el => {
    revealObserver.observe(el);
  });

  /* ─── Text Drift / Parallax Oscillation ──────── */
  // Headings gently sway left & right as user scrolls
  const driftEls = qsa('.drift-text');

  let ticking = false;
  let lastScrollY = window.scrollY;

  function updateDrift() {
    const scrollY = window.scrollY;

    driftEls.forEach((el, i) => {
      const rect = el.getBoundingClientRect();
      const viewportCenter = window.innerHeight / 2;
      const elementCenter = rect.top + rect.height / 2;
      const distFromCenter = (elementCenter - viewportCenter) / window.innerHeight;

      // Alternating direction: odd elements drift opposite
      const direction = i % 2 === 0 ? 1 : -1;
      const magnitude = 14; // max px shift
      const shift = distFromCenter * magnitude * direction;

      el.style.transform = `translateX(${shift.toFixed(2)}px)`;
    });

    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(updateDrift);
      ticking = true;
    }
    lastScrollY = window.scrollY;
  }, { passive: true });

  updateDrift();

  /* ─── Active Nav Link Highlighting ───────────── */
  const sections = qsa('section[id]');
  const navLinks = qsa('.nav-links a, .mobile-nav-links a');

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          navLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
          });
        }
      });
    },
    { threshold: 0.35 }
  );

  sections.forEach(s => sectionObserver.observe(s));

  /* ─── Menu Tabs ───────────────────────────────── */
  const menuTabs   = qsa('.menu-tab');
  const menuPanels = qsa('.menu-panel');

  menuTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;

      menuTabs.forEach(t => t.classList.remove('active'));
      menuPanels.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const panel = qs(`#menu-${target}`);
      if (panel) panel.classList.add('active');
    });
  });

  /* ─── Lightbox ────────────────────────────────── */
  const lightbox    = qs('.lightbox');
  const lightboxImg = qs('.lightbox img');
  const lightboxClose = qs('.lightbox-close');

  qsa('.gallery-item').forEach(item => {
    item.addEventListener('click', () => {
      const src = item.querySelector('img')?.src;
      if (src && lightboxImg && lightbox) {
        lightboxImg.src = src;
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    });
  });

  function closeLightbox() {
    lightbox?.classList.remove('active');
    document.body.style.overflow = '';
  }

  lightboxClose?.addEventListener('click', closeLightbox);
  lightbox?.addEventListener('click', e => {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeLightbox();
      closeMobileNav();
    }
  });

  /* ─── Hero Video Fallback ─────────────────────── */
  const heroVideo = qs('.hero-video');
  if (heroVideo) {
    heroVideo.addEventListener('error', () => {
      const container = qs('.hero-video-container');
      if (container) {
        container.style.backgroundImage = "url('Images/lounge_interior.jpg')";
        container.style.backgroundSize  = 'cover';
        container.style.backgroundPosition = 'center';
      }
    });
  }

  /* ─── Counter Animations ──────────────────────── */
  const counters = qsa('.stat-number[data-count]');
  const counterObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el  = entry.target;
          const end = parseInt(el.dataset.count);
          const suffix = el.dataset.suffix || '';
          let current = 0;
          const step = end / 60;
          const timer = setInterval(() => {
            current += step;
            if (current >= end) {
              current = end;
              clearInterval(timer);
            }
            el.textContent = Math.floor(current) + suffix;
          }, 20);
          counterObserver.unobserve(el);
        }
      });
    },
    { threshold: 0.5 }
  );

  counters.forEach(c => counterObserver.observe(c));

  /* ─── API Base URL Helper ────────────────────── */
  function getApiBaseUrl() {
    const hostname = window.location.hostname;
    const port = window.location.port;

    if (hostname !== 'localhost' && hostname !== '127.0.0.1' && !window.location.protocol.startsWith('file')) {
      return '';
    }
    if (['5000', '5001', '5002'].includes(port)) {
      return '';
    }
    return 'http://localhost:5002';
  }

  /* ─── Form Submission Feedback ────────────────── */
  const contactForm = qs('#reservationForm');
  contactForm?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = contactForm.querySelector('button[type="submit"]');
    const originalText = btn ? btn.innerHTML : 'Send Inquiry';
    
    // Gather form data
    const formData = {
      name: qs('#guestName')?.value,
      email: qs('#guestEmail')?.value,
      phone: qs('#guestPhone')?.value,
      date: qs('#reservationDate')?.value,
      time: qs('#reservationTime')?.value,
      guests: qs('#guestCount')?.value,
      eventType: qs('#occasion')?.value,
      message: qs('#guestMessage')?.value
    };

    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Sending...';
    }

    try {
      const res = await fetch(`${getApiBaseUrl()}/api/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        if (btn) {
          btn.textContent = 'Reservation Sent ✓';
          btn.style.background = 'linear-gradient(135deg, #4a7a5c, #6aaf7e)';
          btn.style.color = '#fff';
        }
        contactForm.reset();
      } else {
        alert(data.message || 'Error submitting reservation.');
        if (btn) {
          btn.textContent = 'Failed ❌';
          btn.style.background = '#8b0000';
          btn.style.color = '#fff';
        }
      }
    } catch (err) {
      console.error('Reservation API Error:', err);
      alert('❌ Could not connect to backend server. Please make sure `npm start` is running in your terminal on port 5002!');
      if (btn) {
        btn.textContent = 'Connection Error ❌';
        btn.style.background = '#8b0000';
        btn.style.color = '#fff';
      }
    } finally {
      setTimeout(() => {
        if (btn) {
          btn.innerHTML = originalText;
          btn.style.background = '';
          btn.style.color = '';
          btn.disabled = false;
        }
      }, 3500);
    }
  });

  /* ─── Newsletter Form ─────────────────────────── */
  const newsletterForm = qs('#newsletterForm');
  newsletterForm?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = newsletterForm.querySelector('.newsletter-btn');
    const input = newsletterForm.querySelector('.newsletter-input');
    const originalText = btn ? btn.textContent : 'Join';

    if (!input || !input.value) return;

    if (btn) {
      btn.disabled = true;
      btn.textContent = '...';
    }

    try {
      const res = await fetch(`${getApiBaseUrl()}/api/newsletter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: input.value })
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        if (btn) btn.textContent = 'Joined ✓';
        input.value = '';
      } else {
        alert(data.message || 'Error joining newsletter.');
        if (btn) btn.textContent = 'Failed';
      }
    } catch (err) {
      console.error('Newsletter API Error:', err);
      alert('❌ Could not connect to backend server. Please make sure `npm start` is running in your terminal on port 5002!');
      if (btn) btn.textContent = 'Error';
    } finally {
      setTimeout(() => {
        if (btn) {
          btn.textContent = originalText;
          btn.disabled = false;
        }
      }, 3000);
    }
  });

  /* ─── Smooth Anchor Scroll ────────────────────── */
  qsa('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const target = qs(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const offset = navbar ? navbar.offsetHeight + 20 : 80;
        window.scrollTo({
          top: target.offsetTop - offset,
          behavior: 'smooth'
        });
      }
    });
  });

  /* ─── Subtle parallax on hero title ──────────── */
  const heroTitle = qs('.hero-title');
  window.addEventListener('scroll', () => {
    if (heroTitle) {
      const scrolled = window.scrollY;
      heroTitle.style.transform = `translateY(${scrolled * 0.25}px)`;
      heroTitle.style.opacity = Math.max(0, 1 - scrolled / 500);
    }
  }, { passive: true });

  /* ─── Marquee pause on hover ──────────────────── */
  const marqueeTrack = qs('.marquee-track');
  marqueeTrack?.parentElement?.addEventListener('mouseenter', () => {
    marqueeTrack.style.animationPlayState = 'paused';
  });
  marqueeTrack?.parentElement?.addEventListener('mouseleave', () => {
    marqueeTrack.style.animationPlayState = 'running';
  });

  /* ─── Hero Temperature Badge (Synced with Video) ─ */
  (function initTempBadge() {
    const numEl = qs('#tempNumber');
    const heroVideo = qs('.hero-video');
    if (!numEl) return;

    function tempToColor(t) {
      if (t >= 60) {
        const p = (t - 60) / 40;
        const r = Math.round(212 + p * (232 - 212));
        const g = Math.round(160 - p * (160 - 92));
        return `rgb(${r},${g},20)`;
      } else if (t >= 30) {
        const p = (t - 30) / 30;
        const r = Math.round(74 + p * (212 - 74));
        const g = Math.round(159 + p * (160 - 159));
        const b = Math.round(212 - p * (212 - 20));
        return `rgb(${r},${g},${b})`;
      } else {
        const p = t / 30;
        const r = Math.round(44 + p * (74 - 44));
        const g = Math.round(111 + p * (159 - 111));
        const b = Math.round(189 + p * (212 - 189));
        return `rgb(${r},${g},${b})`;
      }
    }

    function updateTempDisplay(currentTemp) {
      const rounded = Math.max(0, Math.min(100, Math.round(currentTemp)));
      numEl.textContent = rounded;
    }

    let fallbackTemp = 100;
    
    function tick() {
      if (heroVideo && heroVideo.duration && !isNaN(heroVideo.duration)) {
        // Sync temperature directly with video progress: 100°C at start -> 0°C at end
        const progress = heroVideo.currentTime / heroVideo.duration;
        const currentTemp = 100 - (progress * 100);
        updateTempDisplay(currentTemp);
      } else {
        // Fallback smooth countdown loop
        fallbackTemp -= 0.5;
        if (fallbackTemp < 0) fallbackTemp = 100;
        updateTempDisplay(fallbackTemp);
      }
      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  })();

  console.log('%cCoffee Lounge — Fine Coffee & Lounge ☕', 
    'color: #c9a84c; font-size: 14px; font-family: serif; padding: 4px 0;');

})();
