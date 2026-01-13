import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility (a11y) checks', () => {
  test('should not have any automatically detectable accessibility issues on homepage', async ({ page }) => {
    await page.goto('/');
    
    // Wait for content to load
    await page.waitForSelector('header');

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should not have any accessibility issues on note detail page', async ({ page }) => {
    // Create a note first to ensure we have a page to visit
    await page.goto('/');
    await page.click('button[aria-label="Create note"]');
    
    // Wait for redirect or modal (assuming redirect to /note/:id)
    await page.waitForURL(/\/note\//);
    
    // Wait for content (h1) to ensure we are out of loading state
    await page.waitForSelector('h1');

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should not have any accessibility issues in AI Stream Modal', async ({ page }) => {
    await page.goto('/');
    await page.click('button[aria-label="Create note"]');
    await page.waitForURL(/\/note\//);
    
    // Type some content to enable AI button
    await page.fill('textarea', 'Test content for AI');
    
    // Trigger AI
    await page.click('button:has-text("AI 处理")');
    
    // Wait for modal
    await page.waitForSelector('[role="dialog"]');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('[role="dialog"]')
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
