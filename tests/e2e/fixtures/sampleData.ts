/**
 * Fixture: 示例笔记数据
 * 用于 E2E 测试、演示和示例场景
 */

export const SAMPLE_NOTES = [
  {
    id: '1',
    title: '快速开始指南',
    content: `# NoteGPT - 快速开始

欢迎使用 NoteGPT，一个支持 AI 辅助的笔记应用。

## 功能特性

1. **笔记管理**
   - 创建、编辑、删除笔记
   - 本地 IndexedDB 存储，无需后端
   - 支持自动保存和草稿功能

2. **AI 辅助编写**
   - 选中文本后使用 AI 改进
   - 支持多个 LLM 提供商
   - 实时流式显示生成结果

3. **多提供商支持**
   - OpenAI GPT-3.5/GPT-4
   - DeepSeek 模型
   - 百炼 API
   - 自定义提供商

## 快速演示

1. 创建一条新笔记
2. 输入一些内容
3. 选中文本后点击"AI 处理"
4. 查看 AI 生成的改进建议
5. 接受或丢弃修改`,
    createdAt: new Date('2026-01-01').toISOString(),
    updatedAt: new Date('2026-01-13').toISOString(),
  },
  {
    id: '2',
    title: '产品设计文档',
    content: `# 产品需求文档 (PRD)

## 产品概述

NoteGPT 是一个创新的 Web 笔记应用，集成了 AI 助手功能，帮助用户快速改进笔记内容。

## 核心需求

### 需求 1: 笔记管理
- 支持创建、读取、更新、删除操作
- 数据持久化到浏览器本地存储
- 支持全文搜索

### 需求 2: AI 助手
- 支持选中文本的 AI 改进
- 支持全文的 AI 改进
- 支持多种改进策略（翻译、总结、扩展等）

### 需求 3: 多提供商
- 支持 OpenAI API
- 支持开源 LLM API
- 支持用户自定义 API 端点

## 用户故事

### US1: 用户想快速创建笔记
作为用户，我想快速创建一条新笔记，以便记录我的想法。

### US2: 用户想使用 AI 改进笔记
作为用户，我想选中文本后使用 AI 改进，以便获得更好的表达方式。

### US3: 用户想配置自己的 LLM
作为用户，我想配置自己的 LLM API Key，以便使用自己的模型和配额。`,
    createdAt: new Date('2026-01-05').toISOString(),
    updatedAt: new Date('2026-01-10').toISOString(),
  },
  {
    id: '3',
    title: '技术实现笔记',
    content: `# 技术栈与实现细节

## 前端技术栈

- **框架**: React 18 + TypeScript
- **构建工具**: Vite 5
- **数据存储**: IndexedDB (idb 库)
- **样式**: CSS Modules + Tailwind CSS
- **路由**: React Router v6
- **测试**: Vitest + Playwright

## 后端技术栈

- **运行时**: Node.js 18+
- **框架**: Fastify
- **开发工具**: ts-node-dev

## 主要功能实现

### 1. IndexedDB 数据访问层 (DAO)
\`\`\`typescript
// 实现了 CRUD 操作
const notes = await db.notes.toArray();
await db.notes.add({ title, content });
await db.notes.update(id, { content });
await db.notes.delete(id);
\`\`\`

### 2. SSE 流式 AI 响应
\`\`\`typescript
// 使用 Server-Sent Events 实现流式输出
const response = await fetch('/v1/generate', {
  method: 'POST',
  body: JSON.stringify({ input, mode: 'stream' })
});

const reader = response.body?.getReader();
// 逐字符读取和显示
\`\`\`

### 3. LLM 多提供商支持
- 支持配置不同的 baseUrl 和 apiKey
- 客户端持久化到 localStorage
- 后端动态转发请求

## 性能指标

- 首字符延迟: ~170ms (p95)
- 流式吞吐量: ~37 字符/秒
- 可访问性得分: 100/100
- 响应式适配: 3+ 设备断点`,
    createdAt: new Date('2026-01-08').toISOString(),
    updatedAt: new Date('2026-01-12').toISOString(),
  },
  {
    id: '4',
    title: '长文本测试用例',
    content: `# 这是一篇较长的测试文本

## 文本处理性能测试

这个笔记是为了测试应用在处理较长文本时的性能表现。包括多个段落、列表和代码块。

### 第一个测试部分

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

### 第二个测试部分

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

### 项目列表

1. 第一项
2. 第二项
3. 第三项
   - 子项目 A
   - 子项目 B
   - 子项目 C
4. 第四项

### 代码示例

\`\`\`javascript
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

const result = fibonacci(10); // 55
\`\`\`

### 表格示例

| 功能 | 状态 | 优先级 |
|-----|-----|-------|
| 笔记 CRUD | ✅ 完成 | P1 |
| AI 助手 | ✅ 完成 | P1 |
| 多提供商 | ✅ 完成 | P2 |
| 性能监控 | ✅ 完成 | P2 |

继续填充文本以达到足够的长度进行测试...

这里是更多的测试内容，用来验证应用在处理较长笔记时的行为是否符合预期。应用应该能够流畅地处理几千字的内容，并且 AI 辅助功能也应该能够顺利处理较长的选中文本。`,
    createdAt: new Date('2026-01-03').toISOString(),
    updatedAt: new Date('2026-01-13').toISOString(),
  },
]

export const SAMPLE_PROMPTS = [
  {
    id: 'default',
    name: '默认提示词',
    template: '请根据以下内容生成：\n\n{{input}}',
  },
  {
    id: 'summarize',
    name: '总结',
    template: '请用 3-5 句话总结以下内容的要点：\n\n{{input}}',
  },
  {
    id: 'expand',
    name: '扩展',
    template: '请基于以下内容，用更详细的方式进行扩展和阐述：\n\n{{input}}',
  },
  {
    id: 'improve',
    name: '改进表达',
    template: '请改进以下文本的表达方式，使其更加流畅、专业和易读：\n\n{{input}}',
  },
  {
    id: 'translate-en',
    name: '翻译为英文',
    template: '请将以下中文文本翻译为英文，保持原意和语气：\n\n{{input}}',
  },
  {
    id: 'translate-zh',
    name: '翻译为中文',
    template: '请将以下英文文本翻译为中文，保持原意和语气：\n\n{{input}}',
  },
  {
    id: 'brainstorm',
    name: '头脑风暴',
    template: '基于以下主题，请提供 5-10 个相关的想法或建议：\n\n{{input}}',
  },
]
