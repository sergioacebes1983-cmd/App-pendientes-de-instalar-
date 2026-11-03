import { test, expect } from '@playwright/test';

test('screenshot', async ({ page }) => {
  const errs: string[] = [];
page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
page.on('response', r => { if (r.status() >= 400 && !r.url().includes('/auth/me')) errs.push(r.status() + ' ' + r.url()); });
await page.setViewportSize({ width: 390, height: 844 });
await page.goto('https://portero-control.preview.emergentagent.com/login', { waitUntil: 'domcontentloaded' });
await page.fill('[data-testid="login-email-input"]', 'qa-admin@pruebas-temp.es');
await page.fill('[data-testid="login-password-input"]', 'QaTemp123!');
await page.click('[data-testid="login-submit-button"]');
await page.waitForSelector('[data-testid="communities-grid"]');
console.log('bell:', await page.locator('[data-testid="notifications-toggle-button"]').count());
await page.getByText('QA Comunidad Temporal').click();
await page.waitForSelector('[data-testid="neighbors-list"]');
// add neighbor with street
await page.click('[data-testid="add-neighbor-button"]');
await page.fill('[data-testid="neighbor-form-street-input"]', 'C/ Mayor 12');
await page.fill('[data-testid="neighbor-form-unit-input"]', '3º C');
await page.fill('[data-testid="neighbor-form-name-input"]', 'Vecino UI');
await page.click('[data-testid="neighbor-form-submit-button"]');
await page.waitForTimeout(1200);
await page.click('[data-testid="filter-todos"]');
await page.waitForTimeout(400);
await page.screenshot({ path: 'list.jpeg', quality: 25 });
// photos
const card = page.locator('[data-testid^="neighbor-card-"]').filter({ hasText: 'Vecino UI' });
await card.locator('[data-testid="neighbor-photos-button"]').click();
await page.waitForSelector('[data-testid="photos-sheet"]');
await page.setInputFiles('[data-testid="photos-file-input"]', '/tmp/qa.jpg');
await page.waitForSelector('[data-testid="photos-grid"] img');
await page.waitForTimeout(800);
await page.screenshot({ path: 'photos.jpeg', quality: 25 });
await page.keyboard.press('Escape');
await page.waitForTimeout(500);
console.log('count badge:', await card.locator('[data-testid="neighbor-photo-count"]').innerText());
// export (desktop-like: no coarse pointer in headless → download)
const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-testid="export-excel-button"]')]);
console.log('download:', dl.suggestedFilename());
console.log('ERRORS:', JSON.stringify(errs));
});
