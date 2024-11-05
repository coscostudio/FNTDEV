"use strict";
(() => {
  // bin/live-reload.js
  new EventSource(`${"http://localhost:3000"}/esbuild`).addEventListener("change", () => location.reload());

  // src/index.ts
  function initSplide(selector, options, useAutoScroll = false) {
    const splideElement = document.querySelector(selector);
    if (!splideElement)
      return;
    const splide = new Splide(splideElement, options);
    splide.on("mounted", () => {
      splide.Components.Elements.slides.forEach((slide, index) => {
        slide.addEventListener("click", () => {
          splide.go(index);
        });
      });
    });
    if (useAutoScroll && window.splide?.Extensions) {
      splide.mount(window.splide.Extensions);
    } else {
      splide.mount();
    }
  }
  document.addEventListener("DOMContentLoaded", () => {
    const splideConfigs = [
      {
        selector: ".slider1",
        options: {
          type: "loop",
          autoWidth: true,
          gap: "3rem",
          drag: "false",
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
      }
    ];
    splideConfigs.forEach((config) => {
      initSplide(config.selector, config.options, config.useAutoScroll);
    });
  });
})();
//# sourceMappingURL=index.js.map
