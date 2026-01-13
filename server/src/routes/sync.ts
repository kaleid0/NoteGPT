/**
 * WebSocket 同步路由
 * 处理多端实时协作编辑的消息同步
 */
import { FastifyPluginAsync } from 'fastify';
import { SocketStream } from '@fastify/websocket';
import type { WebSocket } from 'ws';
import type { 
  Note, 
  SyncMessage, 
  InitResponseMessage, 
  UpdateMessage, 
  CreateMessage, 
  DeleteMessage,
  AckMessage 
} from '../../shared/sync-protocol';
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
            // 从数据库获取所有笔记
            const notes = db.getAllNotes();
            const response: InitResponseMessage = {
              type: 'INIT_RESPONSE',
              timestamp: Date.now(),
              clientId,
              notes,
            };
            sendTo(clientId, response);
            fastify.log.info(`Sent ${notes.length} notes to client ${clientId}`);
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
        fastify.log.error('Failed to parse WebSocket message:', err);
      }
    });

    // 连接关闭
    socket.on('close', () => {
      connections.delete(clientId);
      fastify.log.info(`Client ${clientId} disconnected. Total connections: ${connections.size}`);
    });

    // 连接错误
    socket.on('error', (err) => {
      fastify.log.error(`WebSocket error for client ${clientId}:`, err);
      connections.delete(clientId);
    });
  });
};

export default syncRoute;
