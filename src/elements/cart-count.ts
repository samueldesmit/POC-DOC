import { customElement } from '../utilities/decorators';

interface CartUpdateEvent {
    detail: {
        item_count: number;
    };
}

@customElement('cart-count')
export class CartCount extends HTMLElement {
    private currentCount: number;

    connectedCallback(): void {
        // Initialize with the server-side count
        const rawCount = this.textContent?.replace(/[()]/g, '') || '0';
        this.currentCount = parseInt(rawCount, 10);
        this.updateDisplay(this.currentCount);

        document.addEventListener(
            'cartUpdate',
            this.handleCartUpdate.bind(this),
        );
    }

    disconnectedCallback(): void {
        document.removeEventListener(
            'cartUpdate',
            this.handleCartUpdate.bind(this),
        );
    }

    private handleCartUpdate(
        event: CustomEvent<CartUpdateEvent['detail']>,
    ): void {
        const count = event.detail?.item_count;

        // Only update if we have a valid count
        if (typeof count === 'number') {
            this.currentCount = count;
            this.updateDisplay(count);
        }
    }

    private updateDisplay(count: number): void {
        this.textContent = count > 0 ? `${count}` : '';
        this.toggleAttribute('data-active', count > 0);
    }
}
