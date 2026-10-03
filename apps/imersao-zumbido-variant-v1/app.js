(function () {
  "use strict";

  const tracking = window.norwyn;
  const bridge = window.NorwynHotmartBridge;
  if (!tracking) return;

  tracking.initialize();
  if (bridge) void bridge.initialize();

  const sections = [...document.querySelectorAll("[data-norwyn-section]")];
  const sectionTimers = new Map();

  function sectionCoverage(entry) {
    const referenceHeight = Math.min(entry.boundingClientRect.height, window.innerHeight || entry.rootBounds?.height || 0);
    return referenceHeight > 0 ? entry.intersectionRect.height / referenceHeight : 0;
  }

  function cancelSectionTimer(node) {
    const timer = sectionTimers.get(node);
    if (timer) clearTimeout(timer);
    sectionTimers.delete(node);
  }

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting || sectionCoverage(entry) < 0.5) {
        cancelSectionTimer(entry.target);
        return;
      }
      if (sectionTimers.has(entry.target)) return;
      const timer = setTimeout(() => {
        const sectionId = entry.target.dataset.norwynSection;
        const sectionPosition = sections.indexOf(entry.target) + 1;
        tracking.track("lp_section_view", {
          section_id: sectionId,
          section_position: sectionPosition,
          visibility_rule: "50_percent_for_1_second",
        }, { once: true, identity: sectionId });
        if (sectionId === "modules") tracking.track("modules_view", {}, { once: true });
        if (sectionId === "offer") tracking.track("offer_view", {}, { once: true });
        sectionObserver.unobserve(entry.target);
        sectionTimers.delete(entry.target);
      }, 1000);
      sectionTimers.set(entry.target, timer);
    });
  }, { threshold: [0, 0.25, 0.5, 0.75, 1] });

  sections.forEach((section) => sectionObserver.observe(section));

  const ctaObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting || entry.intersectionRatio < 0.45) return;
      const cta = entry.target;
      tracking.track("cta_view", {
        cta_id: cta.dataset.ctaId,
        section_id: cta.dataset.sectionId,
        destination_type: cta.dataset.destinationType,
      }, { once: true, identity: cta.dataset.ctaId });
      ctaObserver.unobserve(cta);
    });
  }, { threshold: [0.45] });

  document.querySelectorAll("[data-cta-id]").forEach((cta) => {
    ctaObserver.observe(cta);
    cta.addEventListener("click", async (event) => {
      const eventData = {
        cta_id: cta.dataset.ctaId,
        section_id: cta.dataset.sectionId,
        destination_type: cta.dataset.destinationType,
      };
      if (cta.dataset.destinationType !== "checkout") {
        void tracking.track("lp_cta_click", eventData);
        return;
      }

      event.preventDefault();
      if (cta.dataset.sending === "true") return;
      cta.dataset.sending = "true";
      let destination = tracking.trackedCheckoutUrl();
      let bridgeReason = "bridge_unavailable";
      try {
        const context = tracking.context();
        const result = bridge ? await bridge.prepare({
          sessionId: context.session.id,
          visitorId: context.visitorId,
          firstTouch: context.firstTouch,
          currentTouch: context.currentTouch,
        }) : null;
        if (result?.url && bridge.isValid(result.url)) destination = result.url;
        if (result?.sck) tracking.applyBridgeAttribution(result.sck);
        bridgeReason = result?.reason || (result?.bridged ? "bridged" : "feature_disabled");
      } catch {
        destination = tracking.trackedCheckoutUrl();
      }

      const ctaEvent = tracking.track("lp_cta_click", { ...eventData, destination, attribution_bridge: bridgeReason });
      const checkoutEvent = tracking.track("checkout_click", {
        cta_id: cta.dataset.ctaId,
        section_id: cta.dataset.sectionId,
        checkout_url: destination,
        hotmart_product_id: "B47092539B",
        hotmart_offer_id: "lov69pen",
        attribution_bridge: bridgeReason,
      });
      cta.href = destination;
      Promise.race([
        Promise.allSettled([ctaEvent, checkoutEvent]),
        new Promise((resolve) => setTimeout(resolve, 450)),
      ]).finally(() => window.location.assign(destination));
    });
  });

  document.querySelectorAll("details[data-faq-id]").forEach((item) => {
    item.addEventListener("toggle", () => {
      if (item.open) void tracking.track("faq_open", { faq_id: item.dataset.faqId });
    });
  });

  const thresholds = [25, 50, 75, 90];
  function onScroll() {
    const available = document.documentElement.scrollHeight - innerHeight;
    if (available <= 0) return;
    const percent = Math.round((scrollY / available) * 100);
    thresholds.forEach((threshold) => {
      if (percent >= threshold) void tracking.track(`scroll_${threshold}`, { percent: threshold }, { once: true });
    });
  }
  addEventListener("scroll", onScroll, { passive: true });
})();
