/**
 * SQLite 数据库服务层
 * 负责笔记、标签、分类及其关系的持久化存储
 */
import Database from 'better-sqlite3';
import path from 'path';
import type { Note, Tag, Category, NoteTag, NoteCategory, NormalizedPayload } from '../sync-protocol';

// 数据库文件路径（可通过环境变量配置）
const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'notes.db');

let db: Database.Database | null = null;

/**
 * 获取数据库实例（单例模式）
 */
export function getDatabase(): Database.Database {
  if (!db) {
    // 确保数据目录存在
    const fs = require('fs');
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    db = new Database(DB_PATH);
    
    // 启用 WAL 模式以提高并发性能
    db.pragma('journal_mode = WAL');
    
    // 初始化表结构
    initializeDatabaseSchema();
  }
  
  return db;
}

/**
 * 初始化数据库 schema（包括迁移逻辑）
 */
function initializeDatabaseSchema(): void {
  const database = db!;
  
  // v1: 基础笔记表
  database.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT,
      content TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1
    );
    
    CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at);
  `);

  // v2: 标签、分类及关系表
  database.exec(`
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1
    );
    
    CREATE INDEX IF NOT EXISTS idx_tags_updated_at ON tags(updated_at);
    
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1
    );
    
    CREATE INDEX IF NOT EXISTS idx_categories_updated_at ON categories(updated_at);
    
    CREATE TABLE IF NOT EXISTS note_tags (
      note_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY (note_id, tag_id),
      FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );
    
    CREATE INDEX IF NOT EXISTS idx_note_tags_note ON note_tags(note_id);
    CREATE INDEX IF NOT EXISTS idx_note_tags_tag ON note_tags(tag_id);
    
    CREATE TABLE IF NOT EXISTS note_categories (
      note_id TEXT NOT NULL,
      category_id TEXT NOT NULL,
      PRIMARY KEY (note_id, category_id),
      FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );
    
    CREATE INDEX IF NOT EXISTS idx_note_categories_note ON note_categories(note_id);
    CREATE INDEX IF NOT EXISTS idx_note_categories_cat ON note_categories(category_id);
  `);
}

/**
 * 关闭数据库连接
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * 获取所有笔记
 */
export function getAllNotes(): Note[] {
  const database = getDatabase();
  const stmt = database.prepare(`
    SELECT id, title, content, created_at as createdAt, updated_at as updatedAt 
    FROM notes 
    ORDER BY updated_at DESC
  `);
  return stmt.all() as Note[];
}

/**
 * 根据 ID 获取单个笔记
 */
export function getNoteById(id: string): Note | undefined {
  const database = getDatabase();
  const stmt = database.prepare(`
    SELECT id, title, content, created_at as createdAt, updated_at as updatedAt 
    FROM notes 
    WHERE id = ?
  `);
  return stmt.get(id) as Note | undefined;
}

/**
 * 创建或更新笔记（Upsert）
 * 使用 LWW（Last Write Wins）策略
 * @returns 返回更新后的笔记，如果因为 LWW 策略未更新则返回 null
 */
export function upsertNote(note: Note): Note | null {
  const database = getDatabase();
  
  // 先检查是否存在以及时间戳
  const existing = getNoteById(note.id);
  
  if (existing) {
    // LWW: 只有当新笔记的 updatedAt 更新时才更新
    if (new Date(note.updatedAt) < new Date(existing.updatedAt)) {
      return null; // 旧数据，不更新
    }
    
    const stmt = database.prepare(`
      UPDATE notes 
      SET title = ?, content = ?, updated_at = ?, version = version + 1
      WHERE id = ?
    `);
    stmt.run(note.title || null, note.content, note.updatedAt, note.id);
  } else {
    const stmt = database.prepare(`
      INSERT INTO notes (id, title, content, created_at, updated_at, version)
      VALUES (?, ?, ?, ?, ?, 1)
    `);
    stmt.run(note.id, note.title || null, note.content, note.createdAt, note.updatedAt);
  }
  
  return getNoteById(note.id) || null;
}

/**
 * 删除笔记
 * @returns 是否成功删除
 */
export function deleteNote(id: string): boolean {
  const database = getDatabase();
  const stmt = database.prepare('DELETE FROM notes WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

/**
 * 批量同步笔记（用于初始化时合并）
 * @param notes 客户端的笔记列表
 * @returns 合并后的所有笔记
 */
export function syncNotes(notes: Note[]): Note[] {
  const database = getDatabase();
  
  const transaction = database.transaction((clientNotes: Note[]) => {
    for (const note of clientNotes) {
      upsertNote(note);
    }
    return getAllNotes();
  });
  
  return transaction(notes);
}

/**
 * 清空所有笔记（仅用于测试）
 */
export function clearAllNotes(): void {
  const database = getDatabase();
  database.exec('DELETE FROM notes');
  database.exec('DELETE FROM tags');
  database.exec('DELETE FROM categories');
  database.exec('DELETE FROM note_tags');
  database.exec('DELETE FROM note_categories');
}

// ============= Tags API =============

export function getAllTags(): Tag[] {
  const database = getDatabase();
  const stmt = database.prepare(`
    SELECT id, name, created_at as createdAt, updated_at as updatedAt 
    FROM tags 
    ORDER BY updated_at DESC
  `);
  return stmt.all() as Tag[];
}

export function getTagById(id: string): Tag | undefined {
  const database = getDatabase();
  const stmt = database.prepare(`
    SELECT id, name, created_at as createdAt, updated_at as updatedAt 
    FROM tags 
    WHERE id = ?
  `);
  return stmt.get(id) as Tag | undefined;
}

export function upsertTag(tag: Tag): Tag | null {
  const database = getDatabase();
  const existing = getTagById(tag.id);
  
  if (existing) {
    if (new Date(tag.updatedAt) < new Date(existing.updatedAt)) {
      return null;
    }
    const stmt = database.prepare(`
      UPDATE tags 
      SET name = ?, updated_at = ?, version = version + 1
      WHERE id = ?
    `);
    stmt.run(tag.name, tag.updatedAt, tag.id);
  } else {
    const stmt = database.prepare(`
      INSERT INTO tags (id, name, created_at, updated_at, version)
      VALUES (?, ?, ?, ?, 1)
    `);
    stmt.run(tag.id, tag.name, tag.createdAt, tag.updatedAt);
  }
  
  return getTagById(tag.id) || null;
}

export function deleteTag(id: string): boolean {
  const database = getDatabase();
  const stmt = database.prepare('DELETE FROM tags WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

// ============= Categories API =============

export function getAllCategories(): Category[] {
  const database = getDatabase();
  const stmt = database.prepare(`
    SELECT id, name, created_at as createdAt, updated_at as updatedAt 
    FROM categories 
    ORDER BY updated_at DESC
  `);
  return stmt.all() as Category[];
}

export function getCategoryById(id: string): Category | undefined {
  const database = getDatabase();
  const stmt = database.prepare(`
    SELECT id, name, created_at as createdAt, updated_at as updatedAt 
    FROM categories 
    WHERE id = ?
  `);
  return stmt.get(id) as Category | undefined;
}

export function upsertCategory(category: Category): Category | null {
  const database = getDatabase();
  const existing = getCategoryById(category.id);
  
  if (existing) {
    if (new Date(category.updatedAt) < new Date(existing.updatedAt)) {
      return null;
    }
    const stmt = database.prepare(`
      UPDATE categories 
      SET name = ?, updated_at = ?, version = version + 1
      WHERE id = ?
    `);
    stmt.run(category.name, category.updatedAt, category.id);
  } else {
    const stmt = database.prepare(`
      INSERT INTO categories (id, name, created_at, updated_at, version)
      VALUES (?, ?, ?, ?, 1)
    `);
    stmt.run(category.id, category.name, category.createdAt, category.updatedAt);
  }
  
  return getCategoryById(category.id) || null;
}

export function deleteCategory(id: string): boolean {
  const database = getDatabase();
  const stmt = database.prepare('DELETE FROM categories WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

// ============= Relations API =============

export function getTagsForNote(noteId: string): Tag[] {
  const database = getDatabase();
  const stmt = database.prepare(`
    SELECT t.id, t.name, t.created_at as createdAt, t.updated_at as updatedAt
    FROM tags t
    INNER JOIN note_tags nt ON t.id = nt.tag_id
    WHERE nt.note_id = ?
  `);
  return stmt.all(noteId) as Tag[];
}

export function getCategoriesForNote(noteId: string): Category[] {
  const database = getDatabase();
  const stmt = database.prepare(`
    SELECT c.id, c.name, c.created_at as createdAt, c.updated_at as updatedAt
    FROM categories c
    INNER JOIN note_categories nc ON c.id = nc.category_id
    WHERE nc.note_id = ?
  `);
  return stmt.all(noteId) as Category[];
}

export function getNotesByTag(tagId: string): Note[] {
  const database = getDatabase();
  const stmt = database.prepare(`
    SELECT n.id, n.title, n.content, n.created_at as createdAt, n.updated_at as updatedAt
    FROM notes n
    INNER JOIN note_tags nt ON n.id = nt.note_id
    WHERE nt.tag_id = ?
  `);
  return stmt.all(tagId) as Note[];
}

export function getNotesByCategory(categoryId: string): Note[] {
  const database = getDatabase();
  const stmt = database.prepare(`
    SELECT n.id, n.title, n.content, n.created_at as createdAt, n.updated_at as updatedAt
    FROM notes n
    INNER JOIN note_categories nc ON n.id = nc.note_id
    WHERE nc.category_id = ?
  `);
  return stmt.all(categoryId) as Note[];
}

export function linkNoteTag(noteId: string, tagId: string): boolean {
  const database = getDatabase();
  const stmt = database.prepare(`
    INSERT OR IGNORE INTO note_tags (note_id, tag_id)
    VALUES (?, ?)
  `);
  stmt.run(noteId, tagId);
  return true;
}

export function unlinkNoteTag(noteId: string, tagId: string): boolean {
  const database = getDatabase();
  const stmt = database.prepare(`
    DELETE FROM note_tags WHERE note_id = ? AND tag_id = ?
  `);
  const result = stmt.run(noteId, tagId);
  return result.changes > 0;
}

export function linkNoteCategory(noteId: string, categoryId: string): boolean {
  const database = getDatabase();
  const stmt = database.prepare(`
    INSERT OR IGNORE INTO note_categories (note_id, category_id)
    VALUES (?, ?)
  `);
  stmt.run(noteId, categoryId);
  return true;
}

export function unlinkNoteCategory(noteId: string, categoryId: string): boolean {
  const database = getDatabase();
  const stmt = database.prepare(`
    DELETE FROM note_categories WHERE note_id = ? AND category_id = ?
  `);
  const result = stmt.run(noteId, categoryId);
  return result.changes > 0;
}

// ============= Normalized Sync =============

export function getNormalizedPayload(): NormalizedPayload {
  const notes = getAllNotes();
  const tags = getAllTags();
  const categories = getAllCategories();
  
  const database = getDatabase();
  
  // Get all relations
  const noteTagsStmt = database.prepare('SELECT note_id as noteId, tag_id as tagId FROM note_tags');
  const note_tags = noteTagsStmt.all() as NoteTag[];
  
  const noteCatsStmt = database.prepare('SELECT note_id as noteId, category_id as categoryId FROM note_categories');
  const note_categories = noteCatsStmt.all() as NoteCategory[];
  
  return {
    notes,
    tags,
    categories,
    relations: {
      note_tags,
      note_categories,
    },
  };
}
