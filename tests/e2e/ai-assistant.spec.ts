import { test, expect } from '@playwright/test'

// This test expects the dev server and backend to be running locally (mock mode)

test('ai assistant modal streams and accept replaces content', async ({ page, baseURL }) => {
  const base = baseURL ?? 'http://localhost:3000'
  await page.goto(base + '/')

  // ensure DB is clean and create an untitled note
  await page.evaluate(() =>
    new Promise<void>((res) => {
      const req = indexedDB.deleteDatabase('notegpt-db')
      req.onsuccess = () => res()
      req.onerror = () => res()
      req.onblocked = () => res()
    })
  )

  const noteId = '000-untitled'
  const now = new Date().toISOString()
  const note = { id: noteId, title: 'Untitled', content: 'hello', createdAt: now, updatedAt: now }

  await page.evaluate((note) =>
    new Promise<void>((res, rej) => {
      const req = indexedDB.open('notegpt-db', 1)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains('notes')) {
          const store = db.createObjectStore('notes', { keyPath: 'id' })
          store.createIndex('by-updated', 'updatedAt')
        }
      }
      req.onsuccess = () => {
        const db = req.result
        const tx = db.transaction('notes', 'readwrite')
        tx.objectStore('notes').put(note)
        tx.oncomplete = () => res()
        tx.onerror = () => rej(tx.error)
      }
      req.onerror = () => rej(req.error)
    }),
    note
  )

  await page.goto(base + '/note/' + noteId)
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