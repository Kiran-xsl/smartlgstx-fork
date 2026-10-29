/* Smart LGSTX: sitewide contact buttons (Push 11). Styles in /cta.css.
 * - slCalendly(event): opens the 15-minute booking popup on the page the
 *   visitor is on. Loads Calendly first on pages that don't have it, and falls
 *   back to /contact?intent=book if Calendly can't load.
 * - Phones: Call and Book pinned at the bottom of every page, Chris's face
 *   beside them. Hidden while the page's own call/book buttons are on screen
 *   (elements marked data-sl-own-ctas) and over the footer.
 * - Phones: the top nav (.sl-site-nav) slides away on scroll down and comes
 *   back on scroll up.
 * Click tracking stays in attribution.js: tel: links send phone_click, and
 * anything whose onclick mentions Calendly sends cta_click (calendly). */
(function () {
  'use strict';
  var CAL = 'https://calendly.com/smartlgstx/30min_savings_consultation';
  var PHOTO = '/images/chris-tweedy-headshot-192.webp';
  var PHONE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false"><path stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>';

  // ── Booking popup ─────────────────────────────────────────────────────────
  var loading = null;
  function loadCalendly() {
    if (window.Calendly) return Promise.resolve();
    if (loading) return loading;
    loading = new Promise(function (ok, fail) {
      if (!document.querySelector('link[href*="assets.calendly.com/assets/external/widget.css"]')) {
        var l = document.createElement('link');
        l.rel = 'stylesheet';
        l.href = 'https://assets.calendly.com/assets/external/widget.css';
        document.head.appendChild(l);
      }
      var s = document.createElement('script');
      s.src = 'https://assets.calendly.com/assets/external/widget.js';
      s.async = true;
      s.onload = function () { window.Calendly ? ok() : fail(); };
      s.onerror = fail;
      document.head.appendChild(s);
      setTimeout(fail, 6000);
    });
    loading.catch(function () { loading = null; });
    return loading;
  }
  window.slCalendly = function (e) {
    if (e && (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1)) return true; // new tab: follow the link
    if (e && e.preventDefault) e.preventDefault();
    loadCalendly().then(function () {
      window.Calendly.initPopupWidget({ url: CAL });
    }, function () {
      location.href = '/contact?intent=book';
    });
    return false;
  };

  // ── Microsoft Clarity (heatmaps, scroll depth, session recordings) ──────
  // Not loaded for visitors who turned sharing off at /privacy-choices or whose
  // browser sends Global Privacy Control, because Clarity also sets Microsoft
  // cookies (MUID) that Microsoft uses for advertising. A visitor who opts out
  // while a page is open is switched to Clarity's no-cookie mode (consentv2
  // denied), which deletes its cookies and ends the session. Form fields are
  // masked by Clarity in every masking mode.
  var CLARITY_ID = 'yze1mxnxfv';
  function sharingOff() {
    return navigator.globalPrivacyControl === true ||
      /(?:^|;\s*)sl_privacy=no_share(?:;|$)/.test(document.cookie);
  }
  if (/^[a-z0-9]{6,16}$/.test(CLARITY_ID) && !sharingOff()) {
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', CLARITY_ID);
    var clarityOff = false;
    var stopClarityIfOff = function () {
      if (clarityOff || !sharingOff() || typeof window.clarity !== 'function') return;
      clarityOff = true;
      try { window.clarity('consentv2', { ad_Storage: 'denied', analytics_Storage: 'denied' }); } catch (e) {}
    };
    document.addEventListener('visibilitychange', function () { if (!document.hidden) stopClarityIfOff(); });
    window.addEventListener('focus', stopClarityIfOff);
    window.addEventListener('pointerdown', stopClarityIfOff, true);
  }

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    var phone = window.matchMedia('(max-width: 768px)');

    // ── Phone bottom bar ──────────────────────────────────────────────────
    if (!document.querySelector('.sl-bar') && !document.documentElement.hasAttribute('data-sl-no-bar')) {
      var bar = document.createElement('div');
      bar.className = 'sl-bar';
      bar.setAttribute('data-cta-location', 'sticky-bar');
      bar.setAttribute('aria-hidden', 'true');
      bar.innerHTML =
        '<img class="sl-bar__face" src="' + PHOTO + '" alt="Chris Tweedy" width="44" height="44" decoding="async">' +
        '<a class="sl-bar__book" href="/contact?intent=book" onclick="return slCalendly(event)" tabindex="-1">Book 15 min</a>' +
        '<a class="sl-bar__call" href="tel:+18333654789" tabindex="-1">' + PHONE_SVG + 'Call Chris</a>';
      document.body.appendChild(bar);

      var blockers = new Set();
      var paint = function () {
        var on = phone.matches && blockers.size === 0;
        bar.classList.toggle('is-on', on);
        bar.setAttribute('aria-hidden', String(!on));
        bar.querySelectorAll('a').forEach(function (a) { a.tabIndex = on ? 0 : -1; });
      };
      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (es) {
          es.forEach(function (x) { x.isIntersecting ? blockers.add(x.target) : blockers.delete(x.target); });
          paint();
        });
        document.querySelectorAll('footer, [data-sl-own-ctas]').forEach(function (el) { io.observe(el); });
      }
      // An open phone menu covers the page, so the bar steps aside
      var mm = document.getElementById('mobileMenu');
      if (mm && 'MutationObserver' in window) {
        new MutationObserver(function () {
          mm.classList.contains('active') || mm.classList.contains('open') ? blockers.add(mm) : blockers.delete(mm);
          paint();
        }).observe(mm, { attributes: true, attributeFilter: ['class'] });
      }
      if (phone.addEventListener) phone.addEventListener('change', paint);
      paint();
    }

    // ── Primary buttons: each gets one of four treatments (bounce, heartbeat,
    // glow, sweep) and plays it once when it comes on screen, at most once
    // every COOLDOWN_MS per button. Timing and strength live in cta.css.
    var COOLDOWN_MS = 20000;
    var FIXED_FX = [
      ['.sl-nav-book', 'glow'],
      ['.sl-bar__book', 'heart'],
      ['.sl-mm__talk', 'shine'],
      ['.sl-c-btn--gold', 'shine']
    ];
    var PAGE_FX = ['bounce', 'heart', 'shine']; // page buttons take turns
    var PRIMARY = '.sl-nav-book, .sl-bar__book, .sl-c-btn--gold, .sl-mm__talk, a.btn-primary, a.btn-gold, a.bg-gold, a[style*="background:#FADC61"]';
    var fxEls = document.querySelectorAll(PRIMARY);
    if (fxEls.length && 'IntersectionObserver' in window) {
      var lastRun = new WeakMap();
      var onScreen = new WeakMap();
      // Nothing plays until 1.5s after the page has finished loading, so the
      // first beat lands once the visitor has settled, not during the load
      var readyAt = 0;
      var setReady = function () { readyAt = Date.now() + 1500; };
      if (document.readyState === 'complete') setReady(); else window.addEventListener('load', setReady);
      var play = function (el) {
        var now = Date.now();
        if (!onScreen.get(el) || now - (lastRun.get(el) || 0) < COOLDOWN_MS) return;
        lastRun.set(el, now);
        el.classList.remove('sl-cta-play');
        void el.offsetWidth; // restart the animation
        el.classList.add('sl-cta-play');
        setTimeout(function () { el.classList.remove('sl-cta-play'); }, 5000);
      };
      var later = function (el) {
        if (!readyAt) { window.addEventListener('load', function () { later(el); }); return; }
        setTimeout(function () { play(el); }, Math.max(400, readyAt - Date.now()) + (parseInt(el.style.getPropertyValue('--sl-stagger'), 10) || 0));
      };
      var fxIO = new IntersectionObserver(function (es) {
        es.forEach(function (x) {
          var vis = x.isIntersecting && x.intersectionRatio >= 0.9;
          onScreen.set(x.target, vis);
          if (vis) later(x.target);
        });
      }, { threshold: [0.9] });
      var pageIdx = 0;
      fxEls.forEach(function (el, i) {
        var fx = null;
        FIXED_FX.some(function (m) { if (el.matches(m[0])) { fx = m[1]; return true; } return false; });
        if (!fx) fx = PAGE_FX[pageIdx++ % PAGE_FX.length];
        el.classList.add('sl-cta-fx', 'sl-fx-' + fx);
        el.style.setProperty('--sl-stagger', (i % 4) * 700 + 'ms');
        el.setAttribute('data-sl-fx', fx);
        var s = document.createElement('span');
        s.className = 'sl-shine';
        s.setAttribute('aria-hidden', 'true');
        el.appendChild(s);
        fxIO.observe(el);
      });
    }

    // ── Grouped phone menu: menu button on guide pages, current page marked ─
    document.querySelectorAll('[data-sl-menu-btn]').forEach(function (b) {
      b.addEventListener('click', function () {
        var m = document.getElementById('mobileMenu');
        if (!m) return;
        var open = m.classList.toggle('active');
        b.setAttribute('aria-expanded', String(open));
        b.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      });
    });
    var here = (location.pathname.replace(/\/$/, '') || '/') + location.search;
    document.querySelectorAll('.sl-mm a[href^="/"]').forEach(function (a) {
      var h = a.getAttribute('href').replace(/\/(\?|$)/, '$1') || '/';
      if (h !== here || a.classList.contains('sl-mm__talk')) return;
      a.setAttribute('aria-current', 'page');
      var g = a.closest('details');
      if (g) g.open = true;
    });

    // ── Phone nav: hide on scroll down, show on scroll up ─────────────────
    var nav = document.querySelector('.sl-site-nav');
    if (nav) {
      var lastY = window.scrollY, ticking = false;
      var menuOpen = function () {
        var m = nav.querySelector('.mobile-menu');
        return !!(m && (m.classList.contains('active') || m.classList.contains('open')));
      };
      var onScroll = function () {
        ticking = false;
        var y = window.scrollY, dy = y - lastY;
        if (!phone.matches || menuOpen() || y < nav.offsetHeight) {
          nav.classList.remove('sl-nav-hidden');
        } else if (dy > 6) {
          nav.classList.add('sl-nav-hidden');
        } else if (dy < -6) {
          nav.classList.remove('sl-nav-hidden');
        }
        if (Math.abs(dy) > 6) lastY = y;
      };
      window.addEventListener('scroll', function () {
        if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
      }, { passive: true });
      // Keyboard users tabbing into the nav always see it
      nav.addEventListener('focusin', function () { nav.classList.remove('sl-nav-hidden'); });
    }
  });
})();
