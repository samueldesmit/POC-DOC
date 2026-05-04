import { defineConfig, transformWithEsbuild } from 'vite';
import { resolve, parse } from 'node:path';

import tailwindcss from '@tailwindcss/vite';

/**
 * Creates a global JavaScript file to be loaded on every page, with functions for use in all bundles
 *
 * @param {{ src: string: { development: string, production: string } }}
 * @returns {import('vite').Plugin}
 */
const globalJs = ({ src }) => {
    let sourcemap, mode;
    const { name, base } = parse(src);
    return {
        name: 'global-js',
        configResolved: (c) => {
            sourcemap = c.build.sourcemap;
            mode = c.mode;
        },
        async generateBundle() {
            if ([...this.getModuleIds()].some((id) => id.endsWith('.js')))
                this.emitFile({
                    type: 'asset',
                    fileName: `${name}.js`,
                    source: await this.load({ id: src })
                        .then(({ code }) =>
                            transformWithEsbuild(code, base, {
                                minify: true,
                                sourcemap,
                            }),
                        )
                        .then(({ code }) => code),
                });
        },
    };
};

export default defineConfig({
    plugins: [tailwindcss(), globalJs({ src: 'src/global.js' })],
    build: {
        emptyOutDir: false,
        rollupOptions: {
            input: ['src/elements/main.js', 'src/assets/tailwind/index.css'],
            output: {
                dir: 'assets',
                entryFileNames: '[name].js',
                chunkFileNames: '[name].js',
                assetFileNames: '[name].[ext]',
                format: 'es',
                preserveModules: false,
            },
            preserveEntrySignatures: 'allow-extension',
        },
        // Copy static assets
        assetsDir: 'assets',
        copyPublicDir: true,
    },
    resolve: {
        alias: {
            '@global': resolve(__dirname, 'src/global.js'),
            '@': resolve(__dirname, 'src'),
        },
    },
    optimizeDeps: {
        include: ['@splidejs/splide'],
    },
});
