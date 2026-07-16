import { test, expect } from '@playwright/test';
import { ensureServerHealthy, API_ENDPOINTS } from './helpers';

test.describe('Spoti5 Web Player E2E', () => {
  test.beforeAll(async ({ request }) => {
    // Verificar que el backend esté respondiendo
    await ensureServerHealthy(request);
  });

  test('Search and play a track', async ({ page }) => {
    // 1. Navigate to the app (served by our backend at /)
    await page.goto('/');

    // 1.5. Enable Flutter web semantics so Playwright can see the DOM
    const enableA11yBtn = page.getByRole('button', { name: 'Enable accessibility' });
    try {
      await enableA11yBtn.waitFor({ state: 'attached', timeout: 15000 });
      await enableA11yBtn.evaluate(node => node.click());
      console.log('Clicked Enable accessibility');
    } catch (e) {
      console.log('Enable accessibility button not clicked:', e);
    }

    // 2. Wait for the app to initialize. 
    // We use getByRole for the textbox instead of placeholder for better Flutter compatibility
    const searchInput = page.getByRole('textbox');
    await searchInput.waitFor({ state: 'visible', timeout: 30000 });

    // 3. Type the search query
    // In Flutter, fill() might not fire necessary keyboard events, so we use pressSequentially
    await searchInput.pressSequentially('Radiohead Creep', { delay: 100 });
    await page.keyboard.press('Enter');

    // Also explicitly click the search button we exposed to ensure search triggers
    const searchBtn = page.locator('flt-semantics[aria-label="Search Button" i]');
    try {
      await searchBtn.waitFor({ state: 'attached', timeout: 5000 });
      await searchBtn.evaluate(node => node.click());
      console.log('Clicked Search Button');
    } catch (e) {
      console.log('Search button not clicked:', e);
    }

    // 4. Wait for the results.
    // In Flutter CanvasKit, semantics nodes use aria-label instead of inner text.
    // Also, they might be visually hidden, so we wait for 'attached' state.
    const resultItem = page.locator('flt-semantics[aria-label*="TrackResult-Creep" i]').first();
    await resultItem.waitFor({ state: 'attached', timeout: 30000 });

    // 5. Click the first result
    await resultItem.evaluate(node => node.click());

    // 6. Verify PlayerBar becomes active
    const playerBarTitle = page.locator('flt-semantics[aria-label*="Creep" i]').nth(1); 
    await playerBarTitle.waitFor({ state: 'attached', timeout: 15000 });
  });

  test('Track duration in UI matches backend (no doubled duration)', async ({ page, request }) => {
    // 1. Get expected duration from the backend (source of truth).
    const apiResponse = await request.get(`${API_ENDPOINTS.search}?q=Radiohead Creep&limit=1`);
    expect(apiResponse.ok()).toBeTruthy();
    const results = await apiResponse.json();
    expect(Array.isArray(results) && results.length).toBeGreaterThan(0);
    const expectedSeconds: number = results[0].duration;
    expect(expectedSeconds).toBeGreaterThan(0);

    // 2. Run the UI flow to reach the results list.
    await page.goto('/');
    const enableA11yBtn = page.getByRole('button', { name: 'Enable accessibility' });
    try {
      await enableA11yBtn.waitFor({ state: 'attached', timeout: 15000 });
      await enableA11yBtn.evaluate(node => node.click());
    } catch (e) {
      console.log('Enable accessibility button not clicked:', e);
    }

    const searchInput = page.getByRole('textbox');
    await searchInput.waitFor({ state: 'visible', timeout: 30000 });
    await searchInput.pressSequentially('Radiohead Creep', { delay: 100 });
    await page.keyboard.press('Enter');

    const searchBtn = page.locator('flt-semantics[aria-label="Search Button" i]');
    try {
      await searchBtn.waitFor({ state: 'attached', timeout: 5000 });
      await searchBtn.evaluate(node => node.click());
    } catch (e) {
      console.log('Search button not clicked:', e);
    }

    // 3. The result item now exposes its duration via aria-label: TrackResult-<title> (<m:ss>).
    const resultItem = page.locator('flt-semantics[aria-label*="TrackResult-Creep" i]').first();
    await resultItem.waitFor({ state: 'attached', timeout: 30000 });
    const renderedLabel = (await resultItem.getAttribute('aria-label')) ?? '';

    // Parse the trailing (m:ss) from the label.
    const match = renderedLabel.match(/\((\d+):(\d{2})\)/);
    expect(match, `No duration found in label "${renderedLabel}"`).not.toBeNull();
    const renderedSeconds = parseInt(match![1], 10) * 60 + parseInt(match![2], 10);

    // 4. Assert the rendered duration matches the backend (no doubling).
    expect(Math.abs(renderedSeconds - expectedSeconds)).toBeLessThanOrEqual(2);
    expect(renderedSeconds).toBeGreaterThan(0);
    console.log(`Backend duration: ${expectedSeconds}s | Rendered UI: ${renderedSeconds}s`);
  });
});
