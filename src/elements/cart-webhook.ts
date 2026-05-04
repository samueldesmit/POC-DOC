const WEBHOOK_URL =
    'https://shared-01.n8n.sition.cloud/webhook/975a37f7-2323-46a8-ac4c-d3c375b991dd';
const BUTTON_ID = 'webhook-test-button';

interface DraftOrderResponse {
    data?: {
        draftOrderCreate?: {
            draftOrder?: {
                id: string;
                totalPrice: string;
                invoiceUrl: string;
                status: string;
                name: string;
                createdAt: string;
            };
            userErrors?: Array<any>;
        };
    };
}

async function clearCart() {
    try {
        const response = await fetch('/cart/clear.js', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Failed to clear cart');
        }

        return true;
    } catch (error) {
        return false;
    }
}

function showInvoiceSuccessState(successMessage: string, emailMessage: string) {
    // Hide cart items
    const cartItems = document.querySelector('cart-items');
    if (cartItems) {
        const itemsContainer = cartItems.querySelector('.divide-y');
        if (itemsContainer) {
            itemsContainer.innerHTML = '';
        }

        // Show empty state with success message
        const emptyTemplate = cartItems.querySelector(
            'template[data-target="cart-items.empty"]',
        ) as HTMLTemplateElement;
        const existingEmpty = cartItems.querySelector(
            'div[data-target="cart-items.empty"]',
        );

        if (emptyTemplate && !existingEmpty) {
            const emptyContent = emptyTemplate.content.cloneNode(
                true,
            ) as DocumentFragment;
            const emptyDiv = document.createElement('div');
            emptyDiv.className =
                'flex h-full flex-col items-center justify-center py-16';
            emptyDiv.setAttribute('data-target', 'cart-items.empty');

            // Create success message
            emptyDiv.innerHTML = `
                <div class="mb-4 flex size-16 items-center justify-center rounded-full bg-[#A08735]/30">
                    <svg class="size-8 text-[#A08735]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                </div>
                <p class="mb-2 text-lg font-semibold text-surface-500">${successMessage}</p>
                <p class="mb-6 text-[0.9375rem] text-surface-400">${emailMessage}</p>
            `;

            cartItems.appendChild(emptyDiv);
        } else if (existingEmpty) {
            // Update existing empty state with success message
            existingEmpty.innerHTML = `
                <div class="mb-4 flex size-16 items-center justify-center rounded-full bg-[#A08735]/30">
                    <svg class="size-8 text-[#A08735]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                </div>
                <p class="mb-2 text-lg font-semibold text-surface-500">${successMessage}</p>
                <p class="mb-6 text-[0.9375rem] text-surface-400">${emailMessage}</p>
            `;
        }
    }

    // Hide the footer (checkout buttons, etc.)
    const footer = document.querySelector('[data-target="cart-form.footer"]');
    if (footer) {
        (footer as HTMLElement).style.display = 'none';
    }

    // Update cart count to 0
    const cartCounts = document.querySelectorAll('cart-count');
    cartCounts.forEach((count) => {
        count.textContent = '0';
    });

    // Update cart title item count
    const itemCountSpan = document.querySelector('#cart-drawer-title span:last-child');
    if (itemCountSpan) {
        itemCountSpan.textContent = '0 items';
    }

    // Hide free shipping bar if present
    const freeShippingBar = document.querySelector('[class*="free-shipping"]');
    if (freeShippingBar) {
        (freeShippingBar as HTMLElement).style.display = 'none';
    }
}

async function sendCartToWebhook() {
    try {
        // Fetch current cart data
        const cartResponse = await fetch('/cart.js', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!cartResponse.ok) {
            throw new Error('Failed to fetch cart data');
        }

        const cartData = await cartResponse.json();

        // Get customer email from data attribute or cart
        const customerEmail =
            document.documentElement.getAttribute('data-customer-email') ||
            null;

        // Send to webhook
        const webhookResponse = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                cart: cartData,
                customer: {
                    email: customerEmail,
                },
                timestamp: new Date().toISOString(),
                source: 'cart-drawer',
            }),
        });

        if (!webhookResponse.ok) {
            throw new Error(`Webhook failed: ${webhookResponse.status}`);
        }

        // Parse the response
        const responseData: DraftOrderResponse[] = await webhookResponse.json();
        // Check if draft order was created successfully
        if (responseData && responseData[0]?.data?.draftOrderCreate) {
            const { draftOrder, userErrors } =
                responseData[0].data.draftOrderCreate;

            // If draft order exists and no errors
            if (draftOrder && (!userErrors || userErrors.length === 0)) {
                return { success: true, draftOrder };
            } else if (userErrors && userErrors.length > 0) {
                return { success: false, errors: userErrors };
            }
        }

        return { success: true };
    } catch (error) {
        return { success: false, error };
    }
}

function showButtonFeedback(
    button: HTMLElement,
    success: boolean,
    message?: string,
) {
    const originalText = button.textContent;
    const originalClasses = button.className;

    if (success) {
        const successMessage = button.dataset.successMessage || 'Success';
        button.textContent = message || successMessage;
    } else {
        button.textContent = message || '✗ Error';
        button.classList.add('!bg-red-600', '!border-red-600', '!text-white');
    }

    if (!success) {
        setTimeout(() => {
            button.textContent = originalText;
            button.className = originalClasses;
        }, 3000);
    }
}

// Use event delegation to handle button clicks
document.addEventListener('click', async (event) => {
    const target = event.target as HTMLElement;

    // Check if clicked element or its parent is the webhook button
    const button =
        target.id === BUTTON_ID ? target : target.closest(`#${BUTTON_ID}`);

    if (button) {
        event.preventDefault();

        // Disable button during request
        if (button instanceof HTMLButtonElement) {
            button.disabled = true;
        }

        // Show loading state
        const originalText = button.textContent;
        button.textContent = 'Processing...';

        const result = await sendCartToWebhook();

        if (result.success) {
            // Clear the cart first
            await clearCart();

            const successMessage =
                (button as HTMLElement).dataset.successMessage || 'Invoice created!';
            const emailMessage =
                (button as HTMLElement).dataset.emailMessage ||
                "We'll send you an invoice by email.";
            showInvoiceSuccessState(successMessage, emailMessage);
        } else {
            showButtonFeedback(button as HTMLElement, false, '✗ Failed');

            // Re-enable button after error
            if (button instanceof HTMLButtonElement) {
                setTimeout(() => {
                    button.disabled = false;
                    button.textContent = originalText;
                }, 3000);
            }
        }
    }
});
