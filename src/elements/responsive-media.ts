import { visible } from '../global.js';

interface ResponsiveMediaHandlers {
    load?: () => void;
    resize?: () => void;
}

customElements.define(
    'responsive-media',
    class ResponsiveMedia extends HTMLElement {
        handlers: ResponsiveMediaHandlers = {};

        connectedCallback(): void {
            const image: HTMLImageElement | undefined = [
                ...this.querySelectorAll('img'),
            ].find(
                (e: HTMLImageElement) => getComputedStyle(e).display !== 'none',
            );

            // Image loading state
            if (image && !image.complete) {
                this.handlers.load = () =>
                    image.toggleAttribute('data-loading', false);
                image.addEventListener('load', () =>
                    image.toggleAttribute('data-loading', false),
                );
                image.toggleAttribute('data-loading', true);
            }

            const hasVideo = Boolean(this.querySelectorAll('video').length);

            if (hasVideo) {
                const video: HTMLVideoElement | undefined = [
                    ...this.querySelectorAll('video'),
                ].find(
                    (e: HTMLVideoElement) =>
                        getComputedStyle(e).display !== 'none',
                );

                // Ensure video poster images have alt attributes for accessibility
                this.querySelectorAll('video img:not([alt])').forEach((img) => {
                    const parentVideo = img.closest('video');
                    img.setAttribute('alt', parentVideo?.getAttribute('aria-label') || '');
                });

                // Video loading state (load by playing)
                visible(this, { rootMargin: '450px' }).then(() => {
                    if (video && video.hasAttribute('data-loading')) {
                        video.addEventListener('loadeddata', () =>
                            video.toggleAttribute('data-loading', false),
                        );
                        video.play();
                    }
                });

                // Handle unloaded mobile/desktop video on resize
                this.handlers.resize = () => {
                    const currentVideo: HTMLVideoElement | undefined = [
                        ...this.querySelectorAll('video'),
                    ].find(
                        (e: HTMLVideoElement) =>
                            getComputedStyle(e).display !== 'none',
                    );

                    if (
                        currentVideo &&
                        currentVideo !== video &&
                        currentVideo.hasAttribute('data-loading')
                    ) {
                        currentVideo.addEventListener('loadeddata', () =>
                            currentVideo.toggleAttribute('data-loading', false),
                        );
                        currentVideo.play();
                    }
                };
                window.addEventListener('resize', this.handlers.resize);
            }

            // Trigger optional appear animation
            visible(this).then(() =>
                this.toggleAttribute('data-visible', true),
            );
        }

        disconnectedCallback(): void {
            if (this.handlers.resize)
                window.removeEventListener('resize', this.handlers.resize);
        }
    },
);
