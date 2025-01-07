///splide >>>
function initSplide(selector: string, options: any, useAutoScroll = false) {
  const splideElement = document.querySelector(selector);
  if (!splideElement) return;

  const splide = new Splide(splideElement, options);

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
        gap: '4rem',
        drag: 'free',
        focus: 'left',
        arrows: false,
        pagination: false,
        keyboard: false,
        autoScroll: {
          autoStart: true,
          speed: 0.75,
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
