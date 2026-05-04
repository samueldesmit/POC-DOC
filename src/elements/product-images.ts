import { subscribe, getTargets, visible } from '../global.js';
import { Splide } from '@splidejs/splide';

// Global state to track active slide index across components
const productGalleryState = {
    activeSlideIndex: 0,
};

// Interface for variant update event
interface VariantUpdateEvent {
    sections: {
        [key: string]: string;
    };
}

export class ProductImages extends HTMLElement {
    private unsubscribe: () => void;

    private mainGallerySlider: Splide | null = null;
    private isInPopup: boolean;
    private popupGallerySyncHandler: ((event: CustomEvent) => void) | null =
        null;
    private zoomInButtonClickHandler: (() => void) | null = null;
    private wheelHandler: ((e: WheelEvent) => void) | null = null;
    private optionsChangedHandler: (() => void) | null = null;
    private modalDialogUpdateHandler: ((event: Event) => void) | null = null;

    get mainGalleryElement() {
        return this.querySelector('.main-slider') as HTMLElement;
    }

    get zoomInButton() {
        return this.querySelector('.zoom-in-button') as HTMLElement | null;
    }

    get modalToggle() {
        return this.zoomInButton?.closest('modal-toggle') as HTMLElement | null;
    }

    connectedCallback(): void {
        this.isInPopup = this.hasAttribute('data-in-popup');

        // Initialize gallery when element becomes visible
        visible(this).then(this.initializeGallery.bind(this));

        // Handle variant updates
        this.unsubscribe = subscribe(
            'variantUpdate',
            this.handleVariantUpdate.bind(this),
        );
    }

    /**
     * Initialize the gallery sliders and event handlers
     */
    private initializeGallery(): void {
        // Initialize main gallery slider
        this.mainGallerySlider = new Splide(this.mainGalleryElement, {
            perPage: 1,
            perMove: 1,
            arrows: true,
            pagination: true,
            focus: 0,
            omitEnd: true,
            drag: true,
            speed: 1000,
            gap: '0.25rem',
            classes: {
                arrows: 'splide__arrows_main-gallery',
            },
            wheelSleep: 500,
            flickMaxPages: 1,
        });

        // Set up event handlers for main gallery
        if (!this.isInPopup) {
            this.setupMainGalleryEvents();
        }

        // Set up custom pagination container
        this.setupPagination();

        // Mount slider
        this.mainGallerySlider.mount();

        // Set up popup specific functionality
        if (this.isInPopup) {
            this.setupPopupGallery();
        }

        // Set up wheel navigation
        this.setupWheelNavigation();

        // Set up zoom button click handler
        this.setupZoomButton();
    }

    /**
     * Set up event handlers for the main gallery
     */
    private setupMainGalleryEvents(): void {
        if (!this.mainGallerySlider) return;

        // Hide zoom button during slide transition
        this.mainGallerySlider.on('move', () => {
            if (this.zoomInButton && this.modalToggle) {
                this.zoomInButton.style.opacity = '0';
                this.zoomInButton.style.visibility = 'hidden';
                this.modalToggle.style.pointerEvents = 'none';
            }
        });

        // Show zoom button after slide transition and update state
        this.mainGallerySlider.on('moved', () => {
            if (this.zoomInButton && this.modalToggle) {
                this.zoomInButton.style.opacity = '100%';
                this.zoomInButton.style.visibility = 'visible';
                this.modalToggle.style.pointerEvents = 'auto';
            }

            // Update global state and data attribute
            const activeSlide = this.mainGallerySlider.index;
            productGalleryState.activeSlideIndex = activeSlide;

            const gallery = this.closest('.product-gallery');
            if (gallery) {
                gallery.setAttribute(
                    'data-active-slide',
                    activeSlide.toString(),
                );
            }
        });
    }

    /**
     * Set up popup gallery specific functionality
     */
    private setupPopupGallery(): void {
        if (!this.mainGallerySlider) return;

        const mainGallerySliderCurrentSpeed =
            this.mainGallerySlider.options.speed;

        // Use the global state for active slide index
        const activeSlide = productGalleryState.activeSlideIndex;

        // Function to sync popup gallery to a specific slide
        const syncPopupGallery = (newSlide: number) => {
            if (!this.mainGallerySlider) return;

            // Temporarily set speed to 0 for instant movement
            this.mainGallerySlider.options.speed = 0;

            // Go to the slide
            this.mainGallerySlider.go(newSlide);

            // Restore original speed
            this.mainGallerySlider.options.speed =
                mainGallerySliderCurrentSpeed;
        };

        // Listen for modal dialog open events
        this.modalDialogUpdateHandler = (event: Event) => {
            const customEvent = event as CustomEvent;
            if (customEvent.detail && customEvent.detail.open === true) {
                // When modal opens, sync to the current global state
                setTimeout(() => {
                    syncPopupGallery(productGalleryState.activeSlideIndex);
                }, 100);
            }
        };
        document.addEventListener(
            'modalDialogUpdate',
            this.modalDialogUpdateHandler,
        );

        // Initial sync when popup opens
        syncPopupGallery(activeSlide);

        // Handle zoom button click event
        this.popupGallerySyncHandler = (event: CustomEvent) => {
            syncPopupGallery(event.detail.activeSlide);
        };

        const gallery = this.closest('.product-gallery');
        if (gallery) {
            gallery.addEventListener(
                'product-images-zoom-button-clicked',
                this.popupGallerySyncHandler,
            );
        }

        // Listen for variant changes
        this.optionsChangedHandler = () => {
            setTimeout(() => {
                syncPopupGallery(productGalleryState.activeSlideIndex);
            }, 300);
        };
        document.addEventListener(
            'options:changed',
            this.optionsChangedHandler,
        );
    }

