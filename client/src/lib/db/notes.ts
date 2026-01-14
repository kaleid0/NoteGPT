import { openDB, DBSchema, IDBPDatabase } from 'idb'

export type Note = {
  id: string
  title?: string
  content: string
  createdAt: string
  updatedAt: string
}

export type Tag = {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export type Category = Tag

export type NoteTag = {
  noteId: string
  tagId: string
}

export type NoteCategory = {
  noteId: string
  categoryId: string
}

interface NoteDB extends DBSchema {
  notes: {
    key: string
    value: Note
    indexes: { 'by-updated': string }
  }
  tags: {
    key: string
    value: Tag
    indexes: { 'by-updated': string }
  }
  categories: {
    key: string
    value: Category
    indexes: { 'by-updated': string }
  }
  note_tags: {
    key: [string, string] // [noteId, tagId]
    value: NoteTag
    indexes: { 'by-note': string; 'by-tag': string }
  }
  note_categories: {
    key: [string, string] // [noteId, categoryId]
    value: NoteCategory
    indexes: { 'by-note': string; 'by-category': string }
  }
}

const DB_NAME = 'notegpt-db'
let dbPromise: Promise<IDBPDatabase<NoteDB>> | null = null

async function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<NoteDB>(DB_NAME, 2, {
      upgrade(db, oldVersion, newVersion) {
        console.log(`Upgrading IndexedDB from v${oldVersion} to v${newVersion}`)

        // v1 -> v2: add tags, categories and relation stores
        if (oldVersion < 2) {
          // Create notes store if not exists (backward compat)
          if (!db.objectStoreNames.contains('notes')) {
            const notesStore = db.createObjectStore('notes', { keyPath: 'id' })
            notesStore.createIndex('by-updated', 'updatedAt')
          }

          // Create tags store
          if (!db.objectStoreNames.contains('tags')) {
            const tagsStore = db.createObjectStore('tags', { keyPath: 'id' })
            tagsStore.createIndex('by-updated', 'updatedAt')
          }

          // Create categories store
          if (!db.objectStoreNames.contains('categories')) {
            const catsStore = db.createObjectStore('categories', { keyPath: 'id' })
            catsStore.createIndex('by-updated', 'updatedAt')
          }

          // Create note_tags relation store
          if (!db.objectStoreNames.contains('note_tags')) {
            const noteTagsStore = db.createObjectStore('note_tags', {
              keyPath: ['noteId', 'tagId'],
            })
            noteTagsStore.createIndex('by-note', 'noteId')
            noteTagsStore.createIndex('by-tag', 'tagId')
          }

          // Create note_categories relation store
          if (!db.objectStoreNames.contains('note_categories')) {
            const noteCatsStore = db.createObjectStore('note_categories', {
              keyPath: ['noteId', 'categoryId'],
            })
            noteCatsStore.createIndex('by-note', 'noteId')
            noteCatsStore.createIndex('by-category', 'categoryId')
          }
        }
      },
    })
  }
  return dbPromise
}

// ============= Notes API =============

// TODO 一次性加载所有笔记及其内容，如果内容很多可能会导致性能问题
// 但是indexedDB不支持部分加载
// 需要分表 meta 和 content
export async function getAllNotes(): Promise<Note[]> {
  const db = await getDB()
  return (await db.getAll('notes')) as Note[]
}

export async function getNote(id: string): Promise<Note | undefined> {
  const db = await getDB()
  return db.get('notes', id)
}

export async function upsertNote(note: Note): Promise<void> {
  const db = await getDB()
  await db.put('notes', note)
}

export async function deleteNote(id: string): Promise<void> {
  const db = await getDB()
  // Also remove all relation entries
  const tx = db.transaction(['notes', 'note_tags', 'note_categories'], 'readwrite')
  await tx.objectStore('notes').delete(id)
  // Delete relations by note
  const tagRelations = await tx.objectStore('note_tags').index('by-note').getAll(id)
  for (const rel of tagRelations) {
    await tx.objectStore('note_tags').delete([rel.noteId, rel.tagId])
  }
  const catRelations = await tx.objectStore('note_categories').index('by-note').getAll(id)
  for (const rel of catRelations) {
    await tx.objectStore('note_categories').delete([rel.noteId, rel.categoryId])
  }
  await tx.done
}

