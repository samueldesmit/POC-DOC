import Splide, { Options } from '@splidejs/splide';
import { AutoScroll } from '@splidejs/splide-extension-auto-scroll';

const KIYOH_FEED_URL =
    'https://www.kiyoh.com/v1/review/feed.xml?hash=idhkg34b6a1ubg5';

const STAR_SVG = `<svg width="14" height="13" viewBox="0 0 20 19" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 15.27L16.18 19L14.54 11.97L20 7.24L12.81 6.63L10 0L7.19 6.63L0 7.24L5.46 11.97L3.82 19L10 15.27Z" fill="currentColor"/></svg>`;

const QUOTE_SVG = `<svg class="text-primary" width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3.4002 13.3C2.33353 13.3 1.5002 12.9333 0.900195 12.2C0.300195 11.4333 0.000195421 10.3 0.000195421 8.8C0.000195421 7.23333 0.350195 5.73333 1.0502 4.3C1.78353 2.86667 2.81686 1.45 4.1502 0.0499998C4.18353 0.0166649 4.23353 -2.5034e-06 4.3002 -2.5034e-06C4.4002 -2.5034e-06 4.46686 0.0499978 4.5002 0.149999C4.56686 0.216664 4.58353 0.299998 4.5502 0.399998C3.7502 1.46667 3.2002 2.5 2.9002 3.5C2.63353 4.46667 2.5002 5.55 2.5002 6.75C2.5002 7.65 2.61686 8.35 2.8502 8.85C3.08353 9.35 3.4002 9.8 3.8002 10.2L1.9002 10.55C1.86686 9.98333 2.01686 9.55 2.3502 9.25C2.71686 8.95 3.18353 8.8 3.7502 8.8C4.4502 8.8 4.98353 9 5.3502 9.4C5.7502 9.8 5.9502 10.35 5.9502 11.05C5.9502 11.7833 5.71686 12.35 5.2502 12.75C4.81686 13.1167 4.2002 13.3 3.4002 13.3ZM11.1002 13.3C10.0335 13.3 9.2002 12.9333 8.6002 12.2C8.03353 11.4333 7.7502 10.3 7.7502 8.8C7.7502 7.2 8.1002 5.68333 8.8002 4.25C9.5002 2.81666 10.5335 1.41666 11.9002 0.0499998C11.9335 0.0166649 11.9835 -2.5034e-06 12.0502 -2.5034e-06C12.1502 -2.5034e-06 12.2169 0.0499978 12.2502 0.149999C12.3169 0.216664 12.3335 0.299998 12.3002 0.399998C11.5002 1.46667 10.9502 2.5 10.6502 3.5C10.3835 4.46667 10.2502 5.55 10.2502 6.75C10.2502 7.65 10.3502 8.36667 10.5502 8.9C10.7835 9.4 11.1002 9.83333 11.5002 10.2L9.6502 10.55C9.61686 9.98333 9.76686 9.55 10.1002 9.25C10.4335 8.95 10.9002 8.8 11.5002 8.8C12.2002 8.8 12.7335 9 13.1002 9.4C13.5002 9.8 13.7002 10.35 13.7002 11.05C13.7002 11.7833 13.4669 12.35 13.0002 12.75C12.5669 13.1167 11.9335 13.3 11.1002 13.3Z" fill="currentColor"/></svg>`;

