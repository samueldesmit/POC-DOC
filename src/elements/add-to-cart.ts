import { publish } from '../global.js';
import { customElement } from '../utilities/decorators';
import { handleCartUpdate } from '../utilities/cart';

interface CartResponse {
    status?: number;
    description?: string;
    item_count: number;
    sections?: Record<string, string>;
}

@customElement('add-to-cart')
export class AddToCart extends HTMLElement {
    private quantity: number = 1;
    private _loading: boolean = false;
    private sectionId: string = 'cart-drawer';

    get button(): HTMLButtonElement | null {
        return this.querySelector('[data-atc-button]');
    }

    get quantityInput(): HTMLElement | null {
        return this.querySelector('[data-quantity-input]');
    }

    get errorContainer(): HTMLElement | null {
        return this.closest('.add-to-cart-box')?.querySelector(
            '.add-to-cart-error-container',
        );
    }

    set loading(value: boolean) {
        if (value === this._loading) return;
        this._loading = value;
        this.toggleAttribute('data-loading', value);
        this.button?.toggleAttribute('disabled', value);

        if (value) {
            this.showLoadingSpinner();
        } else {
            this.hideLoadingSpinner();
        }
    }

    get loading(): boolean {
        return this._loading;
    }

    private showLoadingSpinner(): void {
        const button = this.button;
        if (!button) return;

        const buttonSpinner = button.querySelector('.button-spinner');
        if (buttonSpinner) {
            buttonSpinner.classList.remove('hidden');
        }
        const atcIcon = button.querySelector('.atc-icon');
        if (atcIcon) {
            atcIcon.classList.add('invisible');
        }
    }

    private hideLoadingSpinner(): void {
        const button = this.button;
        if (!button) return;

        const buttonSpinner = button.querySelector('.button-spinner');
        if (buttonSpinner) {
            buttonSpinner.classList.add('hidden');
        }
        const atcIcon = button.querySelector('.atc-icon');
        if (atcIcon) {
            atcIcon.classList.remove('invisible');
        }
    }

    private createFormData(): FormData {
        const formData = new FormData();
        const form = this.closest('form');

        if (!form) return formData;

        const idInput = form.querySelector(
            'input[name="id"]',
        ) as HTMLInputElement;
        if (!idInput?.value) return formData;

        formData.append('items[0][id]', idInput.value);
        if (this.quantityInput?.hasAttribute('data-atc-quantity-input')) {
            formData.append('items[0][quantity]', '1');
        } else {
            formData.append(
                'items[0][quantity]',
                this.quantity?.toString() || '1',
            );
        }
        formData.append('sections', this.sectionId);

        return formData;
    }

    private async addToCart(): Promise<void> {
        if (this.quantityInput?.hasAttribute('data-atc-quantity-input')) {
            const input = this.quantityInput?.querySelector(
                '[data-input]',
            ) as HTMLInputElement;
            if (input) {
                input.value = '1';
                input.setAttribute('value', '1');
            }
            const changeEvent = new Event('change', { bubbles: true });
            input.dispatchEvent(changeEvent);

            return;
        }

        const formData = this.createFormData();
        formData.append('sections_url', window.location.pathname);

        this.loading = true;
        this.toggleError();

        try {
            const response = await fetch(window.routes.cart_add_url, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    Accept: 'application/javascript',
                },
            });

            const cartData: CartResponse = await response.json();

            if (cartData.status) {
                this.toggleError(cartData.description, true);
                return;
            }

            // Wait for cart update and section refresh to complete
            await handleCartUpdate(cartData, this.sectionId, 'add-to-cart');

            this.resetQuantityInput();

            // Only open drawer after cart is updated (unless it's a PLP)
            if (this.quantityInput?.hasAttribute('data-atc-quantity-input'))
                return;
            publish('modalToggle', {
                id: 'cart-drawer',
                open: true,
            });
        } catch (error) {
            // Ignore add-to-cart errors
        } finally {
            this.loading = false;
        }
    }

    private toggleError(error: string = '', show: boolean = false): void {
        if (!this.errorContainer) return;
        if (show) {
            this.errorContainer.innerHTML = error;
            this.errorContainer.removeAttribute('hidden');
        } else {
            this.errorContainer.innerHTML = '';
            this.errorContainer.setAttribute('hidden', '');
        }
    }

    private updateQuantity(event: Event): void {
        const target = event.target as HTMLInputElement;
        this.quantity = parseInt(target.value, 10) || 1;
    }

    private resetQuantityInput() {
        const input = this.quantityInput?.querySelector(
            '[data-input]',
        ) as HTMLInputElement;
        if (input) {
            input.value = '1';
            input.setAttribute('value', '1');

            if (this.quantityInput?.hasAttribute('data-atc-quantity-input'))
                return;

            const changeEvent = new Event('change', { bubbles: true });
            input.dispatchEvent(changeEvent);
        }
    }

    connectedCallback(): void {
        this.button?.addEventListener('click', () => this.addToCart());
        this.quantityInput?.addEventListener('change', (e) =>
            this.updateQuantity(e),
        );
        this.closest('pdp-details-box')?.addEventListener(
            'options:changed',
            () => {
                this.toggleError();
                this.resetQuantityInput();
            },
        );
    }

    disconnectedCallback(): void {
        this.button?.removeEventListener('click', () => this.addToCart());
        this.quantityInput?.removeEventListener('change', (e) =>
            this.updateQuantity(e),
        );
        this.closest('pdp-details-box')?.removeEventListener(
            'options:changed',
            () => {
                this.toggleError();
                this.resetQuantityInput();
            },
        );
    }
}
