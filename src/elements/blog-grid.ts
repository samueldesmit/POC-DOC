customElements.define(
    'blog-grid',
    class BlogGrid extends HTMLElement {
        private isLoadingMore = false;
        private autoLoadObserver?: IntersectionObserver;
        private loadTimeout?: ReturnType<typeof setTimeout> | null;
        private lowestLoadedPage = 1;

        connectedCallback(): void {
            const sectionId =
                this.getAttribute('data-section-id') || '';

            const getCurrentPage = (): number => {
                const urlParams = new URLSearchParams(window.location.search);
                const page = urlParams.get('page');
                return page ? parseInt(page, 10) : 1;
            };

            let currentPage = getCurrentPage();
            this.lowestLoadedPage = currentPage;

            // Load Previous
            const loadPrevButton = this.querySelector(
                '[data-load-more="prev"]',
            ) as HTMLElement | null;

            if (loadPrevButton && currentPage > 1) {
                const loadPrevPage = async (): Promise<void> => {
                    if (this.isLoadingMore) return;
                    this.isLoadingMore = true;

                    const currentGrid = this.querySelector(
                        '[data-articles-grid]',
                    ) as HTMLElement | null;
                    if (!currentGrid) {
                        this.isLoadingMore = false;
                        return;
                    }

                    this.lowestLoadedPage -= 1;
                    if (this.lowestLoadedPage < 1) {
                        this.isLoadingMore = false;
                        return;
                    }

                    const params = new URLSearchParams(
                        window.location.search,
                    );
                    params.set('page', this.lowestLoadedPage.toString());

                    try {
                        const requestUrl = `${window.location.pathname}?${params.toString()}&sections=${sectionId}`;
                        const res = await fetch(requestUrl).then((r) =>
                            r.json(),
                        );

                        const resHTML = new DOMParser().parseFromString(
                            res[sectionId],
                            'text/html',
                        );
                        const resGridEl = resHTML.querySelector(
                            '[data-articles-grid]',
                        ) as HTMLElement | null;

                        if (resGridEl) {
                            currentGrid.innerHTML =
                                resGridEl.innerHTML + currentGrid.innerHTML;
                        }
                    } catch (error) {
                        // Ignore page load errors
                    } finally {
                        this.isLoadingMore = false;
                    }

                    if (this.lowestLoadedPage <= 1) {
                        const prevWrapper = loadPrevButton.parentElement;
                        if (prevWrapper) {
                            prevWrapper.style.display = 'none';
                        }
                    }
                };

                // Click handler
                loadPrevButton.addEventListener(
                    'click',
                    async (e: MouseEvent) => {
                        e.preventDefault();
                        await loadPrevPage();
                    },
                );

                // Auto-load all previous pages on init
                const loadAllPrevious = async (): Promise<void> => {
                    while (this.lowestLoadedPage > 1) {
                        await loadPrevPage();
                    }
                };

                loadAllPrevious();

                // Fetch page 1 to get correct filter data
                this.refreshFilters(sectionId);
            }

            // Load Next
            const loadMoreButton = this.querySelector(
                '[data-load-next]',
            ) as HTMLElement | null;

            if (!loadMoreButton) return;

            const loadNextPage = async (): Promise<void> => {
                if (this.isLoadingMore) return;

                this.isLoadingMore = true;
                loadMoreButton.classList.add('active');

                currentPage += 1;

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
                        '[data-articles-grid]',
                    ) as HTMLElement | null;

                    if (!resGridEl) {
                        this.isLoadingMore = false;
                        return;
                    }

                    const currentGrid = this.querySelector(
                        '[data-articles-grid]',
                    ) as HTMLElement | null;

                    if (!currentGrid) {
                        this.isLoadingMore = false;
                        return;
                    }

                    currentGrid.innerHTML += resGridEl.innerHTML;

                    // Update "Viewed X of Y" text
                    const viewedCountEl = this.querySelector(
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
                        const template =
                            viewedCountEl.getAttribute('data-template') || '';
                        viewedCountEl.textContent = template
                            .replace('VIEWED_PLACEHOLDER', viewed.toString())
                            .replace('TOTAL_PLACEHOLDER', total.toString());
                    }

                    window.history.pushState(
                        {},
                        '',
                        `${window.location.pathname}?${nextPageParams.toString()}`,
                    );

                    // Check if there are more pages
                    const resLoadNextButton = resHTML.querySelector(
                        '[data-load-next]',
                    ) as HTMLElement | null;

                    loadMoreButton.classList.remove('active');
                    if (!resLoadNextButton) {
                        const paginationFooter = loadMoreButton.closest(
                            '[data-pagination-footer]',
                        ) as HTMLElement | null;
                        if (paginationFooter) {
                            paginationFooter.style.display = 'none';
                        }
                    } else {
                        if (window.innerWidth >= 1440 && hasUserScrolled) {
                            setTimeout(() => {
                                setupAutoLoad(true);
                            }, 100);
                        }
                    }
                } catch (error) {
                    // Ignore article load errors
                } finally {
                    this.isLoadingMore = false;
                }
            };

            loadMoreButton.addEventListener('click', async (e: MouseEvent) => {
                e.preventDefault();
                await loadNextPage();
            });

            // Auto-load on desktop
            let hasUserScrolled = false;
            let initialSetupDone = false;

            const setupAutoLoad = (force: boolean = false): void => {
                if (this.loadTimeout) {
                    clearTimeout(this.loadTimeout);
                    this.loadTimeout = null;
                }

                if (this.autoLoadObserver) {
                    this.autoLoadObserver.disconnect();
                    this.autoLoadObserver = undefined;
                }

                if (!loadMoreButton) return;

                const isDesktop = window.innerWidth >= 1440;

                if (isDesktop) {
                    if (!force && !initialSetupDone) {
                        const rect = loadMoreButton.getBoundingClientRect();
                        const distanceFromViewport =
                            rect.top - window.innerHeight;
                        if (distanceFromViewport < 300 && !hasUserScrolled) {
                            return;
                        }
                    }

                    initialSetupDone = true;

                    const observer = new IntersectionObserver(
                        (entries) => {
                            if (
                                entries[0].isIntersecting &&
                                !this.isLoadingMore
                            ) {
                                if (hasUserScrolled) {
                                    if (this.loadTimeout) {
                                        clearTimeout(this.loadTimeout);
                                    }
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
                    observer.observe(loadMoreButton);
                }
            };

            const handleScroll = (): void => {
                if (!hasUserScrolled) {
                    hasUserScrolled = true;
                }
                if (window.innerWidth >= 1440) {
                    setupAutoLoad(true);
                }
            };

            window.addEventListener('scroll', handleScroll, { passive: true });

            setTimeout(() => {
                if (loadMoreButton) {
                    const rect = loadMoreButton.getBoundingClientRect();
                    const distanceFromViewport = rect.top - window.innerHeight;
                    if (distanceFromViewport >= 300) {
                        setupAutoLoad();
                    }
                }
            }, 500);

            let resizeTimeout: ReturnType<typeof setTimeout>;
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => {
                    setupAutoLoad();
                }, 250);
            });
        }

        private async refreshFilters(sectionId: string): Promise<void> {
            try {
                // Fetch without ?page= so the filter paginate block gets page 1
                const params = new URLSearchParams(window.location.search);
                params.delete('page');
                const query = params.toString();
                const url = `${window.location.pathname}${query ? '?' + query : ''}${query ? '&' : '?'}sections=${sectionId}`;
                const res = await fetch(url).then((r) => r.json());

                const resHTML = new DOMParser().parseFromString(
                    res[sectionId],
                    'text/html',
                );

                const newFilters = resHTML.querySelector(
                    '[data-blog-filters]',
                ) as HTMLElement | null;
                const currentFilters = this.closest('[id^="section-"]')?.querySelector(
                    '[data-blog-filters]',
                ) as HTMLElement | null;

                if (newFilters && currentFilters) {
                    currentFilters.innerHTML = newFilters.innerHTML;
                }
            } catch (error) {
                // Ignore filter refresh errors
            }
        }

        disconnectedCallback(): void {
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
