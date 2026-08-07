import { test, expect } from '@playwright/test';
import { ensureServerHealthy, API_ENDPOINTS } from './helpers';

test.describe('Spoti5 Web Player - Play/Pause', () => {
  // Extend test timeout for tunnel mode (tunnel adds ~3-8s overhead per request)
  const isTunnel = process.env.BASE_URL?.includes('trycloudflare.com');
  const pageLoadWait = isTunnel ? 15000 : 3000;
  const searchResultTimeout = isTunnel ? 60000 : 30000;
  const playbackWait = isTunnel ? 15000 : 8000;

  test.beforeAll(async ({ request }) => {
    await ensureServerHealthy(request);
  });

  /**
   * Helper: finds the play/pause button in the player bar.
   * In Flutter web semantics, the button is a flt-semantics[role="button"][tabindex="0"]
   * with the tooltip text ("Pause" or "Play") as textContent,
   * located at the bottom-right of the screen with a small bounding box.
   */
  async function getPlayPauseButton(page: any): Promise<any | null> {
    return await page.evaluate(() => {
      const semantics = document.querySelectorAll('flt-semantics');
      for (let i = 0; i < semantics.length; i++) {
        const el = semantics[i];
        const role = el.getAttribute('role');
        const tabindex = el.getAttribute('tabindex');
        if (role === 'button' && tabindex === '0') {
          const rect = el.getBoundingClientRect();
          // Play/pause button: small, right-side, bottom of screen
          if (rect.width < 100 && rect.height < 100 && rect.left > 1000 && rect.top > 500) {
            return {
              index: i,
              text: el.textContent?.trim() || '',
              bbox: { x: rect.left, y: rect.top, width: rect.width, height: rect.height },
            };
          }
        }
      }
      return null;
    });
  }

  test('play/pause button shows correct state when track is selected', async ({ page }) => {
    if (isTunnel) test.setTimeout(180000);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(pageLoadWait);

    // Enable accessibility
    const enableA11yBtn = page.getByRole('button', { name: 'Enable accessibility' });
    try {
      await enableA11yBtn.waitFor({ state: 'attached', timeout: 15000 });
      await enableA11yBtn.evaluate(node => (node as HTMLElement).click());
    } catch (e) { /* ignore */ }

    // Search
    const searchInput = page.getByRole('textbox');
    await searchInput.waitFor({ state: 'visible', timeout: 30000 });
    await searchInput.pressSequentially('Radiohead Creep', { delay: 100 });
    await page.keyboard.press('Enter');

    const searchBtn = page.locator('flt-semantics[aria-label="Search Button" i]');
    try {
      await searchBtn.waitFor({ state: 'attached', timeout: 5000 });
      await searchBtn.evaluate(node => (node as HTMLElement).click());
    } catch (e) { /* ignore */ }

    // Click first result
    const resultItem = page.locator('flt-semantics[aria-label*="TrackResult-" i]').first();
    await resultItem.waitFor({ state: 'attached', timeout: searchResultTimeout });
    await resultItem.click();

    // Wait for playback to start
    await page.waitForTimeout(playbackWait);

    // Step 1: Verify button shows "Pause" when playing
    const btn = await getPlayPauseButton(page);
    expect(btn, 'Play/pause button not found in player bar').not.toBeNull();
    expect(btn!.text).toBe('Pause', 'Button should show "Pause" when audio is playing');

    // Step 2: Click PAUSE
    const centerX = btn!.bbox.x + btn!.bbox.width / 2;
    const centerY = btn!.bbox.y + btn!.bbox.height / 2;
    await page.mouse.click(centerX, centerY);
    await page.waitForTimeout(4000);

    // Step 3: Verify button shows "Play" when paused
    const btnPaused = await getPlayPauseButton(page);
    expect(btnPaused, 'Play/pause button not found after pause').not.toBeNull();
    expect(btnPaused!.text).toBe('Play', 'Button should show "Play" when audio is paused');

    // Step 4: Click PLAY (resume)
    const centerX2 = btnPaused!.bbox.x + btnPaused!.bbox.width / 2;
    const centerY2 = btnPaused!.bbox.y + btnPaused!.bbox.height / 2;
    await page.mouse.click(centerX2, centerY2);
    await page.waitForTimeout(4000);

    // Step 5: Verify button shows "Pause" when playing again
    const btnResumed = await getPlayPauseButton(page);
    expect(btnResumed, 'Play/pause button not found after resume').not.toBeNull();
    expect(btnResumed!.text).toBe('Pause', 'Button should show "Pause" when audio is playing again');
  });
});
