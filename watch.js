/**
 * Use Vite's built-in watch mode for better performance and reliability
 */

import { fileURLToPath } from 'url';
import { build as viteBuild } from 'vite';
import tailwindcss from '@tailwindcss/vite';

const publicDir = fileURLToPath(new URL('.', import.meta.url));

console.log('\n📦 Starting Vite build with watch mode...\n');

try {
    await viteBuild({
        mode: 'development',
        build: {
            watch: {},
        },
        plugins: [
            tailwindcss(),
            {
                name: 'watch-progress',
                buildStart() {
                    console.log('👀 Watching for changes...\n');
                },
                buildEnd() {
                    console.log('✅ Build complete\n');
                },
                handleHotUpdate({ file }) {
                    console.log(`🔎 Changed: ${file}\n`);
                },
            },
        ],
    });
} catch (e) {
    console.error('❌ Build failed:', e.message);
    process.exit(1);
}

process.on('SIGINT', () => {
    console.clear();
    console.log('\n👋 Stopped watching for changes\n');
    process.exit(0);
});
