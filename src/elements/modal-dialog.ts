import { subscribe, getTargets, publish } from '../global.js';
import { disablePageScroll, enablePageScroll } from '@fluejs/noscroll';
import { customElement } from 'lit/decorators.js';

interface ModalDialogEventDetail {
    open?: boolean;
    id?: string;
    trigger?: HTMLElement;
    instant?: boolean;
    current?: HTMLElement;
    previous?: HTMLElement;
}

interface ModalDialogHandlers {
    escapeKeydown?: (e: KeyboardEvent) => void;
}

@customElement('modal-dialog')
export class ModalDialog extends HTMLElement {
    private handlers: ModalDialogHandlers = {};
    private subscriptions: (() => void)[] = [];
    private trigger?: HTMLElement;
    private previous?: HTMLElement;

    connectedCallback(): void {
        const { content: [content] = [] } = getTargets(this);
        const id = this.getAttribute('data-id');

        if (!content) {
            throw Error('Modal dialog has no content! Add a content target.');
        }

        const header = document.querySelector(
            '#main-header-nav',
        ) as HTMLElement;
        document.body.style.setProperty(
            '--header-height',
            `${header.getBoundingClientRect().height}px`,
        );

        this.handlers.escapeKeydown = (e: KeyboardEvent) => {
            if (
                e.key === 'Escape' &&
                this.hasAttribute('data-open') &&
                !this.hasAttribute('data-previous')
            ) {
                publish('modalToggle', { open: false, id: id });
            }
        };

        this.subscriptions = [
            subscribe(
                'modalToggle',
                ({
                    id: toggleId,
                    open = !this.hasAttribute('data-open'),
                    trigger,
                    instant = false,
                }: ModalDialogEventDetail) => {
                    if (
                        id === toggleId &&
                        open !== this.hasAttribute('data-open')
                    ) {
                        const elements = [
                            this,
                            ...Array.from(this.children),
                        ].filter(Boolean) as HTMLElement[];

                        if (open) {
                            // Close other modals in the same group
                            const group = this.getAttribute('data-modal-group');
                            if (group) {
                                document.querySelectorAll(
                                    `${this.tagName}[data-modal-group="${group}"][data-open]:not([data-id="${id}"])`,
                                ).forEach((sibling) => {
                                    const siblingId = sibling.getAttribute('data-id');
                                    if (siblingId) {
                                        publish('modalToggle', { open: false, id: siblingId, instant: true });
                                    }
                                });
                            }

                            this.toggleAttribute('data-open', true);

                            document.addEventListener(
                                'keydown',
                                this.handlers.escapeKeydown as EventListener,
                            );

                            this.trigger = trigger;

                            // Stay visible till leave transition is over
                            this.toggleAttribute('data-visible', true);
                            publish('modalDialogUpdate', {
                                open: true,
                                current: this,
                            });

                            this.trapFocus();
                            disablePageScroll();

                            // Attach previously opened modal
                            this.previous = document.querySelector(
                                `${this.tagName}[data-open]:not([data-previous]):not([data-id="${id}"])`,
                            );

                            if (this.previous) {
                                this.previous.toggleAttribute(
                                    'data-previous',
                                    true,
                                );

                                // Layer on top
                                this.style.zIndex = (
                                    parseInt(
                                        getComputedStyle(
                                            this.previous,
                                        ).getPropertyValue('z-index'),
                                    ) + 10
                                ).toString();
                            }

                            elements.forEach((e) => {
                                if (instant) {
                                    e.style.setProperty(
                                        'transition-duration',
                                        '0ms',
                                    );
                                    setTimeout(() =>
                                        e.style.removeProperty(
                                            'transition-duration',
                                        ),
                                    );
                                }

                                if (
                                    'toggle' in e &&
                                    typeof e.toggle === 'function'
                                ) {
                                    // Allow for JavaScript on open, like animations or focus
                                    e.toggle(true, instant);
                                }

                                e.toggleAttribute('data-open', true);
                            });
                        } else {
                            this.toggleAttribute('data-open', false);

                            document.removeEventListener(
                                'keydown',
                                this.handlers.escapeKeydown as EventListener,
                            );

                            elements.forEach((e) =>
                                e.toggleAttribute('data-leave', true),
                            );

                            if (this.previous) {
                                // Restore focus to previous
                                this.releaseFocus();
                                (this.previous as any).trapFocus();
                                this.previous.toggleAttribute(
                                    'data-previous',
                                    false,
                                );
                            } else {
                                this.releaseFocus(this.trigger);
                            }

                            const cleanupAfterClosing = () => {
                                elements.forEach((e) =>
                                    e.toggleAttribute('data-leave', false),
                                );

                                const open = this.hasAttribute('data-open');

                                this.toggleAttribute('data-visible', open);

                                if (!open) {
                                    this.style.removeProperty('z-index');

                                    if (!this.previous) {
                                        enablePageScroll();
                                        publish('modalDialogUpdate', {
                                            open: false,
                                            previous: this,
                                        });
                                    } else {
                                        publish('modalDialogUpdate', {
                                            open: true,
                                            current: this.previous,
                                        });
                                    }
                                }
                            };

                            if (instant) {
                                cleanupAfterClosing();
                            } else {
                                setTimeout(
                                    cleanupAfterClosing,
                                    parseInt(
                                        getComputedStyle(this).getPropertyValue(
                                            '--leave-duration',
                                        ),
                                    ),
                                );
                            }

                            elements.forEach((e) => {
                                if (instant) {
                                    e.style.setProperty(
                                        'transition-duration',
                                        '0ms',
                                    );
                                    setTimeout(() =>
                                        e.style.removeProperty(
                                            'transition-duration',
                                        ),
                                    );
                                }

                                if (
                                    'toggle' in e &&
                                    typeof e.toggle === 'function'
                                ) {
                                    // Allow for JavaScript on close, like animations
                                    e.toggle(false, instant).then(() =>
                                        e.toggleAttribute(
                                            'data-open',
                                            this.hasAttribute('data-open'),
                                        ),
                                    );
                                } else {
                                    e.toggleAttribute(
                                        'data-open',
                                        this.hasAttribute('data-open'),
                                    );
                                }
                            });
                        }
                    }
                },
            ),
        ];
    }

    private trapFocus(): void {
        const getFirstAndLastFocusableElements = () => {
            const focusableElements = this.querySelectorAll(
                'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
            );

            return {
                first: focusableElements[0] as HTMLElement,
                last: focusableElements[
                    focusableElements.length - 1
                ] as HTMLElement,
            };
        };

        const { first } = getFirstAndLastFocusableElements();
        first?.focus();

        this.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Tab') {
                const { first, last } = getFirstAndLastFocusableElements();
                const { activeElement } = document;

                if (!e.shiftKey && activeElement === last) {
                    e.preventDefault();
                    first?.focus();
                }

                if (e.shiftKey && activeElement === first) {
                    e.preventDefault();
                    last?.focus();
                }
            }
        });
    }

    private releaseFocus(elementToFocus?: HTMLElement): void {
        if (elementToFocus) {
            elementToFocus.focus();
        }
    }

    disconnectedCallback(): void {
        this.subscriptions.forEach((unsubscribe) => unsubscribe());
        document.removeEventListener(
            'keydown',
            this.handlers.escapeKeydown as EventListener,
        );
    }
}
