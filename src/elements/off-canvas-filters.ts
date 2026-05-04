import { customElement } from '../utilities/decorators';

@customElement('off-canvas-filters')
export class OffcanvasFilters extends HTMLElement {
    private filterButtons: NodeListOf<HTMLButtonElement> | null = null;
    private filterBackButtons: NodeListOf<HTMLButtonElement> | null = null;

    connectedCallback(): void {
        this.filterButtons = this.querySelectorAll('.filter-button');
        this.filterBackButtons = this.querySelectorAll('.filter-back-button');

        this.filterButtons.length > 0 &&
            this.filterButtons.forEach((filterButton) => {
                filterButton.addEventListener(
                    'click',
                    this.handleFilterButtonClick.bind(this),
                );
            });

        this.filterBackButtons.length > 0 &&
            this.filterBackButtons.forEach((filterBackButton) => {
                filterBackButton.addEventListener(
                    'click',
                    this.handleFilterBackButtonClick.bind(this),
                );
            });
    }

    disconnectedCallback(): void {
        this.filterButtons?.length > 0 &&
            this.filterButtons.forEach((filterButton) => {
                filterButton.removeEventListener(
                    'click',
                    this.handleFilterButtonClick.bind(this),
                );
            });

        this.filterBackButtons?.length > 0 &&
            this.filterBackButtons.forEach((filterBackButton) => {
                filterBackButton.removeEventListener(
                    'click',
                    this.handleFilterBackButtonClick.bind(this),
                );
            });
    }

    handleFilterButtonClick(event: Event): void {
        const button = event.currentTarget as HTMLButtonElement;
        const filterContent = button.closest('li')?.querySelector(
            '.filter-content',
        ) as HTMLDivElement;

        if (filterContent !== null) {
            filterContent.dataset.open = 'true';
        }
    }

    handleFilterBackButtonClick(event: Event): void {
        const backbutton = event.currentTarget as HTMLButtonElement;
        const filterContent = backbutton.closest(
            '.filter-content',
        ) as HTMLDivElement;

        if (filterContent !== null) {
            filterContent.removeAttribute('data-open');
        }
    }
}
