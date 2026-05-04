import { customElement } from '../utilities/decorators';
import { updateCart } from '../utilities/cart';

interface CartUpdateEventDetail {
    source: string;
    items: Array<{
        id?: number;
        variant_id?: number;
        quantity: number;
    }>;
}

@customElement('atc-quantity-input')
export class ATCQuantityInput extends HTMLElement {
    private static readonly DEBOUNCE_DELAY = 750;
    private static readonly DEFAULT_QUANTITY = '1';
    private static readonly MIN_QUANTITY = '0';
    private static readonly MIN_VALUE = 0;

    private boundQuantityInputHandler: () => void;
    private boundButtonClickHandler: (event: Event) => void;
    private boundClickHandler: (event: Event) => void;
    private boundCartUpdateHandler: (
        event: CustomEvent<CartUpdateEventDetail>,
    ) => void;
    private boundInputKeydownHandler: (event: KeyboardEvent) => void;
    private debounceTimer: ReturnType<typeof setTimeout> | null = null;

    constructor() {
        super();
        this.boundQuantityInputHandler =
            this.quantityInputRulesHandler.bind(this);
        this.boundButtonClickHandler = this.handleButtonClick.bind(this);
        this.boundClickHandler = this.handleClick.bind(this);
        this.boundCartUpdateHandler = this.handleCartUpdate.bind(this);
        this.boundInputKeydownHandler = this.handleInputKeydown.bind(this);
    }

    get input(): HTMLInputElement | null {
        return this.querySelector<HTMLInputElement>('[data-input]');
    }
    get buttons(): NodeListOf<HTMLButtonElement> {
        return this.querySelectorAll('button');
    }
    get decreaseButton(): HTMLButtonElement | null {
        return this.querySelector<HTMLButtonElement>(
            '[data-action="decrease"]',
        );
    }
    get increaseButton(): HTMLButtonElement | null {
        return this.querySelector<HTMLButtonElement>(
            '[data-action="increase"]',
        );
    }

    connectedCallback(): void {
        const input = this.input;
        if (!input) return;

        this.addEventListener('change', this.boundQuantityInputHandler);
        this.addEventListener('click', this.boundClickHandler);
        window.addEventListener('cartUpdate', this.boundCartUpdateHandler);
        input.addEventListener('keydown', this.boundInputKeydownHandler);
    }

    private handleClick(event: Event): void {
        const target = event.target as Element;
        if (target.closest('button')) {
            this.boundButtonClickHandler(event);
        }
    }

    private handleButtonClick(event: Event): void {
        event.preventDefault();
        const input = this.input;
        if (!input) return;

        const target = event.target as Element;
        const button = target.closest<HTMLButtonElement>('button');
        if (!button) return;

        const action = button.dataset.action;
        const currentValue = input.value;

        action === 'decrease' ? input.stepDown() : input.stepUp();

        if (currentValue !== input.value) {
            const changeEvent = new Event('change', { bubbles: true });
            input.dispatchEvent(changeEvent);
        }
    }

    private setInputValue(value: string | number): void {
        const input = this.input;
        if (!input) return;

        const stringValue = String(value);
        input.value = stringValue;
        input.setAttribute('value', stringValue);
    }

    private getVariantId(): number | null {
        const input = this.input;
        if (!input?.dataset.index) return null;

        const variantId = Number(input.dataset.index);
        return isNaN(variantId) ? null : variantId;
    }

    private async handleCartUpdate(
        event: CustomEvent<CartUpdateEventDetail>,
    ): Promise<void> {
        const input = this.input;
        if (!input) return;

        if (event.detail.source === 'add-to-cart') {
            const variantId = this.getVariantId();
            if (variantId && event.detail.items[0]?.id === variantId) {
                this.setInputValue(ATCQuantityInput.DEFAULT_QUANTITY);
            }
            return;
        }

        const currentVariantId = this.getVariantId();
        if (!currentVariantId) return;

        const foundItem = event.detail.items.find(
            (item) => item.variant_id === currentVariantId,
        );

        if (foundItem) {
            this.setInputValue(foundItem.quantity);
        } else {
            this.setInputValue(ATCQuantityInput.MIN_QUANTITY);
        }
    }

    private async quantityInputRulesHandler(): Promise<void> {
        const input = this.input;
        if (!input) return;

        const min = ATCQuantityInput.MIN_VALUE;
        const max = parseInt(input.max) || Infinity;
        let value = parseInt(input.value) || min;

        if (isNaN(value) || value < min) {
            this.setInputValue(min);
            value = min;
        } else if (value > max && max !== Infinity) {
            this.setInputValue(max);
            value = max;
        }

        const increaseButton = this.increaseButton;
        if (increaseButton) {
            increaseButton.disabled = value >= max;
        }

        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        this.debounceTimer = setTimeout(async () => {
            const productCard = this.closest<HTMLElement>('plp-product-card');
            const productInfoBox = this.closest<HTMLElement>(
                '[data-product-info-box]',
            );
            const loadingElement = productCard || productInfoBox;

            loadingElement?.setAttribute('data-loading', 'true');

            try {
                const variantId = input.dataset.index;
                if (!variantId) return;

                await updateCart({
                    url: '/cart/update.js',
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        updates: { [variantId]: value },
                    }),
                    sectionId: 'cart-drawer',
                });
            } catch (error) {
                // Ignore stock update errors
            } finally {
                loadingElement?.removeAttribute('data-loading');
            }
        }, ATCQuantityInput.DEBOUNCE_DELAY);
    }

    private handleInputKeydown(event: KeyboardEvent): void {
        if (event.key === 'Enter') {
            event.preventDefault();
            this.input?.blur();
        }
    }

    disconnectedCallback(): void {
        const input = this.input;

        this.removeEventListener('change', this.boundQuantityInputHandler);
        this.removeEventListener('click', this.boundClickHandler);
        window.removeEventListener('cartUpdate', this.boundCartUpdateHandler);
        if (input) {
            input.removeEventListener('keydown', this.boundInputKeydownHandler);
        }

        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
    }
}
