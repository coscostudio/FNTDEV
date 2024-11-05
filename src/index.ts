///splide >>>
function initSplide(selector: string, options: any, useAutoScroll = false) {
  const splideElement = document.querySelector(selector);
  if (!splideElement) return;

  const splide = new Splide(splideElement, options);

  // Enable clicking on slides to navigate
  splide.on('mounted', () => {
    splide.Components.Elements.slides.forEach((slide: HTMLElement, index: number) => {
      slide.addEventListener('click', () => {
        splide.go(index);
      });
    });
  });

  // Mount Splide with Autoscroll extension only if needed
  if (useAutoScroll && window.splide?.Extensions) {
    splide.mount(window.splide.Extensions);
  } else {
    splide.mount();
  }
}

// Sliders Initialization
document.addEventListener('DOMContentLoaded', () => {
  const splideConfigs = [
    {
      selector: '.slider1',
      options: {
        type: 'loop',
        autoWidth: true,
        gap: '3rem',
        drag: 'false',
        focus: 'left',
        arrows: false,
        pagination: false,
        keyboard: false,
        autoScroll: {
          autoStart: true,
          speed: 0.5,
          pauseOnHover: false,
        },
      },
      useAutoScroll: true,
    },
  ];

  splideConfigs.forEach((config) => {
    initSplide(config.selector, config.options, config.useAutoScroll);
  });
});
