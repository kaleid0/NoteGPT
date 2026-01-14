import { test, expect } from '@playwright/test'

/**
 * Integration test: AI streaming proxy end-to-end
 * Tests the full flow from UI click to backend proxy to SSE response
 */

test.describe('AI Proxy Integration', () => {
  test.beforeEach(async ({ page, baseURL }) => {
    const base = baseURL ?? 'http://localhost:3000'

    // Pre-create IndexedDB to avoid transient issues
    await page.addInitScript(() => {
      const req = indexedDB.open('notegpt-db', 1)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains('notes')) {
          const store = db.createObjectStore('notes', { keyPath: 'id' })
          store.createIndex('by-updated', 'updatedAt')
        }
      }
      req.onsuccess = () => req.result.close()
    })

    await page.goto(base + '/')
    await page.waitForLoadState('load')
  })

  test('should stream AI response to modal content', async ({ page, baseURL }) => {
    const base = baseURL ?? 'http://localhost:3000'

    // Create a note via UI
    await page.click('button[aria-label="Create note"]')
    await page.waitForURL(/\/note\//)

    // Fill in content
    const contentArea = page
      .locator('textarea, [contenteditable="true"], input[type="text"]')
      .first()
    await contentArea.fill('Hello world, please summarize this.')
    await page.waitForTimeout(500)

    // Click AI button
    await page.click('text=AI 处理')

    // Wait for modal to appear
    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible({ timeout: 10000 })

    // Wait for streaming content to be long enough
    const content = modal.locator('[class*=aiStreamContent]')
    await expect(async () => {
      const text = await content.textContent()
      expect(text?.length).toBeGreaterThan(10)
    }).toPass({ timeout: 25000 })

    // Should have some generated text
    const text = await content.textContent()
    expect(text).toBeTruthy()
  })

  test('should handle accept button to update note', async ({ page, baseURL }) => {
    const base = baseURL ?? 'http://localhost:3000'

    // Create a note
    await page.click('button[aria-label="Create note"]')
    await page.waitForURL(/\/note\//)

    const contentArea = page
      .locator('textarea, [contenteditable="true"], input[type="text"]')
      .first()
    await contentArea.fill('Test content for AI')
    await page.waitForTimeout(500)

    // Open AI modal
    await page.click('text=AI 处理')
    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible({ timeout: 10000 })

    // Wait for content to stream
    const content = modal.locator('[class*=aiStreamContent]')
    await page.waitForTimeout(2000) // Let some content stream

    // Click accept
    const acceptButton = modal.locator('button:has-text("采用")')
    await acceptButton.click()

    // Modal should close
    await expect(modal).not.toBeVisible({ timeout: 5000 })
  })

  test('should handle discard button to close modal', async ({ page, baseURL }) => {
    const base = baseURL ?? 'http://localhost:3000'

    // Create a note
    await page.click('button[aria-label="Create note"]')
    await page.waitForURL(/\/note\//)

    const contentArea = page
      .locator('textarea, [contenteditable="true"], input[type="text"]')
      .first()
    await contentArea.fill('Test content')
    await page.waitForTimeout(500)

    // Open AI modal
    await page.click('text=AI 处理')
    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible({ timeout: 10000 })

    // Click discard
    const discardButton = modal.locator('button:has-text("取消")')
    await discardButton.click()

    // Modal should close
    await expect(modal).not.toBeVisible({ timeout: 5000 })
  })

  test('should handle SSE connection errors gracefully', async ({ page, baseURL }) => {
    const base = baseURL ?? 'http://localhost:3000'

    // Create note
    await page.click('button[aria-label="Create note"]')
    await page.waitForURL(/\/note\//)

    const contentArea = page
      .locator('textarea, [contenteditable="true"], input[type="text"]')
      .first()
    await contentArea.fill('Test')
    await page.waitForTimeout(300)

    // Intercept and abort the SSE request to simulate error
    await page.route('**/v1/generate', async (route) => {
      await route.abort('failed')
    })

    // Open AI modal
    await page.click('text=AI 处理')
    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible({ timeout: 10000 })

    // Should show error message
    const content = modal.locator('[class*=aiStreamContent]')
    await expect(content).toContainText(/error|Error|失败|\[Error\]/i, { timeout: 10000 })
  })
})
