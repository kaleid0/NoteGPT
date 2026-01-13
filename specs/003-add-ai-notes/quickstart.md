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

## 3. 配置 LLM 设置（可选）

访问 Settings 页面配置您的 LLM 提供商：

```bash
http://localhost:3000/settings
```

支持的提供商：
- **OpenAI**: `gpt-3.5-turbo`, `gpt-4` 等
- **DeepSeek**: `deepseek-chat` 等
- **百炼 (Bailian)**: `bailian-turbo` 等
- **自定义**: 支持任何兼容 OpenAI API 的服务

在 Settings 页面可以：
- 选择 LLM 提供商（自动填充 Base URL 和 Model）
- 输入 API Key（密码形式，本地存储）
- 自定义 Base URL 和 Model
- 编辑 Prompt 模板，使用 `{{input}}` 作为占位符

示例 Prompt 模板：
```
请根据以下内容生成摘要，并用中文回复：

{{input}}
```

## 4. 测试 AI 功能

1. 打开浏览器访问: http://localhost:3000
2. (可选) 访问 `/settings` 配置您的 LLM 提供商和 API Key
3. 创建新笔记，输入一些内容
4. 点击"AI 处理"按钮观察流式输出
5. 选择"接受"或"丢弃"

**注意**: 如果未配置 LLM 设置，将使用默认的 OpenAI 配置和本地 mock 流（用于演示）

## 5. 运行测试

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

## 6. CI/CD

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

## 7. 后端代理配置

### 环境变量配置

```bash
# 创建环境配置
cp server/.env.example server/.env

# 编辑 .env，添加 API Key（可选，用于测试真实 API 调用）
OPENAI_API_KEY=sk-...
```

### 多提供商支持

后端自动代理来自前端的 LLM 配置请求。前端通过 Settings 页面配置的 API Key 和 Base URL 将直接发送到后端，后端则转发到相应的 LLM 服务。

**安全建议**：
- 不建议在前端直接暴露真实 API Key（使用浏览器密码字段和 localStorage）
- 建议使用后端代理模式，在服务端管理 API Key
- 在生产环境中，使用环境变量而不是前端存储

## 8. 项目结构

```
NoteGPT/
├── client/              # React 前端
│   ├── src/
│   │   ├── components/  # UI 组件
│   │   │   ├── AIStreamModal/  # AI 流式输入组件
│   │   │   └── Settings/       # LLM 设置组件（新增）
│   │   ├── hooks/       # React hooks (useNotes, useAIStream)
│   │   ├── lib/
│   │   │   ├── db/      # IndexedDB DAO
│   │   │   └── llmConfig.ts    # LLM 配置持久化（新增）
│   │   └── pages/       # 页面组件
├── server/              # Fastify 后端代理
│   └── src/
│       ├── routes/      # API 路由 (/v1/generate)
│       └── services/    # 流式 LLM 服务（支持多提供商）
├── tests/
│   └── e2e/
│       └── perf/        # 性能测试
├── scripts/
│   └── perf/            # 基线比较脚本
└── specs/               # 功能规范文档
```

## 9. 核心功能

### 笔记 CRUD
- 使用 IndexedDB 在本地存储笔记
- 支持创建、读取、更新、删除操作
- 自动保存到浏览器存储

### AI 助手
- 实时流式输出 AI 生成的内容
- 支持接受或丢弃建议
- 支持多个 LLM 提供商

### LLM 配置管理
- 前端 Settings 页面支持配置 LLM 提供商
- 支持 OpenAI、DeepSeek、百炼、自定义提供商
- 本地存储 API Key 和配置（需自行备份）
- 自定义 Prompt 模板

### 性能监控
- AI 首字符延迟性能测试
- 跨浏览器性能基准对比
- 自动 CI 集成

## 10. 故障排除

### Q: 页面无法访问？
A: 确保前端和后端都已启动：
```bash
npm run -w client dev
npm run -w server dev
```

### Q: AI 功能不工作？
A: 
1. 检查浏览器控制台是否有错误信息
2. 确认后端服务是否运行在 http://localhost:4000
3. 如果需要真实 API 调用，在 Settings 配置您的 LLM API Key

### Q: E2E 测试失败？
A: 
1. 确保构建成功：`npm run -w client build`
2. 检查后端是否正常启动
3. 查看 `tests/test-results/` 中的失败截图和日志

### Q: 性能测试如何解读？
A: 
- 首字符延迟（First Char Latency）：用户从点击到看到第一个字符的时间
- p95：95% 的请求都在此时间以内完成
- 查看 `tests/test-results/perf/` 中的 JSON 结果获取详细数据
```
