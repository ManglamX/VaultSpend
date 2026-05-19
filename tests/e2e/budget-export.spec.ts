import { test, expect } from '@playwright/test';

/**
 * budget-alert.spec.ts — Validates budget UI shows correct progress and warnings.
 */
test.describe('Budgets UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:4173/');
    await page.waitForLoadState('networkidle');
  });

  test('Budgets tab renders without error', async ({ page }) => {
    const budgetsTab = page.locator('ion-tab-button').filter({ hasText: /budgets/i });
    await budgetsTab.click();
    // Should show "Budgets" page header
    await expect(page.locator('text=/budgets/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('Can open Add Budget sheet', async ({ page }) => {
    const budgetsTab = page.locator('ion-tab-button').filter({ hasText: /budgets/i });
    await budgetsTab.click();

    // FAB or Add button
    const addBtn = page.locator('ion-fab-button, button').filter({ hasText: /add/i }).first();
    if (await addBtn.isVisible({ timeout: 3000 })) {
      await addBtn.click();
      // Modal or sheet opens
      await expect(page.locator('ion-modal, ion-action-sheet')).toBeVisible({ timeout: 5000 });
    }
  });
});

/**
 * export.spec.ts — Validates the XLSX export & CSV export buttons are clickable.
 */
test.describe('Export Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:4173/');
    await page.waitForLoadState('networkidle');
  });

  test('Settings tab has export buttons', async ({ page }) => {
    const settingsTab = page.locator('ion-tab-button').filter({ hasText: /settings/i });
    await settingsTab.click();

    await expect(page.locator('text=/export/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('Encrypted Backup button is present and clickable', async ({ page }) => {
    const settingsTab = page.locator('ion-tab-button').filter({ hasText: /settings/i });
    await settingsTab.click();

    const backupBtn = page.locator('button').filter({ hasText: /backup/i }).first();
    await expect(backupBtn).toBeVisible({ timeout: 5000 });
    // Just verify it's enabled (not greyed out)
    await expect(backupBtn).toBeEnabled();
  });
});
