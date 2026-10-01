(function () {
  "use strict";

  const tracking = window.norwyn;
  tracking.initialize();
  const attributionBridge = window.NorwynHotmartBridge;
  if (attributionBridge) void attributionBridge.initialize();

  document.querySelectorAll("[data-module-id]").forEach((item, index) => {
    const button = item.querySelector("button");
    const content = item.querySelector(".module-content");
    button.addEventListener("click", () => {
      const wasOpen = item.classList.contains("is-open");
      document.querySelectorAll("[data-module-id]").forEach((other) => {
        other.classList.remove("is-open");
        other.querySelector("button").setAttribute("aria-expanded", "false");
        const otherContent = other.querySelector(".module-content");
        if (otherContent) otherContent.hidden = true;
        other.querySelector("button b").textContent = "+";
      });
      if (!wasOpen) {
        item.classList.add("is-open");
        button.setAttribute("aria-expanded", "true");
        if (content) content.hidden = false;
        button.querySelector("b").textContent = "−";
        tracking.track("module_open", {
          module_id: item.dataset.moduleId,
          module_name: item.dataset.moduleName,
        });
      }
    });
    if (index > 0 && content) content.hidden = true;
  });

  document.querySelectorAll("[data-faq-id]").forEach((item, index) => {
    const button = item.querySelector("button");
    const answer = item.querySelector("p");
    button.addEventListener("click", () => {
      const wasOpen = item.classList.contains("is-open");
      document.querySelectorAll("[data-faq-id]").forEach((other) => {
        other.classList.remove("is-open");
        other.querySelector("button").setAttribute("aria-expanded", "false");
        const otherAnswer = other.querySelector("p");
        if (otherAnswer) otherAnswer.hidden = true;
        other.querySelector("button b").textContent = "+";
      });
      if (!wasOpen) {
        item.classList.add("is-open");
        button.setAttribute("aria-expanded", "true");
        if (answer) answer.hidden = false;
        button.querySelector("b").textContent = "−";
        tracking.track("faq_open", { faq_id: item.dataset.faqId, question: item.dataset.question });
      }
    });
    if (index > 0 && answer) answer.hidden = true;
  });

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting || entry.intersectionRatio < 0.35) return;
      const sectionId = entry.target.dataset.norwynSection;
      tracking.track("section_view", { section_id: sectionId }, { once: true, identity: sectionId });
      if (sectionId === "modules") tracking.track("modules_view", {}, { once: true });
      if (sectionId === "offer") tracking.track("offer_view", {}, { once: true });
      sectionObserver.unobserve(entry.target);
    });
  }, { threshold: [0.2, 0.35] });
  document.querySelectorAll("[data-norwyn-section]").forEach((node) => sectionObserver.observe(node));

  const ctaObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const cta = entry.target;
      tracking.track("cta_view", {
        cta_id: cta.dataset.ctaId,
        cta_text: cta.textContent.trim(),
        section_id: cta.dataset.sectionId,
        destination: cta.getAttribute("href"),
        destination_type: cta.dataset.destinationType,
      }, { once: true, identity: cta.dataset.ctaId });
      ctaObserver.unobserve(cta);
    });
  }, { threshold: 0.45 });

  document.querySelectorAll("[data-cta-id]").forEach((cta) => {
    ctaObserver.observe(cta);
    cta.addEventListener("click", async (event) => {
      const isCheckout = cta.dataset.destinationType === "checkout";
      if (!isCheckout) {
        tracking.track("cta_click", {
          cta_id: cta.dataset.ctaId,
          cta_text: cta.textContent.trim(),
          section_id: cta.dataset.sectionId,
          destination: cta.getAttribute("href"),
          destination_type: cta.dataset.destinationType,
        });
        return;
      }

      event.preventDefault();
      let destination = tracking.trackedCheckoutUrl();
      let bridgeReason = "bridge_unavailable";
      try {
        const context = tracking.context();
        const result = attributionBridge
          ? await attributionBridge.prepare({
              sessionId: context.session.id,
              visitorId: context.visitorId,
              firstTouch: context.firstTouch,
              currentTouch: context.currentTouch,
            })
          : null;
        if (result?.url && attributionBridge.isValid(result.url)) destination = result.url;
        if (result?.sck) tracking.applyBridgeAttribution(result.sck);
        bridgeReason = result?.reason || (result?.bridged ? "bridged" : "feature_disabled");
      } catch {
        destination = tracking.trackedCheckoutUrl();
      }

      const ctaEvent = tracking.track("cta_click", {
        cta_id: cta.dataset.ctaId,
        cta_text: cta.textContent.trim(),
        section_id: cta.dataset.sectionId,
        destination,
        destination_type: cta.dataset.destinationType,
        attribution_bridge: bridgeReason,
      });
      const checkoutEvent = tracking.track("checkout_click", {
        cta_id: cta.dataset.ctaId,
        checkout_url: destination,
        hotmart_product_id: "B47092539B",
        hotmart_offer_id: "lov69pen",
        attribution_bridge: bridgeReason,
      });
      cta.href = destination;
      Promise.race([
        Promise.allSettled([ctaEvent, checkoutEvent]),
        new Promise((resolve) => setTimeout(resolve, 450)),
      ]).finally(() => location.assign(destination));
    });
  });

  const thresholds = [25, 50, 75, 90];
  function onScroll() {
    const available = document.documentElement.scrollHeight - innerHeight;
    if (available <= 0) return;
    const percent = Math.round((scrollY / available) * 100);
    thresholds.forEach((threshold) => {
      if (percent >= threshold) tracking.track(`scroll_${threshold}`, { percent: threshold }, { once: true });
    });
  }
  addEventListener("scroll", onScroll, { passive: true });
})();
