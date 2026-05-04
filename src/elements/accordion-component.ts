import { customElement } from '../utilities/decorators';
import { getTargets } from '../global.js';

interface AccordionTargets {
    button: HTMLButtonElement[];
}

@customElement('accordion-component')
export class AccordionComponent extends HTMLElement {
    private boundClickOutside: (e: MouseEvent) => void;

    constructor() {
        super();
        this.boundClickOutside = this.handleClickOutside.bind(this);
    }

    connectedCallback(): void {
        const { button: [button] = [] } = getTargets<AccordionTargets>(this);
        if (!button) return;

        const group = this.getAttribute('data-group');

        button.addEventListener('click', () => {
            const isExpanded = button.getAttribute('aria-expanded') === 'true';
            const newState = !isExpanded;
            button.setAttribute('aria-expanded', newState.toString());

            if (group === 'plp-filters') {
                if (newState) {
                    setTimeout(() => {
                        document.addEventListener(
                            'click',
                            this.boundClickOutside,
                        );
                    }, 0);
                } else {
                    document.removeEventListener(
                        'click',
                        this.boundClickOutside,
                    );
                }
            }

            // close others in group
            if (group) {
                const groupSelector = `accordion-component[data-group="${group}"]`;
                const groupAccordions = Array.from(
                    document.querySelectorAll<AccordionComponent>(
                        groupSelector,
                    ),
                );

                groupAccordions
                    .filter((accordion) => accordion !== this)
                    .forEach((accordion) => {
                        const { button: [groupButton] = [] } =
                            getTargets<AccordionTargets>(accordion);
                        if (groupButton) {
                            groupButton.setAttribute('aria-expanded', 'false');
                        }
                        // Remove click outside listener from closed accordions
                        document.removeEventListener(
                            'click',
                            (accordion as AccordionComponent).boundClickOutside,
                        );
                    });
            }
        });
    }

    disconnectedCallback(): void {
        document.removeEventListener('click', this.boundClickOutside);
    }

    private handleClickOutside(e: MouseEvent): void {
        if (!this.contains(e.target as Node)) {
            const { button: [button] = [] } =
                getTargets<AccordionTargets>(this);
            if (button) {
                button.setAttribute('aria-expanded', 'false');
            }
            document.removeEventListener('click', this.boundClickOutside);
        }
    }
}
