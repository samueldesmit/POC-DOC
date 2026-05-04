import { publish } from '../global.js';
import { customElement } from '../utilities/decorators';

@customElement('modal-toggle')
export class ModalToggle extends HTMLElement {
    private _target: string;
    private _disabled: boolean = false;
    private _delayTime: number = 300;
    private _button: HTMLElement;

    static get observedAttributes() {
        return ['target', 'disabled', 'delay-time'];
    }

    get target(): string {
        return this._target;
    }

    set target(value: string) {
        this._target = value;
        this.setAttribute('target', value);
    }

    get disabled(): boolean {
        return this._disabled;
    }

    set disabled(value: boolean) {
        this._disabled = value;
        if (value) {
            this.setAttribute('disabled', '');
        } else {
            this.removeAttribute('disabled');
        }
    }

    get delayTime(): number {
        return this._delayTime;
    }

    set delayTime(value: number) {
        this._delayTime = value;
        this.setAttribute('delay-time', value.toString());
    }

    get button(): HTMLElement {
        return this._button || this;
    }

    constructor() {
        super();
        this._button = this.querySelector('button') || this;
        this.handleClick = this.handleClick.bind(this);

        // Add pointer cursor style
        this.style.cursor = 'pointer';
        if (this._button instanceof HTMLButtonElement) {
            this._button.style.cursor = 'pointer';
        }
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (oldValue === newValue) return;

        switch (name) {
            case 'target':
                this._target = newValue;
                break;
            case 'disabled':
                this._disabled = newValue !== null;
                break;
            case 'delay-time':
                this._delayTime = parseInt(newValue, 10) || 300;
                break;
        }
    }

    connectedCallback() {
        // Initialize properties from attributes
        this._target = this.getAttribute('target') || '';
        this._disabled = this.hasAttribute('disabled');
        this._delayTime = parseInt(
            this.getAttribute('delay-time') || '300',
            10,
        );

        // Add event listener
        this.button.addEventListener('click', this.handleClick);
    }

    disconnectedCallback() {
        this.button.removeEventListener('click', this.handleClick);
    }

    private handleClick(event: Event) {
        if (this.disabled || !this.target) {
            return;
        }

        event.preventDefault();

        // Check if the delay-modal class is present
        if (this.classList.contains('delay-modal')) {
            // Delay the modal opening
            setTimeout(() => {
                publish('modalToggle', { id: this.target, trigger: this });
            }, this.delayTime);
        } else {
            // Open the modal immediately
            publish('modalToggle', { id: this.target, trigger: this });
        }
    }
}
