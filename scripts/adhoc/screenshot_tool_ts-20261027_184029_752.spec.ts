import { test, expect } from '@playwright/test';

test('screenshot', async ({ page }) => {
  const errs: string[] = [];
page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
page.on('response', r => { if (r.status() >= 400 && !r.url().includes('/auth/me')) errs.push(r.status() + ' ' + r.url()); });
await page.setViewportSize({ width: 390, height: 844 });
await page.goto('https://portero-control.preview.emergentagent.com/login', { waitUntil: 'domcontentloaded' });
await page.fill('[data-testid="login-email-input"]', 'qa-brand@pruebas-temp.es');
await page.fill('[data-testid="login-password-input"]', 'QaTemp123!');
await page.click('[data-testid="login-submit-button"]');
await page.waitForSelector('[data-testid="communities-grid"]');
await page.getByText('QA Calles Temporal').click();
await page.waitForSelector('[data-testid="street-filter-tabs"]');
await page.click('[data-testid="filter-todos"]');
console.log('all:', await page.locator('[data-testid^="neighbor-card-"]').count());
await page.click('[data-testid="street-tab-1"]');
await page.waitForTimeout(400);
console.log('mayor:', await page.locator('[data-testid^="neighbor-card-"]').count(), await page.locator('[data-testid="street-tab-1"]').innerText());
await page.screenshot({ path: 'street.jpeg', quality: 30 });
await page.click('[data-testid="street-tab-3"]');
await page.waitForTimeout(400);
console.log('sin calle:', await page.locator('[data-testid^="neighbor-card-"]').count());
const icon = await page.evaluate(async () => (await fetch('/icon-192.png')).status);
console.log('icon', icon, 'ERRORS:', JSON.stringify(errs));
});
