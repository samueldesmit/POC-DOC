import { customElement } from '../utilities/decorators';

@customElement('add-to-cart-quantity-input')
export class AddToCartQuantityInput extends HTMLElement {
    private boundQuantityInputHandler: () => void;
    private boundButtonClickHandler: (event: Event) => void;
    private boundClickHandler: (event: Event) => void;

    constructor() {
        super();
        this.boundQuantityInputHandler =
            this.quantityInputRulesHandler.bind(this);
        this.boundButtonClickHandler = this.handleButtonClick.bind(this);
        this.boundClickHandler = ((e: Event) => {
            const target = e.target as Element;
            if (target.closest('button')) {
                this.boundButtonClickHandler(e);
            }
        }).bind(this);
    }

    get input(): HTMLInputElement {
        return this.querySelector('[data-input]');
    }
    get buttons(): NodeListOf<HTMLButtonElement> {
        return this.querySelectorAll('button');
    }
    get decreaseButton(): HTMLButtonElement {
        return this.querySelector('[data-action="decrease"]');
    }
    get increaseButton(): HTMLButtonElement {
        return this.querySelector('[data-action="increase"]');
    }

    connectedCallback(): void {
        this.addEventListener('change', this.boundQuantityInputHandler);
        this.addEventListener('click', this.boundClickHandler);
    }

    private handleButtonClick(event: Event): void {
        const target = event.target as Element;
        const button = target.closest('button') as HTMLButtonElement;

        // Check if button exists and has the correct action
        if (!button || !button.dataset.action) return;

        const action = button.dataset.action;

        // Only handle quantity control buttons
        if (action === 'decrease' || action === 'increase') {
            event.preventDefault();

            const input = this.input;
            if (!input) return;

            const currentValue = input.value;
            action === 'decrease' ? input.stepDown() : input.stepUp();

            const changeEvent = new Event('change', { bubbles: true });
            if (currentValue !== input.value) input.dispatchEvent(changeEvent);
        }
    }

    private quantityInputRulesHandler(): void {
        const min = parseInt(this.input.min) || 0;
        const max = parseInt(this.input.max) || Infinity;
        const value = parseInt(this.input.value) || 0;

        this.decreaseButton.disabled = value <= min;
        this.increaseButton.disabled = value >= max;

        // Dispatch a custom event to notify parent components of quantity change
        const quantityChangeEvent = new CustomEvent('quantity:changed', {
            detail: { quantity: value },
            bubbles: true,
            composed: true,
        });
        this.dispatchEvent(quantityChangeEvent);
    }

    disconnectedCallback(): void {
        this.removeEventListener('change', this.boundQuantityInputHandler);
        this.removeEventListener('click', this.boundClickHandler);
    }
}
