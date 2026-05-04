interface CartItem {
    id: number;
    variant_id: number;
    quantity: number;
    title: string;
}

interface CartResponse {
    item_count: number;
    status?: number;
    description?: string;
    sections?: Record<string, string>;
    items?: CartItem[];
}

/**
 * Dispatches cart update event
 */
function dispatchCartEvent(
    cartData: CartResponse,
    source?: 'add-to-cart',
): void {
    document.dispatchEvent(
        new CustomEvent('cartUpdate', {
            bubbles: true,
            detail: {
                item_count: cartData.item_count,
                sections: cartData.sections,
                items: cartData.items,
                source,
            },
        }),
    );
}

/**
 * Updates UI sections after cart changes
 */
export async function handleCartUpdate(
    cartData: CartResponse,
    sectionId?: string,
    source?: 'add-to-cart',
): Promise<void> {
    // If item_count is missing (e.g. /cart/add.js response), fetch full cart data
    if (typeof cartData.item_count !== 'number') {
        const cartResponse = await fetch(`${window.routes.cart_url}.js`, {
            headers: { Accept: 'application/json' },
        });
        if (cartResponse.ok) {
            const fullCart = (await cartResponse.json()) as CartResponse;
            cartData.item_count = fullCart.item_count;
        }
    }

    dispatchCartEvent(cartData, source);

    const promises: Promise<void>[] = [];
    if (sectionId) promises.push(refreshCartSection(sectionId));

    if (promises.length > 0) await Promise.all(promises);
}

/**
 * Refreshes the cart drawer section content
 */
export async function refreshCartSection(sectionId: string): Promise<void> {
    const sectionsResponse = await fetch(
        `${window.location.pathname}?sections=${sectionId}`,
    );

    if (!sectionsResponse.ok) {
        throw new Error('Failed to fetch updated cart content');
    }

    const sections = await sectionsResponse.json();

    // Parse and replace the entire cart form
    const parser = new DOMParser();
    const doc = parser.parseFromString(sections[sectionId], 'text/html');
    const newCartForm = doc.querySelector('cart-form');

    if (newCartForm) {
        // Find and replace the existing cart form
        const existingCartForm = document.querySelector('cart-form');
        if (existingCartForm) {
            existingCartForm.replaceWith(newCartForm);
        }
    }
}

/**
 * Updates the cart and refreshes the UI
 */
export async function updateCart(options: {
    url: string;
    method?: 'POST' | 'GET';
    body?: FormData | string;
    headers?: Record<string, string>;
    sectionId?: string;
    source?: 'add-to-cart';
}): Promise<CartResponse> {
    const {
        url,
        method = 'POST',
        body,
        headers = {},
        sectionId,
        source,
    } = options;

    const response = await fetch(url, {
        method,
        headers: {
            Accept: 'application/json',
            ...headers,
        },
        ...(body ? { body } : {}),
    });

    if (!response.ok) {
        throw new Error('Failed to update cart');
    }

    const cartData = (await response.json()) as CartResponse;

    dispatchCartEvent(cartData, source);

    if (sectionId) {
        handleCartUpdate(cartData, sectionId, source).catch(() => {
            // Ignore UI update errors
        });
    }

    return cartData;
}
