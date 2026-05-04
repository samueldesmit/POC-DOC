module.exports = function ({ addComponents }) {
    addComponents({
        /* -------------------------------------------------------------------------- */
        /* HEADINGS                                                                   */
        /* -------------------------------------------------------------------------- */

        '.heading-2xl': {
            // Mob: 50px (3.125rem) | Desk: 62px (3.875rem)
            '@apply text-[3.125rem] md:text-[3.875rem]': {},
        },

        '.heading-xl': {
            // Mob: 40px (2.5rem) | Desk: 52px (3.25rem)
            '@apply text-[2.5rem] md:text-[3.25rem]': {},
        },

        '.heading-lg': {
            // Mob: 30px (text-3xl) | Desk: 40px (2.5rem)
            '@apply text-3xl md:text-[2.5rem]': {},
        },

        '.heading-md': {
            // Mob: 20px (text-xl) | Desk: 24px (text-2xl)
            '@apply text-xl md:text-2xl': {},
        },

        '.heading-sm': {
            // Mob: 17px (1.0625rem) | Desk: 18px (1.125rem)
            '@apply text-[1.0625rem] md:text-[1.125rem]': {},
        },

        '.heading-xs': {
            // Mob: 15px (0.9375rem) | Desk: 16px (text-base)
            '@apply text-[0.9375rem] md:text-base': {},
        },

        '.heading-2xs': {
            // Mob: 12px (text-xs) | Desk: 13px (0.8125rem)
            '@apply text-xs md:text-[0.8125rem]': {},
        },

        '.heading-3xs': {
            // Mob: 10px (0.625rem)
            '@apply text-[0.625rem] ': {},
        },

        /* -------------------------------------------------------------------------- */
        /* DESCRIPTION                                                                */
        /* -------------------------------------------------------------------------- */

        '.description-subtitle': {
            // 17px
            '@apply text-[1.0625rem] ': {},
        },

        '.description-body': {
            // 15px
            '@apply text-[0.9375rem] ': {},
        },

        '.description-uppercase': {
            // 15px + uppercase
            '@apply text-[0.9375rem] uppercase': {},
        },

        '.description-micro': {
            // 11px
            '@apply text-[0.6875rem] ': {},
        },

        /* -------------------------------------------------------------------------- */
        /* BODY                                                                       */
        /* -------------------------------------------------------------------------- */

        '.body-normal': {
            // 15px
            '@apply text-[0.9375rem] ': {},
        },

        '.body-underline': {
            // 15px + underline
            '@apply text-[0.9375rem] underline': {},
        },

        '.body-bold': {
            // 15px + bold
            '@apply text-[0.9375rem] font-bold': {},
        },

        /* -------------------------------------------------------------------------- */
        /* UI ELEMENTS (Button, Link, Price)                                          */
        /* -------------------------------------------------------------------------- */

        '.button': {
            // 15px
            '@apply text-[0.9375rem] ': {},
        },

        '.link': {
            // 14px (text-sm)
            '@apply text-sm ': {},
        },

        '.link-underline': {
            // 14px (text-sm)
            '@apply text-sm underline': {},
        },

        // --- PRICE ---

        '.price-list': {
            // 15px
            '@apply text-[0.9375rem] ': {},
        },

        '.price-list-regular': {
            // 12px (text-xs) + strikethrough
            '@apply text-xs line-through': {},
        },

        '.price-pdp': {
            // 17px
            '@apply text-[1.0625rem] ': {},
        },

        '.price-pdp-regular': {
            // 15px + strikethrough
            '@apply text-[0.9375rem] line-through': {},
        },

        '.price-cart': {
            // 13px
            '@apply text-[0.8125rem] ': {},
        },

        '.price-cart-regular': {
            // 11px + strikethrough
            '@apply text-[0.6875rem] line-through': {},
        },
    });
};
