import Swiper from 'swiper';
import { Navigation, Pagination, Zoom, Mousewheel } from 'swiper/modules';

export function initProductSwiper(
    element: HTMLElement,
    callbacks?: {
        onSlideChange?: (swiper: any) => void;
    },
): any {
    const swiper = new Swiper(element, {
        modules: [Navigation, Pagination, Zoom, Mousewheel],
        zoom: true,
        mousewheel: {
            forceToAxis: true,
            sensitivity: 0.7,
            releaseOnEdges: false,
            eventsTarget: 'container',
        },
        navigation: {
            nextEl: element.querySelector('.swiper-button-next') as HTMLElement,
            prevEl: element.querySelector('.swiper-button-prev') as HTMLElement,
        },
        pagination: {
            el: element.querySelector('.swiper-pagination') as HTMLElement,
            clickable: true,
        },
        on: {
            slideChange: (swiper) => {
                if (swiper.zoom && (swiper as any).zoomed) {
                    swiper.zoom.out();
                }
                if (callbacks?.onSlideChange) {
                    callbacks.onSlideChange(swiper);
                }
            },
            zoomChange: (swiper) => {
                const zoomContainers = element.querySelectorAll(
                    '.swiper-zoom-container',
                );
                const zoomScale = (swiper as any).zoom?.scale || 1;
                const isZoomed =
                    zoomScale > 1 || (swiper as any).zoomed === true;

                zoomContainers.forEach((container) => {
                    if (isZoomed) {
                        container.setAttribute('data-zoomed', 'true');
                    } else {
                        container.removeAttribute('data-zoomed');
                    }
                });
            },
        },
    });

    const cursorElement = element.parentElement?.querySelector(
        '.swiper-zoom-cursor',
    ) as HTMLElement;
    const cursorIcon = cursorElement?.querySelector(
        'svg',
    ) as SVGSVGElement | null;

    const zoomContainers = element.querySelectorAll('.swiper-zoom-container');

    const updateZoomState = () => {
        const zoomScale = (swiper as any).zoom?.scale || 1;
        const isZoomed = zoomScale > 1 || (swiper as any).zoomed === true;

        zoomContainers.forEach((container) => {
            if (isZoomed) {
                container.setAttribute('data-zoomed', 'true');
            } else {
                container.removeAttribute('data-zoomed');
            }
        });

        if (cursorElement && cursorIcon) {
            const isZoomed = zoomScale > 1 || (swiper as any).zoomed === true;
            if (isZoomed) {
                cursorIcon.innerHTML = `
                    <g id="zoom">
                        <path id="Vector" fill-rule="evenodd" clip-rule="evenodd" d="M6.06738 10.3218C6.06649 9.9628 6.35676 9.67106 6.71575 9.67016L13.9095 9.6521C14.2685 9.6512 14.5602 9.94148 14.5611 10.3005C14.5621 10.6595 14.2718 10.9512 13.9127 10.9521L6.71901 10.9701C6.36003 10.9711 6.06828 10.6808 6.06738 10.3218Z" fill="currentColor"/>
                        <path id="Vector_3" fill-rule="evenodd" clip-rule="evenodd" d="M16.6821 3.93914C13.1631 0.420284 7.45801 0.420284 3.93914 3.93914C0.420283 7.45801 0.420283 13.1633 3.93914 16.6821C7.45801 20.201 13.1631 20.201 16.6821 16.6821C20.201 13.1633 20.201 7.45801 16.6821 3.93914ZM3.01991 3.01991C7.04645 -1.00664 13.5747 -1.00664 17.6013 3.01991C21.5931 7.01169 21.6276 13.4623 17.7047 17.4964L23.7215 23.5132C23.9754 23.7671 23.9754 24.1787 23.7215 24.4326C23.4677 24.6864 23.0561 24.6864 22.8023 24.4326L16.7411 18.3713C12.693 21.609 6.77091 21.3524 3.01991 17.6014C-1.00664 13.5747 -1.00664 7.04645 3.01991 3.01991Z" fill="currentColor"/>
                    </g>
                `;
            } else {
                cursorIcon.innerHTML = `
                    <g id="zoom">
                        <path id="Vector" fill-rule="evenodd" clip-rule="evenodd" d="M6.06738 10.3218C6.06649 9.9628 6.35676 9.67106 6.71575 9.67016L13.9095 9.6521C14.2685 9.6512 14.5602 9.94148 14.5611 10.3005C14.5621 10.6595 14.2718 10.9512 13.9127 10.9521L6.71901 10.9701C6.36003 10.9711 6.06828 10.6808 6.06738 10.3218Z" fill="currentColor"/>
                        <path id="Vector_2" fill-rule="evenodd" clip-rule="evenodd" d="M10.3034 6.06397C10.6624 6.06307 10.9541 6.35335 10.955 6.71233L10.9731 13.906C10.974 14.2651 10.6837 14.5568 10.3247 14.5577C9.96572 14.5586 9.67397 14.2684 9.67308 13.9093L9.65503 6.71559C9.65413 6.35661 9.94441 6.06486 10.3034 6.06397Z" fill="currentColor"/>
                        <path id="Vector_3" fill-rule="evenodd" clip-rule="evenodd" d="M16.6821 3.93914C13.1631 0.420284 7.45801 0.420284 3.93914 3.93914C0.420283 7.45801 0.420283 13.1633 3.93914 16.6821C7.45801 20.201 13.1631 20.201 16.6821 16.6821C20.201 13.1633 20.201 7.45801 16.6821 3.93914ZM3.01991 3.01991C7.04645 -1.00664 13.5747 -1.00664 17.6013 3.01991C21.5931 7.01169 21.6276 13.4623 17.7047 17.4964L23.7215 23.5132C23.9754 23.7671 23.9754 24.1787 23.7215 24.4326C23.4677 24.6864 23.0561 24.6864 22.8023 24.4326L16.7411 18.3713C12.693 21.609 6.77091 21.3524 3.01991 17.6014C-1.00664 13.5747 -1.00664 7.04645 3.01991 3.01991Z" fill="currentColor"/>
                    </g>
                `;
            }
        }
    };

    zoomContainers.forEach((container) => {
        const containerEl = container as HTMLElement;

        containerEl.addEventListener('mousemove', (e: MouseEvent) => {
            if (cursorElement) {
                cursorElement.style.left = `${e.clientX}px`;
                cursorElement.style.top = `${e.clientY}px`;
                cursorElement.style.display = 'block';
            }
        });

        containerEl.addEventListener('mouseleave', () => {
            if (cursorElement) {
                cursorElement.style.display = 'none';
            }
        });

        containerEl.addEventListener('click', (e: MouseEvent) => {
            if (swiper.zoom) {
                const zoomScale = (swiper as any).zoom?.scale || 1;
                const isZoomed =
                    zoomScale > 1 || (swiper as any).zoomed === true;

                if (isZoomed) {
                    swiper.zoom.out();
                    setTimeout(updateZoomState, 50);
                } else {
                    e.preventDefault();
                    e.stopPropagation();
                    (swiper.zoom.in as any)(e);
                    setTimeout(updateZoomState, 50);
                }
            }
        });
    });
    updateZoomState();
    return swiper;
}

