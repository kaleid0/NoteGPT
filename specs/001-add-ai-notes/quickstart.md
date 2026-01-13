# Quickstart: Web 端 AI 笔记应用

## 1. 前提

- Node.js >= 18
- Git
- 可用的 OpenAI API Key（请参考文档在本地启动后端代理并在 .env 中配置）

## 2. 本地开发（开发者）

1. 克隆仓库并切换到功能分支:

   git checkout 001-add-ai-notes

2. 安装依赖:

   npm install

3. 配置后端代理（推荐）:

   - 复制 `server/.env.example` 为 `server/.env` 并将 `OPENAI_API_KEY` 填入。
   - 启动后端: `cd server && npm run dev`

4. 启动前端:

   npm run dev

5. 打开浏览器访问: http://localhost:3000

## 3. 测试 AI 功能（示例）

- 打开任意笔记，选中文本或不选中文本，点击“AI 处理”按钮。
- 在弹出的悬浮框中观察流式输出，点击“接受”以将修改写回笔记，或点击“丢弃”以放弃生成内容。

## 4. 无后端代理情况（快速演示）

- 若不使用后端代理, 可在 `client/.env` 中使用 `OPENAI_API_KEY`（仅用于本地演示，不推荐在生产中这样做）。

## 5. 安全与配置说明

- 强烈建议使用后端代理来存储与转发 API Key，避免在客户端暴露密钥。
- 后端代理应限制访问并记录审计日志以便追踪请求。
