"use strict";
(() => {
  // bin/live-reload.js
  new EventSource(`${"http://localhost:3000"}/esbuild`).addEventListener("change", () => location.reload());

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
  document.addEventListener("DOMContentLoaded", () => {
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
          gap: "1rem",
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
  });
})();
//# sourceMappingURL=index.js.map
