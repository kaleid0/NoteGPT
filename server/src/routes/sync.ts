/**
 * WebSocket 同步路由
 * 处理多端实时协作编辑的消息同步，包括笔记、标签、分类及其关系的同步
 */
import { FastifyPluginAsync } from 'fastify';
import { SocketStream } from '@fastify/websocket';
import type { WebSocket } from 'ws';
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
} from '../sync-protocol';
import * as db from '../services/database';

// 连接池：存储所有活跃的 WebSocket 连接
interface ClientConnection {
  socket: WebSocket;
  clientId: string;
  lastPing: number;
}
const connections = new Map<string, ClientConnection>();

// 心跳检测间隔（30秒）
const HEARTBEAT_INTERVAL = 30000;
const HEARTBEAT_TIMEOUT = 60000;

// 是否使用规范化 payload（可通过环境变量控制）
const USE_NORMALIZED_PAYLOAD = process.env.USE_NORMALIZED_PAYLOAD !== 'false';

/**
 * 广播消息给所有其他客户端
 */
function broadcast(message: SyncMessage, excludeClientId?: string): void {
  const data = JSON.stringify(message);
  connections.forEach((conn, id) => {
    if (id !== excludeClientId && conn.socket.readyState === 1) { // WebSocket.OPEN = 1
      conn.socket.send(data);
    }
  });
}

/**
 * 发送消息给特定客户端
 */
function sendTo(clientId: string, message: SyncMessage): void {
  const conn = connections.get(clientId);
  if (conn && conn.socket.readyState === 1) {
    conn.socket.send(JSON.stringify(message));
  }
}

/**
 * 获取当前连接数（用于测试和监控）
 */
export function getConnectionCount(): number {
  return connections.size;
}

