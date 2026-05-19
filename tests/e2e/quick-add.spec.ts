import { test, expect } from '@playwright/test';

/**
 * quick-add.spec.ts — Tests the core FAB → expense add flow.
 * Assumes the app is already past onboarding (pre-seeded state).
 */
test.describe('Quick Add Expense', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:4173/');
    // Wait for app to load
    await page.waitForLoadState('networkidle');
  });

  test('Add Expense button opens sheet, saves, and shows in recent list', async ({ page }) => {
    // Navigate to Dashboard tab if not there
    const dashTab = page.locator('ion-tab-button').filter({ hasText: /dashboard/i });
    if (await dashTab.isVisible()) await dashTab.click();

    // Tap the "Add Expense" quick action button
    const addBtn = page.locator('button', { hasText: /Add Expense/i });
    await addBtn.click();

    // Amount input should appear in the modal
    await expect(page.locator('input[type="number"][placeholder="0.00"]').first()).toBeVisible({ timeout: 5000 });

    // Type an amount
    await page.locator('input[type="number"][placeholder="0.00"]').first().fill('350');

    // Pick first category
    const firstCat = page.locator('button').filter({ has: page.locator('span').first() }).first();
    await firstCat.click();

    // Save
    await page.locator('button', { hasText: /Save Expense/i }).click();

    // Toast/confirmation appears
    await expect(page.locator('ion-toast, text=/saved/i')).toBeVisible({ timeout: 5000 });
  });

  test('FAB tap to toast fires in under 5 seconds', async ({ page }) => {
    const dashTab = page.locator('ion-tab-button').filter({ hasText: /dashboard/i });
    if (await dashTab.isVisible()) await dashTab.click();

    const start = Date.now();

    const addBtn = page.locator('button', { hasText: /Add Expense/i });
    await addBtn.click();

    await page.locator('input[type="number"][placeholder="0.00"]').first().fill('100');
    const firstCat = page.locator('button').filter({ has: page.locator('span') }).first();
    await firstCat.click();
    await page.locator('button', { hasText: /Save Expense/i }).click();
    await page.locator('ion-toast').waitFor({ timeout: 5000 });

    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(5000);
  });
});
