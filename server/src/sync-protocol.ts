/**
 * 实时协作同步协议定义
 * 用于服务端和客户端之间的 WebSocket 通信
 */

// 笔记数据结构
export interface Note {
  id: string;
  title?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

// 标签和分类数据结构（支持未来的归一化 payload）
export interface Tag {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category extends Tag {}

// 关系数据结构
export interface NoteTag {
  noteId: string;
  tagId: string;
}

export interface NoteCategory {
  noteId: string;
  categoryId: string;
}

// 规范化初始化响应 Payload
export interface NormalizedPayload {
  notes: Note[];
  tags: Tag[];
  categories: Category[];
  relations: {
    note_tags: NoteTag[];
    note_categories: NoteCategory[];
  };
}

// 同步消息类型
export type SyncMessageType = 
  | 'INIT'                // 客户端初始化请求
  | 'INIT_RESPONSE'       // 服务端初始化响应（返回所有笔记，兼容 v1）
  | 'INIT_RESPONSE_NORM'  // 服务端初始化响应（规范化载荷）
  | 'UPDATE'              // 笔记更新
  | 'DELETE'              // 笔记删除
  | 'CREATE'              // 笔记创建
  | 'TAG_CREATE'          // 标签创建
  | 'TAG_UPDATE'          // 标签更新
  | 'TAG_DELETE'          // 标签删除
  | 'CATEGORY_CREATE'     // 分类创建
  | 'CATEGORY_UPDATE'     // 分类更新
  | 'CATEGORY_DELETE'     // 分类删除
  | 'RELATION_ADD'        // 添加关系（note-tag 或 note-category）
  | 'RELATION_REMOVE'     // 移除关系
  | 'PING'                // 心跳检测
  | 'PONG'                // 心跳响应
  | 'ACK';                // 确认收到

// 基础消息结构
export interface SyncMessageBase {
  type: SyncMessageType;
  timestamp: number;
  clientId?: string;  // 发送方客户端ID，用于避免回环
}

// 初始化请求
export interface InitMessage extends SyncMessageBase {
  type: 'INIT';
}

// 初始化响应（兼容 v1：仅返回笔记）
export interface InitResponseMessage extends SyncMessageBase {
  type: 'INIT_RESPONSE';
  notes: Note[];
}

// 初始化响应（规范化 v2：完整归一化载荷）
export interface InitResponseNormMessage extends SyncMessageBase {
  type: 'INIT_RESPONSE_NORM';
  payload: NormalizedPayload;
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

// 标签消息
export interface TagCreateMessage extends SyncMessageBase {
  type: 'TAG_CREATE';
  tag: Tag;
}

export interface TagUpdateMessage extends SyncMessageBase {
  type: 'TAG_UPDATE';
  tag: Tag;
}

export interface TagDeleteMessage extends SyncMessageBase {
  type: 'TAG_DELETE';
  tagId: string;
}

// 分类消息
export interface CategoryCreateMessage extends SyncMessageBase {
  type: 'CATEGORY_CREATE';
  category: Category;
}

export interface CategoryUpdateMessage extends SyncMessageBase {
  type: 'CATEGORY_UPDATE';
  category: Category;
}

export interface CategoryDeleteMessage extends SyncMessageBase {
  type: 'CATEGORY_DELETE';
  categoryId: string;
}

// 关系消息
export interface RelationAddMessage extends SyncMessageBase {
  type: 'RELATION_ADD';
  relationName: 'note_tags' | 'note_categories';
  noteId: string;
  targetId: string; // tagId 或 categoryId
}

export interface RelationRemoveMessage extends SyncMessageBase {
  type: 'RELATION_REMOVE';
  relationName: 'note_tags' | 'note_categories';
  noteId: string;
  targetId: string;
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
  | InitResponseNormMessage
  | UpdateMessage
  | CreateMessage
  | DeleteMessage
  | TagCreateMessage
  | TagUpdateMessage
  | TagDeleteMessage
  | CategoryCreateMessage
  | CategoryUpdateMessage
  | CategoryDeleteMessage
  | RelationAddMessage
  | RelationRemoveMessage
  | PingMessage
  | PongMessage
  | AckMessage;

// 生成客户端唯一ID
export function generateClientId(): string {
  return `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
