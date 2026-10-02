(function () {
  "use strict";

  const SESSION_TTL_MS = 30 * 60 * 1000;
  const ATTRIBUTION_KEYS = [
    "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
    "campaign_id", "adset_id", "ad_id", "fbclid", "sck", "src",
  ];
  const TRAFFIC_TYPES = new Set(["public", "internal", "test"]);
  const STORAGE = {
    visitor: "norwyn_visitor_id_v1",
    session: "norwyn_session_v1",
    firstTouch: "norwyn_first_touch_v1",
    once: "norwyn_tracking_once_v1",
  };
  const memoryStorage = {};
  const config = {
    endpoint: "https://plataf-op-hml.vercel.app/api/norwyn/lp-events",
    pageId: "imersao_zumbido",
    productId: "dfc00511-b160-42b0-878f-6e5b933b636b",
    product: "Imersão Zumbido",
    template: "premium_formation",
    pageVersion: "v1.0-hml-tracking",
    contentVersion: "2026-09-27-r397",
    environment: "hml",
    checkoutUrl: "https://pay.hotmart.com/B47092539B?off=lov69pen",
  };

  function uuid() {
    try {
      return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `nw_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    } catch {
      return `nw_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    }
  }

  function read(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) || memoryStorage[key] || fallback;
    } catch {
      return memoryStorage[key] || fallback;
    }
  }

  function write(key, value) {
    memoryStorage[key] = value;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Tracking remains best-effort when storage is unavailable.
    }
  }

  function visitorId() {
    let value = read(STORAGE.visitor, null);
    if (typeof value !== "string" || !value) {
      value = uuid();
      write(STORAGE.visitor, value);
    }
    return value;
  }

  function touchFromLocation() {
    const params = new URLSearchParams(location.search);
    const touch = {};
    ATTRIBUTION_KEYS.forEach((key) => {
      touch[key] = params.get(key) || null;
    });
    touch.referrer = document.referrer || null;
    touch.landing_url = location.href;
    touch.captured_at = new Date().toISOString();
    return touch;
  }

  function trafficTypeFromLocation() {
    const value = new URLSearchParams(location.search).get("traffic_type");
    return value && TRAFFIC_TYPES.has(value.toLowerCase()) ? value.toLowerCase() : "public";
  }

  function hasCampaign(touch) {
    return ATTRIBUTION_KEYS.some((key) => Boolean(touch[key]));
  }

  function currentContext() {
    const now = Date.now();
    const incoming = touchFromLocation();
    let firstTouch = read(STORAGE.firstTouch, null);
    if (!firstTouch) {
      firstTouch = incoming;
      write(STORAGE.firstTouch, firstTouch);
    }

    let session = read(STORAGE.session, null);
    const expired = !session || !session.id || now - Number(session.last_activity_at || 0) >= SESSION_TTL_MS;
    if (expired) {
      session = {
        id: uuid(),
        started_at: new Date(now).toISOString(),
        last_activity_at: now,
        current_touch: incoming,
      };
    } else {
      session.last_activity_at = now;
      if (hasCampaign(incoming)) session.current_touch = incoming;
    }
    write(STORAGE.session, session);
    return { visitorId: visitorId(), session, firstTouch, currentTouch: session.current_touch || incoming, isNewSession: expired };
  }

  function onceKey(context, eventName, identity) {
    return `${context.session.id}:${config.pageId}:${eventName}:${identity || "default"}`;
  }

  function claimOnce(context, eventName, identity) {
    const key = onceKey(context, eventName, identity);
    const state = read(STORAGE.once, {});
    if (state[key]) return false;
    const next = Object.fromEntries(Object.entries(state).slice(-250));
    next[key] = Date.now();
    write(STORAGE.once, next);
    return true;
  }

  function post(payload) {
    window.dispatchEvent(new CustomEvent("norwyn:event", { detail: payload }));
    return fetch(config.endpoint, {
      method: "POST",
      // text/plain keeps the cross-origin request simple, so checkout navigation
      // does not race a CORS preflight. The backend still parses the JSON body.
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => null);
  }

  function track(event, eventData, options) {
    const context = currentContext();
    const identity = options && options.identity;
    if (options && options.once && !claimOnce(context, event, identity)) return Promise.resolve(null);
    const payload = {
      event,
      occurred_at: new Date().toISOString(),
      visitor_id: context.visitorId,
      session_id: context.session.id,
      page_id: config.pageId,
      product_id: config.productId,
      product: config.product,
      template: config.template,
      page_version: config.pageVersion,
      content_version: config.contentVersion,
      environment: config.environment,
      traffic_type: trafficTypeFromLocation(),
      url: location.href,
      referrer: document.referrer || null,
      landing_url: context.currentTouch.landing_url,
      attribution: Object.fromEntries(ATTRIBUTION_KEYS.map((key) => [key, context.currentTouch[key] || null])),
      first_touch: context.firstTouch,
      current_touch: context.currentTouch,
      event_data: eventData || {},
    };
    return post(payload);
  }

  function trackedCheckoutUrl() {
    const context = currentContext();
    const url = new URL(config.checkoutUrl);
    ATTRIBUTION_KEYS.forEach((key) => {
      const value = context.currentTouch[key];
      if (value && !url.searchParams.has(key)) url.searchParams.set(key, value);
    });
    return url.toString();
  }

  function applyBridgeAttribution(sck) {
    if (typeof sck !== "string" || !/^nw_[A-Za-z0-9_-]{12,64}$/.test(sck)) return false;
    const context = currentContext();
    context.session.current_touch = { ...(context.session.current_touch || {}), sck };
    write(STORAGE.session, context.session);
    return true;
  }

  function initialize() {
    const context = currentContext();
    if (context.isNewSession) track("session_start", {}, { once: true });
    if (!window.__norwynPageViewSent) {
      window.__norwynPageViewSent = true;
      track("page_view", {}, { once: false });
    }
  }

  window.norwyn = { track, trackedCheckoutUrl, applyBridgeAttribution, initialize, context: currentContext, config };
})();
