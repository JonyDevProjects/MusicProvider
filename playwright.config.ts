import { defineConfig, devices } from '@playwright/test';

/**
 * Configuración E2E para la plataforma Web de MusicProvider.
 * El servidor Express (src/server.ts) se levanta automáticamente en el webServer
 * antes de ejecutar las pruebas, reutilizando el script dev:server del proyecto.
 */
export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './tests/e2e-results',
  testMatch: /(.+\.)?(test|spec)\.[jt]s/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { outputFolder: './tests/e2e-report', open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'npm run dev:server',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
