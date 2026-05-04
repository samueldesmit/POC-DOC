import { customElement } from '../utilities/decorators';

@customElement('header-nav')
export class HeaderNav extends HTMLElement {
    private header: HTMLElement | null = null;
    private headerSection: HTMLElement | null = null;
    private announcementBar: HTMLElement | null = null;
    private previousScroll: number = 0;
    private boundScrollHandler: () => void;
    private hamburgerObserver: MutationObserver | null = null;
    private searchObserver: MutationObserver | null = null;
    private megaMenuObserver: MutationObserver | null = null;
    private announcementBarObserver: ResizeObserver | null = null;
    private announcementBarMutationObserver: MutationObserver | null = null;
    private isOverlayMode: boolean = false;
    private isStickyEnabled: boolean = false;

    constructor() {
        super();
        this.boundScrollHandler = this.scrollHandler.bind(this);
    }

    connectedCallback(): void {
        this.header = document.getElementById('main-header-nav');
        this.headerSection = this.header?.closest(
            '.section--header',
        ) as HTMLElement | null;
        this.announcementBar = document.querySelector(
            '[data-announcement-bar]',
        );

        if (!this.header || !this.headerSection) return;

        const isHomePage =
            this.header.getAttribute('data-is-home-page') === 'true';
        this.isStickyEnabled =
            this.header.getAttribute('data-make-header-disappear-on-scroll') ===
            'true';
        // Header always overlays on homepage (transparent bg by design)
        this.isOverlayMode = isHomePage;

        // Set announcement bar height as CSS variable
        this.updateAnnouncementBarHeight();

        // Watch for announcement bar changes (appears/disappears/resizes)
        this.initAnnouncementBarObserver();

        if (this.isStickyEnabled) {
            // Sticky enabled - header always visible
            if (this.isOverlayMode) {
                // Homepage: overlay → fixed on scroll, but never hides
                this.headerSection.classList.add('is-overlay-mode');
                this.bindEvents();
                this.scrollHandler();
            } else {
                // Other pages: pure CSS sticky, always visible
                this.headerSection.classList.add('is-sticky');
            }
        } else {
            // Sticky disabled - hide on scroll down, show on scroll up
            if (this.isOverlayMode) {
                this.headerSection.classList.add('is-overlay-mode');
            } else {
                this.headerSection.classList.add('is-sticky');
            }
            this.bindEvents();
            this.scrollHandler();
        }

        this.initHamburgerToggle();
        this.initSearchToggle();
        this.initMegaMenuToggle();
    }

    disconnectedCallback(): void {
        window.removeEventListener('scroll', this.boundScrollHandler);
        if (this.hamburgerObserver) {
            this.hamburgerObserver.disconnect();
        }
        if (this.searchObserver) {
            this.searchObserver.disconnect();
        }
        if (this.megaMenuObserver) {
            this.megaMenuObserver.disconnect();
        }
        if (this.announcementBarObserver) {
            this.announcementBarObserver.disconnect();
        }
        if (this.announcementBarMutationObserver) {
            this.announcementBarMutationObserver.disconnect();
        }
    }

    private getAnnouncementBarHeight(): number {
        // Re-query in case announcement bar was added/removed
        this.announcementBar = document.querySelector(
            '[data-announcement-bar]',
        );
        if (!this.announcementBar) {
            return 0;
        }
        return this.announcementBar.offsetHeight;
    }

    private updateAnnouncementBarHeight(): void {
        if (!this.headerSection) return;
        const announcementHeight = this.getAnnouncementBarHeight();
        this.headerSection.style.setProperty(
            '--announcement-height',
            `${announcementHeight}px`,
        );
    }

    private initAnnouncementBarObserver(): void {
        // Watch for announcement bar being added/removed from DOM
        // Observe body for changes to header sections
        this.announcementBarMutationObserver = new MutationObserver(() => {
            // Check if announcement bar exists or was removed
            const currentBar = document.querySelector(
                '[data-announcement-bar]',
            );
            const barChanged = currentBar !== this.announcementBar;

            if (barChanged) {
                // Disconnect old resize observer if it exists
                if (this.announcementBarObserver) {
                    this.announcementBarObserver.disconnect();
                    this.announcementBarObserver = null;
                }

                // Update reference
                this.announcementBar = currentBar;

                // Update height immediately
                this.updateAnnouncementBarHeight();

                // If announcement bar now exists, observe it for resize
                if (this.announcementBar) {
                    this.announcementBarObserver = new ResizeObserver(() => {
                        this.updateAnnouncementBarHeight();
                    });
                    this.announcementBarObserver.observe(this.announcementBar);
                }
            }
        });

        // Observe body for changes (announcement bar can be added/removed)
        this.announcementBarMutationObserver.observe(document.body, {
            childList: true,
            subtree: true,
        });

        // Watch for announcement bar resize if it exists
        if (this.announcementBar) {
            this.announcementBarObserver = new ResizeObserver(() => {
                this.updateAnnouncementBarHeight();
            });
            this.announcementBarObserver.observe(this.announcementBar);
        }
    }

    private bindEvents(): void {
        window.addEventListener('scroll', this.boundScrollHandler, {
            passive: true,
        });
    }

