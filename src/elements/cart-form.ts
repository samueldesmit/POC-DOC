import { customElement } from '../utilities/decorators';
import { handleCartUpdate } from '../utilities/cart';

interface CartResponse {
    status?: number;
    description?: string;
    item_count: number;
    sections?: Record<string, string>;
}

@customElement('cart-form')
export class CartForm extends HTMLElement {
    private sectionId: string | null = null;
    private loadingOverlay: HTMLElement | null = null;

    connectedCallback(): void {
        this.sectionId = this.getAttribute('data-section-id');
        this.loadingOverlay = this.querySelector('[data-loading]');
        if (!this.sectionId) return;

        // Listen for quantity changes on any cart item forms
        this.addEventListener('change', this.handleQuantityChange.bind(this));
    }

    private setLoading(loading: boolean): void {
        if (this.loadingOverlay) {
            this.loadingOverlay.toggleAttribute('data-active', loading);
        }
    }

    private async handleQuantityChange(event: Event): Promise<void> {
        const target = event.target as HTMLInputElement;
        if (!target.dataset.index) return;

        const cartItem = target.closest('cart-item');
        if (cartItem) cartItem.toggleAttribute('data-loading', true);
        this.setLoading(true);

        try {
            const response = await fetch(
                `${window.routes.cart_change_url}.js`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                    },
                    body: JSON.stringify({
                        line: target.dataset.index,
                        quantity: target.value,
                    }),
                },
            );

            if (!response.ok) {
                throw new Error('Failed to update cart');
            }

            const cartData: CartResponse = await response.json();

            // Use the centralized handleCartUpdate function
            if (this.sectionId) {
                handleCartUpdate(cartData, this.sectionId);
            }
        } catch (error) {
            // Revert the input value on error
            const originalQuantity = target.defaultValue;
            target.value = originalQuantity;
        } finally {
            this.setLoading(false);
            if (cartItem) cartItem.toggleAttribute('data-loading', false);
        }
    }
}
