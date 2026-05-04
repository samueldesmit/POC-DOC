import { timeline } from 'motion';
import { getTargets } from '../global.js';
import { customElement } from '../utilities/decorators';

/**
 * Animation configuration for mega menu items
 */
const ANIMATION_CONFIG = {
    DURATION: {
        OPEN: 0.45,
        CLOSE: 0.3,
    },
    EASING: [0.4, 0, 0.2, 1] as const,
    CLIP_PATHS: {
        CLOSED: 'inset(0 0 100% 0)',
        OPEN: 'inset(0 0 0 0)',
    },
} as const;

/**
 * Custom element for individual mega menu items
 * Handles dropdown animations and state management
 */
@customElement('mega-menu-item')
export class MegaMenuItem extends HTMLElement {
    private currentAnimation: any = null;

    /**
     * Toggle the dropdown state with optional instant animation
     * @param open - Whether to open or close the dropdown
     * @param instant - Whether to skip animation
     */
    toggle: (open: boolean, instant?: boolean) => Promise<void>;

    connectedCallback(): void {
        this.toggle = async (open: boolean, instant = false): Promise<void> => {
            try {
                this.toggleAttribute('data-open', open);

                const dropdown = this.getDropdownElement();
                if (!dropdown) {
                    return;
                }

                await this.animateDropdown(dropdown, open, instant);
            } catch (error) {
                // Ignore toggle errors
            }
        };
    }

    /**
     * Get the dropdown element for this menu item
     */
    private getDropdownElement(): HTMLElement | null {
        const {
            dropdown: [dropdown],
        } = getTargets(this);
        return dropdown || null;
    }

    /**
     * Animate the dropdown element
     */
    private async animateDropdown(
        dropdown: HTMLElement,
        open: boolean,
        instant: boolean,
    ): Promise<void> {
        // Cancel any existing animation
        if (this.currentAnimation) {
            this.currentAnimation.stop();
        }

        const clipPathValues = open
            ? [
                  ANIMATION_CONFIG.CLIP_PATHS.CLOSED,
                  ANIMATION_CONFIG.CLIP_PATHS.OPEN,
              ]
            : [
                  ANIMATION_CONFIG.CLIP_PATHS.OPEN,
                  ANIMATION_CONFIG.CLIP_PATHS.CLOSED,
              ];

        const duration = open
            ? ANIMATION_CONFIG.DURATION.OPEN
            : ANIMATION_CONFIG.DURATION.CLOSE;

        this.currentAnimation = timeline([
            [
                dropdown,
                { clipPath: clipPathValues },
                {
                    duration,
                    at: 0,
                    easing: ANIMATION_CONFIG.EASING,
                },
            ],
        ]);

        // Handle animation completion
        this.currentAnimation.finished.then(() => {
            if (!this.hasAttribute('data-open')) {
                dropdown.style.clipPath = ANIMATION_CONFIG.CLIP_PATHS.CLOSED;
            }
            this.currentAnimation = null;
        });

        // Skip animation if instant is requested
        if (instant) {
            this.currentAnimation.finish();
        }

        await this.currentAnimation.finished;
    }

    /**
     * Cleanup when the element is disconnected
     */
    disconnectedCallback(): void {
        if (this.currentAnimation) {
            this.currentAnimation.stop();
            this.currentAnimation = null;
        }
    }
}
