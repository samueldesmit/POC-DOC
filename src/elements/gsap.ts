import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Legacy element: keeps backward compatibility with existing sections
 * that use class-based animation targeting (e.g. winery-selection, hero image-zoom).
 */
customElements.define(
    'gsap-elements',
    class GsapElements extends HTMLElement {
        connectedCallback(): void {
            const gsapElements = this.querySelectorAll(
                '.gsap-element-scroll-opacity',
            );

            if (gsapElements) {
                gsapElements.forEach((element) => {
                    gsap.fromTo(
                        element,

                        { opacity: 0.5, y: 30 },
                        {
                            delay: 0.2,
                            opacity: 1,
                            y: 0,
                            duration: 1,
                            ease: 'power2.out',
                            scrollTrigger: {
                                trigger: element,
                                start: 'top 80%',
                                toggleActions: 'play none none none',
                            },
                        },
                    );
                });
            }
            const gsapElementsFullOpacity = this.querySelectorAll(
                '.gsap-element-full-opacity',
            );

            if (gsapElementsFullOpacity) {
                gsapElementsFullOpacity.forEach((element) => {
                    gsap.fromTo(
                        element,

                        { opacity: 0, y: 30 },
                        {
                            delay: 0.2,
                            opacity: 1,
                            y: 0,
                            duration: 1,
                            ease: 'power2.out',
                            scrollTrigger: {
                                trigger: element,
                                start: 'top 80%',
                                toggleActions: 'play none none none',
                            },
                        },
                    );
                });
            }
            const gsapElementsLeftToRight = this.querySelectorAll(
                '.gsap-element-left-right',
            );

            if (gsapElementsLeftToRight) {
                gsapElementsLeftToRight.forEach((element) => {
                    gsap.fromTo(
                        element,
                        { opacity: 0, x: '-50' },
                        {
                            opacity: 1,
                            x: 0,
                            duration: 1,
                            ease: 'power2.out',
                        },
                    );
                });
            }

            const gsapElementsOpacity = document.querySelectorAll(
                '.gsap-element-opacity',
            );
            if (gsapElementsOpacity) {
                gsapElementsOpacity.forEach((element) => {
                    gsap.fromTo(
                        element,
                        { opacity: 0 },
                        {
                            opacity: 1,
                            duration: 1,
                            ease: 'power2.out',
                            scrollTrigger: {
                                trigger: element,
                                start: 'top 80%',
                                toggleActions: 'play none none none',
                            },
                        },
                    );
                });
            }
            const gsapElementsImageZoom = document.querySelectorAll(
                '.gsap-element-image-zoom',
            );
            if (gsapElementsImageZoom) {
                gsapElementsImageZoom.forEach((element) => {
                    gsap.fromTo(
                        element,
                        { scale: 1.3 },
                        {
                            scale: 1,
                            duration: 1,
                            ease: 'power2.out',
                            scrollTrigger: {
                                trigger: element,
                                start: 'top 50%',
                                toggleActions: 'play none none none',
                            },
                        },
                    );
                });
            }

            // Slide from left animation
            const gsapSlideFromLeft = document.querySelectorAll(
                '.gsap-slide-from-left',
            );
            if (gsapSlideFromLeft) {
                gsapSlideFromLeft.forEach((element) => {
                    gsap.fromTo(
                        element,
                        { opacity: 0, x: -60 },
                        {
                            opacity: 1,
                            x: 0,
                            duration: 0.8,
                            ease: 'power2.out',
                            scrollTrigger: {
                                trigger: element,
                                start: 'top 85%',
                                toggleActions: 'play none none none',
                            },
                        },
                    );
                });
            }

            // Slide from right animation
            const gsapSlideFromRight = document.querySelectorAll(
                '.gsap-slide-from-right',
            );
            if (gsapSlideFromRight) {
                gsapSlideFromRight.forEach((element) => {
                    gsap.fromTo(
                        element,
                        { opacity: 0, x: 60 },
                        {
                            opacity: 1,
                            x: 0,
                            duration: 0.8,
                            delay: 0.15,
                            ease: 'power2.out',
                            scrollTrigger: {
                                trigger: element,
                                start: 'top 85%',
                                toggleActions: 'play none none none',
                            },
                        },
                    );
                });
            }

            // Slide from left/right animations (late trigger)
            // Use matchMedia: slide + fade on desktop, fade-only on mobile
            ScrollTrigger.matchMedia({
                '(min-width: 1024px)': () => {
                    document
                        .querySelectorAll('.gsap-slide-from-left-late')
                        .forEach((element) => {
                            gsap.fromTo(
                                element,
                                { opacity: 0, x: -60 },
                                {
                                    opacity: 1,
                                    x: 0,
                                    duration: 0.8,
                                    ease: 'power2.out',
                                    scrollTrigger: {
                                        trigger: element,
                                        start: 'top 80%',
                                        toggleActions: 'play none none none',
                                    },
                                },
                            );
                        });

                    document
                        .querySelectorAll('.gsap-slide-from-right-late')
                        .forEach((element) => {
                            gsap.fromTo(
                                element,
                                { opacity: 0, x: 60 },
                                {
                                    opacity: 1,
                                    x: 0,
                                    duration: 0.8,
                                    delay: 0.15,
                                    ease: 'power2.out',
                                    scrollTrigger: {
                                        trigger: element,
                                        start: 'top 80%',
                                        toggleActions: 'play none none none',
                                    },
                                },
                            );
                        });
                },
                '(max-width: 1023px)': () => {
                    document
                        .querySelectorAll(
                            '.gsap-slide-from-left-late, .gsap-slide-from-right-late',
                        )
                        .forEach((element) => {
                            gsap.fromTo(
                                element,
                                { opacity: 0 },
                                {
                                    opacity: 1,
                                    duration: 0.6,
                                    ease: 'power2.out',
                                    scrollTrigger: {
                                        trigger: element,
                                        start: 'top 80%',
                                        toggleActions: 'play none none none',
                                    },
                                },
                            );
                        });
                },
            });
        }
    },
);

