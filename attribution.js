/**
 * Smart LGSTX: CTA Attribution Script
 * First-touch UTM capture + CTA click tracking → GA4 and the Meta Pixel
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

  // ── Meta Pixel mirror ─────────────────────────────────────────────────────
  // Every event fired below also goes to the Meta Pixel, so Ads Manager can
  // tie ads to contacts and bookings. Meta's standard events where one fits
  // (Contact, Schedule), custom events for the rest. Only the action and where
  // it happened go to Meta: never names, emails, phone numbers or form text.
  var META_EVENTS = {
    phone_click:            ['track', 'Contact'],
    email_click:            ['track', 'Contact'],
    calendly_booked:        ['track', 'Schedule'],
    cta_click:              ['trackCustom', 'CTAClick'],
    social_click:           ['trackCustom', 'SocialClick'],
    calendly_opened:        ['trackCustom', 'CalendlyOpened'],
    calendly_time_selected: ['trackCustom', 'CalendlyTimeSelected']
  };
  var META_PARAMS = ['cta_location', 'cta_mode', 'social_network'];

  function fireMeta(eventName, extra) {
    var m = META_EVENTS[eventName];
    if (!m || typeof fbq !== 'function') return;
    var params = {};
    META_PARAMS.forEach(function (k) { if (extra && extra[k]) params[k] = extra[k]; });
    if (eventName === 'phone_click') params.contact_method = 'phone';
    if (eventName === 'email_click') params.contact_method = 'email';
    fbq(m[0], m[1], params);
  }

  function fire(eventName, extra) {
    // A Meta failure must never cost the GA4 event
    try { fireMeta(eventName, extra); } catch (e) {}
    if (typeof gtag !== 'function') return;
    var payload = Object.assign(
      { page: window.location.pathname },
      getFirstTouch(),
      extra || {}
    );
    gtag('event', eventName, payload);
  }

  // ── CTA location: walk up DOM, check data-cta-location or section index ──
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
  // Calendly posts these from https://calendly.com (the check in Calendly's own
  // embed docs), and posts event_type_viewed twice, milliseconds apart, for one
  // popup open (seen on the live site Oct 16, 2026). Ignoring other origins stops
  // another page faking a booking; ignoring repeats within 2 seconds stops one
  // open or booking counting twice.
  var calendlyLast = {};
  window.addEventListener('message', function (e) {
    if (e.origin !== 'https://calendly.com') return;
    if (!e.data || !e.data.event) return;
    if (e.data.event.indexOf('calendly') !== 0) return;
    var ev = e.data.event;
    var now = Date.now();
    if (calendlyLast[ev] && now - calendlyLast[ev] < 2000) return;
    calendlyLast[ev] = now;
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

  // ── Form starts (Meta only) ───────────────────────────────────────────────
  // GA4 already records form_start through Enhanced Measurement. Meta gets one
  // FormStart per form per page view, so starts can be compared with leads.
  var startedForms = {};
  document.addEventListener('focusin', function (e) {
    var f = e.target && e.target.closest && e.target.closest('form[action*="formspree.io"]');
    if (!f || typeof fbq !== 'function') return;
    var id = f.id || 'unnamed_form';
    if (startedForms[id]) return;
    startedForms[id] = true;
    fbq('trackCustom', 'FormStart', { form_id: id });
  });

  // ── Your Privacy Choices ──────────────────────────────────────────────────
  // Each page's head skips the Meta Pixel when the visitor turned sharing off at
  // /privacy-choices or the browser sends Global Privacy Control (GPC). GA4 gets
  // one meta_pixel_off per session, so reports can show how much traffic Meta
  // can't see. With GPC on, the footer also says the signal was honored, as
  // California's rules ask (11 CCR 7025).
  var gpcOn = navigator.globalPrivacyControl === true;
  var noShare = gpcOn || /(?:^|;\s*)sl_privacy=no_share(?:;|$)/.test(document.cookie);
  if (noShare) {
    try {
      if (!sessionStorage.getItem('sl_mpo')) {
        sessionStorage.setItem('sl_mpo', '1');
        fire('meta_pixel_off', { reason: gpcOn ? 'gpc' : 'choice' });
      }
    } catch (e) {}
  }
  if (gpcOn) {
    var addGpcNote = function () {
      Array.prototype.forEach.call(document.querySelectorAll('footer a[href="/privacy-choices"]'), function (a) {
        if (a.parentNode.querySelector('.sl-gpc-note')) return;
        // The separator stays outside the no-wrap span so phones can break the line there
        var note = document.createElement('span');
        note.className = 'sl-gpc-note';
        note.style.whiteSpace = 'nowrap';
        note.textContent = 'Opt-Out Preference Signal Honored';
        a.parentNode.insertBefore(note, a.nextSibling);
        a.parentNode.insertBefore(document.createTextNode('  ·  '), note);
      });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addGpcNote);
    else addGpcNote();
  }
  // The Back button can restore a page with its old scripts still running. If the
  // visitor turned sharing off in the meantime, reload so the pixel check runs again.
  window.addEventListener('pageshow', function (e) {
    if (e.persisted && typeof fbq === 'function' &&
        /(?:^|;\s*)sl_privacy=no_share(?:;|$)/.test(document.cookie)) location.reload();
  });

})();
