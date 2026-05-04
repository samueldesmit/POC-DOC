import { customElement } from '../utilities/decorators.js';

interface ProductVariant {
    variantId: number;
    color: string;
    size: string;
}

@customElement('plp-product-card')
export class PLPProductCard extends HTMLElement {
    private static readonly SECTION_ID = 'product-card-section';

    private productContainer: HTMLElement;
    private swatches: NodeListOf<HTMLElement> | null = null;
    private productCardContainer: HTMLElement | null = null;
    private boundShowMoreColors: (event: Event) => void;
    private swatchClickHandlers: Map<HTMLElement, () => void> = new Map();
    private showMoreColorsButtons: HTMLElement[] = [];

    constructor() {
        super();
        this.productContainer = this;
        this.boundShowMoreColors = this.showMoreColors.bind(this);
    }

    connectedCallback(): void {
        this.productCardContainer = this.productContainer.closest<HTMLElement>(
            '[data-product-card-container]',
        );

        // Fallback to the plp-product-card element itself if no container is found
        if (!this.productCardContainer) {
            this.productCardContainer = this.productContainer;
        }

        this.swatches = this.productContainer.querySelectorAll<HTMLElement>(
            '[data-variant-id], [data-color], [data-size]',
        );

        if (!this.swatches || this.swatches.length === 0) return;

        this.initializeSwatches();

        const buttons = this.productContainer.querySelectorAll<HTMLElement>(
            '.show-more-colors-btn',
        );
        buttons.forEach((btn) => {
            btn.addEventListener('click', this.boundShowMoreColors);
            this.showMoreColorsButtons.push(btn);
        });
    }

    private initializeSwatches(): void {
        if (!this.swatches) return;

        this.swatches.forEach((swatch) => {
            const handler = () => {
                this.handleSwatchClick(swatch);
            };
            swatch.addEventListener('click', handler);
            this.swatchClickHandlers.set(swatch, handler);
        });
    }

    private getVariants(): ProductVariant[] | null {
        const raw = this.productContainer.getAttribute('data-variants');
        if (!raw) return null;

        try {
            return JSON.parse(raw.replace(/'/g, '"')) as ProductVariant[];
        } catch (error) {
            return null;
        }
    }

    private getCurrentVariantId(): number | null {
        const variantIdStr = this.productContainer.dataset.variantId;
        if (!variantIdStr) return null;

        const variantId = Number(variantIdStr);
        return isNaN(variantId) ? null : variantId;
    }

    private findVariant(
        variants: ProductVariant[],
        swatch: HTMLElement,
        previousVariant: ProductVariant | undefined,
    ): ProductVariant | undefined {
        const colorChanged = !!swatch.dataset.color;
        const sizeChanged = !!swatch.dataset.size;

        if (colorChanged) {
            return variants.find(
                (variant) =>
                    variant.color === swatch.dataset.color &&
                    variant.size === previousVariant?.size,
            );
        }

        if (sizeChanged) {
            return variants.find(
                (variant) =>
                    variant.size === swatch.dataset.size &&
                    variant.color === previousVariant?.color,
            );
        }

        const currentVariantId = this.getCurrentVariantId();
        if (currentVariantId === null) return undefined;

        return variants.find(
            (variant) => variant.variantId === currentVariantId,
        );
    }

    private async handleSwatchClick(swatch: HTMLElement): Promise<void> {
        const variants = this.getVariants();
        if (!variants) return;

        const currentVariantId = this.getCurrentVariantId();
        if (currentVariantId === null) return;

        const previousVariant = variants.find(
            (variant) => variant.variantId === currentVariantId,
        );

        const newVariant = this.findVariant(variants, swatch, previousVariant);
        const variantId = newVariant?.variantId;

        if (!variantId) return;

        const productHandle = this.productContainer.dataset.productHandle;
        if (!productHandle || !this.productCardContainer) return;

        this.productCardContainer.setAttribute('data-loading', '');

        try {
            const response = await fetch(
                `/products/${productHandle}?variant=${variantId}&section_id=${PLPProductCard.SECTION_ID}`,
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const html = await response.text();
            if (this.productCardContainer) {
                this.productCardContainer.innerHTML = html;
            }
        } catch (error) {
            // Ignore variant fetch errors
        } finally {
            if (this.productCardContainer) {
                this.productCardContainer.removeAttribute('data-loading');
            }
        }
    }

    private showMoreColors(event: Event): void {
        const btn = event.currentTarget as HTMLElement;
        const btnContainer = btn.closest<HTMLElement>('div');
        if (!btnContainer) return;

        btnContainer
            .querySelectorAll<HTMLElement>('.hidden')
            .forEach((el) => el.classList.remove('hidden'));
        btn.style.display = 'none';
    }

    disconnectedCallback(): void {
        // Remove swatch click handlers
        if (this.swatches) {
            this.swatches.forEach((swatch) => {
                const handler = this.swatchClickHandlers.get(swatch);
                if (handler) {
                    swatch.removeEventListener('click', handler);
                }
            });
            this.swatchClickHandlers.clear();
        }

        // Remove show more colors button handlers
        this.showMoreColorsButtons.forEach((btn) => {
            btn.removeEventListener('click', this.boundShowMoreColors);
        });
        this.showMoreColorsButtons = [];
    }
}
