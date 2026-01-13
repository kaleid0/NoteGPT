/**
 * SQLite 数据库服务层
 * 负责笔记的持久化存储
 */
import Database from 'better-sqlite3';
import path from 'path';
import type { Note } from '../../shared/sync-protocol';

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
    db.exec(`
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
  }
  
  return db;
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
}
