import { subscribe, getTargets } from '../global.js';

interface SectionData {
    sections: {
        [key: string]: string;
    };
    direction?: number;
}

interface TargetElements {
    pagination: HTMLElement[];
    grid: HTMLElement[];
}

customElements.define(
    'product-grid',
    class ProductGrid extends HTMLElement {
        private unsubscribe?: () => void;
        private unsubscribeFilterChange?: () => void;
        private unsubscribePagination?: () => void;
        private isLoadingMore = false;
        private autoLoadObserver?: IntersectionObserver;
        private loadTimeout?: ReturnType<typeof setTimeout> | null;

        connectedCallback(): void {
            const sectionId: string =
                this.closest('product-collection')?.getAttribute(
                    'data-section-id',
                ) || '';

            // Subscribe to loading state - toggle data-loading attribute
            this.unsubscribeFilterChange = subscribe('filterChange', (isLoading: boolean) => {
                this.toggleAttribute('data-loading', isLoading);
            });

            this.unsubscribe = subscribe(
                'productsUpdate',
                ({ sections }: SectionData) => {
                    const section = sections[sectionId];

                    if (section) {
                        const newProductGrid = new DOMParser()
                            .parseFromString(section, 'text/html')
                            .querySelector('product-grid');
                        if (newProductGrid) {
                            this.replaceWith(newProductGrid);
                        }
                    }
                },
            );

            this.addEventListener('click', (e: MouseEvent) => {
                const link = (e.target as Element).closest('a');

                if (link && link.hasAttribute('data-page')) {
                    const page = link.getAttribute('data-page');

                    const searchParams = new URLSearchParams(location.search);
                    searchParams.set('page', page || '1');
                    let urlWithoutOrigin =
                        window.location.pathname + window.location.search;

                    const url = `${window.location.pathname}?${searchParams}`;

                    if (urlWithoutOrigin !== url) {
                        e.preventDefault();
                        history.pushState(
                            { searchParams: `${searchParams}` },
                            '',
                            url,
                        );
                        setTimeout(() => link.click());
                    }
                }
            });

            this.unsubscribePagination = subscribe(
                'productsUpdatePage',
                ({ sections, direction }: SectionData) => {
                    const section = sections[sectionId];

                    if (section) {
                        const newProductGrid = new DOMParser()
                            .parseFromString(section, 'text/html')
                            .querySelector(
                                'product-grid',
                            ) as HTMLElement | null;

                        if (!newProductGrid) return;

                        const {
                            pagination: [pagination] = [],
                            grid: [grid] = [],
                        } = getTargets(this) as unknown as TargetElements;

                        const {
                            pagination: [newPagination] = [],
                            grid: [newGrid] = [],
                        } = getTargets(
                            newProductGrid as HTMLElement,
                        ) as unknown as TargetElements;

                        if (!grid || !newGrid) return;

                        const newProducts = [
                            ...newGrid.children,
                        ] as HTMLElement[];

                        if (direction && direction >= 0) {
                            // Next
                            if (pagination && newPagination) {
                                pagination.replaceWith(newPagination);
                            }
                            grid.append(...newProducts);
                        } else {
                            // Previous
                            grid.prepend(...newProducts);
                            if (pagination && newPagination) {
                                pagination.replaceWith(newPagination);
                            }
                        }
                    }
                },
            );

            // Load more pagination logic - simplified like inspiration code
            const productCollection =
                this.closest('product-collection') || document;
            const loadMoreButtons = productCollection.querySelectorAll(
                '[data-load-more]',
            ) as NodeListOf<HTMLElement>;
            const loadNextElement = productCollection.querySelector(
                '[data-load-next]',
            ) as HTMLElement | null;

            // Get current page from URL or default to 1
            const getCurrentPage = (): number => {
                const urlParams = new URLSearchParams(window.location.search);
                const page = urlParams.get('page');
                return page ? parseInt(page, 10) : 1;
            };

            let currentPage = getCurrentPage();

            const loadNextPage = async (): Promise<void> => {
                if (this.isLoadingMore) return;

                this.isLoadingMore = true;
                if (loadNextElement) {
                    loadNextElement.classList.add('active');
                }

                currentPage += 1;

                // Build URL with current params + new page
                const nextPageParams = new URLSearchParams(
                    window.location.search,
                );
                nextPageParams.set('page', currentPage.toString());

                try {
                    const requestUrl = `${window.location.pathname}?${nextPageParams.toString()}&sections=${sectionId}`;
                    const res = await fetch(requestUrl).then((r) => r.json());

                    const resHTML = new DOMParser().parseFromString(
                        res[sectionId],
                        'text/html',
                    );
                    const resGridEl = resHTML.querySelector(
                        '[data-products-grid]',
                    ) as HTMLElement | null;

                    if (!resGridEl) {
                        this.isLoadingMore = false;
                        return;
                    }

                    const currentGrid = this.querySelector(
                        '[data-products-grid]',
                    ) as HTMLElement | null;

                    if (!currentGrid) {
                        this.isLoadingMore = false;
                        return;
                    }

                    // Simple append like inspiration code
                    currentGrid.innerHTML += resGridEl.innerHTML;

                    // Update "Viewed X of Y" text
                    const viewedCountEl = productCollection.querySelector(
                        '[data-viewed-count]',
                    ) as HTMLElement | null;
                    if (viewedCountEl) {
                        const pageSize = parseInt(
                            viewedCountEl.getAttribute('data-page-size') || '0',
                            10,
                        );
                        const total = parseInt(
                            viewedCountEl.getAttribute('data-total') || '0',
                            10,
                        );
                        const viewed = Math.min(pageSize * currentPage, total);
                        const template = viewedCountEl.getAttribute('data-template') || `You've viewed ${viewed} of ${total} products`;
                        viewedCountEl.textContent = template
                            .replace('VIEWED_PLACEHOLDER', String(viewed))
                            .replace('TOTAL_PLACEHOLDER', String(total));
                    }

                    // Update URL
                    window.history.pushState(
                        {},
                        '',
                        `${window.location.pathname}?${nextPageParams.toString()}`,
                    );

                    // Check if there's a load next button in the response
                    const resLoadNextButton = resHTML.querySelector(
                        '[data-load-next]',
                    ) as HTMLElement | null;

                    // Find the load next element again (it might have been updated)
                    const updatedLoadNextElement =
                        productCollection.querySelector(
                            '[data-load-next]',
                        ) as HTMLElement | null;

                    if (updatedLoadNextElement) {
                        updatedLoadNextElement.classList.remove('active');
                        // Hide button if no more pages
                        if (!resLoadNextButton) {
                            updatedLoadNextElement.style.display = 'none';
                        } else {
                            // Re-setup observer if we're on desktop and there are more pages
                            if (window.innerWidth >= 1440 && hasUserScrolled) {
                                setTimeout(() => {
                                    setupAutoLoad(true);
                                }, 100);
                            }
                        }
                    }
                } catch (error) {
                    // Ignore product load errors
                } finally {
                    this.isLoadingMore = false;
                }
            };

            const loadPrevPage = async (): Promise<void> => {
                if (this.isLoadingMore) return;

                this.isLoadingMore = true;
                const prevButton = productCollection.querySelector(
                    '[data-load-more="prev"]',
                ) as HTMLElement | null;

                if (prevButton) {
                    prevButton.classList.add('active');
                }

                currentPage -= 1;

                if (currentPage < 1) {
                    this.isLoadingMore = false;
                    return;
                }

                // Build URL with current params + new page
                const prevPageParams = new URLSearchParams(
                    window.location.search,
                );
                prevPageParams.set('page', currentPage.toString());

                try {
                    const requestUrl = `${window.location.pathname}?${prevPageParams.toString()}&sections=${sectionId}`;
                    const res = await fetch(requestUrl).then((r) => r.json());

                    const resHTML = new DOMParser().parseFromString(
                        res[sectionId],
                        'text/html',
                    );
                    const resGridEl = resHTML.querySelector(
                        '[data-products-grid]',
                    ) as HTMLElement | null;

                    if (!resGridEl) {
                        this.isLoadingMore = false;
                        return;
                    }

                    const currentGrid = this.querySelector(
                        '[data-products-grid]',
                    ) as HTMLElement | null;

                    if (!currentGrid) {
                        this.isLoadingMore = false;
                        return;
                    }

                    // Prepend previous page products
                    currentGrid.innerHTML =
                        resGridEl.innerHTML + currentGrid.innerHTML;

                    // Update URL
                    window.history.pushState(
                        {},
                        '',
                        `${window.location.pathname}?${prevPageParams.toString()}`,
                    );

                    // Hide prev button if on page 1
                    if (prevButton) {
                        prevButton.classList.remove('active');
                        if (currentPage === 1) {
                            prevButton.classList.add('hidden');
                        }
                    }
                } catch (error) {
                    // Ignore product load errors
                } finally {
                    this.isLoadingMore = false;
                }
            };

            // Add event listeners to load more buttons
            loadMoreButtons.forEach((btn) => {
                const direction = btn.getAttribute('data-load-more') as
                    | 'prev'
                    | 'next'
                    | null;
                if (direction === 'next') {
                    btn.addEventListener('click', async (e: MouseEvent) => {
                        e.preventDefault();
                        await loadNextPage();
                    });
                } else if (direction === 'prev') {
                    btn.addEventListener('click', async (e: MouseEvent) => {
                        e.preventDefault();
                        await loadPrevPage();
                    });
                }
            });

            // Simple IntersectionObserver for auto-loading (desktop only)
            // Auto-load on desktop (>= 1440px), manual button click on mobile
            let hasUserScrolled = false;
            let initialSetupDone = false;

            const setupAutoLoad = (force: boolean = false): void => {
                // Clear any pending timeout
                if (this.loadTimeout) {
                    clearTimeout(this.loadTimeout);
                    this.loadTimeout = null;
                }

                // Disconnect existing observer if any
                if (this.autoLoadObserver) {
                    this.autoLoadObserver.disconnect();
                    this.autoLoadObserver = undefined;
                }

                const currentLoadNextElement = productCollection.querySelector(
                    '[data-load-next]',
                ) as HTMLElement | null;

                if (!currentLoadNextElement) return;

                const isDesktop = window.innerWidth >= 1440;

                if (isDesktop) {
                    // On initial setup, check if element is already visible
                    // If it is and user hasn't scrolled, don't set up observer yet
                    if (!force && !initialSetupDone) {
                        const rect =
                            currentLoadNextElement.getBoundingClientRect();
                        const distanceFromViewport =
                            rect.top - window.innerHeight;

                        // If element is already visible/close and user hasn't scrolled, skip
                        if (distanceFromViewport < 300 && !hasUserScrolled) {
                            return;
                        }
                    }

                    initialSetupDone = true;

                    // Clear any existing timeout
                    if (this.loadTimeout) {
                        clearTimeout(this.loadTimeout);
                        this.loadTimeout = null;
                    }

                    const observer = new IntersectionObserver(
                        (entries) => {
                            if (
                                entries[0].isIntersecting &&
                                !this.isLoadingMore
                            ) {
                                // Only trigger if user has scrolled (prevent immediate trigger on page load)
                                if (hasUserScrolled) {
                                    // Clear any existing timeout
                                    if (this.loadTimeout) {
                                        clearTimeout(this.loadTimeout);
                                    }

                                    // Delay auto-load by 1.5 seconds so user can see the button
                                    this.loadTimeout = setTimeout(() => {
                                        if (!this.isLoadingMore) {
                                            observer.unobserve(
                                                entries[0].target,
                                            );
                                            loadNextPage();
                                        }
                                        this.loadTimeout = null;
                                    }, 500);
                                }
                            } else {
                                // Element is no longer intersecting, clear timeout
                                if (this.loadTimeout) {
                                    clearTimeout(this.loadTimeout);
                                    this.loadTimeout = null;
                                }
                            }
                        },
                        {
                            rootMargin: '300px',
                            threshold: 0.1,
                        },
                    );
                    this.autoLoadObserver = observer;
                    observer.observe(currentLoadNextElement);
                }
            };

            // Track when user scrolls and re-setup observer
            const handleScroll = (): void => {
                if (!hasUserScrolled) {
                    hasUserScrolled = true;
                }
                // Always re-setup observer on scroll (in case button position changed)
                if (window.innerWidth >= 1440) {
                    setupAutoLoad(true);
                }
            };

            // Set up observer after user scrolls
            window.addEventListener('scroll', handleScroll, { passive: true });

            // Initial setup - will be skipped if button is already visible
            // If button is far enough, set up observer immediately
            setTimeout(() => {
                const currentLoadNextElement = productCollection.querySelector(
                    '[data-load-next]',
                ) as HTMLElement | null;

                if (currentLoadNextElement) {
                    const rect = currentLoadNextElement.getBoundingClientRect();
                    const distanceFromViewport = rect.top - window.innerHeight;

                    // If element is far enough (> 300px), set up observer immediately
                    if (distanceFromViewport >= 300) {
                        setupAutoLoad();
                    }
                }
            }, 500);

            // Re-setup on window resize (in case user switches between mobile/desktop)
            let resizeTimeout: ReturnType<typeof setTimeout>;
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => {
                    setupAutoLoad();
                }, 250);
            });
        }

        disconnectedCallback(): void {
            if (this.unsubscribe) this.unsubscribe();
            if (this.unsubscribeFilterChange) this.unsubscribeFilterChange();
            if (this.unsubscribePagination) this.unsubscribePagination();
            if (this.autoLoadObserver) {
                this.autoLoadObserver.disconnect();
            }
            if (this.loadTimeout) {
                clearTimeout(this.loadTimeout);
                this.loadTimeout = null;
            }
        }
    },
);
