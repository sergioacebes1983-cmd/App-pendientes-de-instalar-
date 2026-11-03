import { test, expect } from '@playwright/test';

test('screenshot', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
await page.goto('https://portero-control.preview.emergentagent.com/login', { waitUntil: 'domcontentloaded' });
await page.fill('[data-testid="login-email-input"]', 'pwa-test@pruebas-temp.es');
await page.fill('[data-testid="login-password-input"]', 'TempPwa123!');
await page.click('[data-testid="login-submit-button"]');
await page.waitForSelector('[data-testid="install-app-button"]');
await page.waitForTimeout(1500);
const sw = await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return !!r; });
const manifest = await page.evaluate(async () => (await (await fetch('/manifest.webmanifest')).json()).name);
console.log('sw registered:', sw, 'manifest:', manifest);
await page.click('[data-testid="install-app-button"]');
await page.waitForSelector('[data-testid="install-help-dialog"]');
await page.screenshot({ path: 'install.jpeg', quality: 30 });
});
