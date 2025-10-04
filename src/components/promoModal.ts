type TriggerMode = 'time' | 'exit' | 'both' | 'off';

type GsapTimelineLike = {
  to: (target: unknown, vars: Record<string, unknown>, position?: string | number) => GsapTimelineLike;
  kill: () => void;
};

type GsapLike = {
  set: (target: unknown, vars: Record<string, unknown>) => void;
  timeline: (options?: Record<string, unknown>) => GsapTimelineLike;
};

export interface PromoModalOptions {
  triggerMode: TriggerMode;
  timeDelayMs: number;
  sessionKey: string;
  respectExistingSession: boolean;
}

const DEFAULT_OPTIONS: PromoModalOptions = {
  triggerMode: 'both',
  timeDelayMs: 3000,
  sessionKey: 'fntPromoModalShown',
  respectExistingSession: true,
};

const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

declare global {
  interface Window {
    gsap?: GsapLike;
  }
}

export class PromoModal {
  private options: PromoModalOptions;
  private modalRoot: HTMLElement | null;
  private modalContent: HTMLElement | null;
  private closeControls: HTMLElement[];
  private isInitialized = false;
  private isOpen = false;
  private timerId: number | null = null;
  private exitIntentActive = false;
  private closeControlsBound = false;
  private previousFocus: HTMLElement | null = null;
  private gsap: GsapLike | null = null;
  private openTimeline: GsapTimelineLike | null = null;
  private closeTimeline: GsapTimelineLike | null = null;

  private readonly handleCloseControl = (event: Event) => {
    event.preventDefault();
    this.close();
  };

  private readonly handleOutsidePointer = (event: PointerEvent) => {
    if (!this.isOpen || !this.modalRoot || !this.modalContent) return;
    const target = event.target as Node | null;
    if (!target) return;
    if (!this.modalRoot.contains(target)) return;
    if (this.modalContent.contains(target)) return;
    this.close();
  };

