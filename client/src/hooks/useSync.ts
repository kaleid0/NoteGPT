/**
 * WebSocket 同步 Hook
 * 管理与服务器的实时连接、消息收发和自动重连
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { 
  Note, 
  Tag,
  Category,
  SyncMessage, 
  InitResponseMessage,
  InitResponseNormMessage,
  UpdateMessage, 
  CreateMessage, 
  DeleteMessage,
  TagCreateMessage,
  TagUpdateMessage,
  TagDeleteMessage,
  CategoryCreateMessage,
  CategoryUpdateMessage,
  CategoryDeleteMessage,
  RelationAddMessage,
  RelationRemoveMessage,
  AckMessage 
} from '../lib/sync-protocol';
import { generateClientId } from '../lib/sync-protocol';

// 连接状态
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

// 同步事件类型
export interface SyncEvents {
  onNotesInit?: (notes: Note[]) => void;
  onNoteUpdate?: (note: Note) => void;
  onNoteCreate?: (note: Note) => void;
  onNoteDelete?: (noteId: string) => void;
  onTagCreate?: (tag: Tag) => void;
  onTagUpdate?: (tag: Tag) => void;
  onTagDelete?: (tagId: string) => void;
  onCategoryCreate?: (category: Category) => void;
  onCategoryUpdate?: (category: Category) => void;
  onCategoryDelete?: (categoryId: string) => void;
  onRelationAdd?: (relationName: 'note_tags' | 'note_categories', noteId: string, targetId: string) => void;
  onRelationRemove?: (relationName: 'note_tags' | 'note_categories', noteId: string, targetId: string) => void;
  onConnectionChange?: (status: ConnectionStatus) => void;
}

// 配置选项
export interface SyncOptions {
  serverUrl?: string;
  token?: string;
  reconnectInterval?: number;
  heartbeatInterval?: number;
  maxReconnectAttempts?: number;
}

const DEFAULT_OPTIONS: Required<SyncOptions> = {
  serverUrl: 'ws://localhost:4000/v1/sync',
  token: '',
  reconnectInterval: 3000,
  heartbeatInterval: 25000,
  maxReconnectAttempts: 10,
};

export function useSync(events: SyncEvents, options: SyncOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [clientId] = useState(() => generateClientId());
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval>>();
  const eventsRef = useRef(events);
  
  // 保持 events 引用最新
  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  // 发送消息
  const send = useCallback((message: Omit<SyncMessage, 'timestamp' | 'clientId'>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const fullMessage: SyncMessage = {
        ...message,
        timestamp: Date.now(),
        clientId,
      } as SyncMessage;
      wsRef.current.send(JSON.stringify(fullMessage));
    }
  }, [clientId]);

  // 发送笔记更新
  const sendUpdate = useCallback((note: Note) => {
    send({ type: 'UPDATE', note } as Omit<UpdateMessage, 'timestamp' | 'clientId'>);
  }, [send]);

  // 发送笔记创建
  const sendCreate = useCallback((note: Note) => {
    send({ type: 'CREATE', note } as Omit<CreateMessage, 'timestamp' | 'clientId'>);
  }, [send]);

  // 发送笔记删除
  const sendDelete = useCallback((noteId: string) => {
    send({ type: 'DELETE', noteId } as Omit<DeleteMessage, 'timestamp' | 'clientId'>);
  }, [send]);

  // 处理收到的消息
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: SyncMessage = JSON.parse(event.data);
      
      switch (message.type) {
        case 'INIT_RESPONSE': {
          const initMsg = message as InitResponseMessage;
          eventsRef.current.onNotesInit?.(initMsg.notes);
          break;
        }
        case 'INIT_RESPONSE_NORM': {
          const initNormMsg = message as InitResponseNormMessage;
          const payload = initNormMsg.payload;
          // Handle normalized payload
          eventsRef.current.onNotesInit?.(payload.notes);
          // Emit tag/category creation events
          for (const tag of payload.tags) {
            eventsRef.current.onTagCreate?.(tag);
          }
          for (const cat of payload.categories) {
            eventsRef.current.onCategoryCreate?.(cat);
          }
          // Emit relation add events
          for (const rel of payload.relations.note_tags) {
            eventsRef.current.onRelationAdd?.('note_tags', rel.noteId, rel.tagId);
          }
          for (const rel of payload.relations.note_categories) {
            eventsRef.current.onRelationAdd?.('note_categories', rel.noteId, rel.categoryId);
          }
          break;
        }
        case 'UPDATE': {
          const updateMsg = message as UpdateMessage;
          // 忽略自己发送的消息
          if (updateMsg.clientId !== clientId) {
            eventsRef.current.onNoteUpdate?.(updateMsg.note);
          }
          break;
        }
        case 'CREATE': {
          const createMsg = message as CreateMessage;
          if (createMsg.clientId !== clientId) {
            eventsRef.current.onNoteCreate?.(createMsg.note);
          }
          break;
        }
        case 'DELETE': {
          const deleteMsg = message as DeleteMessage;
          if (deleteMsg.clientId !== clientId) {
            eventsRef.current.onNoteDelete?.(deleteMsg.noteId);
          }
          break;
        }
        case 'TAG_CREATE': {
          const tagMsg = message as TagCreateMessage;
          if (tagMsg.clientId !== clientId) {
            eventsRef.current.onTagCreate?.(tagMsg.tag);
          }
          break;
        }
        case 'TAG_UPDATE': {
          const tagMsg = message as TagUpdateMessage;
          if (tagMsg.clientId !== clientId) {
            eventsRef.current.onTagUpdate?.(tagMsg.tag);
          }
          break;
        }
        case 'TAG_DELETE': {
          const tagMsg = message as TagDeleteMessage;
          if (tagMsg.clientId !== clientId) {
            eventsRef.current.onTagDelete?.(tagMsg.tagId);
          }
          break;
        }
        case 'CATEGORY_CREATE': {
          const catMsg = message as CategoryCreateMessage;
          if (catMsg.clientId !== clientId) {
            eventsRef.current.onCategoryCreate?.(catMsg.category);
          }
          break;
        }
        case 'CATEGORY_UPDATE': {
          const catMsg = message as CategoryUpdateMessage;
          if (catMsg.clientId !== clientId) {
            eventsRef.current.onCategoryUpdate?.(catMsg.category);
          }
          break;
        }
        case 'CATEGORY_DELETE': {
          const catMsg = message as CategoryDeleteMessage;
          if (catMsg.clientId !== clientId) {
            eventsRef.current.onCategoryDelete?.(catMsg.categoryId);
          }
          break;
        }
        case 'RELATION_ADD': {
          const relMsg = message as RelationAddMessage;
          if (relMsg.clientId !== clientId) {
            eventsRef.current.onRelationAdd?.(relMsg.relationName, relMsg.noteId, relMsg.targetId);
          }
          break;
        }
        case 'RELATION_REMOVE': {
          const relMsg = message as RelationRemoveMessage;
          if (relMsg.clientId !== clientId) {
            eventsRef.current.onRelationRemove?.(relMsg.relationName, relMsg.noteId, relMsg.targetId);
          }
          break;
        }
        case 'PONG': {
          // 心跳响应，更新连接状态
          break;
        }
        case 'ACK': {
          // 确认消息，可用于实现消息确认机制
          const ackMsg = message as AckMessage;
          console.debug('Message acknowledged:', ackMsg.originalTimestamp);
          break;
        }
      }
    } catch (err) {
      console.error('Failed to parse sync message:', err);
    }
  }, [clientId]);

  // 启动心跳
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    heartbeatIntervalRef.current = setInterval(() => {
      send({ type: 'PING' });
    }, opts.heartbeatInterval);
  }, [send, opts.heartbeatInterval]);

  // 停止心跳
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = undefined;
    }
  }, []);

  // 连接 WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || 
        wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    const url = opts.token 
      ? `${opts.serverUrl}?token=${encodeURIComponent(opts.token)}`
      : opts.serverUrl;

    setStatus('connecting');
    eventsRef.current.onConnectionChange?.('connecting');

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setStatus('connected');
        eventsRef.current.onConnectionChange?.('connected');
        reconnectAttemptsRef.current = 0;
        
        // 请求初始化数据
        send({ type: 'INIT' });
        
        // 启动心跳
        startHeartbeat();
      };

      ws.onmessage = handleMessage;

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setStatus('disconnected');
        eventsRef.current.onConnectionChange?.('disconnected');
        stopHeartbeat();
        
        // 尝试重连（非主动关闭时）
        if (event.code !== 1000 && reconnectAttemptsRef.current < opts.maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`Reconnecting... attempt ${reconnectAttemptsRef.current}`);
            connect();
          }, opts.reconnectInterval);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setStatus('error');
        eventsRef.current.onConnectionChange?.('error');
      };
    } catch (err) {
      console.error('Failed to create WebSocket:', err);
      setStatus('error');
      eventsRef.current.onConnectionChange?.('error');
    }
  }, [opts.serverUrl, opts.token, opts.reconnectInterval, opts.maxReconnectAttempts, send, handleMessage, startHeartbeat, stopHeartbeat]);

  // 断开连接
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    stopHeartbeat();
    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnect');
      wsRef.current = null;
    }
    setStatus('disconnected');
  }, [stopHeartbeat]);

  // 自动连接和清理
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    status,
    clientId,
    connect,
    disconnect,
    sendUpdate,
    sendCreate,
    sendDelete,
  };
}
