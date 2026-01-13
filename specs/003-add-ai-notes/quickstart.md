# Quickstart: Web 端 AI 笔记应用

## 1. 前提

- Node.js >= 18
- Git
- 可用的 OpenAI API Key（可选，用于真实 AI 调用）

## 2. 快速开始

```bash
# 克隆并切换到功能分支
git checkout 003-add-ai-notes

# 安装依赖（使用 npm workspaces）
npm install

# 启动开发服务器
npm run -w client dev       # 前端 http://localhost:3000
npm run -w server dev       # 后端 http://localhost:4000
```

## 3. 测试 AI 功能

1. 打开浏览器访问: http://localhost:3000
2. 创建新笔记，输入一些内容
3. 点击"AI 处理"按钮观察流式输出
4. 选择"接受"或"丢弃"

## 4. 运行测试

### 单元测试
```bash
npm run -w client test:unit
```

### E2E 测试（需要先构建）
```bash
# 构建并预览
npm run -w client build
npm run -w client preview -- --port 3000 &
npm run -w server dev &

# 运行 E2E 测试
npx playwright test
```

### 性能测试
```bash
# 运行 AI 首字符延迟性能测试（所有浏览器）
npx playwright test tests/e2e/perf/ai-latency.spec.ts

# 仅 Chromium
npx playwright test tests/e2e/perf/ai-latency.spec.ts --project=chromium

# 查看结果
cat tests/test-results/perf/*.json

# 与基线比较
node scripts/perf/compare-baseline.js
```

## 5. CI/CD

CI 工作流自动运行:
- Lint & Typecheck
- 单元测试
- 跨浏览器 E2E perf 测试 (Chromium, Firefox, WebKit)
- 性能基线比较

### 性能基线配置

编辑 `tests/e2e/perf/baseline.json`:
```json
{
  "p95_threshold_ms": 2000,
  "browsers": {
    "chromium": { "p95_threshold_ms": 2000 },
    "firefox": { "p95_threshold_ms": 2500 },
    "webkit": { "p95_threshold_ms": 2500 }
  }
}
```

### CI Artifacts

每次运行后可下载:
- `playwright-perf-results`: 性能测试 JSON 结果
- `playwright-traces`: 失败时的 trace 和 screenshot

## 6. 后端代理配置

```bash
# 创建环境配置
cp server/.env.example server/.env

# 编辑 .env，添加 API Key
OPENAI_API_KEY=sk-...
```

## 7. 项目结构

```
NoteGPT/
├── client/              # React 前端
│   ├── src/
│   │   ├── components/  # UI 组件
│   │   ├── hooks/       # React hooks (useNotes, useAIStream)
│   │   ├── lib/db/      # IndexedDB DAO
│   │   └── pages/       # 页面组件
├── server/              # Fastify 后端代理
│   └── src/routes/      # API 路由 (/v1/generate)
├── tests/
│   └── e2e/
│       └── perf/        # 性能测试
├── scripts/
│   └── perf/            # 基线比较脚本
└── specs/               # 功能规范文档
```
