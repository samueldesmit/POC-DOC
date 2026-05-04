import { customElement } from '../utilities/decorators';

@customElement('offcanvas-menu')
export class OffcanvasMenu extends HTMLElement {
    private resizeObserver: ResizeObserver;
    private header: HTMLElement | null;

    get links(): NodeListOf<HTMLAnchorElement> {
        return this.querySelectorAll('a');
    }

    get buttons(): NodeListOf<HTMLButtonElement> {
        return this.querySelectorAll('button');
    }

    constructor() {
        super();
        this.header = document.querySelector('header');
        this.resizeObserver = new ResizeObserver(
            this.updateHeaderOffset.bind(this),
        );
    }

    connectedCallback(): void {
        this.links.length > 0 &&
            this.links.forEach((link) => {
                link.addEventListener('click', this.handleLinkClick.bind(this));
            });

        this.buttons.length > 0 &&
            this.buttons.forEach((button) => {
                button.addEventListener(
                    'click',
                    this.handleButtonClick.bind(this),
                );
            });

        if (this.header) {
            this.resizeObserver.observe(this.header);
            this.updateHeaderOffset();
            window.addEventListener(
                'scroll',
                this.updateHeaderOffset.bind(this),
            );
            window.addEventListener(
                'resize',
                this.updateHeaderOffset.bind(this),
            );
        }
    }

    disconnectedCallback(): void {
        this.links.length > 0 &&
            this.links.forEach((link) => {
                link.removeEventListener(
                    'click',
                    this.handleLinkClick.bind(this),
                );
            });

        this.buttons.length > 0 &&
            this.buttons.forEach((button) => {
                button.removeEventListener(
                    'click',
                    this.handleButtonClick.bind(this),
                );
            });

        if (this.header) {
            this.resizeObserver.unobserve(this.header);
            window.removeEventListener(
                'scroll',
                this.updateHeaderOffset.bind(this),
            );
            window.removeEventListener(
                'resize',
                this.updateHeaderOffset.bind(this),
            );
        }
    }

    private updateHeaderOffset(): void {
        if (this.header) {
            const headerRect = this.header.getBoundingClientRect();
            const headerHeight = headerRect.height;
            const headerTop = Math.max(0, headerRect.top);
            document.documentElement.style.setProperty(
                '--header-offset',
                `${headerTop + headerHeight}px`,
            );
        }
    }

    handleLinkClick(event: Event) {
        const _this = event.currentTarget as HTMLAnchorElement;
        const childrenDiv = _this.parentElement?.querySelector(
            'div',
        ) as HTMLDivElement;

        if (childrenDiv !== null) {
            event.preventDefault();
            childrenDiv.dataset.open = 'true';
        }
    }

    handleButtonClick(event: Event) {
        const _this = event.currentTarget as HTMLButtonElement;
        const parent = _this.parentElement as HTMLDivElement;

        if (parent !== null) {
            parent.removeAttribute('data-open');
        }
    }
}
