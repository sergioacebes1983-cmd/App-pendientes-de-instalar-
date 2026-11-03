import { test, expect } from '@playwright/test';

test('screenshot', async ({ page }) => {
  const errs: string[] = [];
page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
page.on('response', r => { if (r.status() >= 400 && !r.url().includes('/auth/me')) errs.push(r.status() + ' ' + r.url()); });
await page.setViewportSize({ width: 390, height: 844 });
await page.goto('https://portero-control.preview.emergentagent.com/login', { waitUntil: 'domcontentloaded' });
await page.fill('[data-testid="login-email-input"]', 'qa-rep@pruebas-temp.es');
await page.fill('[data-testid="login-password-input"]', 'QaTemp123!');
await page.click('[data-testid="login-submit-button"]');
await page.waitForSelector('[data-testid="communities-grid"]');
await page.click('[data-testid="mobile-nav-reports"]');
await page.waitForSelector('[data-testid="report-body"]');
await page.waitForTimeout(600);
await page.screenshot({ path: 'reports.jpeg', quality: 30 });
console.log('ERRORS:', JSON.stringify(errs));
});
