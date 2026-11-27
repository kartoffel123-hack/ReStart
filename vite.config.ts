import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@domain': fileURLToPath(new URL('./src/domain', import.meta.url)),
            '@app': fileURLToPath(new URL('./src/app', import.meta.url)),
            '@presentation': fileURLToPath(new URL('./src/presentation', import.meta.url))
        }
    },
    server: { port: 5173 },
    build: {
        target: 'es2022',
        sourcemap: true
    },
    test: {
        environment: 'node',
        include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
        exclude: ['tests/e2e/**', 'node_modules/**'],
        setupFiles: ['./tests/setup.ts'],
        testTimeout: 30_000,
        hookTimeout: 60_000
    }
});
