(function (root) {
  "use strict";

  const measurementId = root.__NORWYN_RUNTIME_CONFIG__?.ga4MeasurementId || "";
  const consentKey = "norwyn_meta_consent_v1";
  const state = { configured: /^G-[A-Z0-9]+$/i.test(measurementId), initialized: false, pageViewSent: false };

  function sendPageView() {
    if (!state.initialized || state.pageViewSent || typeof root.gtag !== "function") return;
    state.pageViewSent = true;
    root.gtag("event", "page_view", {
      landing_key: "imersao-zumbido",
      landing_version: "variant_v1",
      page_location: root.location.href,
      page_title: root.document.title,
    });
  }

  function hasConsent() {
    try {
      return root.localStorage.getItem(consentKey) === "granted";
    } catch {
      return false;
    }
  }

  function initialize() {
    if (!state.configured || state.initialized || !hasConsent()) return false;
    state.initialized = true;
    root.dataLayer = root.dataLayer || [];
    root.gtag = root.gtag || function () { root.dataLayer.push(arguments); };
    root.gtag("js", new Date());
    root.gtag("config", measurementId, { send_page_view: false });
    sendPageView();
    const script = root.document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    script.dataset.norwynGa4 = measurementId;
    script.onerror = function () { state.initialized = false; };
    root.document.head.appendChild(script);
    return true;
  }

  const eventMap = {
    page_view: "page_view",
    lp_section_view: "lp_section_view",
    lp_cta_click: "lp_cta_click",
    offer_view: "view_offer",
    checkout_click: "begin_checkout",
  };

  root.addEventListener("norwyn:measurement-consent", (event) => {
    if (event?.detail?.value === "granted") initialize();
  });

  root.addEventListener("norwyn:event", (event) => {
    const payload = event?.detail;
    const gaEvent = eventMap[payload?.event];
    if (!gaEvent || (!state.initialized && !initialize()) || typeof root.gtag !== "function") return;
    if (gaEvent === "page_view" && state.pageViewSent) return;
    if (gaEvent === "page_view") state.pageViewSent = true;
    root.gtag("event", gaEvent, {
      landing_key: payload.landing_key,
      landing_version: payload.landing_version,
      section_id: payload.event_data?.section_id,
      cta_id: payload.event_data?.cta_id,
      entry_source: payload.entry_source,
      traffic_type: payload.traffic_type,
    });
  });

  initialize();
  root.NorwynGa4 = { measurementId, state, initialize };
})(typeof window !== "undefined" ? window : globalThis);
