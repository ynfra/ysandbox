import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.dist' });
dotenv.config({ path: '.env' });

export default defineConfig({
    testDir: 'tests',
    workers: process.env.CI ? 1 : undefined,
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ]
})
