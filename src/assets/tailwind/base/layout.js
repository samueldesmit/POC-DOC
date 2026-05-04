module.exports = function ({ addComponents }) {
    addComponents({
        '.container': {
            '@apply w-full mx-auto max-w-screen-2xl section-px': {},
        },
        '.container-small': {
            '@apply w-full lg:max-w-4xl mx-auto section-px': {},
        },
        '.section-px': {
            '@apply px-4 lg:px-12': {},
        },
        '.main-grid-layout': {
            '@apply grid grid-cols-4 lg:grid-cols-12 gap-2 lg:gap-4': {},
        },
        '.main-grid-layout-desktop': {
            '@apply lg:grid lg:grid-cols-12 lg:gap-4': {},
        },
        '.h-min-header': {
            '@apply h-[calc(100svh-var(--header-height)-var(--announcement-bar-height))]':
                {},
        },
        '.link-animation': {
            '@apply relative inline-block after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:origin-bottom-right after:scale-x-0 after:bg-current after:transition-transform after:duration-300 after:ease-in-out hover:after:origin-bottom-left hover:after:scale-x-100':
                {},
        },
    });
};
