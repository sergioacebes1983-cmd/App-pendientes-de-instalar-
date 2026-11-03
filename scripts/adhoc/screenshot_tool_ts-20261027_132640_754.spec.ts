import { test, expect } from '@playwright/test';

test('screenshot', async ({ page }) => {
  const errs: string[] = [];
page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
page.on('response', r => { if (r.status() >= 400 && !r.url().includes('/auth/me')) errs.push(r.status() + ' ' + r.url()); });
await page.setViewportSize({ width: 390, height: 844 });
await page.goto('https://portero-control.preview.emergentagent.com/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('[data-testid="login-email-input"]');
await page.fill('[data-testid="login-email-input"]', 'admin@telecom.es');
await page.fill('[data-testid="login-password-input"]', 'Admin123!');
await page.click('[data-testid="login-submit-button"]');
await page.waitForSelector('[data-testid="communities-grid"]');
await page.screenshot({ path: 'home.jpeg', quality: 20 });
await page.getByText('Edificio Mirador del Parque').click();
await page.waitForSelector('[data-testid="neighbors-list"]');
// add neighbor
await page.click('[data-testid="add-neighbor-button"]');
await page.fill('[data-testid="neighbor-form-unit-input"]', '4º A');
await page.fill('[data-testid="neighbor-form-name-input"]', 'Prueba Vecino');
await page.click('[data-testid="neighbor-form-submit-button"]');
await page.waitForTimeout(1200);
const first = page.locator('[data-testid="neighbor-toggle-status-button"]').first();
await first.click();
await page.waitForTimeout(1500);
await page.click('[data-testid="filter-instalado"]');
await page.waitForTimeout(500);
await page.screenshot({ path: 'detail.jpeg', quality: 20 });
await page.locator('[data-testid="neighbor-history-button"]').first().click();
await page.waitForSelector('[data-testid="history-list"] li');
await page.screenshot({ path: 'history.jpeg', quality: 20 });
console.log('history text:', await page.locator('[data-testid="history-list"]').innerText());
console.log('ERRORS:', JSON.stringify(errs));
});
