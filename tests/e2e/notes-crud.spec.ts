import { test, expect } from '@playwright/test'

// Full CRUD flow using IndexedDB helpers inside browser context since list UI is not yet implemented
test('notes CRUD flow', async ({ page, baseURL }) => {
  const base = baseURL ?? 'http://localhost:5173'
  await page.goto(base + '/')

  // ensure DB is clean
  await page.evaluate(() =>
    new Promise<void>((res) => {
      const req = indexedDB.deleteDatabase('notegpt-db')
      req.onsuccess = () => res()
      req.onerror = () => res()
      req.onblocked = () => res()
    })
  )

  // create a note directly in IndexedDB
  const noteId = 'e2e-note-1'
  const now = new Date().toISOString()
  const note = { id: noteId, title: 'E2E Note', content: 'hello', createdAt: now, updatedAt: now }

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

  // navigate to note detail and verify content
  await page.goto(`${base}/note/${noteId}`)
  const editor = page.locator('textarea[aria-label="Note editor"]')
  await expect(editor).toHaveValue('hello')

  // edit content (onChange triggers save)
  await editor.fill('hello world')
  await page.waitForTimeout(200)

  // verify persisted content in IndexedDB
  const persisted = await page.evaluate((id) =>
    new Promise<any>((res, rej) => {
      const req = indexedDB.open('notegpt-db', 1)
      req.onsuccess = () => {
        const db = req.result
        const tx = db.transaction('notes', 'readonly')
        const getReq = tx.objectStore('notes').get(id)
        getReq.onsuccess = () => res(getReq.result)
        getReq.onerror = () => rej(getReq.error)
      }
      req.onerror = () => rej(req.error)
    }),
    noteId
  )
  expect(persisted).toBeTruthy()
  expect(persisted.content).toBe('hello world')

  // delete note via IndexedDB (since UI delete not implemented yet)
  await page.evaluate((id) =>
    new Promise<void>((res, rej) => {
      const req = indexedDB.open('notegpt-db', 1)
      req.onsuccess = () => {
        const tx = req.result.transaction('notes', 'readwrite')
        tx.objectStore('notes').delete(id)
        tx.oncomplete = () => res()
        tx.onerror = () => rej(tx.error)
      }
      req.onerror = () => rej(req.error)
    }),
    noteId
  )

  // reload and expect to land on the notes list (Notes header present)
  await page.reload()
  await expect(page.locator('text=Notes')).toBeVisible()
})
