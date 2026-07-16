import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('Navigating to app...');
  await page.goto('http://localhost:3000');
  
  console.log('Waiting for accessibility button...');
  const enableA11yBtn = page.getByRole('button', { name: 'Enable accessibility' });
  try {
    await enableA11yBtn.waitFor({ state: 'attached', timeout: 5000 });
    await enableA11yBtn.evaluate(node => node.click());
    console.log('Clicked Enable accessibility');
  } catch (e) {
    console.log('Enable accessibility button not clicked:', e);
  }

  console.log('Waiting 3 seconds for semantics to render...');
  await page.waitForTimeout(3000);

  const semantics = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('flt-semantics')).map(el => {
      const clone = el.cloneNode(false) as Element;
      return clone.outerHTML;
    });
  });
  console.log('Semantics nodes:', semantics);

  await browser.close();
})();
