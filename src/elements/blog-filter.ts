import { customElement } from '../utilities/decorators';
import { getTargets } from '../global.js';

interface BlogFilterTargets {
    search: HTMLInputElement[];
    list: HTMLUListElement[];
}

@customElement('blog-filter')
export class BlogFilter extends HTMLElement {
    private searchInput: HTMLInputElement | null = null;
    private listElement: HTMLUListElement | null = null;
    private allItems: HTMLLIElement[] = [];
    private accordionObserver: MutationObserver | null = null;

    connectedCallback(): void {
        const { search: [searchInput] = [], list: [listElement] = [] } =
            getTargets(this) as unknown as BlogFilterTargets;

        if (!searchInput || !listElement) return;

        this.searchInput = searchInput as HTMLInputElement;
        this.listElement = listElement as HTMLUListElement;
        this.allItems = Array.from(
            listElement.querySelectorAll<HTMLLIElement>('.blog-filter-item'),
        );
        this.searchInput.addEventListener(
            'input',
            this.handleSearch.bind(this),
        );

        // Handle filter link clicks to show loading state
        this.setupFilterLinkHandlers();

        // Handle clear filter link clicks
        this.setupClearFilterHandlers();

        // Focus input when accordion opens
        this.setupAccordionObserver();
    }

    disconnectedCallback(): void {
        // Clean up MutationObserver
        if (this.accordionObserver) {
            this.accordionObserver.disconnect();
            this.accordionObserver = null;
        }
    }

    private setupFilterLinkHandlers(): void {
        if (!this.listElement) return;

        // Find all filter links within this blog-filter component
        const filterLinks =
            this.listElement.querySelectorAll<HTMLAnchorElement>(
                'a[href*="/tagged/"], a[href*="/blogs/"]',
            );

        filterLinks.forEach((link) => {
            link.addEventListener('click', () => {
                // Add loading state to article cards
                this.setArticleCardsLoading(true);
            });
        });
    }

    private setupClearFilterHandlers(): void {
        // Find all clear filter links on the page
        const clearFilterLinks = document.querySelectorAll<HTMLAnchorElement>(
            'a[data-blog-clear-filter]',
        );

        clearFilterLinks.forEach((link) => {
            link.addEventListener('click', () => {
                // Add loading state to article cards when clearing filters
                this.setArticleCardsLoading(true);
            });
        });
    }

    private setArticleCardsLoading(isLoading: boolean): void {
        // Find all article cards in the blog section
        // Look for articles that contain links to blog articles
        const articleCards = document.querySelectorAll<HTMLElement>(
            'article:has(a[href*="/blogs/"])',
        );

        // Also find by section containers that have article grids
        const blogSections = document.querySelectorAll<HTMLElement>(
            'section.gap-8, section.gap-y-8',
        );

        // Apply loading state to section containers
        blogSections.forEach((section) => {
            if (isLoading) {
                section.setAttribute('data-loading', '');
            } else {
                section.removeAttribute('data-loading');
            }
        });

        // Apply loading state to individual article cards
        articleCards.forEach((card) => {
            if (isLoading) {
                card.setAttribute('data-loading', '');
            } else {
                card.removeAttribute('data-loading');
            }
        });
    }

    private setupAccordionObserver(): void {
        // Find the parent accordion component
        const accordionComponent = this.closest('accordion-component');
        if (!accordionComponent) return;

        // Find the accordion button
        const accordionButton =
            accordionComponent.querySelector<HTMLButtonElement>(
                '[data-target="accordion-component.button"]',
            );
        if (!accordionButton) return;

        // Observe changes to aria-expanded attribute
        this.accordionObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (
                    mutation.type === 'attributes' &&
                    mutation.attributeName === 'aria-expanded'
                ) {
                    const isExpanded =
                        accordionButton.getAttribute('aria-expanded') ===
                        'true';
                    if (isExpanded && this.searchInput) {
                        // Small delay to ensure accordion animation has started
                        setTimeout(() => {
                            this.searchInput?.focus();
                        }, 100);
                    }
                }
            });
        });

        this.accordionObserver.observe(accordionButton, {
            attributes: true,
            attributeFilter: ['aria-expanded'],
        });
    }

    private handleSearch(): void {
        if (!this.listElement || !this.searchInput) return;

        const searchTerm = this.searchInput.value.toLowerCase().trim();

        const existingNoResults = this.listElement.querySelector(
            '.blog-filter-no-results',
        );
        if (existingNoResults) {
            existingNoResults.remove();
        }

        if (searchTerm.length === 0) {
            this.allItems.forEach((item) => {
                item.style.display = '';
            });
            return;
        }

        let visibleCount = 0;
        this.allItems.forEach((item) => {
            const searchValue = item.getAttribute('data-search-value') || '';
            const matches = searchValue.includes(searchTerm);

            if (matches) {
                item.style.display = '';
                visibleCount++;
            } else {
                item.style.display = 'none';
            }
        });

        if (visibleCount === 0) {
            const noResults = document.createElement('li');
            noResults.className =
                'blog-filter-no-results p-2 text-sm text-primary/60 text-center';
            noResults.textContent =
                (window as any).translations?.blogs?.no_results ||
                'No results found';
            this.listElement.appendChild(noResults);
        }
    }
}
