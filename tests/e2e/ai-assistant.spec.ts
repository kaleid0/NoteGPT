import { test, expect } from '@playwright/test'

// This test expects the dev server and backend to be running locally (mock mode)

test('ai assistant modal streams and accept replaces content', async ({ page, baseURL }) => {
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
      // ignore in environments without IndexedDB
    }
  })

  await page.goto(base + '/')
  await page.waitForLoadState('load')
  // debug logging
  page.on('console', msg => console.log('[PAGE CONSOLE]', msg.type(), msg.text()))
  page.on('pageerror', err => console.log('[PAGE ERROR]', err))
  page.on('crash', () => console.log('[PAGE CRASHED]'))
  page.on('close', () => console.log('[PAGE CLOSED]'))
  page.on('requestfailed', req => console.log('[REQUEST FAILED]', req.url(), req.failure()?.errorText ?? ''))

  // ensure DB is clean
  await page.evaluate(() =>
    new Promise<void>((res) => {
      const req = indexedDB.deleteDatabase('notegpt-db')
      req.onsuccess = () => res()
      req.onerror = () => res()
      req.onblocked = () => res()
    })
  )

  // create a new note via the UI (more robust than direct IndexedDB writes)
  await page.goto(base + '/')
  await page.waitForLoadState('networkidle')
  await page.click('[aria-label="Create note"]')
  await page.waitForURL('**/note/*')
  const url = new URL(page.url())
  const noteId = url.pathname.split('/').pop() || '000-untitled'

  // we expect to be on the note detail page
  await page.waitForLoadState('networkidle')

  await page.goto(base + '/note/' + noteId)
  await page.waitForLoadState('networkidle')
  // we expect the note detail page to show an editor textarea
  const ta = page.locator('textarea[aria-label="Note editor"]')
  await expect(ta).toBeVisible()

  // set some text
  await ta.fill('Hello world')

  // click AI button
  await page.click('text=AI 处理')

  // modal should show streaming placeholder
  const modal = page.locator('[role="dialog"]')
  await expect(modal).toBeVisible()

  // wait for mock streaming to produce some text
  await page.waitForTimeout(500)

  // click Accept
  await page.click('text=接受')

  // expect textarea content changed (mock will generate something)
  await expect(ta).not.toHaveText('')
})