import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

// Measures first-character latency for AI streaming modal (p95 target <= 2000ms)
// Run with: npx playwright test tests/e2e/perf/ai-latency.spec.ts --project=chromium --headed

const RESULTS_DIR = path.resolve(__dirname, '../../test-results/perf')

test.describe('AI streaming performance', () => {
  test('first-character latency p95', async ({ page, baseURL, browserName }) => {
    const base = baseURL ?? 'http://localhost:3000'

    // ensure IndexedDB exists before the app loads to avoid transient page closure during HMR/preview
    await page.addInitScript(() => {
      try {
        const req = indexedDB.open('notegpt-db', 1)
        req.onupgradeneeded = () => {
          const db = req.result
          if (!db.objectStoreNames.contains('notes')) {
            const store = db.createObjectStore('notes', { keyPath: 'id' })
            store.createIndex('by-updated', 'updatedAt')
          }
        }
        req.onsuccess = () => req.result.close()
        req.onerror = () => {}
      } catch (e) {
        // ignore
      }
    })

    // ensure DB clean
    await page.goto(base + '/')
    await page.evaluate(() => indexedDB.deleteDatabase('notegpt-db'))

    // seed a note
    const noteId = 'perf-note-1'
    const now = new Date().toISOString()
    const note = { id: noteId, title: 'Perf Note', content: 'hello world', createdAt: now, updatedAt: now }

    // write with retries to avoid transient failures
    for (let i = 0; i < 3; i++) {
      try {
        await page.evaluate((note) => {
          return new Promise<void>((res) => {
            const req = indexedDB.open('notegpt-db', 1)
            req.onupgradeneeded = () => {
              const db = req.result
              if (!db.objectStoreNames.contains('notes')) {
                const store = db.createObjectStore('notes', { keyPath: 'id' })
                store.createIndex('by-updated', 'updatedAt')
              }
            }
            req.onsuccess = () => {
              const tx = req.result.transaction('notes', 'readwrite')
              tx.objectStore('notes').put(note)
              tx.oncomplete = () => res()
              tx.onerror = () => res()
            }
            req.onerror = () => res()
          })
        }, note)
        break
      } catch (err) {
        console.log('[E2E] IndexedDB write failed, retrying', err)
        await page.waitForTimeout(300)
        if (i === 2) throw err
      }
    }

    await page.goto(`${base}/note/${noteId}`)
    await page.waitForLoadState('networkidle')

    // click AI button to open modal
    await page.click('text=AI 处理')

    // measure time until first character appears in modal content
    const start = Date.now()
    const contentLocator = page.locator('[role="dialog"] .ai-stream-content')

    // Wait for first non-empty text node inside the content area
    await page.waitForFunction((selector) => {
      const el = document.querySelector(selector)
      if (!el) return false
      return el.textContent && el.textContent.trim().length > 0
    }, `[role="dialog"] .ai-stream-content`, { timeout: 15000 })

    const firstCharAt = Date.now()
    const latency = firstCharAt - start

    // Save result
    const results = { timestamp: new Date().toISOString(), browser: browserName, latency }
    try {
      fs.mkdirSync(RESULTS_DIR, { recursive: true })
      fs.writeFileSync(path.join(RESULTS_DIR, `ai-first-char-${Date.now()}.json`), JSON.stringify(results, null, 2))
    } catch (e) {
      // ignore file write errors in CI ephemeral env
    }

    // Assert p95 target for this single run (for now): <= 2000ms
    expect(latency).toBeLessThanOrEqual(2000)
  })
})
