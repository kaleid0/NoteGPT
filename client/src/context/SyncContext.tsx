/**
 * 同步上下文 Provider
 * 提供全局的实时同步能力，包括连接状态和同步方法
 */
import React, { createContext, useContext, useCallback, useEffect, useMemo } from 'react';
import { useSync, ConnectionStatus, SyncEvents, SyncOptions } from '../hooks/useSync';
import { Note } from '../lib/db/notes';
import useNotesStore from '../stores/notesStore';
import useSyncStore from '../stores/syncStore';

// 同步上下文类型
interface SyncContextType {
  // 连接状态
  status: ConnectionStatus;
  clientId: string;
  
  // 连接控制
  connect: () => void;
  disconnect: () => void;
  
  // 同步方法（发送到服务器并更新本地）
  syncUpdate: (note: Note) => Promise<void>;
  syncCreate: (note: Note) => Promise<void>;
  syncDelete: (noteId: string) => Promise<void>;
  
  // 远程更新通知（用于 UI 刷新）
  lastRemoteUpdate: number;
  // 最后更新的笔记（用于 NoteDetail 页面实时更新）
  lastUpdatedNote: Note | null;
  // 最后删除的笔记 ID
  lastDeletedNoteId: string | null;
}

const SyncContext = createContext<SyncContextType | null>(null);

// 同步配置 Props
interface SyncProviderProps {
  children: React.ReactNode;
  serverUrl?: string;
  token?: string;
}

