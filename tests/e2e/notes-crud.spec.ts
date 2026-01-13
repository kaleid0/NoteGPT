import { test, expect } from '@playwright/test'

// Full CRUD flow using IndexedDB helpers inside browser context
// NOTE: This test is complex due to Vite HMR potentially closing pages during development
// In CI/production environments with stable servers, this would be more straightforward
test('notes CRUD flow', async ({ page, baseURL }) => {
  const base = baseURL ?? 'http://localhost:3000'
  
  // Pre-initialize IndexedDB schema in all frames to avoid dynamic schema changes
  await page.addInitScript(() => {
    // Seed IndexedDB with schema before any page logic runs
    const req = indexedDB.open('notegpt-db', 1)
    req.onupgradeneeded = (evt) => {
      const db = (evt.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains('notes')) {
        db.createObjectStore('notes', { keyPath: 'id' })
        db.createObjectStore('settings', { keyPath: 'key' })
      }
    }
    req.onsuccess = () => {
      ;(req.result as IDBDatabase).close()
    }
  })

  // Navigate and wait for stability
  await page.goto(base + '/')
  await page.waitForLoadState('networkidle')
  
  // Add diagnostic logging
  page.on('console', msg => console.log('[PAGE CONSOLE]', msg.type(), msg.text()))
  page.on('pageerror', err => console.log('[PAGE ERROR]', err.message))
  page.on('close', () => console.log('[PAGE CLOSED DURING TEST]'))

  // Clean database
  await page.evaluate(() =>
    new Promise<void>((res, rej) => {
      const req = indexedDB.deleteDatabase('notegpt-db')
      req.onsuccess = () => res()
      req.onerror = () => rej((req as any).error)
    })
  )
  
  // Wait a moment for database cleanup to complete
  await page.waitForTimeout(100)

  // Now create a fresh note in the cleaned database
  const noteId = `note-${Date.now()}`
  const now = new Date().toISOString()
  
  try {
    const result = await page.evaluate(({ noteId, now }) => {
      return new Promise<{ success: boolean; error?: string }>((resolve) => {
        const req = indexedDB.open('notegpt-db', 1)
        
        req.onupgradeneeded = (evt) => {
          const db = (evt.target as IDBOpenDBRequest).result
          if (!db.objectStoreNames.contains('notes')) {
            db.createObjectStore('notes', { keyPath: 'id' })
          }
        }
        
        req.onsuccess = () => {
          try {
            const db = req.result
            const tx = db.transaction('notes', 'readwrite')
            const store = tx.objectStore('notes')
            store.put({
              id: noteId,
              title: 'Test Note',
              content: 'Initial content',
              createdAt: now,
              updatedAt: now,
            })
            
            tx.oncomplete = () => {
              db.close()
              resolve({ success: true })
            }
            tx.onerror = () => {
              db.close()
              resolve({ success: false, error: 'Transaction error' })
            }
          } catch (e) {
            resolve({ success: false, error: String(e) })
          }
        }
        
        req.onerror = () => {
          resolve({ success: false, error: 'DB open failed' })
        }
      })
    }, { noteId, now })
    
    if (!result.success) {
      throw new Error(`IndexedDB write failed: ${result.error}`)
    }
  } catch (err) {
    console.error('[E2E] Failed to write initial note:', err)
    throw err
  }

  // Navigate to the note detail page
  await page.goto(`${base}/note/${noteId}`)
  await page.waitForLoadState('domcontentloaded')

  // Verify note content is visible in editor
  const editor = page.locator('textarea[aria-label="Note editor"]')
  await expect(editor).toHaveValue('Initial content')

  // Edit the note
  await editor.fill('Updated content via CRUD test')
  await page.waitForTimeout(300) // Wait for onChange save

  // Verify the update was persisted in IndexedDB
  const persisted = await page.evaluate((noteId) => {
    return new Promise<{ content: string } | null>((resolve) => {
      const req = indexedDB.open('notegpt-db')
      req.onsuccess = () => {
        const db = req.result
        const tx = db.transaction('notes', 'readonly')
        const store = tx.objectStore('notes')
        const getReq = store.get(noteId)
        
        getReq.onsuccess = () => {
          const note = getReq.result
          db.close()
          resolve(note ? { content: note.content } : null)
        }
        getReq.onerror = () => {
          db.close()
          resolve(null)
        }
      }
      req.onerror = () => resolve(null)
    })
  }, noteId)
  
  expect(persisted).toMatchObject({ content: 'Updated content via CRUD test' })
})