// ============= Tags API =============

export async function getAllTags(): Promise<Tag[]> {
  const db = await getDB()
  return (await db.getAll('tags')) as Tag[]
}

export async function getTag(id: string): Promise<Tag | undefined> {
  const db = await getDB()
  return db.get('tags', id)
}

export async function upsertTag(tag: Tag): Promise<void> {
  const db = await getDB()
  await db.put('tags', tag)
}

export async function deleteTag(id: string): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['tags', 'note_tags'], 'readwrite')
  await tx.objectStore('tags').delete(id)
  // Delete all relations with this tag
  const relations = await tx.objectStore('note_tags').index('by-tag').getAll(id)
  for (const rel of relations) {
    await tx.objectStore('note_tags').delete([rel.noteId, rel.tagId])
  }
  await tx.done
}

// ============= Categories API =============

export async function getAllCategories(): Promise<Category[]> {
  const db = await getDB()
  return (await db.getAll('categories')) as Category[]
}

export async function getCategory(id: string): Promise<Category | undefined> {
  const db = await getDB()
  return db.get('categories', id)
}

export async function upsertCategory(category: Category): Promise<void> {
  const db = await getDB()
  await db.put('categories', category)
}

export async function deleteCategory(id: string): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['categories', 'note_categories'], 'readwrite')
  await tx.objectStore('categories').delete(id)
  // Delete all relations with this category
  const relations = await tx.objectStore('note_categories').index('by-category').getAll(id)
  for (const rel of relations) {
    await tx.objectStore('note_categories').delete([rel.noteId, rel.categoryId])
  }
  await tx.done
}

// ============= Relations API =============

export async function getTagsForNote(noteId: string): Promise<Tag[]> {
  const db = await getDB()
  const relations = await db.getAllFromIndex('note_tags', 'by-note', noteId)
  const tags: Tag[] = []
  for (const rel of relations) {
    const tag = await db.get('tags', rel.tagId)
    if (tag) tags.push(tag)
  }
  return tags
}

export async function getCategoriesForNote(noteId: string): Promise<Category[]> {
  const db = await getDB()
  const relations = await db.getAllFromIndex('note_categories', 'by-note', noteId)
  const categories: Category[] = []
  for (const rel of relations) {
    const cat = await db.get('categories', rel.categoryId)
    if (cat) categories.push(cat)
  }
  return categories
}

export async function getNotesByTag(tagId: string): Promise<Note[]> {
  const db = await getDB()
  const relations = await db.getAllFromIndex('note_tags', 'by-tag', tagId)
  const notes: Note[] = []
  for (const rel of relations) {
    const note = await db.get('notes', rel.noteId)
    if (note) notes.push(note)
  }
  return notes
}

export async function getNotesByCategory(categoryId: string): Promise<Note[]> {
  const db = await getDB()
  const relations = await db.getAllFromIndex('note_categories', 'by-category', categoryId)
  const notes: Note[] = []
  for (const rel of relations) {
    const note = await db.get('notes', rel.noteId)
    if (note) notes.push(note)
  }
  return notes
}

export async function linkNoteTag(noteId: string, tagId: string): Promise<void> {
  const db = await getDB()
  await db.put('note_tags', { noteId, tagId })
}

export async function unlinkNoteTag(noteId: string, tagId: string): Promise<void> {
  const db = await getDB()
  await db.delete('note_tags', [noteId, tagId])
}

export async function linkNoteCategory(noteId: string, categoryId: string): Promise<void> {
  const db = await getDB()
  await db.put('note_categories', { noteId, categoryId })
}

export async function unlinkNoteCategory(noteId: string, categoryId: string): Promise<void> {
  const db = await getDB()
  await db.delete('note_categories', [noteId, categoryId])
}
