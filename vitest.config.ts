import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['src/lib/__tests__/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
        exclude: ['e2e/**'],
    },
});
