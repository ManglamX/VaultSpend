import { test, expect } from '@playwright/test';

test.describe('Onboarding Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app locally
    await page.goto('http://localhost:4173/');
  });

  test('completes onboarding and navigates to Dashboard', async ({ page }) => {
    // Wait for the VaultSpend Splash Screen
    await expect(page.locator('text=VaultSpend')).toBeVisible({ timeout: 10000 });
    
    // Step 1: Splash
    await page.click('button:has-text("Next")');

    // Step 2: Pitch
    await expect(page.locator('text=100% Private')).toBeVisible();
    await page.click('button:has-text("Next")');

    // Step 3: Notification Permission stub
    await expect(page.locator('text=Stay on Budget')).toBeVisible();
    await page.click('button:has-text("Get Started")');

    // Step 4: PIN creation (6-digit PIN)
    await expect(page.locator('text=Secure your Vault')).toBeVisible();
    for (let i = 0; i < 6; i++) {
        await page.click(`button:has-text("1")`); // 111111
    }

    // Step 5: PIN confirmation
    await expect(page.locator('text=Confirm PIN')).toBeVisible();
    for (let i = 0; i < 6; i++) {
        await page.click(`button:has-text("1")`); // 111111
    }

    // Step 6: Profile Name Input
    await expect(page.locator('text=About You')).toBeVisible();
    await page.fill('input[placeholder="Your Name"]', 'John Crypto');
    await page.click('button:has-text("Complete Setup")');

    // Should arrive at Dashboard
    await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=John')).toBeVisible(); // Top greeting is first name
  });
});
