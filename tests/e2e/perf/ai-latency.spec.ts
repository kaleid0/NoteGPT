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
        const req = indexedDB.open('notegpt-db')
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
    await page.waitForLoadState('load')
    // debug logging
    page.on('console', (msg) => console.log('[PAGE CONSOLE]', msg.type(), msg.text()))
    page.on('pageerror', (err) => console.log('[PAGE ERROR]', err))
    page.on('crash', () => console.log('[PAGE CRASHED]'))
    page.on('close', () => console.log('[PAGE CLOSED]'))
    page.on('requestfailed', (req) =>
      console.log('[REQUEST FAILED]', req.url(), req.failure()?.errorText ?? '')
    )

    // seed a note
    const noteId = 'perf-note-1'
    const now = new Date().toISOString()
    const note = {
      id: noteId,
      title: 'Perf Note',
      content: 'hello world',
      createdAt: now,
      updatedAt: now,
    }

    // write with retries to avoid transient failures
    for (let i = 0; i < 3; i++) {
      try {
        await page.evaluate((note) => {
          return new Promise<void>((res, rej) => {
            const req = indexedDB.open('notegpt-db')
            req.onupgradeneeded = () => {
              const db = req.result
              if (!db.objectStoreNames.contains('notes')) {
                const store = db.createObjectStore('notes', { keyPath: 'id' })
                store.createIndex('by-updated', 'updatedAt')
              }
            }
            req.onsuccess = () => {
              try {
                const db = req.result
                const tx = db.transaction('notes', 'readwrite')
                tx.objectStore('notes').put(note)
                tx.oncomplete = () => {
                  try { db.close() } catch (e) {}
                  res()
                }
                tx.onerror = () => {
                  try { db.close() } catch (e) {}
                  rej(tx.error || new Error('IndexedDB transaction error'))
                }
              } catch (e) {
                try { req.result && req.result.close() } catch (e) {}
                rej(e)
              }
            }
            req.onerror = () => rej(new Error('IndexedDB open error'))
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

    // measure time until client logs first-character latency
    const start = Date.now()

    let latency = null
    let errorMessage = null

    try {
      // Wait for the app to log the first-char latency to console
      await page.waitForEvent('console', {
        predicate: (msg) => {
          const t = msg.text()
          return (
            t.includes('First Char Latency') ||
            t.includes('First Char latency') ||
            t.includes('⚡ First char latency') ||
            t.includes('First Char Latency:') ||
            t.includes('First char latency:')
          )
        },
        timeout: 15000,
      })

      const firstCharAt = Date.now()
      latency = firstCharAt - start
    } catch (err: unknown) {
      errorMessage = String(err instanceof Error && err.message ? err.message : err)
      console.warn('[PERF] Error measuring first-char latency:', errorMessage)
    } finally {
      // Save result (always attempt to write a file so CI artifact step can find it)
      const results = {
        timestamp: new Date().toISOString(),
        browser: browserName,
        latency,
        error: errorMessage,
      }
      try {
        fs.mkdirSync(RESULTS_DIR, { recursive: true })
        const fname = path.join(RESULTS_DIR, `ai-first-char-${Date.now()}.json`)
        fs.writeFileSync(fname, JSON.stringify(results, null, 2))
        console.log('[PERF] Wrote results to', fname)
      } catch (e) {
        console.warn('[PERF] Could not write results file', e)
      }
    }

    // Assert p95 target for this single run (for now): <= 2000ms
    if (errorMessage) throw new Error('Failed to observe AI first character: ' + errorMessage)
    expect(latency).toBeLessThanOrEqual(2000)
  })
})