customElements.define(
    'product-images-swiper',
    class ProductImagesSwiper extends HTMLElement {
        private swiper: any | null = null;

        connectedCallback(): void {
            if (!this.isProductPage()) {
                return;
            }

            requestAnimationFrame(() => {
                const swiperElement = this.querySelector(
                    '.main-slider',
                ) as HTMLElement | null;
                if (!swiperElement) return;

                if (swiperElement.hasAttribute('data-swiper-initialized')) {
                    return;
                }

                const wrapper = swiperElement.querySelector('.swiper-wrapper');
                if (!wrapper || wrapper.children.length === 0) {
                    setTimeout(() => {
                        this.initializeSwiper(swiperElement);
                    }, 100);
                    return;
                }

                this.initializeSwiper(swiperElement);
            });
        }

        private isProductPage(): boolean {
            return (
                document.body.classList.contains('template-product') ||
                window.location.pathname.includes('/products/') ||
                this.closest('product-form') !== null
            );
        }

        private initializeSwiper(element: HTMLElement): void {
            this.swiper = initProductSwiper(element, {
                onSlideChange: (swiper) => {
                    const gallery = this.closest('.product-gallery');
                    if (gallery) {
                        gallery.setAttribute(
                            'data-active-slide',
                            swiper.activeIndex.toString(),
                        );
                    }
                },
            });

            element.setAttribute('data-swiper-initialized', 'true');
        }

        disconnectedCallback(): void {
            if (this.swiper) {
                this.swiper.destroy(true, true);
                this.swiper = null;
            }
        }
    },
);
