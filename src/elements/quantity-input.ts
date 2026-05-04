import { customElement } from '../utilities/decorators';

@customElement('quantity-input')
export class QuantityInput extends HTMLElement {
    private timeout: number | undefined;

    connectedCallback(): void {
        const input = this.querySelector<HTMLInputElement>(
            '[data-target="quantity-input.input"]',
        );
        const valueDisplay = this.querySelector<HTMLSpanElement>(
            '[data-target="quantity-input.value"]',
        );
        const plus = this.querySelector<HTMLButtonElement>(
            '[data-target="quantity-input.plus"]',
        );
        const minus = this.querySelector<HTMLButtonElement>(
            '[data-target="quantity-input.minus"]',
        );
        const remove = this.querySelector<HTMLButtonElement>(
            '[data-target="quantity-input.remove"]',
        );

        if (!input) return;

        const invalidChars = ['-', '+', 'e', 'E'];

        const updateDisplay = (value: string): void => {
            if (valueDisplay) {
                valueDisplay.textContent = value;
            }
        };

        const handleQuantityChange = (isKeyboardNav = false): void => {
            // Clear any existing timeout
            clearTimeout(this.timeout);

            const currentValue = parseInt(input.value);

            // Update display immediately
            updateDisplay(input.value);

            // If it's keyboard navigation without Enter, don't update cart
            if (isKeyboardNav) {
                // Just update button states
                if (input.min) {
                    minus?.toggleAttribute(
                        'disabled',
                        currentValue <= parseInt(input.min),
                    );
                }
                if (input.max) {
                    plus?.toggleAttribute(
                        'disabled',
                        currentValue >= parseInt(input.max),
                    );
                }
                return;
            }

            // Set a new timeout for mouse clicks and Enter key
            this.timeout = window.setTimeout(() => {
                if (!isNaN(currentValue) && currentValue >= 0) {
                    // Update button states
                    if (input.min) {
                        minus?.toggleAttribute(
                            'disabled',
                            currentValue <= parseInt(input.min),
                        );
                    }
                    if (input.max) {
                        plus?.toggleAttribute(
                            'disabled',
                            currentValue >= parseInt(input.max),
                        );
                    }

                    // Trigger form change event for cart update
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }, 300); // 300ms delay
        };

        const handleButtonClick = (button: HTMLButtonElement): void => {
            const previousValue = input.value;

            switch (button) {
                case plus:
                    input.stepUp();
                    updateDisplay(input.value);
                    break;
                case minus:
                    input.stepDown();
                    updateDisplay(input.value);
                    break;
                case remove:
                    input.value = '0';
                    updateDisplay('0');
                    // For remove, update immediately without timeout
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                    return;
            }

            if (previousValue !== input.value) {
                handleQuantityChange(false);
            }
        };

        const handleButtonKeydown = (
            e: KeyboardEvent,
            button: HTMLButtonElement,
        ): void => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleButtonClick(button);
            }
        };

        [minus, plus, remove].filter(Boolean).forEach((button) => {
            if (button) {
                button.addEventListener('click', () =>
                    handleButtonClick(button),
                );
                button.addEventListener('keydown', (e) =>
                    handleButtonKeydown(e, button),
                );
            }
        });

        // Prevent form submission on Enter
        input.closest('form')?.addEventListener('submit', (e) => {
            e.preventDefault();
        });

        // Prevent invalid characters
        input.addEventListener('keydown', (e: KeyboardEvent) => {
            if (invalidChars.includes(e.key)) {
                e.preventDefault();
            }
            // Handle Enter key press
            if (e.key === 'Enter') {
                e.preventDefault();
                handleQuantityChange(false);
            }
        });

        // Handle quantity updates on keyup
        input.addEventListener('keyup', (e) => {
            if (e.key !== 'Enter') {
                handleQuantityChange(true);
            }
        });

        // Handle direct input changes (like paste)
        input.addEventListener('input', (e) => {
            // Check if the event is from a real input event (not programmatic)
            if (e.isTrusted) {
                handleQuantityChange(false);
            }
        });
    }

    disconnectedCallback(): void {
        if (this.timeout) {
            clearTimeout(this.timeout);
        }
    }
}