customElements.define(
    'kiyoh-reviews',
    class KiyohReviews extends HTMLElement {
        private splide: Splide | null = null;

        connectedCallback(): void {
            // Defer to next frame so child elements are parsed and available
            requestAnimationFrame(() => {
                fetch(KIYOH_FEED_URL)
                    .then((res) => res.text())
                    .then((xml) => {
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(xml, 'text/xml');

                        this.updateRating(doc);
                        this.renderReviews(doc);
                        this.initSplide();
                    })
                    .catch(() => {
                        this.initSplide();
                    });
            });
        }

        disconnectedCallback(): void {
            if (this.splide) {
                this.splide.destroy();
                this.splide = null;
            }
        }

        private updateRating(doc: Document): void {
            const sectionEl =
                this.closest('[id^="section-"]') || this.parentElement;
            if (sectionEl == null) return;

            const avgRating =
                doc.querySelector('averageRating')?.textContent?.trim();
            const numberReviews =
                doc.querySelector('numberReviews')?.textContent?.trim();

            const ratingEl = sectionEl.querySelector(
                '[data-kiyoh-rating-number]',
            );
            const reviewCountEl = sectionEl.querySelector(
                '[data-kiyoh-review-count]',
            );

            if (ratingEl && avgRating) {
                ratingEl.textContent = avgRating;
            }
            if (reviewCountEl && numberReviews) {
                reviewCountEl.textContent = `${numberReviews} reviews`;
            }
        }

        private renderReviews(doc: Document): void {
            const slidesList = this.querySelector('[data-kiyoh-slides]');
            if (!slidesList) return;

            const reviewQuoteType = this.dataset.reviewQuoteType || 'oneliner';
            const questionGroup =
                reviewQuoteType === 'opinion'
                    ? 'DEFAULT_OPINION'
                    : 'DEFAULT_ONELINER';

            const reviews = doc.querySelectorAll('reviews > reviews');
            if (!reviews.length) return;

            const slides: string[] = [];

            const showStars = this.dataset.showReviewStars !== 'false';

            reviews.forEach((review) => {
                const author =
                    review.querySelector('reviewAuthor')?.textContent?.trim() ||
                    '';
                const reviewRating = parseInt(
                    review.querySelector('rating')?.textContent?.trim() || '0',
                    10,
                );
                const contents = review.querySelectorAll(
                    'reviewContent > reviewContent',
                );

                let quote = '';

                contents.forEach((content) => {
                    const group =
                        content.querySelector('questionGroup')?.textContent;
                    const rating =
                        content.querySelector('rating')?.textContent?.trim() ||
                        '';

                    if (group === questionGroup && rating) {
                        quote = rating;
                    }
                });

                // KiYOH uses 1-10 scale; only show reviews with 4+ stars (rating >= 8)
                if (quote && author && reviewRating >= 8) {
                    const starsHtml = showStars
                        ? `<span class="flex items-center gap-0.5 pt-1 text-primary">${this.renderStars(reviewRating)}</span>`
                        : '';

                    slides.push(`
                        <li class="splide__slide grid grid-cols-[14px_1fr] gap-5">
                            ${QUOTE_SVG}
                            <div class="flex flex-col gap-2 font-cormorant-garamond text-[20px] text-primary font-medium leading-[150%]">
                                ${starsHtml}
                                ${this.escapeHtml(quote)}
                                <span class="text-[12px] font-inter uppercase font-normalw">
                                    ${this.escapeHtml(author)}
                                </span>
                            </div>
                        </li>
                    `);
                }
            });

            if (slides.length) {
                slidesList.innerHTML = slides.join('');
            }
        }

        private initSplide(): void {
            const splideEl = this.querySelector(
                '[data-kiyoh-splide]',
            ) as HTMLElement | null;
            if (!splideEl) return;

            const dataset = this.dataset;

            const smoothAutoplay = this.toBool(dataset.splideSmoothAutoplay, false);
            const autoScrollSpeed = this.toNumber(dataset.splideAutoScrollSpeed, 1);

            const options: Options = {
                type: 'loop',
                perPage: this.toNumber(dataset.splidePerPageMobile, 1.2),
                gap: dataset.splideGapMobile || '8px',
                pauseOnHover: true,
                pagination: false,
                arrows: false,
                perMove: 1,
                focus: 0,
                omitEnd: true,
                mediaQuery: 'min',
                breakpoints: {
                    640: {
                        perPage: this.toNumber(dataset.splidePerPageDesktop, 3),
                        gap: dataset.splideGapDesktop || '12px',
                    },
                },
            };

            if (smoothAutoplay) {
                options.drag = 'free';
                options.autoplay = false;
                (options as Record<string, unknown>).autoScroll = {
                    speed: autoScrollSpeed,
                    pauseOnHover: true,
                    pauseOnFocus: true,
                };
            } else {
                options.autoplay = this.toBool(dataset.splideAutoplay, false);
                options.interval = this.toNumber(dataset.splideInterval, 5000);
                options.speed = 1000;
                options.easing = 'cubic-bezier(0.165, 0.84, 0.44, 1)';
            }

            this.splide = new Splide(splideEl, options);

            if (smoothAutoplay) {
                this.splide.mount({ AutoScroll });
            } else {
                this.splide.mount();
            }
        }

        private toNumber(value: string | undefined, fallback: number): number {
            const parsed = Number(value);
            return isNaN(parsed) ? fallback : parsed;
        }

        private toBool(value: string | undefined, fallback: boolean): boolean {
            if (value === undefined) return fallback;
            return value === 'true';
        }

        private renderStars(rating: number): string {
            // KiYOH uses 1-10 scale, convert to 5 stars
            const starCount = Math.round(rating / 2);
            return Array.from({ length: 5 }, (_, i) =>
                i < starCount
                    ? STAR_SVG
                    : STAR_SVG.replace('fill="currentColor"', 'fill="currentColor" opacity="0.2"'),
            ).join('');
        }

        private escapeHtml(str: string): string {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }
    },
);
