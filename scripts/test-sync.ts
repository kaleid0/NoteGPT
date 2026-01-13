/**
 * WebSocket 同步功能快速验证脚本
 * 运行: npx ts-node scripts/test-sync.ts
 */
import WebSocket from 'ws';

const SERVER_URL = 'ws://localhost:4000/v1/sync';

interface Note {
  id: string;
  title?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testSync(): Promise<void> {
  console.log('🔌 连接到 WebSocket 服务器...');
  
  const ws1 = new WebSocket(SERVER_URL);
  const ws2 = new WebSocket(SERVER_URL);
  
  // 等待连接
  await Promise.all([
    new Promise<void>((resolve, reject) => {
      ws1.on('open', () => {
        console.log('✅ 客户端1 已连接');
        resolve();
      });
      ws1.on('error', reject);
    }),
    new Promise<void>((resolve, reject) => {
      ws2.on('open', () => {
        console.log('✅ 客户端2 已连接');
        resolve();
      });
      ws2.on('error', reject);
    }),
  ]);

  // 设置消息监听
  ws2.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    console.log('📨 客户端2 收到消息:', msg.type, msg.note?.title || msg.noteId || '');
  });

  // 测试1: 发送 INIT 请求
  console.log('\n📤 测试1: 发送 INIT 请求...');
  ws1.send(JSON.stringify({ type: 'INIT', timestamp: Date.now() }));
  
  await new Promise<void>((resolve) => {
    ws1.once('message', (data) => {
      const msg = JSON.parse(data.toString());
      console.log('📥 收到 INIT_RESPONSE:', msg.notes?.length || 0, '条笔记');
      resolve();
    });
  });

  // 测试2: 创建新笔记并验证广播
  console.log('\n📤 测试2: 客户端1 创建新笔记...');
  const newNote: Note = {
    id: `test-${Date.now()}`,
    title: '测试协作笔记',
    content: '这是一条测试内容',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  ws1.send(JSON.stringify({
    type: 'CREATE',
    timestamp: Date.now(),
    note: newNote,
  }));

  await sleep(500);

  // 测试3: 更新笔记
  console.log('\n📤 测试3: 客户端1 更新笔记...');
  const updatedNote = {
    ...newNote,
    content: '更新后的内容',
    updatedAt: new Date().toISOString(),
  };
  
  ws1.send(JSON.stringify({
    type: 'UPDATE',
    timestamp: Date.now(),
    note: updatedNote,
  }));

  await sleep(500);

  // 测试4: PING/PONG
  console.log('\n📤 测试4: 测试心跳...');
  ws1.send(JSON.stringify({ type: 'PING', timestamp: Date.now() }));
  
  await new Promise<void>((resolve) => {
    ws1.once('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'PONG') {
        console.log('📥 收到 PONG 响应');
      }
      resolve();
    });
  });

  // 测试5: 删除笔记
  console.log('\n📤 测试5: 客户端1 删除笔记...');
  ws1.send(JSON.stringify({
    type: 'DELETE',
    timestamp: Date.now(),
    noteId: newNote.id,
  }));

  await sleep(500);

  // 关闭连接
  console.log('\n🔌 关闭连接...');
  ws1.close();
  ws2.close();

  console.log('\n✅ 所有测试完成!');
}

testSync().catch((err) => {
  console.error('❌ 测试失败:', err);
  process.exit(1);
});
