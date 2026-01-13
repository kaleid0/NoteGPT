# research.md — Web 端 AI 笔记应用 (001-add-ai-notes)

## 概述

目标：解决实现细节与选择，以便阶段 1 设计能顺利实施。

## 待研究的未知/决策项

1. 流式传输实现模式
   - Decision: 推荐在后端代理处使用 OpenAI 的流式响应 (fetch streaming) 并在代理处将流转发到客户端（使用 SSE 或 WebSocket），客户端通过流式接收并逐字呈现。
   - Rationale: 直接在客户端和 OpenAI 交互易于暴露 API Key 与 CORS 问题；代理可做鉴权、降速、审计与聚合。
   - Alternatives considered: 直接客户端 fetch(stream) → 安全性差；将完整响应在后端完成再返回 → 体验延迟较高。

2. IndexedDB 访问封装
   - Decision: 使用 `idb`（小型、成熟库）作为 IndexedDB 的轻量封装并实现简单的 Notes DAO。
   - Rationale: 提供异步 API、较好浏览器兼容性且易于模拟测试。
   - Alternatives: localForage、Dexie (更强大但更重)。

3. 样式隔离方案
   - Decision: 使用 CSS Modules（配合 PostCSS）作为首选，以保证局部作用域样式与简单构建；可选支持 styled-components 作为替代（若需要动态样式/主题）。
   - Rationale: CSS Modules 与 TypeScript 集成良好，构建简单且无运行时开销。

4. UX 稳定性与错误边界
   - Decision: 使用 React Error Boundaries、全局异常捕获、请求超时策略与友好降级页/占位来避免白屏/崩溃。
   - Rationale: 可避免未捕获异常带来全局崩溃，并可在无法获得 AI 返回时提供降级策略（例如仅保存草稿、提示重试）。

5. 响应式策略与测试
   - Decision: 采用移动优先的 CSS 断点 (min-width: 420px, 768px 等) 并使用 Playwright 的视口测试覆盖 375px、414px、768px、1366px 等断点。
   - Rationale: 确保在主流设备宽度下体验一致且可回归测试。

## 输出

- 对于每个决策, 在 spec/plan 中固化决定与实现任务
- 生成相应的样例代码片段（代理的流式转发、IndexedDB 示例）供实现使用
