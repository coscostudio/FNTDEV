import { PromoModal, type GsapLike } from './components/promoModal';

declare const Splide: any;

declare global {
  interface Window {
    splide?: {
      Extensions?: unknown;
    };
    gsap?: GsapLike;
  }
}

function initSplide(selector: string, options: any, useAutoScroll = false) {
  // Query all matching elements instead of just one
  const splideElements = document.querySelectorAll(selector);
  if (!splideElements.length) return;

  // Initialize each instance
  splideElements.forEach((element, index) => {
    const uniqueId = `${selector.replace('.', '')}-${index}`;
    element.setAttribute('id', uniqueId);

    const splide = new Splide(element, {
      ...options,
    });

    // Enable clicking on slides to navigate
    splide.on('mounted', () => {
      splide.Components.Elements.slides.forEach((slide: HTMLElement, slideIndex: number) => {
        slide.addEventListener('click', () => {
          splide.go(slideIndex);
        });
      });
    });

    // Mount Splide with Autoscroll extension only if needed
    if (useAutoScroll && window.splide?.Extensions) {
      splide.mount(window.splide.Extensions);
    } else {
      splide.mount();
    }
  });
}

function animateCardWrappers(): void {
  const gsap = window.gsap;
  if (!gsap) return;

  const wrappers = document.querySelectorAll<HTMLElement>('.wrapper_cards');
  if (!wrappers.length) return;

  wrappers.forEach((wrapper, index) => {
    if (wrapper.dataset.gsapAnimated === 'true') return;
    wrapper.dataset.gsapAnimated = 'true';

    gsap.set(wrapper, { autoAlpha: 0, y: 24 });
    gsap.to(wrapper, {
      autoAlpha: 1,
      y: 0,
      duration: 0.6,
      ease: 'power3.out',
      delay: 0.1 * index,
    });
  });
}

// Sliders Initialization
document.addEventListener('DOMContentLoaded', () => {
  const modal = new PromoModal({
    triggerMode: 'both',
    timeDelayMs: 3000,
    sessionKey: 'fntPromoModalShown',
    respectExistingSession: true,
  });

  modal.init();

  (window as typeof window & { fntPromo?: PromoModal }).fntPromo = modal;

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
          speed: 0.5,
          pauseOnHover: false,
        },
      },
      useAutoScroll: true,
    },
    {
      selector: '.slider-fnt',
      options: {
        type: 'loop',
        autoWidth: true,
        gap: '1rem',
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
    {
      selector: '.product-slider',
      options: {
        autoWidth: true,
        perMove: 1,
        gap: '0rem',
        arrows: true,
        pagination: false,
        drag: true,
        type: 'slide',
        focus: 'left',
        snap: true,
      },
      useAutoScroll: false,
    },
  ];

  splideConfigs.forEach((config) => {
    initSplide(config.selector, config.options, config.useAutoScroll);
  });

  animateCardWrappers();
});
