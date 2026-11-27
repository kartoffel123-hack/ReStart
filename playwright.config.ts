import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './tests/e2e',
    use: { baseURL: 'http://127.0.0.1:4193' },
    webServer: {
        command: 'npm run preview -- --host 127.0.0.1 --port 4193 --strictPort',
        url: 'http://127.0.0.1:4193',
        reuseExistingServer: false
    }
});
