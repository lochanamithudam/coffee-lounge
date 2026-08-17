/* ===============================================
   COFFEE LOUNGE — JavaScript
   Scroll Animations, Parallax, Nav, Interactions
   =============================================== */

(function () {
  'use strict';

  /* ─── Utility ─────────────────────────────────── */
  const qs = (s, c = document) => c.querySelector(s);
  const qsa = (s, c = document) => [...c.querySelectorAll(s)];

  /* ─── Navbar Scroll Behavior ──────────────────── */
  const navbar = qs('#navbar');

  function handleNavScroll() {
    if (!navbar) return;
    if (window.scrollY > 80) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', handleNavScroll, { passive: true });
  handleNavScroll();

  /* ─── Mobile Nav ──────────────────────────────── */
  const hamburger = qs('.nav-hamburger');
  const mobileNav = qs('.mobile-nav');
  const mobileClose = qs('.mobile-nav-close');
  const mobileOverlay = qs('.mobile-overlay');

  function openMobileNav() {
    mobileNav?.classList.add('open');
    mobileOverlay?.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeMobileNav() {
    mobileNav?.classList.remove('open');
    mobileOverlay?.classList.remove('active');
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

  function updateDrift() {
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
  const menuTabs = qsa('.menu-tab');
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
  const lightbox = qs('.lightbox');
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
        container.style.backgroundSize = 'cover';
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
          const el = entry.target;
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
    return 'http://localhost:5000';
  }

  /* ─── Form Submission Feedback ────────────────── */
  const contactForm = qs('#reservationForm');
  contactForm?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = contactForm.querySelector('button[type="submit"]');
    const originalText = btn ? btn.innerHTML : 'Send Inquiry';

    // Gather and validate form data
    const name = qs('#guestName')?.value?.trim() || '';
    const email = qs('#guestEmail')?.value?.trim() || '';
    const phone = qs('#guestPhone')?.value?.trim() || '';
    const date = qs('#reservationDate')?.value?.trim() || '';
    const time = qs('#reservationTime')?.value?.trim() || '';
    const guests = qs('#guestCount')?.value || '2 Guests';
    const eventType = qs('#occasion')?.value || 'Casual Dining';
    const message = qs('#guestMessage')?.value?.trim() || '';

    if (!name || !email || !date || !time) {
      alert('Please fill in your Name, Email, Date, and Time for the reservation.');
      return;
    }

    const formData = {
      name,
      email,
      phone,
      date,
      time,
      guests,
      eventType,
      message
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
      alert('❌ Could not connect to backend server. Please make sure `npm start` is running in your terminal!');
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

    if (!input || !input.value || !input.value.trim()) return;

    if (btn) {
      btn.disabled = true;
      btn.textContent = '...';
    }

    try {
      const res = await fetch(`${getApiBaseUrl()}/api/newsletter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: input.value.trim() })
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
      alert('❌ Could not connect to backend server. Please make sure `npm start` is running in your terminal!');
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
      const href = anchor.getAttribute('href');
      if (!href || href === '#' || href.length < 2) return;
      try {
        const target = qs(href);
        if (target) {
          e.preventDefault();
          const offset = navbar ? navbar.offsetHeight + 20 : 80;
          const targetTop = target.getBoundingClientRect().top + window.scrollY - offset;
          window.scrollTo({
            top: targetTop,
            behavior: 'smooth'
          });
        }
      } catch {
        // Ignore invalid selector
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
      // Apply temperature-derived colour to the badge number
      numEl.style.color = tempToColor(rounded);
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

  /* ─── Events & Experiences Filtering ───────────── */
  const eventTabs = qsa('.events-tab-btn');
  const eventCards = qsa('.event-card');

  eventTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const filter = tab.dataset.filter;
      eventTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      eventCards.forEach(card => {
        const category = card.dataset.category;
        if (filter === 'all' || category === filter) {
          card.classList.remove('hidden');
        } else {
          card.classList.add('hidden');
        }
      });
    });
  });

  /* ─── Experience Modals Logic ────────────────────── */
  function setupModal(triggerId, modalId, closeId) {
    const trigger = qs(`#${triggerId}`);
    const modal = qs(`#${modalId}`);
    const closeBtn = qs(`#${closeId}`);

    if (!trigger || !modal) return;

    trigger.addEventListener('click', () => {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    });

    const closeModal = () => {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    };

    closeBtn?.addEventListener('click', closeModal);
    modal.addEventListener('click', e => {
      if (e.target === modal) closeModal();
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && modal.classList.contains('active')) {
        closeModal();
      }
    });
  }

  setupModal('openStampCardBtn', 'stampCardModal', 'closeStampModal');
  setupModal('openBrewConfigBtn', 'brewConfigModal', 'closeBrewModal');
  setupModal('openEcoModalBtn', 'ecoModal', 'closeEcoModal');

  /* ─── Digital Stamp Card Interaction ───────────── */
  (function initStampCard() {
    const testAddBtn = qs('#testAddStampBtn');
    const stampCountEl = qs('#currentStampCount');
    let currentStamps = 7;

    testAddBtn?.addEventListener('click', () => {
      if (currentStamps < 10) {
        currentStamps++;
        if (stampCountEl) stampCountEl.textContent = currentStamps;
        const targetSlot = qs(`#slot${currentStamps}`);
        if (targetSlot) {
          targetSlot.classList.add('stamped');
          targetSlot.innerHTML = '<i class="fa-solid fa-mug-hot"></i>';
        }
        if (currentStamps === 10) {
          alert('🎉 Congratulations! You have unlocked your FREE Specialty Coffee Reward!');
          testAddBtn.disabled = true;
          testAddBtn.innerHTML = '<i class="fa-solid fa-gift"></i> Reward Unlocked!';
        }
      }
    });
  })();

  /* ─── Brew Bar Customizer & Order Composer ──────── */
  (function initBrewConfigurator() {
    let selectedBean   = 'Ethiopian Yirgacheffe';
    let selectedRoast  = 'Light Roast';
    let selectedMethod = 'V60 Pour-Over';
    const BREW_PRICE   = 850;

    const recipePreview = qs('#brewRecipePreview');

    // Sync recipe text everywhere
    function syncRecipe() {
      const text = `${selectedBean} · ${selectedRoast} via ${selectedMethod}`;
      if (recipePreview)                        recipePreview.textContent = text;
      const od = qs('#brewOrderRecipeDisplay'); if (od) od.textContent = text;
      const ob = qs('#brewOrderBean');          if (ob) ob.innerHTML = `<i class="fa-solid fa-earth-americas"></i> ${selectedBean}`;
      const or = qs('#brewOrderRoast');         if (or) or.innerHTML = `<i class="fa-solid fa-fire"></i> ${selectedRoast}`;
      const om = qs('#brewOrderMethod');        if (om) om.innerHTML = `<i class="fa-solid fa-filter"></i> ${selectedMethod}`;
      // Short labels in summary
      const bShort = selectedBean.split(' ')[0];
      const rShort = selectedRoast.split(' ')[0];
      const mShort = selectedMethod.split(' ')[0];
      const sr = qs('#brewSummaryRecipeShort'); if (sr) sr.textContent = `${bShort} × ${rShort} × ${mShort}`;
    }

    function setupPillGroup(groupId, callback) {
      const container = qs(`#${groupId}`);
      if (!container) return;
      const pills = qsa('.brew-pill', container);
      pills.forEach(pill => {
        pill.addEventListener('click', () => {
          pills.forEach(p => p.classList.remove('selected'));
          pill.classList.add('selected');
          callback(pill.dataset.value);
          syncRecipe();
        });
      });
    }

    setupPillGroup('beanSelect',   val => { selectedBean   = val; });
    setupPillGroup('roastSelect',  val => { selectedRoast  = val; });
    setupPillGroup('methodSelect', val => { selectedMethod = val; });

    /* ── Open Brew Order Composer from brew modal ───── */
    const openBrewOrderBtn = qs('#openBrewOrderBtn');
    const brewOrderModal   = qs('#brewOrderModal');
    const closeBrewOrderBtn = qs('#closeBrewOrderModal');

    openBrewOrderBtn?.addEventListener('click', () => {
      syncRecipe();
      // close the config modal first
      qs('#brewConfigModal')?.classList.remove('active');
      document.body.style.overflow = 'hidden';
      // small delay so transition feels clean
      setTimeout(() => {
        brewOrderModal?.classList.add('active');
      }, 180);
    });

    const closeBrewOrder = () => {
      brewOrderModal?.classList.remove('active');
      document.body.style.overflow = '';
    };

    closeBrewOrderBtn?.addEventListener('click', closeBrewOrder);
    brewOrderModal?.addEventListener('click', e => {
      if (e.target === brewOrderModal) closeBrewOrder();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && brewOrderModal?.classList.contains('active')) {
        closeBrewOrder();
      }
    });

    /* ── Quantity Controls ───────────────────────────── */
    let brewQty = 1;

    function updateQtyDisplay() {
      const disp = qs('#brewQtyDisplay');
      const sq   = qs('#brewSummaryQty');
      const tot  = qs('#brewOrderTotal');
      if (disp) disp.textContent = brewQty;
      if (sq)   sq.textContent   = brewQty;
      if (tot)  tot.textContent  = `LKR ${(BREW_PRICE * brewQty).toLocaleString()}`;
    }

    qs('#brewQtyMinus')?.addEventListener('click', () => {
      if (brewQty > 1) { brewQty--; updateQtyDisplay(); }
    });

    qs('#brewQtyPlus')?.addEventListener('click', () => {
      if (brewQty < 10) { brewQty++; updateQtyDisplay(); }
    });

    /* ── Delivery address toggle ─────────────────────── */
    qs('#brewOrderType')?.addEventListener('change', function () {
      const wrap = qs('#brewDeliveryAddressWrap');
      if (wrap) wrap.style.display = this.value === 'delivery' ? 'flex' : 'none';
    });

    /* ── Form Submit → API → Email Confirmation ─────── */
    const brewForm     = qs('#brewOrderForm');
    const feedback     = qs('#brewOrderFeedback');
    const submitBtn    = qs('#brewOrderSubmitBtn');

    function showFeedback(msg, type) {
      if (!feedback) return;
      feedback.className = `brew-order-feedback ${type}`;
      feedback.innerHTML = msg;
      feedback.style.display = 'block';
    }

    function getApiBase() {
      const h = window.location.hostname;
      if (h !== 'localhost' && h !== '127.0.0.1' && !window.location.protocol.startsWith('file')) return '';
      if (['5000','5001','5002'].includes(window.location.port)) return '';
      return 'http://localhost:5000';
    }

    brewForm?.addEventListener('submit', async e => {
      e.preventDefault();

      const name   = qs('#brewOrderName')?.value?.trim();
      const email  = qs('#brewOrderEmail')?.value?.trim();
      const phone  = qs('#brewOrderPhone')?.value?.trim();
      const type   = qs('#brewOrderType')?.value || 'pickup';
      const addr   = qs('#brewDeliveryAddress')?.value?.trim() || '';
      const notes  = qs('#brewOrderNotes')?.value?.trim() || '';

      // Validation
      if (!name || !email || !phone) {
        showFeedback('⚠️ Please fill in your name, email, and phone number.', 'error');
        return;
      }
      if (type === 'delivery' && !addr) {
        showFeedback('⚠️ Please enter a delivery address.', 'error');
        return;
      }

      // Build order payload matching existing /api/orders schema
      const recipe  = `${selectedBean} · ${selectedRoast} via ${selectedMethod}`;
      const lineTotal = `LKR ${BREW_PRICE.toLocaleString()}`;
      const totalAmt  = `LKR ${(BREW_PRICE * brewQty).toLocaleString()}`;

      const payload = {
        name, email, phone,
        orderType: type,
        address: addr || null,
        pickupTime: null,
        notes,
        specialInstructions: recipe,
        items: [{
          name: `Custom Brew — ${recipe}`,
          qty: brewQty,
          lineTotal
        }],
        subtotal: totalAmt,
        deliveryFee: type === 'delivery' ? 'LKR 150' : 'LKR 0',
        taxes: 'LKR 0',
        total: type === 'delivery'
          ? `LKR ${(BREW_PRICE * brewQty + 150).toLocaleString()}`
          : totalAmt
      };

      // Disable button, show loading
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Placing Order…</span>';
      }
      if (feedback) feedback.style.display = 'none';

      try {
        const res  = await fetch(`${getApiBase()}/api/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (res.ok && data.status === 'success') {
          showFeedback(
            `<strong>🎉 Order Placed! Confirmation email sent to <em>${email}</em>.</strong><br>
             <span style="font-size:0.8rem;">Order ID: ${data.order?.id || '—'} &nbsp;|&nbsp; Recipe: ${recipe}</span>`,
            'success'
          );
          brewForm.reset();
          brewQty = 1;
          updateQtyDisplay();
          if (submitBtn) {
            submitBtn.innerHTML = '<i class="fa-solid fa-check"></i> <span>Order Sent!</span>';
          }
          // Auto-close after 4s
          setTimeout(() => { closeBrewOrder(); }, 4200);
        } else {
          throw new Error(data.message || 'Order failed.');
        }
      } catch (err) {
        showFeedback(
          `❌ ${err.message || 'Could not place order.'}<br><small>Make sure the server is running (<code>npm start</code>) or try again.</small>`,
          'error'
        );
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> <span>Send Order &amp; Get Confirmation Email</span>';
        }
      }
    });

  })();

  console.log('%cCoffee Lounge — Fine Coffee & Lounge ☕',
    'color: #c9a84c; font-size: 14px; font-family: serif; padding: 4px 0;');

})();

