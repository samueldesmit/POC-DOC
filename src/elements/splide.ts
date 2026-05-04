import Splide, { Options } from '@splidejs/splide';
import { AutoScroll } from '@splidejs/splide-extension-auto-scroll';

customElements.define(
    'splide-section',
    class SplideSlider extends HTMLElement {
        private splide: Splide | null = null;
        private _handlePinClick: EventListener | null = null;
        private _handleWheel: ((e: WheelEvent) => void) | null = null;
        private _wheelThrottled = false;

        connectedCallback(): void {
            const splideHolder = this.querySelector(
                '.splide',
            ) as HTMLElement | null;
            if (!splideHolder) return;

            const dataset = this.dataset;

            if (
                dataset.splideDisableOnDesktop === 'true' &&
                window.matchMedia('(min-width: 1024px)').matches
            ) {
                return;
            }

            const smoothAutoplay = this.toBool(dataset.splideSmoothAutoplay, false);
            const autoScrollSpeed = this.toNumber(dataset.splideAutoScrollSpeed, 1);

            const options: Options = {
                autoplay: this.toBool(dataset.splideAutoplay, false),
                interval: this.toNumber(dataset.splideInterval, 100),
                type: dataset.splideType || 'slide',
                perPage: this.toNumber(dataset.splidePerPageMobile, 1.2),
                gap: dataset.splideGapMobile || '1rem',
                pauseOnHover: this.toBool(dataset.splidePauseOnHover, true),
                height: dataset.splideHeight || 'auto',
                pagination: this.toBool(dataset.splidePagination, false),
                arrows: this.toBool(dataset.splideArrows, false),
                padding: dataset.splidePadding || '0rem',
                perMove: 1,
                perSlide: 1,
                focus: 0,
                keyboard: this.toBool(dataset.splideKeyboard, true),
                omitEnd: true,
                drag: this.toBool(dataset.splideDrag, true),
                autoWidth: this.toBool(dataset.splideAutoWidth, false),
                start: this.toNumber(dataset.splideStart, 0),
                speed: this.toNumber(dataset.splideSpeed, 1000),
                easing: dataset.splideEasing || 'cubic-bezier(0.165, 0.84, 0.44, 1)',
                mediaQuery: 'min',
                breakpoints: {
                    640: {
                        perPage: this.toNumber(
                            dataset.splidePerPageDesktop,
                            3.3,
                        ),
                        drag: this.toBool(dataset.splideDrag, true),
                        gap: dataset.splideGapDesktop || '1rem',
                        padding: dataset.splidePaddingDesktop || '0rem',
                    },
                },
            };

            if (smoothAutoplay) {
                options.type = 'loop';
                options.drag = 'free';
                options.autoplay = false;
                (options as Record<string, unknown>).autoScroll = {
                    speed: autoScrollSpeed,
                    pauseOnHover: true,
                    pauseOnFocus: true,
                };
            }

            this.splide = new Splide(splideHolder, options);

            const section = this.closest('section');

            // Custom single big arrow control (desktop-only in Product Highlight)
            const customArrow = this.querySelector(
                '[data-product-highlight-arrow]',
            ) as HTMLButtonElement | null;

            if (customArrow && this.splide) {
                // Track whether we're currently travelling forward or backward
                let travelDirection: 'forward' | 'backward' = 'forward';

                const applyDirectionToArrow = () => {
                    const isBackward = travelDirection === 'backward';

                    customArrow.dataset.direction = isBackward ? 'prev' : 'next';
                    customArrow.setAttribute(
                        'aria-label',
                        isBackward ? 'Previous product' : 'Next product',
                    );

                    // Visually flip the arrow when going backwards
                    customArrow.classList.toggle('rotate-180', isBackward);
                };

                const updateArrowDirection = (index: number) => {
                    if (!this.splide) return;

                    const lastIndex = this.splide.length - 1;

                    if (travelDirection === 'forward') {
                        // If we've reached the last slide, start travelling backwards
                        if (index >= lastIndex) {
                            travelDirection = 'backward';
                        }
                    } else {
                        // If we've reached the first slide, start travelling forwards again
                        if (index <= 0) {
                            travelDirection = 'forward';
                        }
                    }

                    applyDirectionToArrow();
                };

                customArrow.addEventListener('click', () => {
                    if (!this.splide) return;
                    const direction =
                        customArrow.dataset.direction === 'prev' ? '<' : '>';
                    this.splide.go(direction);
                });

                this.splide.on('mounted', () => {
                    updateArrowDirection(this.splide ? this.splide.index : 0);
                });

                this.splide.on('move', (newIndex: number) => {
                    updateArrowDirection(newIndex);
                });
            }
            const handlePinClick = ((event: CustomEvent) => {
                if (this.splide) {
                    this.splide.go(event.detail.index);
                }
            }) as EventListener;

            section?.addEventListener(
                'shop-the-look-pin-clicked',
                handlePinClick,
            );
            this._handlePinClick = handlePinClick;

            // Handle winery navigation clicks
            const wineryNavDots = section?.querySelectorAll(
                '.winery-nav-dot',
            ) as NodeListOf<HTMLElement> | null;

            if (wineryNavDots && wineryNavDots.length > 0) {
                wineryNavDots.forEach((dot) => {
                    dot.addEventListener('click', () => {
                        const slideIndex = parseInt(
                            dot.getAttribute('data-slide-index') || '0',
                            10,
                        );
                        if (this.splide) {
                            this.splide.go(slideIndex);
                        }
                    });
                });
            }

            this.splide.on('move', (newIndex) => {
                if (!section) return;
                const activePin = section.querySelector(
                    '[data-pin-order][data-active]',
                );
                const destinationPin = section.querySelector(
                    `[data-pin-order="${newIndex}"]`,
                );

                if (activePin) {
                    activePin.removeAttribute('data-active');
                }

                if (destinationPin) {
                    destinationPin.setAttribute('data-active', '');
                }

                // Update pagination text (format: "1 / 3")
                const paginationText = this.querySelector(
                    '.splide-pagination-text',
                ) as HTMLElement | null;
                if (paginationText) {
                    const currentPageSpan = paginationText.querySelector(
                        '.splide-current-page',
                    ) as HTMLElement | null;
                    if (currentPageSpan) {
                        // newIndex is 0-based, but pagination should be 1-based
                        currentPageSpan.textContent = String(newIndex + 1);
                    }
                }

                // Update winery navigation dots
                const wineryNavDots =
                    section.querySelectorAll('.winery-nav-dot');
                wineryNavDots.forEach((dot, index) => {
                    if (index === newIndex) {
                        dot.classList.add('active');
                    } else {
                        dot.classList.remove('active');
                    }
                });
            });

            const paginationContainer = this.querySelector(
                '.splide-custom-pagination',
            ) as HTMLElement | null;

            if (paginationContainer) {
                this.splide.on('pagination:mounted', (data) => {
                    paginationContainer.innerHTML = '';
                    data.list.classList.add('flex', 'gap-4');
                    paginationContainer.appendChild(data.list);
                });
            }

            if (smoothAutoplay) {
                this.splide.mount({ AutoScroll });
            } else {
                this.splide.mount();
            }

            // Horizontal scroll navigation with throttling
            const wheelEnabled = this.toBool(dataset.splideWheel, true);

            if (wheelEnabled) {
                const SCROLL_THRESHOLD = 15; // Minimum delta to trigger navigation
                const THROTTLE_MS = 500; // Prevent rapid-fire navigation

                this._handleWheel = (e: WheelEvent) => {
                    const isHorizontalScroll =
                        Math.abs(e.deltaX) > Math.abs(e.deltaY);
                    if (!isHorizontalScroll) return;

                    e.preventDefault();

                    // Throttle to prevent too-rapid slide changes
                    if (this._wheelThrottled || !this.splide) return;
                    if (Math.abs(e.deltaX) < SCROLL_THRESHOLD) return;

                    this.splide.go(e.deltaX > 0 ? '>' : '<');
                    this._wheelThrottled = true;

                    setTimeout(() => {
                        this._wheelThrottled = false;
                    }, THROTTLE_MS);
                };

                this.addEventListener('wheel', this._handleWheel, {
                    passive: false,
                });
            }
        }

        disconnectedCallback(): void {
            const section = this.closest('section');
            if (this._handlePinClick && section) {
                section.removeEventListener(
                    'shop-the-look-pin-clicked',
                    this._handlePinClick,
                );
                this._handlePinClick = null;
            }

            if (this._handleWheel) {
                this.removeEventListener('wheel', this._handleWheel);
                this._handleWheel = null;
            }

            if (this.splide) {
                this.splide.destroy();
                this.splide = null;
            }
        }

        private toNumber(value: string | undefined, fallback: number): number {
            const parsed = Number(value);
            return isNaN(parsed) ? fallback : parsed;
        }

        private toBool(value: string | undefined, fallback: boolean): boolean {
            if (value === undefined) return fallback;
            return value === 'true';
        }
    },
);
