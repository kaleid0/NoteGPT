/**
 * 实时协作同步协议定义（客户端版本）
 * 与 shared/sync-protocol.ts 保持一致
 */

// 笔记数据结构
export interface Note {
  id: string;
  title?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

// 同步消息类型
export type SyncMessageType = 
  | 'INIT'           // 客户端初始化请求
  | 'INIT_RESPONSE'  // 服务端初始化响应（返回所有笔记）
  | 'UPDATE'         // 笔记更新
  | 'DELETE'         // 笔记删除
  | 'CREATE'         // 笔记创建
  | 'PING'           // 心跳检测
  | 'PONG'           // 心跳响应
  | 'ACK';           // 确认收到

// 基础消息结构
export interface SyncMessageBase {
  type: SyncMessageType;
  timestamp: number;
  clientId?: string;
}

// 初始化请求
export interface InitMessage extends SyncMessageBase {
  type: 'INIT';
}

// 初始化响应
export interface InitResponseMessage extends SyncMessageBase {
  type: 'INIT_RESPONSE';
  notes: Note[];
}

// 笔记更新消息
export interface UpdateMessage extends SyncMessageBase {
  type: 'UPDATE';
  note: Note;
}

// 笔记创建消息
export interface CreateMessage extends SyncMessageBase {
  type: 'CREATE';
  note: Note;
}

// 笔记删除消息
export interface DeleteMessage extends SyncMessageBase {
  type: 'DELETE';
  noteId: string;
}

// 心跳消息
export interface PingMessage extends SyncMessageBase {
  type: 'PING';
}

export interface PongMessage extends SyncMessageBase {
  type: 'PONG';
}

// 确认消息
export interface AckMessage extends SyncMessageBase {
  type: 'ACK';
  originalTimestamp: number;
}

// 联合类型
export type SyncMessage = 
  | InitMessage
  | InitResponseMessage
  | UpdateMessage
  | CreateMessage
  | DeleteMessage
  | PingMessage
  | PongMessage
  | AckMessage;

// 生成客户端唯一ID
export function generateClientId(): string {
  return `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