    private scrollHandler(): void {
        if (!this.header || !this.headerSection) return;

        const scroll = window.scrollY || 0;
        const scrollDirection = scroll < this.previousScroll ? 'up' : 'down';
        const announcementHeight = this.getAnnouncementBarHeight();
        const headerHeight = this.headerSection.offsetHeight;

        if (this.isOverlayMode) {
            // Homepage with overlay mode
            const threshold = announcementHeight + headerHeight;

            if (scroll <= announcementHeight) {
                // At top - header absolute below announcement bar
                this.headerSection.classList.remove(
                    'is-fixed',
                    'is-hidden',
                    'has-bg',
                );
                this.headerSection.classList.add('is-overlay-mode');
            } else if (scroll > threshold) {
                this.headerSection.classList.remove('is-overlay-mode');
                this.headerSection.classList.add('is-fixed');

                if (this.isStickyEnabled) {
                    // Sticky: always visible with background
                    this.headerSection.classList.remove('is-hidden');
                    this.headerSection.classList.add('has-bg');
                } else {
                    // Not sticky: hide on scroll down, show on scroll up
                    if (scrollDirection === 'down') {
                        this.headerSection.classList.add('is-hidden');
                        this.headerSection.classList.remove('has-bg');
                    } else {
                        this.headerSection.classList.remove('is-hidden');
                        this.headerSection.classList.add('has-bg');
                    }
                }
            } else {
                // Between - transitioning to fixed
                this.headerSection.classList.remove(
                    'is-overlay-mode',
                    'is-hidden',
                );
                this.headerSection.classList.add('is-fixed');
            }
        } else {
            // Non-overlay pages - hide on scroll down, show on scroll up
            if (scrollDirection === 'down' && scroll > headerHeight) {
                this.headerSection.classList.add('is-hidden');
                this.headerSection.classList.remove('has-bg');
            } else if (scrollDirection === 'up' && scroll > 0) {
                this.headerSection.classList.remove('is-hidden');
                this.headerSection.classList.add('has-bg');
            } else if (scroll === 0) {
                this.headerSection.classList.remove('is-hidden', 'has-bg');
            }
        }

        this.previousScroll = scroll;
    }

    private updateHamburgerState(): void {
        const modal = document.querySelector(
            'modal-dialog[data-id="offcanvas-menu"]',
        );
        const hamburgerToggle = document.querySelector('.hamburger-toggle');
        const mobileHeaderBar = document.querySelector('.mobile-header-bar');

        if (modal && hamburgerToggle) {
            const isOpen = modal.hasAttribute('data-open');
            if (isOpen) {
                hamburgerToggle.setAttribute('data-open', '');
                mobileHeaderBar?.classList.add('menu-open');
                this.announcementBar?.classList.add('menu-open');
            } else {
                hamburgerToggle.removeAttribute('data-open');
                // Only remove menu-open if search modal is not also open
                const searchModal = document.querySelector(
                    'modal-dialog[data-id="search-results"]',
                );
                const searchOpen = searchModal?.hasAttribute('data-open');
                if (!searchOpen) {
                    if (mobileHeaderBar) {
                        mobileHeaderBar.classList.remove('menu-open');
                    }
                    this.announcementBar?.classList.remove('menu-open');
                }
            }
        }
    }

    private initHamburgerToggle(): void {
        const modal = document.querySelector(
            'modal-dialog[data-id="offcanvas-menu"]',
        );

        if (modal) {
            // Use MutationObserver to watch for data-open attribute changes
            this.hamburgerObserver = new MutationObserver(() =>
                this.updateHamburgerState(),
            );
            this.hamburgerObserver.observe(modal, {
                attributes: true,
                attributeFilter: ['data-open'],
            });

            // Initial state
            this.updateHamburgerState();
        } else {
            // Retry if modal not yet available
            setTimeout(() => this.initHamburgerToggle(), 100);
        }
    }

    private updateSearchState(): void {
        const modal = document.querySelector(
            'modal-dialog[data-id="search-results"]',
        );
        const mobileHeaderBar = document.querySelector('.mobile-header-bar');

        if (modal && mobileHeaderBar) {
            const isOpen = modal.hasAttribute('data-open');
            if (isOpen) {
                mobileHeaderBar.classList.add('menu-open');
                this.announcementBar?.classList.add('menu-open');
            } else {
                // Only remove if hamburger menu is not also open
                const hamburgerModal = document.querySelector(
                    'modal-dialog[data-id="offcanvas-menu"]',
                );
                const hamburgerOpen = hamburgerModal?.hasAttribute('data-open');
                if (!hamburgerOpen) {
                    mobileHeaderBar.classList.remove('menu-open');
                    this.announcementBar?.classList.remove('menu-open');
                }
            }
        }
    }

    private initSearchToggle(): void {
        const modal = document.querySelector(
            'modal-dialog[data-id="search-results"]',
        );

        if (modal) {
            this.searchObserver = new MutationObserver(() =>
                this.updateSearchState(),
            );
            this.searchObserver.observe(modal, {
                attributes: true,
                attributeFilter: ['data-open'],
            });

            this.updateSearchState();
        } else {
            setTimeout(() => this.initSearchToggle(), 100);
        }
    }

    private updateMegaMenuState(): void {
        const megaMenu = document.querySelector('mega-menu');

        if (megaMenu && this.headerSection) {
            const isOpen = megaMenu.hasAttribute('data-open');
            if (isOpen) {
                this.headerSection.classList.add('desktop-menu-open');
                this.announcementBar?.classList.add('desktop-menu-open');
            } else {
                this.headerSection.classList.remove('desktop-menu-open');
                this.announcementBar?.classList.remove('desktop-menu-open');
            }
        }
    }

    private initMegaMenuToggle(): void {
        const megaMenu = document.querySelector('mega-menu');

        if (megaMenu) {
            // Use MutationObserver to watch for data-open attribute changes
            this.megaMenuObserver = new MutationObserver(() =>
                this.updateMegaMenuState(),
            );
            this.megaMenuObserver.observe(megaMenu, {
                attributes: true,
                attributeFilter: ['data-open'],
            });

            // Initial state
            this.updateMegaMenuState();
        } else {
            // Retry if mega menu not yet available
            setTimeout(() => this.initMegaMenuToggle(), 100);
        }
    }
}
