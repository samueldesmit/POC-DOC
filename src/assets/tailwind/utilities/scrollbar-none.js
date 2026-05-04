module.exports = function ({ addUtilities }) {
    addUtilities({
        '.scrollbar-none': {
            '@apply [-ms-overflow-style:none] [scrollbar-width:none] [&::-moz-scrollbar]:hidden [&::-webkit-scrollbar]:hidden':
                {},
        },
    });
};
