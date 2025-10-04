const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',');

type TriggerMode = 'time' | 'exit' | 'both' | 'off';

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
  private addedTemporaryTabIndex = false;

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
      return;
    }

    if (event.key !== 'Tab') return;

    const focusable = this.getFocusableElements();
    if (!focusable.length) {
      if (this.modalRoot && document.activeElement !== this.modalRoot) {
        event.preventDefault();
        this.safeFocus(this.modalRoot);
      }
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement as HTMLElement | null;

    if (event.shiftKey) {
      if (!active || active === first) {
        event.preventDefault();
        this.safeFocus(last);
      }
      return;
    }

    if (!active || active === last) {
      event.preventDefault();
      this.safeFocus(first);
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
  }

  close(): void {
    if (!this.modalRoot || !this.isOpen) return;

    this.isOpen = false;
    this.modalRoot.classList.remove('is-open');
    this.modalRoot.setAttribute('aria-hidden', 'true');
    this.toggleScrollLock(false);
    this.disableLiveListeners();
    this.releaseFocus();
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

    const focusable = this.getFocusableElements();
    if (focusable.length) {
      this.safeFocus(focusable[0]);
      return;
    }

    if (!this.modalRoot.hasAttribute('tabindex')) {
      this.modalRoot.setAttribute('tabindex', '-1');
      this.addedTemporaryTabIndex = true;
    }
    this.safeFocus(this.modalRoot);
  }

  private releaseFocus(): void {
    if (this.addedTemporaryTabIndex && this.modalRoot) {
      this.modalRoot.removeAttribute('tabindex');
      this.addedTemporaryTabIndex = false;
    }

    if (this.previousFocus) {
      this.safeFocus(this.previousFocus);
    }
    this.previousFocus = null;
  }

  private getFocusableElements(): HTMLElement[] {
    if (!this.modalRoot) return [];
    const elements = Array.from(this.modalRoot.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS));
    return elements.filter(
      (element) => !element.hasAttribute('disabled') && this.isVisible(element)
    );
  }

  private isVisible(element: HTMLElement): boolean {
    return !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
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
}