export function SyncProvider({ children, serverUrl, token }: SyncProviderProps) {
  // sync store setters/selectors
  const setLastRemoteUpdate = useSyncStore((s) => s.setLastRemoteUpdate);
  const setLastUpdatedNoteId = useSyncStore((s) => s.setLastUpdatedNoteId);
  const setLastDeletedNoteId = useSyncStore((s) => s.setLastDeletedNoteId);
  const setStatus = useSyncStore((s) => s.setStatus);
  const setClientId = useSyncStore((s) => s.setClientId);

  const upsertNoteToStore = useNotesStore((s) => s.upsert);
  const removeNoteFromStore = useNotesStore((s) => s.remove);
  
  // 同步事件处理器
  const syncEvents: SyncEvents = useMemo(() => ({
    onNotesInit: async (notes: Note[]) => {
      console.log('Received initial notes from server:', notes.length);
      // 合并服务器笔记到本地 (LWW): delegate to notes store upsert
      for (const serverNote of notes) {
        await upsertNoteToStore(serverNote);
      }
      setLastRemoteUpdate(Date.now());
    },

    onNoteUpdate: async (note: Note) => {
      console.log('Received note update from server:', note.id);
      await upsertNoteToStore(note);
      setLastUpdatedNoteId(note.id);
      setLastRemoteUpdate(Date.now());
    },

    onNoteCreate: async (note: Note) => {
      console.log('Received new note from server:', note.id);
      await upsertNoteToStore(note);
      setLastUpdatedNoteId(note.id);
      setLastRemoteUpdate(Date.now());
    },

    onNoteDelete: async (noteId: string) => {
      console.log('Received note deletion from server:', noteId);
      await removeNoteFromStore(noteId);
      setLastDeletedNoteId(noteId);
      setLastRemoteUpdate(Date.now());
    },

    onTagCreate: async (tag) => {
      console.log('Received tag creation from server:', tag.id);
      const tagStore = useNotesStore.getState();
      await tagStore.upsertTag(tag);
      setLastRemoteUpdate(Date.now());
    },

    onTagUpdate: async (tag) => {
      console.log('Received tag update from server:', tag.id);
      const tagStore = useNotesStore.getState();
      await tagStore.upsertTag(tag);
      setLastRemoteUpdate(Date.now());
    },

    onTagDelete: async (tagId) => {
      console.log('Received tag deletion from server:', tagId);
      const tagStore = useNotesStore.getState();
      await tagStore.removeTag(tagId);
      setLastRemoteUpdate(Date.now());
    },

    onCategoryCreate: async (category) => {
      console.log('Received category creation from server:', category.id);
      const catStore = useNotesStore.getState();
      await catStore.upsertCategory(category);
      setLastRemoteUpdate(Date.now());
    },

    onCategoryUpdate: async (category) => {
      console.log('Received category update from server:', category.id);
      const catStore = useNotesStore.getState();
      await catStore.upsertCategory(category);
      setLastRemoteUpdate(Date.now());
    },

    onCategoryDelete: async (categoryId) => {
      console.log('Received category deletion from server:', categoryId);
      const catStore = useNotesStore.getState();
      await catStore.removeCategory(categoryId);
      setLastRemoteUpdate(Date.now());
    },

    onRelationAdd: async (relationName, noteId, targetId) => {
      console.log(`Received relation add: ${relationName}`, noteId, targetId);
      const relStore = useNotesStore.getState();
      if (relationName === 'note_tags') {
        await relStore.linkNoteTag(noteId, targetId);
      } else if (relationName === 'note_categories') {
        await relStore.linkNoteCategory(noteId, targetId);
      }
      setLastRemoteUpdate(Date.now());
    },

    onRelationRemove: async (relationName, noteId, targetId) => {
      console.log(`Received relation remove: ${relationName}`, noteId, targetId);
      const relStore = useNotesStore.getState();
      if (relationName === 'note_tags') {
        await relStore.unlinkNoteTag(noteId, targetId);
      } else if (relationName === 'note_categories') {
        await relStore.unlinkNoteCategory(noteId, targetId);
      }
      setLastRemoteUpdate(Date.now());
    },

    onConnectionChange: (status: ConnectionStatus) => {
      console.log('Sync connection status:', status);
      setStatus(status);
    },
  }), [upsertNoteToStore, removeNoteFromStore, setLastRemoteUpdate, setLastUpdatedNoteId, setLastDeletedNoteId, setStatus]);
  
  const syncOptions: SyncOptions = useMemo(() => ({
    serverUrl: serverUrl || 'ws://localhost:4000/v1/sync',
    token: token || '',
  }), [serverUrl, token]);
  
  const {
    status,
    clientId,
    connect,
    disconnect,
    sendUpdate,
    sendCreate,
    sendDelete,
  } = useSync(syncEvents, syncOptions);

  // keep sync store in sync with useSync outputs
  useEffect(() => {
    setStatus(status);
  }, [status, setStatus]);

  useEffect(() => {
    if (clientId) setClientId(clientId);
  }, [clientId, setClientId]);
  
  // 同步更新：先更新本地，再发送到服务器
  const syncUpdate = useCallback(async (note: Note) => {
    await upsertNoteToStore(note);
    sendUpdate(note);
  }, [sendUpdate, upsertNoteToStore]);
  
  // 同步创建：先创建本地，再发送到服务器
  const syncCreate = useCallback(async (note: Note) => {
    await upsertNoteToStore(note);
    sendCreate(note);
  }, [sendCreate, upsertNoteToStore]);
  
  // 同步删除：先删除本地，再发送到服务器
  const syncDelete = useCallback(async (noteId: string) => {
    await removeNoteFromStore(noteId);
    sendDelete(noteId);
  }, [sendDelete, removeNoteFromStore]);
  
  // read values from sync store
  const statusFromStore = useSyncStore((s) => s.status);
  const clientIdFromStore = useSyncStore((s) => s.clientId);
  const lastRemoteUpdateFromStore = useSyncStore((s) => s.lastRemoteUpdate);
  const lastUpdatedNoteIdFromStore = useSyncStore((s) => s.lastUpdatedNoteId);
  const lastDeletedNoteIdFromStore = useSyncStore((s) => s.lastDeletedNoteId);

  const contextValue: SyncContextType = useMemo(() => ({
    status: statusFromStore,
    clientId: clientIdFromStore,
    connect,
    disconnect,
    syncUpdate,
    syncCreate,
    syncDelete,
    lastRemoteUpdate: lastRemoteUpdateFromStore,
    lastUpdatedNote: lastUpdatedNoteIdFromStore ? (useNotesStore.getState().notesById[lastUpdatedNoteIdFromStore] ?? null) : null,
    lastDeletedNoteId: lastDeletedNoteIdFromStore,
  }), [statusFromStore, clientIdFromStore, connect, disconnect, syncUpdate, syncCreate, syncDelete, lastRemoteUpdateFromStore, lastUpdatedNoteIdFromStore, lastDeletedNoteIdFromStore]);
  
  return (
    <SyncContext.Provider value={contextValue}>
      {children}
    </SyncContext.Provider>
  );
}

/**
 * 使用同步上下文的 Hook
 */
export function useSyncContext(): SyncContextType {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSyncContext must be used within a SyncProvider');
  }
  return context;
}

/**
 * 连接状态指示器组件
 */
export function ConnectionIndicator() {
  const { status } = useSyncContext();
  
  const statusConfig = {
    connecting: { color: '#f59e0b', text: '连接中...' },
    connected: { color: '#10b981', text: '已同步' },
    disconnected: { color: '#6b7280', text: '离线' },
    error: { color: '#ef4444', text: '连接错误' },
  };
  
  const config = statusConfig[status];
  
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '6px',
      fontSize: '12px',
      color: config.color,
    }}>
      <span style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: config.color,
      }} />
      {config.text}
    </div>
  );
}
