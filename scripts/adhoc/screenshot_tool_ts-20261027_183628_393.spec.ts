import { test, expect } from '@playwright/test';

test('screenshot', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
await page.goto('https://portero-control.preview.emergentagent.com/login', { waitUntil: 'networkidle' });
await page.screenshot({ path: 'login-m.jpeg', quality: 30 });
await page.setViewportSize({ width: 1280, height: 720 });
await page.goto('https://portero-control.preview.emergentagent.com/login', { waitUntil: 'networkidle' });
await page.screenshot({ path: 'login-d.jpeg', quality: 30 });
});
