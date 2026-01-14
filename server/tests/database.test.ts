/**
 * SQLite 数据库服务层单元测试
 */
import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import * as db from '../src/services/database'
import type { Note } from '../../shared/sync-protocol'
import fs from 'fs'
import path from 'path'

// 设置测试数据库路径
const TEST_DB_PATH = path.join(__dirname, 'test-notes.db')
process.env.DB_PATH = TEST_DB_PATH

describe('Database Service', () => {
  beforeEach(() => {
    // 清空测试数据
    db.clearAllNotes()
  })

  afterAll(() => {
    // 关闭数据库连接
    db.closeDatabase()
    // 清理测试数据库文件
    try {
      if (fs.existsSync(TEST_DB_PATH)) {
        fs.unlinkSync(TEST_DB_PATH)
      }
      if (fs.existsSync(TEST_DB_PATH + '-wal')) {
        fs.unlinkSync(TEST_DB_PATH + '-wal')
      }
      if (fs.existsSync(TEST_DB_PATH + '-shm')) {
        fs.unlinkSync(TEST_DB_PATH + '-shm')
      }
    } catch (e) {
      // ignore cleanup errors
    }
  })

  describe('upsertNote', () => {
    it('should create a new note', () => {
      const note: Note = {
        id: 'test-1',
        title: 'Test Note',
        content: 'Hello World',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const result = db.upsertNote(note)

      expect(result).not.toBeNull()
      expect(result?.id).toBe('test-1')
      expect(result?.title).toBe('Test Note')
      expect(result?.content).toBe('Hello World')
    })

    it('should update an existing note', () => {
      const now = new Date()
      const note: Note = {
        id: 'test-2',
        title: 'Original Title',
        content: 'Original Content',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      }

      db.upsertNote(note)

      const later = new Date(now.getTime() + 1000)
      const updated: Note = {
        ...note,
        title: 'Updated Title',
        content: 'Updated Content',
        updatedAt: later.toISOString(),
      }

      const result = db.upsertNote(updated)

      expect(result?.title).toBe('Updated Title')
      expect(result?.content).toBe('Updated Content')
    })

    it('should not update if updatedAt is older (LWW)', () => {
      const later = new Date()
      const earlier = new Date(later.getTime() - 1000)

      const newerNote: Note = {
        id: 'test-3',
        title: 'Newer',
        content: 'Newer Content',
        createdAt: earlier.toISOString(),
        updatedAt: later.toISOString(),
      }

      db.upsertNote(newerNote)

      const olderNote: Note = {
        ...newerNote,
        title: 'Older',
        content: 'Older Content',
        updatedAt: earlier.toISOString(),
      }

      const result = db.upsertNote(olderNote)

      // Should return null (not updated due to LWW)
      expect(result).toBeNull()

      // Verify the note wasn't changed
      const fetched = db.getNoteById('test-3')
      expect(fetched?.title).toBe('Newer')
    })
  })

  describe('getAllNotes', () => {
    it('should return all notes ordered by updatedAt DESC', () => {
      const now = new Date()

      const note1: Note = {
        id: 'note-1',
        title: 'First',
        content: '',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      }

      const note2: Note = {
        id: 'note-2',
        title: 'Second',
        content: '',
        createdAt: now.toISOString(),
        updatedAt: new Date(now.getTime() + 1000).toISOString(),
      }

      db.upsertNote(note1)
      db.upsertNote(note2)

      const notes = db.getAllNotes()

      expect(notes.length).toBe(2)
      expect(notes[0].id).toBe('note-2') // Most recently updated first
      expect(notes[1].id).toBe('note-1')
    })

    it('should return empty array when no notes exist', () => {
      const notes = db.getAllNotes()
      expect(notes).toEqual([])
    })
  })

  describe('getNoteById', () => {
    it('should return the note with matching id', () => {
      const note: Note = {
        id: 'find-me',
        title: 'Find Me',
        content: 'Here I am',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      db.upsertNote(note)

      const result = db.getNoteById('find-me')

      expect(result).not.toBeUndefined()
      expect(result?.id).toBe('find-me')
      expect(result?.content).toBe('Here I am')
    })

    it('should return undefined for non-existent id', () => {
      const result = db.getNoteById('non-existent')
      expect(result).toBeUndefined()
    })
  })

  describe('deleteNote', () => {
    it('should delete an existing note', () => {
      const note: Note = {
        id: 'delete-me',
        title: 'Delete Me',
        content: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      db.upsertNote(note)

      const deleted = db.deleteNote('delete-me')

      expect(deleted).toBe(true)
      expect(db.getNoteById('delete-me')).toBeUndefined()
    })

    it('should return false when deleting non-existent note', () => {
      const deleted = db.deleteNote('non-existent')
      expect(deleted).toBe(false)
    })
  })

  describe('syncNotes', () => {
    it('should merge client notes with server notes', () => {
      const now = new Date()

      // Server has an existing note
      const serverNote: Note = {
        id: 'server-note',
        title: 'Server Note',
        content: 'From server',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      }
      db.upsertNote(serverNote)

      // Client sends new notes
      const clientNotes: Note[] = [
        {
          id: 'client-note-1',
          title: 'Client Note 1',
          content: 'From client',
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        },
        {
          id: 'client-note-2',
          title: 'Client Note 2',
          content: 'Also from client',
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        },
      ]

      const result = db.syncNotes(clientNotes)

      expect(result.length).toBe(3)
      expect(result.find((n) => n.id === 'server-note')).toBeDefined()
      expect(result.find((n) => n.id === 'client-note-1')).toBeDefined()
      expect(result.find((n) => n.id === 'client-note-2')).toBeDefined()
    })
  })
})
