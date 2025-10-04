"use strict";
(() => {
  // bin/live-reload.js
  new EventSource(`${"http://localhost:3000"}/esbuild`).addEventListener("change", () => location.reload());

  // src/components/promoModal.ts
  var DEFAULT_OPTIONS = {
    triggerMode: "both",
    timeDelayMs: 3e3,
    sessionKey: "fntPromoModalShown",
    respectExistingSession: true
  };
  var isBrowser = typeof window !== "undefined" && typeof document !== "undefined";
  var PromoModal = class {
    constructor(options) {
      this.isInitialized = false;
      this.isOpen = false;
      this.timerId = null;
      this.exitIntentActive = false;
      this.closeControlsBound = false;
      this.previousFocus = null;
      this.gsap = null;
      this.openTimeline = null;
      this.closeTimeline = null;
      this.handleCloseControl = (event) => {
        event.preventDefault();
        this.close();
      };
      this.handleOutsidePointer = (event) => {
        if (!this.isOpen || !this.modalRoot || !this.modalContent)
          return;
        const target = event.target;
        if (!target)
          return;
        if (!this.modalRoot.contains(target))
          return;
        if (this.modalContent.contains(target))
          return;
        this.close();
      };
      this.handleKeydown = (event) => {
        if (!this.isOpen)
          return;
        if (event.key === "Escape") {
          event.preventDefault();
          this.close();
        }
      };
      this.handleExitIntent = (event) => {
        if (!this.shouldAutoOpen())
          return;
        if (event.relatedTarget)
          return;
        if (event.clientY > 0)
          return;
        this.triggerAutoOpen();
      };
      this.options = { ...DEFAULT_OPTIONS, ...options };
      if (!isBrowser) {
        this.modalRoot = null;
        this.modalContent = null;
        this.closeControls = [];
        return;
      }
      this.modalRoot = document.querySelector(".modal_promo");
      this.modalContent = this.modalRoot?.querySelector(".modal_promo-component") ?? null;
      this.closeControls = this.modalRoot ? Array.from(this.modalRoot.querySelectorAll('[data-action="modal-close"]')) : [];
      this.gsap = window.gsap ?? null;
      if (this.modalRoot && !this.modalRoot.hasAttribute("aria-hidden")) {
        this.modalRoot.setAttribute("aria-hidden", "true");
      }
    }
    init() {
      if (!this.modalRoot || this.isInitialized)
        return;
      this.isInitialized = true;
      this.attachCloseControlListeners();
      this.armTriggers();
    }
    open() {
      if (!this.modalRoot || this.isOpen)
        return;
      if (this.shouldRespectSession() && this.hasSessionFlag())
        return;
      this.clearAutoTriggers();
      this.isOpen = true;
      this.modalRoot.classList.add("is-open");
      this.modalRoot.setAttribute("aria-hidden", "false");
      this.toggleScrollLock(true);
      this.enableLiveListeners();
      this.trapFocus();
      this.setSessionFlag();
      this.animateOpen();
    }
    close() {
      if (!this.modalRoot || !this.isOpen)
        return;
      this.disableLiveListeners();
      this.isOpen = false;
      if (this.gsap && (this.modalContent || this.modalRoot)) {
        this.animateClose();
        return;
      }
      this.finalizeClose();
    }
    attachCloseControlListeners() {
      if (this.closeControlsBound)
        return;
      this.closeControls.forEach((control) => {
        control.addEventListener("click", this.handleCloseControl);
      });
      this.closeControlsBound = true;
    }
    armTriggers() {
      if (!this.modalRoot)
        return;
      this.clearAutoTriggers();
      if (this.options.triggerMode === "off")
        return;
      if (this.shouldRespectSession() && this.hasSessionFlag())
        return;
      if (this.options.triggerMode === "time" || this.options.triggerMode === "both") {
        this.timerId = window.setTimeout(
          () => {
            this.triggerAutoOpen();
          },
          Math.max(0, this.options.timeDelayMs)
        );
      }
      if (this.options.triggerMode === "exit" || this.options.triggerMode === "both") {
        this.attachExitIntent();
      }
    }
    triggerAutoOpen() {
      this.clearAutoTriggers();
      this.open();
    }
    enableLiveListeners() {
      if (!this.modalRoot)
        return;
      this.modalRoot.addEventListener("pointerdown", this.handleOutsidePointer);
      document.addEventListener("keydown", this.handleKeydown);
    }
    disableLiveListeners() {
      if (!this.modalRoot)
        return;
      this.modalRoot.removeEventListener("pointerdown", this.handleOutsidePointer);
      document.removeEventListener("keydown", this.handleKeydown);
    }
    trapFocus() {
      if (!this.modalRoot)
        return;
      this.previousFocus = document.activeElement ?? null;
    }
    releaseFocus() {
      if (this.previousFocus) {
        this.safeFocus(this.previousFocus);
      }
      this.previousFocus = null;
    }
    safeFocus(element) {
      if (!element)
        return;
      try {
        element.focus({ preventScroll: true });
      } catch (error) {
        element.focus();
      }
    }
    toggleScrollLock(locked) {
      const root = document.documentElement;
      const { body } = document;
      if (!root || !body)
        return;
      if (locked) {
        root.classList.add("modal-open");
        body.classList.add("modal-open");
      } else {
        root.classList.remove("modal-open");
        body.classList.remove("modal-open");
      }
    }
    finalizeClose() {
      if (!this.modalRoot)
        return;
      this.modalRoot.classList.remove("is-open");
      this.modalRoot.setAttribute("aria-hidden", "true");
      this.toggleScrollLock(false);
      this.releaseFocus();
    }
    clearAutoTriggers() {
      if (this.timerId !== null) {
        window.clearTimeout(this.timerId);
        this.timerId = null;
      }
      this.detachExitIntent();
    }
    attachExitIntent() {
      if (this.exitIntentActive)
        return;
      if (this.isTouchDevice())
        return;
      document.addEventListener("mouseout", this.handleExitIntent);
      this.exitIntentActive = true;
    }
    detachExitIntent() {
      if (!this.exitIntentActive)
        return;
      document.removeEventListener("mouseout", this.handleExitIntent);
      this.exitIntentActive = false;
    }
    shouldAutoOpen() {
      if (!this.modalRoot)
        return false;
      if (this.options.triggerMode === "off")
        return false;
      if (this.shouldRespectSession() && this.hasSessionFlag())
        return false;
      return true;
    }
    hasSessionFlag() {
      if (!isBrowser)
        return false;
      try {
        return window.sessionStorage.getItem(this.options.sessionKey) === "true";
      } catch (error) {
        return false;
      }
    }
    setSessionFlag() {
      if (!isBrowser)
        return;
      try {
        window.sessionStorage.setItem(this.options.sessionKey, "true");
      } catch (error) {
      }
    }
    shouldRespectSession() {
      return this.options.respectExistingSession !== false;
    }
    isTouchDevice() {
      if (!isBrowser)
        return false;
      const nav = window.navigator;
      return "ontouchstart" in window || nav && typeof nav.maxTouchPoints === "number" && nav.maxTouchPoints > 0;
    }
    animateOpen() {
      if (!this.gsap || !this.modalRoot)
        return;
      this.closeTimeline?.kill();
      this.closeTimeline = null;
      this.gsap.set(this.modalRoot, { autoAlpha: 0 });
      if (this.modalContent) {
        this.gsap.set(this.modalContent, { autoAlpha: 0, y: 32, scale: 0.95 });
      }
      this.openTimeline?.kill();
      const timeline = this.gsap.timeline({
        defaults: { ease: "power2.out" },
        onComplete: () => {
          this.openTimeline = null;
          this.gsap?.set(this.modalRoot, { clearProps: "opacity,visibility" });
          if (this.modalContent) {
            this.gsap?.set(this.modalContent, { clearProps: "transform,opacity" });
          }
        }
      });
      timeline.to(this.modalRoot, { autoAlpha: 1, duration: 0.25, ease: "power1.out" });
      if (this.modalContent) {
        timeline.to(
          this.modalContent,
          { autoAlpha: 1, y: 0, scale: 1, duration: 0.5, ease: "power3.out" },
          "-=0.1"
        );
      }
      this.openTimeline = timeline;
    }
    animateClose() {
      if (!this.gsap || !this.modalRoot) {
        this.finalizeClose();
        return;
      }
      this.openTimeline?.kill();
      this.openTimeline = null;
      this.closeTimeline?.kill();
      const contentTarget = this.modalContent ?? this.modalRoot;
      const timeline = this.gsap.timeline({
        defaults: { ease: "power2.in" },
        onComplete: () => {
          this.closeTimeline = null;
          this.gsap?.set(this.modalRoot, { clearProps: "opacity,visibility" });
          if (this.modalContent) {
            this.gsap?.set(this.modalContent, { clearProps: "transform,opacity" });
          }
          this.finalizeClose();
        }
      });
      if (this.modalContent) {
        timeline.to(contentTarget, {
          autoAlpha: 0,
          y: 24,
          scale: 0.95,
          duration: 0.3
        });
        timeline.to(
          this.modalRoot,
          { autoAlpha: 0, duration: 0.25, ease: "power1.in" },
          "-=0.15"
        );
      } else {
        timeline.to(this.modalRoot, { autoAlpha: 0, duration: 0.25 });
      }
      this.closeTimeline = timeline;
    }
  };

  // src/index.ts
  function initSplide(selector, options, useAutoScroll = false) {
    const splideElements = document.querySelectorAll(selector);
    if (!splideElements.length)
      return;
    splideElements.forEach((element, index) => {
      const uniqueId = `${selector.replace(".", "")}-${index}`;
      element.setAttribute("id", uniqueId);
      const splide = new Splide(element, {
        ...options
      });
      splide.on("mounted", () => {
        splide.Components.Elements.slides.forEach((slide, slideIndex) => {
          slide.addEventListener("click", () => {
            splide.go(slideIndex);
          });
        });
      });
      if (useAutoScroll && window.splide?.Extensions) {
        splide.mount(window.splide.Extensions);
      } else {
        splide.mount();
      }
    });
  }
  function animateCardWrappers() {
    const gsap = window.gsap;
    if (!gsap)
      return;
    const wrappers = document.querySelectorAll(".wrapper_cards");
    if (!wrappers.length)
      return;
    wrappers.forEach((wrapper, index) => {
      if (wrapper.dataset.gsapAnimated === "true")
        return;
      wrapper.dataset.gsapAnimated = "true";
      gsap.set(wrapper, { autoAlpha: 0, y: 24 });
      gsap.to(wrapper, {
        autoAlpha: 1,
        y: 0,
        duration: 0.6,
        ease: "power3.out",
        delay: 0.1 * index
      });
    });
  }
  document.addEventListener("DOMContentLoaded", () => {
    const modal = new PromoModal({
      triggerMode: "both",
      timeDelayMs: 3e3,
      sessionKey: "fntPromoModalShown",
      respectExistingSession: true
    });
    modal.init();
    window.fntPromo = modal;
    const splideConfigs = [
      {
        selector: ".slider1",
        options: {
          type: "loop",
          autoWidth: true,
          gap: "4rem",
          drag: "free",
          focus: "left",
          arrows: false,
          pagination: false,
          keyboard: false,
          autoScroll: {
            autoStart: true,
            speed: 0.5,
            pauseOnHover: false
          }
        },
        useAutoScroll: true
      },
      {
        selector: ".slider-fnt",
        options: {
          type: "loop",
          autoWidth: true,
          gap: "1rem",
          drag: "free",
          focus: "left",
          arrows: false,
          pagination: false,
          keyboard: false,
          autoScroll: {
            autoStart: true,
            speed: 0.75,
            pauseOnHover: false
          }
        },
        useAutoScroll: true
      },
      {
        selector: ".product-slider",
        options: {
          autoWidth: true,
          perMove: 1,
          gap: "0rem",
          arrows: true,
          pagination: false,
          drag: true,
          type: "slide",
          focus: "left",
          snap: true
        },
        useAutoScroll: false
      }
    ];
    splideConfigs.forEach((config) => {
      initSplide(config.selector, config.options, config.useAutoScroll);
    });
    animateCardWrappers();
  });
})();
//# sourceMappingURL=index.js.map
