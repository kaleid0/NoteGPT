/**
 * 快速集成测试脚本 - 验证归一化同步功能
 */

import WebSocket from 'ws';

const WS_URL = 'ws://localhost:4000/sync';

async function testNormalizedSync() {
  console.log('🚀 开始测试归一化同步...\n');

  return new Promise((resolve, reject) => {
    try {
      const ws = new WebSocket(WS_URL);
      let messageCount = 0;

      ws.on('open', () => {
        console.log('✅ WebSocket 连接已建立');
        console.log('📤 发送 INIT 消息...\n');
        ws.send(JSON.stringify({
          type: 'INIT',
          timestamp: Date.now(),
          clientId: 'test-client-' + Math.random().toString(36).substring(2, 9)
        }));
      });

      ws.on('message', (data: string) => {
        try {
          const message = JSON.parse(data);
          messageCount++;
          
          console.log(`\n📥 消息 #${messageCount}:`);
          console.log(`   类型: ${message.type}`);
          
          if (message.type === 'INIT_RESPONSE_NORM') {
            console.log('   ✅ 收到归一化响应 (INIT_RESPONSE_NORM)');
            console.log(`   📊 Payload 结构:`);
            if (message.payload) {
              console.log(`      - 笔记数: ${message.payload.notes?.length || 0}`);
              console.log(`      - 标签数: ${message.payload.tags?.length || 0}`);
              console.log(`      - 分类数: ${message.payload.categories?.length || 0}`);
              console.log(`      - Note-Tag 关系: ${message.payload.relations?.note_tags?.length || 0}`);
              console.log(`      - Note-Category 关系: ${message.payload.relations?.note_categories?.length || 0}`);
            }
            
            console.log('\n✅ 归一化同步测试成功！');
            ws.close();
            resolve('✅ 所有测试通过');
          } else if (message.type === 'INIT_RESPONSE') {
            console.log('   ℹ️  收到兼容性响应 (INIT_RESPONSE v1)');
            console.log(`      笔记数: ${message.notes?.length || 0}`);
            console.log('\n✅ 兼容性模式工作正常');
            ws.close();
            resolve('✅ 兼容性模式工作');
          }
        } catch (err) {
          console.error('❌ 解析消息失败:', err);
          reject(err);
        }
      });

      ws.on('error', (err) => {
        console.error('❌ WebSocket 错误:', err.message);
        reject(err);
      });

      ws.on('close', () => {
        console.log('\n🔌 WebSocket 已关闭');
        if (messageCount === 0) {
          reject(new Error('未收到任何服务器响应'));
        }
      });

      // 超时处理
      setTimeout(() => {
        if (ws.readyState !== WebSocket.CLOSED) {
          ws.close();
          reject(new Error('测试超时 (5秒)'));
        }
      }, 5000);
    } catch (err) {
      reject(err);
    }
  });
}

testNormalizedSync()
  .then((result) => {
    console.log('\n' + result);
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ 测试失败:', err.message);
    process.exit(1);
  });