    /**
     * Set up wheel navigation for the gallery
     */
    private setupWheelNavigation(): void {
        let lastWheelTime = 0;
        const throttleDelay = 300; // Milliseconds between allowed wheel events
        const sensitivityThreshold = 25; // Higher value means less sensitive

        this.wheelHandler = (e: WheelEvent) => {
            const now = Date.now();

            // Only process wheel events with horizontal movement
            if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
                e.preventDefault();

                // Check if we've passed the delay since last wheel action
                if (now - lastWheelTime > throttleDelay) {
                    // Only trigger navigation if the delta exceeds sensitivity threshold
                    if (
                        this.mainGallerySlider &&
                        Math.abs(e.deltaX) > sensitivityThreshold
                    ) {
                        this.mainGallerySlider.go(e.deltaX > 0 ? '>' : '<');
                        lastWheelTime = now;
                    }
                }
            }
        };

        this.addEventListener('wheel', this.wheelHandler, { passive: false });
    }

    /**
     * Set up custom pagination container
     */
    private setupPagination(): void {
        if (!this.mainGallerySlider) return;

        const paginationContainer = this.querySelector(
            '.splide-custom-pagination',
        ) as HTMLElement | null;

        if (paginationContainer) {
            this.mainGallerySlider.on('pagination:mounted', (data) => {
                paginationContainer.innerHTML = '';
                data.list.classList.add('flex', 'gap-2', 'justify-center', 'py-4');
                paginationContainer.appendChild(data.list);
            });
        }
    }

    /**
     * Set up zoom button click handler
     */
    private setupZoomButton(): void {
        if (!this.zoomInButton) return;

        this.zoomInButtonClickHandler = () => {
            if (!this.mainGallerySlider) return;
            const activeSlide = this.mainGallerySlider.index;

            // Update global state
            productGalleryState.activeSlideIndex = activeSlide;

            const gallery = this.closest('.product-gallery');
            if (gallery) {
                gallery.setAttribute(
                    'data-active-slide',
                    activeSlide.toString(),
                );
            }

            // Dispatch event to open zoom modal with correct slide
            const zoomInButtonEvent = new CustomEvent(
                'product-images-zoom-button-clicked',
                {
                    detail: { activeSlide: activeSlide },
                    bubbles: true,
                    composed: true,
                },
            );
            this.dispatchEvent(zoomInButtonEvent);
        };

        this.zoomInButton.addEventListener(
            'click',
            this.zoomInButtonClickHandler,
        );
    }

    /**
     * Handle variant updates
     */
    private handleVariantUpdate({ sections }: VariantUpdateEvent): void {
        const html = new DOMParser()
            .parseFromString(sections['main-product'], 'text/html')
            .querySelector('product-images') as HTMLElement | null;

        if (!html) return;

        try {
            const {
                slide: [slide],
            } = getTargets(this);
            const {
                slide: [newSlide],
            } = getTargets(html);

            // Replace images if first one is different
            if (newSlide.dataset.id !== slide.dataset.id) {
                this.replaceWith(html);

                // Reset active slide to 0 when variant changes
                productGalleryState.activeSlideIndex = 0;

                const productGallery =
                    document.querySelector('.product-gallery');
                if (productGallery) {
                    productGallery.setAttribute('data-active-slide', '0');
                }
            }
        } catch (error) {
            // Ignore variant update errors
        }
    }

    disconnectedCallback(): void {
        // Clean up subscription
        if (this.unsubscribe) {
            this.unsubscribe();
        }

        // Clean up sliders
        if (this.mainGallerySlider) {
            this.mainGallerySlider.off('move');
            this.mainGallerySlider.off('moved');
            this.mainGallerySlider.destroy();
            this.mainGallerySlider = null;
        }

        // Clean up event listeners
        if (this.isInPopup && this.popupGallerySyncHandler) {
            const gallery = this.closest('.product-gallery');
            if (gallery) {
                gallery.removeEventListener(
                    'product-images-zoom-button-clicked',
                    this.popupGallerySyncHandler,
                );
            }
            this.popupGallerySyncHandler = null;
        }

        if (this.optionsChangedHandler) {
            document.removeEventListener(
                'options:changed',
                this.optionsChangedHandler,
            );
            this.optionsChangedHandler = null;
        }

        if (this.zoomInButton && this.zoomInButtonClickHandler) {
            this.zoomInButton.removeEventListener(
                'click',
                this.zoomInButtonClickHandler,
            );
            this.zoomInButtonClickHandler = null;
        }

        if (this.wheelHandler) {
            this.removeEventListener('wheel', this.wheelHandler);
            this.wheelHandler = null;
        }

        if (this.modalDialogUpdateHandler) {
            document.removeEventListener(
                'modalDialogUpdate',
                this.modalDialogUpdateHandler,
            );
            this.modalDialogUpdateHandler = null;
        }
    }
}

customElements.define('product-images', ProductImages);
