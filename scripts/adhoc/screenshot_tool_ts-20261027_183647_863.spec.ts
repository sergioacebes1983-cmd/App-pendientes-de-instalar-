import { test, expect } from '@playwright/test';

test('screenshot', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
await page.goto('https://portero-control.preview.emergentagent.com/login', { waitUntil: 'domcontentloaded' });
await page.fill('[data-testid="login-email-input"]', 'qa-logo@pruebas-temp.es');
await page.fill('[data-testid="login-password-input"]', 'QaTemp123!');
await page.click('[data-testid="login-submit-button"]');
await page.waitForSelector('[data-testid="company-logo"]');
await page.waitForTimeout(800);
await page.screenshot({ path: 'home-m.jpeg', quality: 30 });
await page.setViewportSize({ width: 1280, height: 720 });
await page.waitForTimeout(500);
await page.screenshot({ path: 'home-d.jpeg', quality: 30 });
});
