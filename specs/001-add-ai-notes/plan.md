# 实施计划: Web 端 AI 笔记应用 (001-add-ai-notes)

**分支**: `001-add-ai-notes` | **日期**: 2026-01-12 | **规范**: [spec.md](./spec.md)

## 摘要

实现一个基于 React + TypeScript 的微型 AI 笔记应用，支持浏览器端持久化（IndexedDB）、AI 助手流式响应（通过后端代理调用 OpenAI），并满足实时、流畅和用户友好的交互原则。优先交付笔记 CRUD 与 AI 助手的 P1 用户故事，确保可用性、延迟与降级策略在交付前通过验收。

## 技术背景

下面列出实现选项与推荐技术（非强制）：

- **语言/版本**: TypeScript 5.x（推荐启用严格模式）。
- **前端框架（示例）**: React 18 + Vite（项目当前实现）；也可替换为等效现代框架，但需在 `plan.md` 中列出替代实现代价。
- **样式方案**: 推荐 CSS Modules（或 CSS-in-JS 作为替代）以保证样式隔离。
- **持久化**: 推荐使用 IndexedDB（通过 `idb`）作为浏览器端持久化实现；可选 localStorage 作为简单后备。
- **后端代理 / 流式传输**: 推荐在后端实现对 LLM API 的代理并使用 SSE 或 WebSocket 将流式响应转发给客户端（目的是隐藏 API Key 与支持审计/降速）。
- **LLM**: 默认示例使用 OpenAI 流式 API；计划包含一个 mock LLM（演示模式）以支持离线演示与 CI。
- **测试**: E2E 建议使用 Playwright；单元/集成建议使用 Vitest/Jest 与 @testing-library/react。
- **性能目标**: AI 首字符延迟 p95 ≤ 2s（通过自动化性能测试测量并在 CI 中记录）。
- **安全与运维**: 后端代理需记录审计日志、支持最小权限访问与演示模式的开关。

这些选项在实现阶段应被记录为 trade-offs，并在 PR 中明确列出替代方案与评估。

## 章程检查

- 可用性: P1 用户故事包含可用性验收; 小规模用户测试通过或包含可重复的可用性脚本。
- 实时性: 关键交互延迟预算在 spec 中定义 (SC-002) 并在实现前接受。
- 安全: 后端代理实现并包含密钥管理指南与最小权限策略。
- 可观测性: 延迟/错误/吞吐指标必须可视化并纳入 CI 性能回归检测。

## 项目结构 (建议)

```
client/
├── src/
│   ├── components/   # React 组件 (CSS Modules)
│   ├── hooks/
│   ├── pages/
│   └── styles/
server/
├── src/
│   ├── routes/
│   └── services/     # OpenAI proxy + auth
tests/
├── e2e/               # Playwright
└── unit/
```

## 初始里程碑

1. 设置 (TypeScript + React + Vite) + 基础构建工具与 CI (ESLint, Prettier, TSConfig, GitHub Actions)
2. 基础 (IndexedDB 层, 后端代理雏形, OpenAI 流式集成示例)
3. 实现 P1 用户故事 (笔记 CRUD, AI 流式悬浮框, 接受/丢弃交互)
4. 可用性与性能测试 (Playwright E2E, 2s 首字符延迟验证)
5. 文档与 quickstart 完成

## 复杂度跟踪

- 后端代理: 安全与审计需要额外工作 (密钥轮换、访问控制), 评估需记录在复杂度表中

## 行动项

- 阶段 0: 生成 research.md 并分配研究任务 (流式实现、IndexedDB 封装、样式隔离模式、OpenAI 速率限制策略)
- 阶段 1: 生成 data-model.md、contracts/、quickstart.md
- 阶段 2: 制定 tasks.md 并开始实现
