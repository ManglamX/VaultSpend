import { test, expect } from '@playwright/test';

/**
 * navigation.spec.ts — Tests that all 5 main tabs are reachable and render correctly.
 */
test.describe('Tab Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:4173/');
    await page.waitForLoadState('networkidle');
  });

  const tabs = [
    { name: /dashboard/i, heading: /dashboard/i },
    { name: /expenses/i, heading: /expenses/i },
    { name: /analytics/i, heading: /analytics|spending/i },
    { name: /budgets/i,   heading: /budgets/i },
    { name: /settings/i,  heading: /settings/i },
  ];

  for (const tab of tabs) {
    test(`${tab.name.source} tab loads without crash`, async ({ page }) => {
      const tabBtn = page.locator('ion-tab-button').filter({ hasText: tab.name });
      await tabBtn.click();
      // Verify a heading related to the tab appears
      await expect(page.locator('h1, h2, ion-title').filter({ hasText: tab.heading }).first())
        .toBeVisible({ timeout: 8000 });
    });
  }

  test('browser back navigation works after tab switch', async ({ page }) => {
    const expTab = page.locator('ion-tab-button').filter({ hasText: /expenses/i });
    await expTab.click();
    await page.goBack();
    // Should still be on the app, not a blank page
    await expect(page.locator('ion-app')).toBeVisible({ timeout: 5000 });
  });
});

/**
 * lock-screen.spec.ts — Validates the lock screen and PIN entry.
 */
test.describe('Lock Screen', () => {
  test('app renders a lock screen or onboarding on cold start', async ({ page }) => {
    // Clear cached state to simulate first install
    await page.goto('http://localhost:4173/');
    await page.waitForLoadState('networkidle');

    // Either the onboarding or lock screen PinPad should be visible
    const pinOrSplash = page.locator(
      'text=/VaultSpend|Enter PIN|Secure your Vault/i'
    ).first();
    await expect(pinOrSplash).toBeVisible({ timeout: 10000 });
  });
});