  private readonly handleKeydown = (event: KeyboardEvent) => {
    if (!this.isOpen) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
    }
  };

  private readonly handleExitIntent = (event: MouseEvent) => {
    if (!this.shouldAutoOpen()) return;
    if (event.relatedTarget) return;
    if (event.clientY > 0) return;
    this.triggerAutoOpen();
  };

  constructor(options?: Partial<PromoModalOptions>) {
    this.options = { ...DEFAULT_OPTIONS, ...options };

    if (!isBrowser) {
      this.modalRoot = null;
      this.modalContent = null;
      this.closeControls = [];
      return;
    }

    this.modalRoot = document.querySelector<HTMLElement>('.modal_promo');
    this.modalContent =
      this.modalRoot?.querySelector<HTMLElement>('.modal_promo-component') ?? null;
    this.closeControls = this.modalRoot
      ? Array.from(this.modalRoot.querySelectorAll<HTMLElement>('[data-action="modal-close"]'))
      : [];

    this.gsap = window.gsap ?? null;

    if (this.modalRoot && !this.modalRoot.hasAttribute('aria-hidden')) {
      this.modalRoot.setAttribute('aria-hidden', 'true');
    }
  }

  init(): void {
    if (!this.modalRoot || this.isInitialized) return;

    this.isInitialized = true;
    this.attachCloseControlListeners();
    this.armTriggers();
  }

  open(): void {
    if (!this.modalRoot || this.isOpen) return;
    if (this.shouldRespectSession() && this.hasSessionFlag()) return;

    this.clearAutoTriggers();
    this.isOpen = true;

    this.modalRoot.classList.add('is-open');
    this.modalRoot.setAttribute('aria-hidden', 'false');
    this.toggleScrollLock(true);
    this.enableLiveListeners();
    this.trapFocus();
    this.setSessionFlag();
    this.animateOpen();
  }

  close(): void {
    if (!this.modalRoot || !this.isOpen) return;

    this.disableLiveListeners();
    this.isOpen = false;

    if (this.gsap && (this.modalContent || this.modalRoot)) {
      this.animateClose();
      return;
    }

    this.finalizeClose();
  }

  private attachCloseControlListeners(): void {
    if (this.closeControlsBound) return;
    this.closeControls.forEach((control) => {
      control.addEventListener('click', this.handleCloseControl);
    });
    this.closeControlsBound = true;
  }

  private armTriggers(): void {
    if (!this.modalRoot) return;
    this.clearAutoTriggers();

    if (this.options.triggerMode === 'off') return;
    if (this.shouldRespectSession() && this.hasSessionFlag()) return;

    if (this.options.triggerMode === 'time' || this.options.triggerMode === 'both') {
      this.timerId = window.setTimeout(
        () => {
          this.triggerAutoOpen();
        },
        Math.max(0, this.options.timeDelayMs)
      );
    }

    if (this.options.triggerMode === 'exit' || this.options.triggerMode === 'both') {
      this.attachExitIntent();
    }
  }

  private triggerAutoOpen(): void {
    this.clearAutoTriggers();
    this.open();
  }

  private enableLiveListeners(): void {
    if (!this.modalRoot) return;
    this.modalRoot.addEventListener('pointerdown', this.handleOutsidePointer);
    document.addEventListener('keydown', this.handleKeydown);
  }

  private disableLiveListeners(): void {
    if (!this.modalRoot) return;
    this.modalRoot.removeEventListener('pointerdown', this.handleOutsidePointer);
    document.removeEventListener('keydown', this.handleKeydown);
  }

  private trapFocus(): void {
    if (!this.modalRoot) return;

    this.previousFocus = (document.activeElement as HTMLElement) ?? null;
  }

  private releaseFocus(): void {
    if (this.previousFocus) {
      this.safeFocus(this.previousFocus);
    }
    this.previousFocus = null;
  }

  private safeFocus(element: HTMLElement): void {
    if (!element) return;
    try {
      element.focus({ preventScroll: true });
    } catch (error) {
      element.focus();
    }
  }

  private toggleScrollLock(locked: boolean): void {
    const root = document.documentElement;
    const { body } = document;
    if (!root || !body) return;

    if (locked) {
      root.classList.add('modal-open');
      body.classList.add('modal-open');
    } else {
      root.classList.remove('modal-open');
      body.classList.remove('modal-open');
    }
  }

  private finalizeClose(): void {
    if (!this.modalRoot) return;
    this.modalRoot.classList.remove('is-open');
    this.modalRoot.setAttribute('aria-hidden', 'true');
    this.toggleScrollLock(false);
    this.releaseFocus();
  }

  private clearAutoTriggers(): void {
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.detachExitIntent();
  }

  private attachExitIntent(): void {
    if (this.exitIntentActive) return;
    if (this.isTouchDevice()) return;

    document.addEventListener('mouseout', this.handleExitIntent);
    this.exitIntentActive = true;
  }

  private detachExitIntent(): void {
    if (!this.exitIntentActive) return;
    document.removeEventListener('mouseout', this.handleExitIntent);
    this.exitIntentActive = false;
  }

  private shouldAutoOpen(): boolean {
    if (!this.modalRoot) return false;
    if (this.options.triggerMode === 'off') return false;
    if (this.shouldRespectSession() && this.hasSessionFlag()) return false;
    return true;
  }

  private hasSessionFlag(): boolean {
    if (!isBrowser) return false;
    try {
      return window.sessionStorage.getItem(this.options.sessionKey) === 'true';
    } catch (error) {
      return false;
    }
  }

  private setSessionFlag(): void {
    if (!isBrowser) return;
    try {
      window.sessionStorage.setItem(this.options.sessionKey, 'true');
    } catch (error) {
      // Ignore storage errors
    }
  }

  private shouldRespectSession(): boolean {
    return this.options.respectExistingSession !== false;
  }

  private isTouchDevice(): boolean {
    if (!isBrowser) return false;
    const nav = window.navigator;
    return (
      'ontouchstart' in window ||
      (nav && typeof nav.maxTouchPoints === 'number' && nav.maxTouchPoints > 0)
    );
  }

  private animateOpen(): void {
    if (!this.gsap || !this.modalRoot) return;

    this.closeTimeline?.kill();
    this.closeTimeline = null;

    this.gsap.set(this.modalRoot, { autoAlpha: 0 });
    if (this.modalContent) {
      this.gsap.set(this.modalContent, { autoAlpha: 0, y: 32, scale: 0.95 });
    }

    this.openTimeline?.kill();
    const timeline = this.gsap.timeline({
      defaults: { ease: 'power2.out' },
      onComplete: () => {
        this.openTimeline = null;
        this.gsap?.set(this.modalRoot, { clearProps: 'opacity,visibility' });
        if (this.modalContent) {
          this.gsap?.set(this.modalContent, { clearProps: 'transform,opacity' });
        }
      },
    });

    timeline.to(this.modalRoot, { autoAlpha: 1, duration: 0.25, ease: 'power1.out' });

    if (this.modalContent) {
      timeline.to(
        this.modalContent,
        { autoAlpha: 1, y: 0, scale: 1, duration: 0.5, ease: 'power3.out' },
        '-=0.1'
      );
    }

    this.openTimeline = timeline;
  }

  private animateClose(): void {
    if (!this.gsap || !this.modalRoot) {
      this.finalizeClose();
      return;
    }

    this.openTimeline?.kill();
    this.openTimeline = null;

    this.closeTimeline?.kill();

    const contentTarget = this.modalContent ?? this.modalRoot;

    const timeline = this.gsap.timeline({
      defaults: { ease: 'power2.in' },
      onComplete: () => {
        this.closeTimeline = null;
        this.gsap?.set(this.modalRoot!, { clearProps: 'opacity,visibility' });
        if (this.modalContent) {
          this.gsap?.set(this.modalContent, { clearProps: 'transform,opacity' });
        }
        this.finalizeClose();
      },
    });

    if (this.modalContent) {
      timeline.to(contentTarget, {
        autoAlpha: 0,
        y: 24,
        scale: 0.95,
        duration: 0.3,
      });
      timeline.to(
        this.modalRoot,
        { autoAlpha: 0, duration: 0.25, ease: 'power1.in' },
        '-=0.15'
      );
    } else {
      timeline.to(this.modalRoot, { autoAlpha: 0, duration: 0.25 });
    }

    this.closeTimeline = timeline;
  }
}
