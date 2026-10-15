/**
 * Smart LGSTX — CTA Attribution Script
 * First-touch UTM capture + CTA click tracking → GA4
 */
(function () {
  'use strict';

  // ── First-touch UTM capture (sessionStorage, one write per session) ────────
  (function () {
    if (sessionStorage.getItem('sl_ft')) return;
    var p = new URLSearchParams(window.location.search);
    sessionStorage.setItem('sl_ft', JSON.stringify({
      source:   p.get('utm_source')   || '(direct)',
      medium:   p.get('utm_medium')   || '(none)',
      campaign: p.get('utm_campaign') || '(none)',
      landing:  window.location.pathname
    }));
  })();

  function getFirstTouch() {
    try { return JSON.parse(sessionStorage.getItem('sl_ft') || '{}'); }
    catch (e) { return {}; }
  }

  function fire(eventName, extra) {
    if (typeof gtag !== 'function') return;
    var payload = Object.assign(
      { page: window.location.pathname },
      getFirstTouch(),
      extra || {}
    );
    gtag('event', eventName, payload);
  }

  // ── CTA location — walk up DOM, check data-cta-location or section index ──
  function getLocation(el) {
    var node = el;
    while (node && node !== document.body) {
      if (node.dataset && node.dataset.ctaLocation) return node.dataset.ctaLocation;
      node = node.parentElement;
    }
    if (el.closest('nav'))    return 'nav';
    if (el.closest('footer')) return 'footer';
    var secs = Array.from(document.querySelectorAll('section'));
    for (var i = 0; i < secs.length; i++) {
      if (secs[i].contains(el)) {
        // Section 0 is almost always the hero on every page
        return i === 0 ? 'hero' : 'section-' + i;
      }
    }
    return 'page';
  }

  // ── Phone clicks ──────────────────────────────────────────────────────────
  document.addEventListener('click', function (e) {
    var t = e.target.closest('a[href^="tel:"]');
    if (!t) return;
    fire('phone_click', {
      event_category: 'contact',
      cta_location: t.dataset.ctaLocation || getLocation(t)
    });
  });

  // ── Email clicks (mailto: links) ──────────────────────────────────────────
  // Sends where the link sits on the page, never the address itself:
  // Google Analytics policy forbids sending email addresses in event data.
  document.addEventListener('click', function (e) {
    var t = e.target.closest('a[href^="mailto:"]');
    if (!t) return;
    fire('email_click', {
      event_category: 'contact',
      cta_location: t.dataset.ctaLocation || getLocation(t)
    });
  });

  // ── Calendly popup button clicks ──────────────────────────────────────────
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[onclick*="Calendly"]');
    if (!t) return;
    fire('cta_click', {
      cta_mode: 'calendly',
      cta_location: getLocation(t)
    });
  });

  // ── Audit form CTA clicks ─────────────────────────────────────────────────
  document.addEventListener('click', function (e) {
    var t = e.target.closest('a[href*="get-your-free-audit"], a[href="/contact"]');
    if (!t) return;
    fire('cta_click', {
      cta_mode: 'form',
      cta_location: getLocation(t)
    });
  });

  // ── Social profile clicks (footer LinkedIn / Facebook / Instagram icons) ──
  // Sends the network and the clean profile URL so GA4 reports stay readable.
  document.addEventListener('click', function (e) {
    var t = e.target.closest('a[data-social]');
    if (!t) return;
    fire('social_click', {
      event_category: 'social',
      social_network: t.dataset.social,
      cta_location: t.dataset.ctaLocation || getLocation(t),
      link_url: t.href,
      link_domain: t.hostname,
      outbound: true
    });
  });

  // ── Calendly booking funnel events ────────────────────────────────────────
  window.addEventListener('message', function (e) {
    if (!e.data || !e.data.event) return;
    if (e.data.event.indexOf('calendly') !== 0) return;
    var ev = e.data.event;
    var ft = getFirstTouch();
    if (ev === 'calendly.event_type_viewed')
      fire('calendly_opened', { event_category: 'engagement' });
    if (ev === 'calendly.date_and_time_selected')
      fire('calendly_time_selected', { event_category: 'engagement' });
    if (ev === 'calendly.event_scheduled')
      fire('calendly_booked', {
        event_category: 'conversion',
        event_label: 'call_scheduled',
        // Surface first-touch explicitly on the key conversion event
        first_touch_source:   ft.source,
        first_touch_medium:   ft.medium,
        first_touch_campaign: ft.campaign,
        first_touch_landing:  ft.landing
      });
  });

})();
