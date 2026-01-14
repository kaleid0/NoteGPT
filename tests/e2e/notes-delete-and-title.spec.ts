import { test, expect } from '@playwright/test'

// E2E: delete from list (confirmation) and inline title edit saves on Enter/blur
test('delete note from notes list with confirmation', async ({ page, baseURL }) => {
  const base = baseURL ?? 'http://localhost:3000'
  const noteId = `test-note-${Date.now()}`
  const now = new Date().toISOString()

  // Pre-seed IndexedDB with a note
  await page.goto(base)
  await page.waitForLoadState('networkidle')

  // Clear IndexedDB for origin to avoid version conflicts (resilient seeding)
  const cleanupPage = await page.context().newPage()
  try {
    await cleanupPage.goto(base)
    await cleanupPage.waitForLoadState('domcontentloaded')
    const client = await cleanupPage.context().newCDPSession(cleanupPage)
    try {
      await client.send('Storage.clearDataForOrigin', { origin: base, storageTypes: 'indexeddb' })
    } finally {
      await client.detach()
    }
  } finally {
    await cleanupPage.close()
  }

  await page.evaluate(
    ({ noteId, now }) => {
      return new Promise<void>((resolve, reject) => {
        const req = indexedDB.open('notegpt-db', 1)
        req.onupgradeneeded = (evt) => {
          const db = (evt.target as IDBOpenDBRequest).result
          if (!db.objectStoreNames.contains('notes')) {
            db.createObjectStore('notes', { keyPath: 'id' })
          }
        }
        req.onsuccess = () => {
          const db = req.result
          const tx = db.transaction('notes', 'readwrite')
          const store = tx.objectStore('notes')
          store.put({
            id: noteId,
            title: 'E2E Test Note',
            content: 'This note will be deleted',
            createdAt: now,
            updatedAt: now,
          })
          tx.oncomplete = () => {
            db.close()
            resolve()
          }
          tx.onerror = () => {
            db.close()
            reject(tx.error)
          }
        }
        req.onerror = () => reject(req.error)
      })
    },
    { noteId, now }
  )

  // Reload to show the seeded note
  await page.reload()
  await page.waitForLoadState('networkidle')

  // Verify note exists in list
  const noteCard = page.locator(`[data-note-id="${noteId}"]`)
  await expect(noteCard).toBeVisible()
  await expect(noteCard.locator('h3')).toHaveText('E2E Test Note')

  // Click delete button
  await noteCard.locator(`button[aria-label="Delete note ${noteId}"]`).click()

  // Confirm dialog should appear
  let confirmDialog = page.locator('role=dialog')
  if ((await confirmDialog.count()) === 0) {
    confirmDialog = page.locator('text=确认删除该笔记吗？').locator('..').locator('..')
  }
  await expect(confirmDialog.getByRole('button', { name: '确认' })).toBeVisible()

  // Click confirm
  await confirmDialog.getByRole('button', { name: '确认' }).click()

  // Note should be removed from the list
  await expect(noteCard).not.toBeVisible({ timeout: 3000 })

  // Verify note is removed from IndexedDB
  const dbNote = await page.evaluate((noteId) => {
    return new Promise<any>((resolve) => {
      const req = indexedDB.open('notegpt-db')
      req.onsuccess = () => {
        const db = req.result
        const tx = db.transaction('notes', 'readonly')
        const store = tx.objectStore('notes')
        const getReq = store.get(noteId)
        getReq.onsuccess = () => {
          db.close()
          resolve(getReq.result)
        }
      }
    })
  }, noteId)

  expect(dbNote).toBeUndefined()
})

test('inline title edit saves on Enter and blur', async ({ page, baseURL }) => {
  const base = baseURL ?? 'http://localhost:3000'
  const noteId = `title-edit-${Date.now()}`
  const now = new Date().toISOString()

  // Pre-seed IndexedDB with a note
  await page.goto(base)
  await page.waitForLoadState('networkidle')

  // Clear IndexedDB for origin to avoid version conflicts (resilient seeding)
  const cleanupPage = await page.context().newPage()
  try {
    await cleanupPage.goto(base)
    await cleanupPage.waitForLoadState('domcontentloaded')
    const client = await cleanupPage.context().newCDPSession(cleanupPage)
    try {
      await client.send('Storage.clearDataForOrigin', { origin: base, storageTypes: 'indexeddb' })
    } finally {
      await client.detach()
    }
  } finally {
    await cleanupPage.close()
  }

  await page.evaluate(
    ({ noteId, now }) => {
      return new Promise<void>((resolve, reject) => {
        const req = indexedDB.open('notegpt-db', 1)
        req.onupgradeneeded = (evt) => {
          const db = (evt.target as IDBOpenDBRequest).result
          if (!db.objectStoreNames.contains('notes')) {
            db.createObjectStore('notes', { keyPath: 'id' })
          }
        }
        req.onsuccess = () => {
          const db = req.result
          const tx = db.transaction('notes', 'readwrite')
          const store = tx.objectStore('notes')
          store.put({
            id: noteId,
            title: 'Original Title',
            content: 'Test content',
            createdAt: now,
            updatedAt: now,
          })
          tx.oncomplete = () => {
            db.close()
            resolve()
          }
          tx.onerror = () => {
            db.close()
            reject(tx.error)
          }
        }
        req.onerror = () => reject(req.error)
      })
    },
    { noteId, now }
  )

  // Navigate to note detail page
  await page.goto(`${base}/note/${noteId}`)
  await page.waitForLoadState('domcontentloaded')

  // Find title input
  const titleInput = page.locator('input[aria-label="Note title"]')
  await expect(titleInput).toBeVisible()
  await expect(titleInput).toHaveValue('Original Title')

  // Edit title and press Enter
  await titleInput.fill('Updated via Enter')
  await titleInput.press('Enter')

  // Wait for save (debounce/async)
  await page.waitForTimeout(500)

  // Verify title is persisted in IndexedDB
  let persistedNote = await page.evaluate((noteId) => {
    return new Promise<{ title: string } | null>((resolve) => {
      const req = indexedDB.open('notegpt-db')
      req.onsuccess = () => {
        const db = req.result
        const tx = db.transaction('notes', 'readonly')
        const store = tx.objectStore('notes')
        const getReq = store.get(noteId)
        getReq.onsuccess = () => {
          db.close()
          resolve(getReq.result ? { title: getReq.result.title } : null)
        }
      }
    })
  }, noteId)

  expect(persistedNote?.title).toBe('Updated via Enter')

  // Test blur save: edit again and blur
  await titleInput.fill('Updated via Blur')
  await titleInput.blur()

  // Wait for save
  await page.waitForTimeout(500)

  persistedNote = await page.evaluate((noteId) => {
    return new Promise<{ title: string } | null>((resolve) => {
      const req = indexedDB.open('notegpt-db')
      req.onsuccess = () => {
        const db = req.result
        const tx = db.transaction('notes', 'readonly')
        const store = tx.objectStore('notes')
        const getReq = store.get(noteId)
        getReq.onsuccess = () => {
          db.close()
          resolve(getReq.result ? { title: getReq.result.title } : null)
        }
      }
    })
  }, noteId)

  expect(persistedNote?.title).toBe('Updated via Blur')
})
