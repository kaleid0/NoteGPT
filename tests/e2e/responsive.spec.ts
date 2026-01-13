import { test, expect } from '@playwright/test';

const viewports = [
  { name: 'Mobile (iPhone 12)', width: 390, height: 844 },
  { name: 'Tablet (iPad)', width: 768, height: 1024 },
  { name: 'Desktop', width: 1280, height: 720 },
];

test.describe('Responsive Layout Verification', () => {
  for (const viewport of viewports) {
    test(`homepage layout is correct on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');
      
      // Basic visibility checks
      await expect(page.locator('header')).toBeVisible();
      await expect(page.locator('button[aria-label="Create note"]')).toBeVisible();
      
      // Screenshot for visual regression (manual or baseline)
      await page.screenshot({ path: `tests/e2e/screenshots/homepage-${viewport.name.replace(/\s/g, '-')}.png` });
    });

    test(`note detail layout is correct on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');
      await page.click('button:has-text("New Note")');
      await page.waitForURL(/\/note\//);
      
      await expect(page.locator('textarea')).toBeVisible();
      await expect(page.locator('button:has-text("AI 处理")')).toBeVisible();
      
      // Check if text area is reasonably sized (not overflowed)
      const box = await page.locator('textarea').boundingBox();
      expect(box?.width).toBeLessThanOrEqual(viewport.width);
      
      await page.screenshot({ path: `tests/e2e/screenshots/note-detail-${viewport.name.replace(/\s/g, '-')}.png` });
    });
  }
});