/**
 * Section-level scroll animation element.
 * Wrap any section content with <gsap-section data-animation="...">
 * Supported: fade-up, fade-in, stagger-up, slide-in-left, slide-in-right
 */
customElements.define(
    'gsap-section',
    class GsapSection extends HTMLElement {
        connectedCallback(): void {
            this.style.display = 'block';

            const prefersReducedMotion = window.matchMedia(
                '(prefers-reduced-motion: reduce)',
            ).matches;

            if (prefersReducedMotion) return;

            let animation = this.dataset.animation || 'fade-up';

            // On mobile, horizontal slide animations cause overflow in stacked layouts.
            // Fall back to fade-up for a clean entrance without horizontal overflow issues.
            const isMobile = window.innerWidth < 1024;
            if (
                isMobile &&
                (animation === 'slide-in-left' ||
                    animation === 'slide-in-right')
            ) {
                animation = 'fade-up';
            }

            // Prevent horizontal scroll from x-offset animations
            if (
                animation === 'slide-in-left' ||
                animation === 'slide-in-right'
            ) {
                const parent = this.parentElement;
                if (parent) parent.style.overflowX = 'clip';
            }

            const trigger = {
                trigger: this,
                start: 'top 90%',
                toggleActions: 'play none none none' as const,
            };

            switch (animation) {
                case 'fade-up':
                    gsap.fromTo(
                        this,
                        { y: 30, opacity: 0 },
                        {
                            y: 0,
                            opacity: 1,
                            duration: 0.8,
                            ease: 'power2.out',
                            scrollTrigger: trigger,
                        },
                    );
                    break;
                case 'fade-in':
                    gsap.fromTo(
                        this,
                        { opacity: 0 },
                        {
                            opacity: 1,
                            duration: 1,
                            ease: 'power1.out',
                            scrollTrigger: trigger,
                        },
                    );
                    break;
                case 'slide-in-left':
                    gsap.fromTo(
                        this,
                        { x: -60, opacity: 0 },
                        {
                            x: 0,
                            opacity: 1,
                            duration: 0.8,
                            ease: 'power2.out',
                            scrollTrigger: trigger,
                        },
                    );
                    break;
                case 'slide-in-right':
                    gsap.fromTo(
                        this,
                        { x: 60, opacity: 0 },
                        {
                            x: 0,
                            opacity: 1,
                            duration: 0.8,
                            ease: 'power2.out',
                            scrollTrigger: trigger,
                        },
                    );
                    break;
                case 'image-zoom': {
                    // Find images/responsive-media inside and scale them in
                    const images = this.querySelectorAll(
                        'img, responsive-media img',
                    );
                    if (images.length) {
                        gsap.fromTo(
                            images,
                            { scale: 1.3 },
                            {
                                scale: 1,
                                duration: 1,
                                ease: 'power2.out',
                                scrollTrigger: {
                                    trigger: this,
                                    start: 'top 50%',
                                    toggleActions:
                                        'play none none none' as const,
                                },
                            },
                        );
                    }
                    break;
                }
                case 'stagger-up': {
                    // Auto-detect stagger children: explicit attr, splide slides, or direct children
                    let children =
                        this.querySelectorAll('[data-gsap-child]');
                    if (!children.length) {
                        children =
                            this.querySelectorAll('.splide__slide');
                    }
                    if (!children.length) {
                        children = this.querySelectorAll(
                            ':scope > div > div, :scope > div > ul > li',
                        );
                    }
                    if (children.length > 1) {
                        gsap.fromTo(
                            children,
                            { y: 20, opacity: 0 },
                            {
                                y: 0,
                                opacity: 1,
                                duration: 0.6,
                                ease: 'power2.out',
                                stagger: 0.15,
                                scrollTrigger: trigger,
                            },
                        );
                    } else {
                        gsap.fromTo(
                            this,
                            { y: 30, opacity: 0 },
                            {
                                y: 0,
                                opacity: 1,
                                duration: 0.8,
                                ease: 'power2.out',
                                scrollTrigger: trigger,
                            },
                        );
                    }
                    break;
                }
            }
        }
    },
);
