(function (root) {
  "use strict";

  const CHECKOUT = "https://pay.hotmart.com/B47092539B?off=lov69pen";
  const ENDPOINT = "https://plataf-op-hml.vercel.app/api/norwyn/attribution-bridge";
  const ATTRIBUTION_KEYS = [
    "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
    "campaign_id", "adset_id", "ad_id", "fbclid", "sck", "src",
  ];
  const state = { enabled: false, mode: "disabled", ready: false };

  function canonicalUrl(currentTouch) {
    try {
      const url = new URL(CHECKOUT);
      ATTRIBUTION_KEYS.forEach((key) => {
        const value = currentTouch && currentTouch[key];
        if (value && !url.searchParams.has(key)) url.searchParams.set(key, String(value));
      });
      return url.toString();
    } catch {
      return CHECKOUT;
    }
  }

  function isValid(value) {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && url.hostname === "pay.hotmart.com" && url.pathname === "/B47092539B" && url.searchParams.get("off") === "lov69pen";
    } catch {
      return false;
    }
  }

  function testMode() {
    try {
      const params = new URLSearchParams(root.location.search);
      return params.get("traffic_type") === "test" && params.get("bridge_test") === "1";
    } catch {
      return false;
    }
  }

  async function initialize(fetchImpl) {
    const fetcher = fetchImpl || root.fetch;
    if (typeof fetcher !== "function") return state;
    const smoke = testMode();
    try {
      const response = await fetcher(`${ENDPOINT}${smoke ? "?traffic_type=test&smoke=1" : ""}`, { method: "GET", mode: "cors", cache: "no-store" });
      const payload = response.ok ? await response.json() : null;
      state.enabled = payload?.enabled === true;
      state.mode = payload?.mode || "disabled";
    } catch {
      state.enabled = false;
      state.mode = "unavailable";
    } finally {
      state.ready = true;
    }
    return state;
  }

  async function prepare(input, options) {
    const fallback = canonicalUrl(input?.currentTouch);
    if (!state.enabled) return { url: fallback, bridged: false, reason: state.ready ? "feature_disabled" : "feature_not_ready" };
    if (!input?.sessionId || !input?.visitorId) return { url: CHECKOUT, bridged: false, reason: "anonymous_identity_unavailable" };

    const fetcher = options?.fetchImpl || root.fetch;
    if (typeof fetcher !== "function") return { url: fallback, bridged: false, reason: "fetch_unavailable" };
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeout = setTimeout(() => controller?.abort(), options?.timeoutMs || 1200);
    try {
      const response = await fetcher(ENDPOINT, {
        method: "POST",
        mode: "cors",
        cache: "no-store",
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: JSON.stringify({
          session_id: input.sessionId,
          visitor_id: input.visitorId,
          landing_url: root.location.href,
          checkout_url: fallback,
          first_touch: input.firstTouch || {},
          current_touch: input.currentTouch || {},
          traffic_type: testMode() ? "test" : "public",
          smoke: testMode(),
        }),
        signal: controller?.signal,
      });
      const payload = response.ok ? await response.json() : null;
      if (!payload || !isValid(payload.checkout_url)) return { url: fallback, bridged: false, reason: payload?.reason || "invalid_bridge_response" };
      return { url: payload.checkout_url, sck: payload.sck || null, bridged: payload.bridged === true, reason: payload.reason || null };
    } catch {
      return { url: fallback, bridged: false, reason: "bridge_unavailable" };
    } finally {
      clearTimeout(timeout);
    }
  }

  root.NorwynHotmartBridge = { CHECKOUT, ENDPOINT, state, canonicalUrl, isValid, initialize, prepare };
})(typeof window !== "undefined" ? window : globalThis);
