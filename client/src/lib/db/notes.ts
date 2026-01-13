import { openDB, DBSchema, IDBPDatabase } from 'idb';

export type Note = {
  id: string;
  title?: string; // 可选
  content: string;
  createdAt: string;
  updatedAt: string;
};

// 定义数据库 Schema
interface NoteDB extends DBSchema {
  notes: {
    key: string; // 主键是 id (string)
    value: Note; // 存储的值是 Note 对象
    indexes: { 'by-updated': string }; // 索引名及其对应字段类型
  };
}

const DB_NAME = 'notegpt-db';
const STORE = 'notes';
// let dbPromise: Promise<any>;
let dbPromise: Promise<IDBPDatabase<NoteDB>> | null = null;

async function getDB() {
  // return openDB(DB_NAME, 1, {
  //   upgrade(db) {
  //     if (!db.objectStoreNames.contains(STORE)) {
  //       const store = db.createObjectStore(STORE, { keyPath: 'id' })
  //       store.createIndex('by-updated', 'updatedAt')
  //     }
  //   }
  // })
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id' });
          store.createIndex('by-updated', 'updatedAt');
        }
      },
    });
  }
  return dbPromise;
}

export async function getAllNotes(): Promise<Note[]> {
  const db = await getDB();
  return (await db.getAll(STORE)) as Note[];
}

export async function getNote(id: string): Promise<Note | undefined> {
  const db = await getDB();
  return db.get(STORE, id) as Promise<Note | undefined>;
}

export async function upsertNote(note: Note): Promise<void> {
  const db = await getDB();
  await db.put(STORE, note);
}

export async function deleteNote(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE, id);
}
