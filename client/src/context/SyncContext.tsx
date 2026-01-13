/**
 * 同步上下文 Provider
 * 提供全局的实时同步能力，包括连接状态和同步方法
 */
import React, { createContext, useContext, useCallback, useMemo, useState } from 'react';
import { useSync, ConnectionStatus, SyncEvents, SyncOptions } from '../hooks/useSync';
import { Note, upsertNote, deleteNote as deleteNoteFromDB, getAllNotes } from '../lib/db/notes';

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
  // 用于通知 UI 刷新的时间戳
  const [lastRemoteUpdate, setLastRemoteUpdate] = useState(0);
  // 最后更新的笔记（用于 NoteDetail 页面实时更新）
  const [lastUpdatedNote, setLastUpdatedNote] = useState<Note | null>(null);
  // 最后删除的笔记 ID
  const [lastDeletedNoteId, setLastDeletedNoteId] = useState<string | null>(null);
  
  // 同步事件处理器
  const syncEvents: SyncEvents = useMemo(() => ({
    onNotesInit: async (notes: Note[]) => {
      console.log('Received initial notes from server:', notes.length);
      // 合并服务器笔记到本地（LWW 策略）
      const localNotes = await getAllNotes();
      const localMap = new Map(localNotes.map(n => [n.id, n]));
      
      for (const serverNote of notes) {
        const local = localMap.get(serverNote.id);
        if (!local || new Date(serverNote.updatedAt) >= new Date(local.updatedAt)) {
          await upsertNote(serverNote);
        }
      }
      
      setLastRemoteUpdate(Date.now());
    },
    
    onNoteUpdate: async (note: Note) => {
      console.log('Received note update from server:', note.id);
      await upsertNote(note);
      setLastUpdatedNote(note);
      setLastRemoteUpdate(Date.now());
    },
    
    onNoteCreate: async (note: Note) => {
      console.log('Received new note from server:', note.id);
      await upsertNote(note);
      setLastUpdatedNote(note);
      setLastRemoteUpdate(Date.now());
    },
    
    onNoteDelete: async (noteId: string) => {
      console.log('Received note deletion from server:', noteId);
      await deleteNoteFromDB(noteId);
      setLastDeletedNoteId(noteId);
      setLastRemoteUpdate(Date.now());
    },
    
    onConnectionChange: (status: ConnectionStatus) => {
      console.log('Sync connection status:', status);
    },
  }), []);
  
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
  
  // 同步更新：先更新本地，再发送到服务器
  const syncUpdate = useCallback(async (note: Note) => {
    await upsertNote(note);
    sendUpdate(note);
  }, [sendUpdate]);
  
  // 同步创建：先创建本地，再发送到服务器
  const syncCreate = useCallback(async (note: Note) => {
    await upsertNote(note);
    sendCreate(note);
  }, [sendCreate]);
  
  // 同步删除：先删除本地，再发送到服务器
  const syncDelete = useCallback(async (noteId: string) => {
    await deleteNoteFromDB(noteId);
    sendDelete(noteId);
  }, [sendDelete]);
  
  const contextValue: SyncContextType = useMemo(() => ({
    status,
    clientId,
    connect,
    disconnect,
    syncUpdate,
    syncCreate,
    syncDelete,
    lastRemoteUpdate,
    lastUpdatedNote,
    lastDeletedNoteId,
  }), [status, clientId, connect, disconnect, syncUpdate, syncCreate, syncDelete, lastRemoteUpdate, lastUpdatedNote, lastDeletedNoteId]);
  
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
