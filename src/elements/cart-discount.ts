import { customElement } from '../utilities/decorators';
import { handleCartUpdate } from '../utilities/cart';

interface CartDiscountResponse {
    item_count: number;
    status?: number;
    description?: string;
    sections?: Record<string, string>;
    discount_codes?: Array<{
        code: string;
        applicable: boolean;
    }>;
}

interface ShopifyWindow extends Window {
    Shopify?: {
        routes?: {
            root?: string;
        };
    };
}

@customElement('cart-discount-component')
export class CartDiscountComponent extends HTMLElement {
    private sectionId: string | null = null;
    private abortController: AbortController | null = null;
    private form: HTMLFormElement | null = null;
    private discountInput: HTMLInputElement | null = null;
    private errorContainer: HTMLElement | null = null;
    private errorDiscountCode: HTMLElement | null = null;
    private errorShipping: HTMLElement | null = null;

    private getRefs(): void {
        this.errorContainer = this.querySelector('[ref="cartDiscountError"]');
        this.errorDiscountCode = this.querySelector(
            '[ref="cartDiscountErrorDiscountCode"]',
        );
        this.errorShipping = this.querySelector(
            '[ref="cartDiscountErrorShipping"]',
        );
    }

    private createAbortController(): AbortController {
        this.abortController?.abort();
        this.abortController = new AbortController();
        return this.abortController;
    }

    private existingDiscounts(): string[] {
        return Array.from(this.querySelectorAll('.cart-discount__pill-remove'))
            .filter(
                (pill): pill is HTMLElement =>
                    pill instanceof HTMLElement &&
                    typeof pill.dataset.discountCode === 'string',
            )
            .map((pill) => pill.dataset.discountCode!);
    }

    private getCartUrl(): string {
        const shopifyWindow = window as ShopifyWindow;
        return shopifyWindow.Shopify?.routes?.root
            ? `${shopifyWindow.Shopify.routes.root}cart/update.js`
            : '/cart/update.js';
    }

    private isShippingDiscount(code: string): boolean {
        const lower = code.toLowerCase();
        return lower.includes('shipping') || lower.includes('ship');
    }

    private handleDiscountError(
        type: 'discount_code' | 'shipping',
        discountCode?: string,
    ): void {
        if (
            !this.errorContainer ||
            !this.errorDiscountCode ||
            !this.errorShipping
        )
            return;

        const target =
            type === 'discount_code'
                ? this.errorDiscountCode
                : this.errorShipping;
        this.errorContainer.classList.remove('hidden');
        this.errorContainer.classList.add('flex');
        target.classList.remove('hidden');

        if (
            type === 'discount_code' &&
            discountCode &&
            this.errorDiscountCode
        ) {
            this.errorDiscountCode.textContent = `The discount code '${discountCode}' is not valid`;
        }
    }

    private hideErrors(): void {
        this.errorContainer?.classList.add('hidden');
        this.errorContainer?.classList.remove('flex');
        this.errorDiscountCode?.classList.add('hidden');
        this.errorShipping?.classList.add('hidden');
    }

    private extractDiscountCodesFromHtml(html: string): string[] {
        const parsed = new DOMParser().parseFromString(html, 'text/html');
        const section = parsed.getElementById(
            `shopify-section-${this.sectionId}`,
        );
        if (!section) return [];

        return Array.from(
            section.querySelectorAll('.cart-discount__pill-remove'),
        )
            .filter(
                (el): el is HTMLElement =>
                    el instanceof HTMLElement &&
                    typeof el.dataset.discountCode === 'string',
            )
            .map((el) => el.dataset.discountCode!);
    }

