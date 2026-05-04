import { subscribe, publish } from '../global.js';

interface ProductsUpdateEvent {
    sections: {
        [key: string]: string;
    };
}

customElements.define(
    'sort-form',
    class SortForm extends HTMLElement {
        private unsubscribe?: () => void;

        connectedCallback(): void {
            const sectionId: string | null =
                this.closest('product-collection')?.getAttribute(
                    'data-section-id',
                );

            this.unsubscribe = subscribe('productsUpdate', () => {
                this.toggleAttribute('data-loading', false);
            });

            this.querySelector('form')?.addEventListener(
                'input',
                async (e: Event) => {
                    e.preventDefault();

                    this.toggleAttribute('data-loading', true);

                    // Get current search parameters from URL
                    const currentSearchParams = new URLSearchParams(
                        window.location.search,
                    );
                    const currentSearchQuery = currentSearchParams.get('q');

                    // Get sort form data
                    const sortForm = (e.target as HTMLInputElement).form;
                    let sortParams = '';
                    if (sortForm) {
                        const formData = new FormData(sortForm);
                        const cleanedFormData = new FormData();

                        // Only include non-empty values
                        for (const [key, value] of formData.entries()) {
                            if (value !== '') {
                                cleanedFormData.append(key, value);
                            }
                        }

                        sortParams = new URLSearchParams(
                            cleanedFormData as unknown as Record<
                                string,
                                string
                            >,
                        ).toString();
                    }

                    // Get filter parameters if any
                    const filterForm = document.querySelector(
                        'filters-form form',
                    ) as HTMLFormElement | null;
                    let filterParams = '';
                    if (filterForm) {
                        const formData = new FormData(filterForm);
                        const cleanedFormData = new FormData();

                        // Only include non-empty values
                        for (const [key, value] of formData.entries()) {
                            if (value !== '') {
                                cleanedFormData.append(key, value);
                            }
                        }

                        filterParams = new URLSearchParams(
                            cleanedFormData as unknown as Record<
                                string,
                                string
                            >,
                        ).toString();
                    }

                    // Construct the URL with search query first if it exists
                    let finalUrl = window.location.pathname;
                    if (currentSearchQuery) {
                        finalUrl += `?q=${encodeURIComponent(currentSearchQuery)}`;

                        // Add filter parameters
                        if (filterParams) {
                            finalUrl += `&${filterParams}`;
                        }

                        // Add sort parameters
                        if (sortParams) {
                            finalUrl += `&${sortParams}`;
                        }
                    } else {
                        // No search query, just add filter and sort params
                        if (filterParams) {
                            finalUrl += `?${filterParams}`;
                        }

                        if (sortParams) {
                            finalUrl += finalUrl.includes('?')
                                ? `&${sortParams}`
                                : `?${sortParams}`;
                        }
                    }

                    try {
                        const sections = await fetch(
                            `${finalUrl}${finalUrl.includes('?') ? '&' : '?'}sections=${sectionId}`,
                        ).then((r) => r.json());

                        publish('productsUpdate', { sections });

                        // Update URL in browser
                        window.history.pushState(
                            { searchQuery: currentSearchQuery },
                            '',
                            finalUrl,
                        );
                    } catch (error) {
                        // Ignore product/URL update errors
                    }
                },
            );
        }

        disconnectedCallback(): void {
            if (this.unsubscribe) this.unsubscribe();
        }
    },
);