const syncRoute: FastifyPluginAsync = async (fastify) => {
  // 心跳检测定时器
  const heartbeatTimer = setInterval(() => {
    const now = Date.now();
    connections.forEach((conn, id) => {
      if (now - conn.lastPing > HEARTBEAT_TIMEOUT) {
        fastify.log.info(`Client ${id} heartbeat timeout, closing connection`);
        try {
          conn.socket.terminate();
        } catch (e) {
          // ignore
        }
        connections.delete(id);
      }
    });
  }, HEARTBEAT_INTERVAL);

  // 清理定时器
  fastify.addHook('onClose', () => {
    clearInterval(heartbeatTimer);
    // 关闭所有连接
    connections.forEach((conn) => {
      try {
        conn.socket.terminate();
      } catch (e) {
        // ignore
      }
    });
    connections.clear();
  });

  fastify.get('/sync', { websocket: true }, (connection, req) => {
    // connection 是 SocketStream，socket 是实际的 WebSocket
    const socket = connection.socket;

    // 从查询参数获取认证 token
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    const serverToken = process.env.SERVER_API_TOKEN;

    // 验证 token（如果服务端配置了 token）
    if (serverToken && token !== serverToken) {
      fastify.log.warn('WebSocket connection rejected: invalid token');
      socket.close(4001, 'Unauthorized');
      return;
    }

    // 生成客户端ID
    const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // 注册连接
    connections.set(clientId, {
      socket,
      clientId,
      lastPing: Date.now(),
    });

    fastify.log.info(`Client ${clientId} connected. Total connections: ${connections.size}`);

    // 处理消息
    socket.on('message', (rawMessage: Buffer | string) => {
      const messageStr = typeof rawMessage === 'string' ? rawMessage : rawMessage.toString();
      try {
        const message: SyncMessage = JSON.parse(messageStr);
        const conn = connections.get(clientId);
        if (conn) {
          conn.lastPing = Date.now();
        }

        switch (message.type) {
          case 'INIT': {
            if (USE_NORMALIZED_PAYLOAD) {
              // Send normalized payload
              const payload = db.getNormalizedPayload();
              const response: InitResponseNormMessage = {
                type: 'INIT_RESPONSE_NORM',
                timestamp: Date.now(),
                clientId,
                payload,
              };
              sendTo(clientId, response);
              fastify.log.info(`Sent normalized payload (${payload.notes.length} notes, ${payload.tags.length} tags, ${payload.categories.length} categories) to client ${clientId}`);
            } else {
              // Send legacy flat response
              const notes = db.getAllNotes();
              const response: InitResponseMessage = {
                type: 'INIT_RESPONSE',
                timestamp: Date.now(),
                clientId,
                notes,
              };
              sendTo(clientId, response);
              fastify.log.info(`Sent ${notes.length} notes to client ${clientId}`);
            }
            break;
          }

          case 'CREATE':
          case 'UPDATE': {
            const noteMessage = message as CreateMessage | UpdateMessage;
            const note = noteMessage.note;
            
            // 写入数据库（LWW 策略在 db 层处理）
            const updated = db.upsertNote(note);
            
            if (updated) {
              fastify.log.info(`Note ${note.id} ${message.type.toLowerCase()}d by client ${clientId}`);
              
              // 广播给其他客户端
              broadcast({
                type: message.type,
                timestamp: Date.now(),
                clientId,
                note: updated,
              } as UpdateMessage | CreateMessage, clientId);
            }

            // 发送确认
            const ack: AckMessage = {
              type: 'ACK',
              timestamp: Date.now(),
              originalTimestamp: message.timestamp,
            };
            sendTo(clientId, ack);
            break;
          }

          case 'DELETE': {
            const deleteMessage = message as DeleteMessage;
            const deleted = db.deleteNote(deleteMessage.noteId);
            
            if (deleted) {
              fastify.log.info(`Note ${deleteMessage.noteId} deleted by client ${clientId}`);
              
              // 广播给其他客户端
              broadcast({
                type: 'DELETE',
                timestamp: Date.now(),
                clientId,
                noteId: deleteMessage.noteId,
              } as DeleteMessage, clientId);
            }

            // 发送确认
            const ack: AckMessage = {
              type: 'ACK',
              timestamp: Date.now(),
              originalTimestamp: message.timestamp,
            };
            sendTo(clientId, ack);
            break;
          }

          case 'TAG_CREATE': {
            const tagMsg = message as TagCreateMessage;
            const created = db.upsertTag(tagMsg.tag);
            if (created) {
              fastify.log.info(`Tag ${tagMsg.tag.id} created by client ${clientId}`);
              broadcast({
                type: 'TAG_CREATE',
                timestamp: Date.now(),
                clientId,
                tag: created,
              } as TagCreateMessage, clientId);
            }
            break;
          }

          case 'TAG_UPDATE': {
            const tagMsg = message as TagUpdateMessage;
            const updated = db.upsertTag(tagMsg.tag);
            if (updated) {
              fastify.log.info(`Tag ${tagMsg.tag.id} updated by client ${clientId}`);
              broadcast({
                type: 'TAG_UPDATE',
                timestamp: Date.now(),
                clientId,
                tag: updated,
              } as TagUpdateMessage, clientId);
            }
            break;
          }

          case 'TAG_DELETE': {
            const tagMsg = message as TagDeleteMessage;
            const deleted = db.deleteTag(tagMsg.tagId);
            if (deleted) {
              fastify.log.info(`Tag ${tagMsg.tagId} deleted by client ${clientId}`);
              broadcast({
                type: 'TAG_DELETE',
                timestamp: Date.now(),
                clientId,
                tagId: tagMsg.tagId,
              } as TagDeleteMessage, clientId);
            }
            break;
          }

          case 'CATEGORY_CREATE': {
            const catMsg = message as CategoryCreateMessage;
            const created = db.upsertCategory(catMsg.category);
            if (created) {
              fastify.log.info(`Category ${catMsg.category.id} created by client ${clientId}`);
              broadcast({
                type: 'CATEGORY_CREATE',
                timestamp: Date.now(),
                clientId,
                category: created,
              } as CategoryCreateMessage, clientId);
            }
            break;
          }

          case 'CATEGORY_UPDATE': {
            const catMsg = message as CategoryUpdateMessage;
            const updated = db.upsertCategory(catMsg.category);
            if (updated) {
              fastify.log.info(`Category ${catMsg.category.id} updated by client ${clientId}`);
              broadcast({
                type: 'CATEGORY_UPDATE',
                timestamp: Date.now(),
                clientId,
                category: updated,
              } as CategoryUpdateMessage, clientId);
            }
            break;
          }

          case 'CATEGORY_DELETE': {
            const catMsg = message as CategoryDeleteMessage;
            const deleted = db.deleteCategory(catMsg.categoryId);
            if (deleted) {
              fastify.log.info(`Category ${catMsg.categoryId} deleted by client ${clientId}`);
              broadcast({
                type: 'CATEGORY_DELETE',
                timestamp: Date.now(),
                clientId,
                categoryId: catMsg.categoryId,
              } as CategoryDeleteMessage, clientId);
            }
            break;
          }

          case 'RELATION_ADD': {
            const relMsg = message as RelationAddMessage;
            if (relMsg.relationName === 'note_tags') {
              db.linkNoteTag(relMsg.noteId, relMsg.targetId);
            } else if (relMsg.relationName === 'note_categories') {
              db.linkNoteCategory(relMsg.noteId, relMsg.targetId);
            }
            fastify.log.info(`Relation added: ${relMsg.relationName} ${relMsg.noteId}-${relMsg.targetId} by client ${clientId}`);
            broadcast(relMsg, clientId);
            break;
          }

          case 'RELATION_REMOVE': {
            const relMsg = message as RelationRemoveMessage;
            if (relMsg.relationName === 'note_tags') {
              db.unlinkNoteTag(relMsg.noteId, relMsg.targetId);
            } else if (relMsg.relationName === 'note_categories') {
              db.unlinkNoteCategory(relMsg.noteId, relMsg.targetId);
            }
            fastify.log.info(`Relation removed: ${relMsg.relationName} ${relMsg.noteId}-${relMsg.targetId} by client ${clientId}`);
            broadcast(relMsg, clientId);
            break;
          }

          case 'PING': {
            sendTo(clientId, {
              type: 'PONG',
              timestamp: Date.now(),
            });
            break;
          }

          default:
            fastify.log.warn(`Unknown message type: ${(message as SyncMessage).type}`);
        }
      } catch (err) {
        fastify.log.error({ err }, 'Failed to parse WebSocket message');
      }
    });

    // 连接关闭
    socket.on('close', () => {
      connections.delete(clientId);
      fastify.log.info(`Client ${clientId} disconnected. Total connections: ${connections.size}`);
    });

    // 连接错误
    socket.on('error', (err) => {
      fastify.log.error({ err }, `WebSocket error for client ${clientId}`);
      connections.delete(clientId);
    });
  });
};

export default syncRoute;