    private async updateCart(
        discountCodes: string[],
    ): Promise<CartDiscountResponse> {
        const response = await fetch(this.getCartUrl(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            signal: this.createAbortController().signal,
            body: JSON.stringify({
                discount: discountCodes.join(','),
                sections: [this.sectionId],
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to update cart');
        }

        return response.json();
    }

    private applyDiscount = async (event: SubmitEvent): Promise<void> => {
        event.preventDefault();
        event.stopPropagation();

        if (!this.form || !this.discountInput || !this.sectionId) return;

        const discountCodeValue = this.discountInput.value.trim();
        if (!discountCodeValue) return;

        const existingDiscounts = this.existingDiscounts();
        if (existingDiscounts.includes(discountCodeValue)) return;

        this.hideErrors();

        try {
            const data = await this.updateCart([
                ...existingDiscounts,
                discountCodeValue,
            ]);

            // Check if discount code is not applicable
            const nonApplicableDiscount = data.discount_codes?.find(
                (d) => d.code === discountCodeValue && d.applicable === false,
            );

            if (nonApplicableDiscount) {
                this.discountInput.value = '';
                const isShipping = this.isShippingDiscount(discountCodeValue);
                this.handleDiscountError(
                    isShipping ? 'shipping' : 'discount_code',
                    isShipping ? undefined : discountCodeValue,
                );
                return;
            }

            // Check if it's a shipping-only discount (applicable but not shown in UI)
            if (data.sections?.[this.sectionId]) {
                const codes = this.extractDiscountCodesFromHtml(
                    data.sections[this.sectionId],
                );
                const isApplicableShipping =
                    codes.length === existingDiscounts.length &&
                    codes.every((code) => existingDiscounts.includes(code)) &&
                    data.discount_codes?.some(
                        (d) =>
                            d.code === discountCodeValue &&
                            d.applicable === true,
                    );

                if (isApplicableShipping) {
                    this.handleDiscountError('shipping');
                    this.discountInput.value = '';
                    return;
                }

                await handleCartUpdate(data, this.sectionId);
            }
        } catch (error) {
            // Ignore non-abort errors
        } finally {
            this.abortController = null;
        }
    };

    private removeDiscount = async (
        event: MouseEvent | KeyboardEvent,
    ): Promise<void> => {
        event.preventDefault();
        event.stopPropagation();

        if (
            (event instanceof KeyboardEvent && event.key !== 'Enter') ||
            !this.sectionId
        ) {
            return;
        }

        const button = (event.target as HTMLElement).closest(
            '.cart-discount__pill-remove',
        ) as HTMLElement | null;
        const discountCode = button?.dataset.discountCode;
        if (!discountCode) return;

        const existingDiscounts = this.existingDiscounts();
        const updatedDiscounts = existingDiscounts.filter(
            (code) => code !== discountCode,
        );
        if (updatedDiscounts.length === existingDiscounts.length) return;

        try {
            const data = await this.updateCart(updatedDiscounts);
            if (data.sections?.[this.sectionId]) {
                await handleCartUpdate(data, this.sectionId);
            }
        } catch (error) {
            // Ignore non-abort errors
        } finally {
            this.abortController = null;
        }
    };

    connectedCallback(): void {
        this.sectionId = this.getAttribute('data-section-id');
        if (!this.sectionId) {
            return;
        }

        this.getRefs();
        this.form = this.querySelector('form');
        this.discountInput = this.querySelector('input[name="discount"]');

        if (!this.form || !this.discountInput) {
            return;
        }

        this.form.addEventListener('submit', this.applyDiscount);
        this.addEventListener('click', this.handleRemoveClick);
    }

    private handleRemoveClick = (event: MouseEvent): void => {
        const target = event.target as HTMLElement;
        const button = target.closest('.cart-discount__pill-remove');
        if (button) {
            this.removeDiscount(event);
        }
    };

    disconnectedCallback(): void {
        if (this.form) {
            this.form.removeEventListener('submit', this.applyDiscount);
        }

        this.removeEventListener('click', this.handleRemoveClick);

        if (this.abortController) {
            this.abortController.abort();
        }
    }
}
