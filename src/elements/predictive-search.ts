import axios from 'axios';
import { debounce, subscribe } from '../global.js';

customElements.define(
    'predictive-search',
    class PredictiveSearch extends HTMLElement {
        inputElement!: HTMLInputElement;
        resultsSectionId!: string;
        resourceTypes!: string;
        debouncedOnInputChange!: (event: Event) => void;
        private unsubscribe?: () => void;

        connectedCallback(): void {
            this.inputElement = this.querySelector(
                '[data-target="predictive-search.input"]',
            )!;
            this.resultsSectionId = this.dataset.sectionId || '';
            this.resourceTypes = this.dataset.resourceTypes || 'product';

            this.debouncedOnInputChange = debounce(
                this.onInputChange.bind(this),
                300,
            );

            if (this.inputElement) {
                this.inputElement.addEventListener(
                    'input',
                    this.debouncedOnInputChange,
                );
            }

            this.unsubscribe = subscribe(
                'modalDialogUpdate',
                ({ open, current }: { open?: boolean; current?: HTMLElement }) => {
                    if (open && current && this.contains(current) && this.inputElement) {
                        setTimeout(() => this.inputElement.focus(), 50);
                    }
                },
            );
        }

        disconnectedCallback(): void {
            if (this.inputElement && this.debouncedOnInputChange) {
                this.inputElement.removeEventListener(
                    'input',
                    this.debouncedOnInputChange,
                );
            }
            this.unsubscribe?.();
        }

        async onInputChange(event: Event): Promise<void> {
            const input = event.target as HTMLInputElement;
            const searchTerm = input.value.trim();
            if (!searchTerm) return;

            const target = document.querySelector(
                '.predictive-search-results',
            );
            target?.setAttribute('data-loading', '');

            const url = `/search/suggest?q=${encodeURIComponent(searchTerm)}&resources[type]=${this.resourceTypes}&section_id=${this.resultsSectionId}&resources[options][fields]=title,tag,product_type,variants.title`;

            try {
                const response = await axios.get(url);
                const parser = new DOMParser();
                const dom = parser.parseFromString(response.data, 'text/html');
                const section = dom.querySelector('.predictive-search-results');

                if (section && target) {
                    target.innerHTML = section.innerHTML;
                }
            } catch (error) {
                // Ignore search errors
            } finally {
                target?.removeAttribute('data-loading');
            }
        }
    },
);
