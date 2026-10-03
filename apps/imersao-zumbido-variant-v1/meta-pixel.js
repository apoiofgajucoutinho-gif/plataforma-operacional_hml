(function (root) {
  "use strict";

  const PIXEL_ID = "1421640192678969";
  const CONSENT_KEY = "norwyn_meta_consent_v1";
  const state = {
    enabled: false,
    initialized: false,
    pageViewSent: false,
    viewContentSent: false,
    offerViewPending: false,
    offerViewSent: false,
    initiateCheckoutSent: false,
  };

  function readConsent() {
    try {
      const value = root.localStorage.getItem(CONSENT_KEY);
      return value === "granted" || value === "denied" ? value : null;
    } catch {
      return null;
    }
  }

  function writeConsent(value) {
    try {
      root.localStorage.setItem(CONSENT_KEY, value);
    } catch {
      // Consent still applies for the current page when storage is unavailable.
    }
  }

  function removeConsentNotice() {
    root.document.getElementById("meta-consent")?.remove();
  }

  function installPixel() {
    if (!state.enabled || state.initialized || root.__norwynMetaPixelInitialized) return;
    state.initialized = true;
    root.__norwynMetaPixelInitialized = true;

    if (!root.fbq) {
      const fbq = function () {
        if (fbq.callMethod) fbq.callMethod.apply(fbq, arguments);
        else fbq.queue.push(arguments);
      };
      root.fbq = fbq;
      if (!root._fbq) root._fbq = fbq;
      fbq.push = fbq;
      fbq.loaded = true;
      fbq.version = "2.0";
      fbq.queue = [];

      const script = root.document.createElement("script");
      script.async = true;
      script.src = "https://connect.facebook.net/en_US/fbevents.js";
      script.dataset.norwynMetaPixel = PIXEL_ID;
      root.document.head.appendChild(script);
    }

    root.fbq("init", PIXEL_ID);
    sendPageSignals();
    if (state.offerViewPending) sendOfferView();
  }

  function sendPageSignals() {
    if (!state.initialized || typeof root.fbq !== "function") return;
    if (!state.pageViewSent) {
      state.pageViewSent = true;
      root.fbq("track", "PageView");
    }
    if (!state.viewContentSent) {
      state.viewContentSent = true;
      root.fbq("track", "ViewContent", {
        content_ids: ["imersao-zumbido"],
        content_name: "Imersão Zumbido",
        content_type: "product",
      });
    }
  }

  function sendOfferView() {
    if (state.offerViewSent) return;
    if (!state.initialized || typeof root.fbq !== "function") {
      state.offerViewPending = true;
      return;
    }
    state.offerViewPending = false;
    state.offerViewSent = true;
    root.fbq("trackCustom", "ViewOffer", {
      content_ids: ["imersao-zumbido"],
      content_name: "Imersão Zumbido",
      content_type: "product",
      currency: "BRL",
      value: 397,
    });
  }

  function sendInitiateCheckout() {
    if (!state.initialized || state.initiateCheckoutSent || typeof root.fbq !== "function") return;
    state.initiateCheckoutSent = true;
    root.fbq("track", "InitiateCheckout", {
      content_ids: ["B47092539B"],
      content_name: "Imersão Zumbido",
      content_type: "product",
      currency: "BRL",
      num_items: 1,
      value: 397,
    });
  }

  function grantConsent() {
    writeConsent("granted");
    removeConsentNotice();
    installPixel();
    root.dispatchEvent(new CustomEvent("norwyn:measurement-consent", { detail: { value: "granted" } }));
  }

  function denyConsent() {
    writeConsent("denied");
    removeConsentNotice();
    root.dispatchEvent(new CustomEvent("norwyn:measurement-consent", { detail: { value: "denied" } }));
  }

  function showConsentNotice() {
    if (root.document.getElementById("meta-consent")) return;
    const notice = root.document.createElement("aside");
    notice.id = "meta-consent";
    notice.className = "meta-consent";
    notice.setAttribute("role", "dialog");
    notice.setAttribute("aria-label", "Preferências de privacidade");
    notice.innerHTML = [
      '<div class="meta-consent-copy">',
      "<strong>Privacidade e medição</strong>",
      "<p>Podemos usar o Pixel da Meta para medir visitas e cliques no checkout. O tracking operacional da Norwyn continua separado.</p>",
      "</div>",
      '<div class="meta-consent-actions">',
      '<button type="button" data-meta-consent="denied">Agora não</button>',
      '<button type="button" class="is-primary" data-meta-consent="granted">Permitir medição</button>',
      "</div>",
    ].join("");
    notice.querySelector('[data-meta-consent="granted"]').addEventListener("click", grantConsent);
    notice.querySelector('[data-meta-consent="denied"]').addEventListener("click", denyConsent);
    root.document.body.appendChild(notice);
  }

  function initialize() {
    state.enabled = true;
    const consent = readConsent();
    if (consent === "granted") installPixel();
    else if (consent !== "denied") showConsentNotice();
    return state;
  }

  root.addEventListener("norwyn:event", (event) => {
    const eventName = event?.detail?.event;
    if (eventName === "offer_view") sendOfferView();
    if (eventName === "checkout_click") sendInitiateCheckout();
  });

  root.document.addEventListener("click", (event) => {
    const checkout = event.target.closest?.('[data-destination-type="checkout"]');
    if (checkout) sendInitiateCheckout();
  }, true);

  root.NorwynMetaPixel = {
    PIXEL_ID,
    CONSENT_KEY,
    state,
    initialize,
    grantConsent,
    denyConsent,
    resetConsent() {
      try {
        root.localStorage.removeItem(CONSENT_KEY);
      } catch {
        // No persistent storage to reset.
      }
      root.location.reload();
    },
  };

  initialize();
})(typeof window !== "undefined" ? window : globalThis);
