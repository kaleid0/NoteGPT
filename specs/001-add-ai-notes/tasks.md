---
description: "任务清单: Web 端 AI 笔记应用 (001-add-ai-notes) — 按依赖关系排序的可执行任务"
---

# 任务: Web 端 AI 笔记应用 (001-add-ai-notes)

**输入**: 来自 `specs/001-add-ai-notes/spec.md` 的设计文档
**前置条件**: 已确定 Q1: 后端代理, Q2: OpenAI (流式), Q3: IndexedDB

## 格式: `[ID] [P] [Story] 描述`
- **[P]**: 可以并行运行(不同文件, 无依赖关系)
- **[Story]**: 此任务属于哪个用户故事(例如: US1、US2、US3)
- 在描述中包含确切的文件路径

---

## 阶段 1: 设置 (T001 - T010) ✅

目的: 初始化项目脚手架、类型和质量工具、样式隔离与 CI, 为后续开发提供稳定基础。

- [ ] T001 [P] [Setup] 初始化 monorepo 结构并创建 `client/` 与 `server/` 文件夹 (路径: `/client`, `/server`)
  - 产物: 基础目录, package.json(s), README 占位
- [ ] T002 [P] [Setup] 使用 Vite 初始化 `client/` (React + TypeScript) (路径: `/client`)
  - 产物: `client/tsconfig.json` (strict: true), `client/package.json`, 基本启动脚本
- [ ] T003 [P] [Setup] 初始化 `server/` (Node.js + Fastify 或 Express) 并添加 `server/package.json` (路径: `/server`)
- [ ] T004 [P] [Setup] 配置 ESLint + Prettier + Stylelint，并在 `client/`/`server/` 中阻止 `any` (`@typescript-eslint/no-explicit-any` 禁用) (路径: `.eslintrc`, `client/.eslintrc`, `server/.eslintrc`)
- [ ] T005 [P] [Setup] 配置 CSS Modules 支持与组件样式约定 (路径: `client/vite.config.ts`, `client/src/components/*.module.css`)
- [ ] T006 [P] [Setup] 添加基本 CI (GitHub Actions) 用于 lint、typecheck、unit tests 快速检测 (路径: `.github/workflows/ci.yml`)
- [ ] T007 [Setup] 在 `client/` 中建立基础路由与页面占位: `src/pages/NotesList.tsx`, `src/pages/NoteDetail.tsx` (空实现，用于后续填充)
- [ ] T008 [Setup] 在仓库根添加开发 `Makefile` / scripts (或 npm scripts) 用于统一启动(`npm run dev:all` 启动 server+client)
- [ ] T009 [Setup] 添加 `client/.env.example` 与 `server/.env.example`（包含 `OPENAI_API_KEY` 占位与说明）
- [ ] T010 [Setup] 添加基本监控/日志框架依赖声明 (例如 `pino`/`winston` server，`sentry` 占位) (路径: `server/package.json`)

**检查点**: 能成功启动 `client` 和 `server`，并通过 CI 的 lint/typecheck 阶段。

---

## 阶段 2: 基础实现 (T011 - T024) 🔧

目的: 实现可复用的基础设施：IndexedDB 层、后端代理流式转发、错误边界与性能基线工具。

- [x] T011 [P] [Foundation] 实现 IndexedDB 数据访问层(DAO) `client/src/lib/db/notes.ts` (使用 `idb`) 并添加单元测试 `tests/unit/db/notes.test.ts`
- [ ] T012 [P] [Foundation] 实现 Note 数据模型与类型定义 `client/src/types/note.ts` (id, title, content, createdAt, updatedAt)
- [ ] T013 [Foundation] 在 `client/src/lib/storage.ts` 添加持久化抽象层以便未来支持 localStorage 后备
- [x] T014 [Foundation] 实现 server 代理端点 `server/src/routes/generate.ts`：接收 `{input, mode, selectionRange}` 并向 OpenAI 发起请求，返回流式响应 (SSE 或 chunked transfer)
- [x] T015 [Foundation] 为代理添加基本访问控制/最小认证 (本地 token 检查) `server/src/middleware/auth.ts`
- [x] T016 [Foundation] 为代理实现审计日志与请求记录 `server/src/services/audit.ts`
- [x] T017 [P] [Foundation] 实现 server->client 的流式转发示例（使用 Server-Sent Events），客户端 hook 位于 `client/src/hooks/useAIStream.ts`
- [x] T018 [Foundation] 在 server 添加集成测试 (模拟 OpenAI 响应) `tests/integration/server/generate.test.ts`
- [ ] T019 [Foundation] 添加 Error Boundary 与全局错误处理组件 `client/src/components/ErrorBoundary.tsx`
- [ ] T020 [Foundation] 在 client 中实现网络请求超时/重试策略库 `client/src/lib/fetchWithTimeout.ts`
- [ ] T021 [Foundation] 将流式响应的 metric hooks 集成（收集首字符延迟） `client/src/hooks/useStreamingMetrics.ts`
- [ ] T022 [Foundation] 在 CI 中配置性能基线测试占位 (future: GitHub Actions job to run Playwright perf)

**检查点**: IndexedDB DAO 可读写; server `/v1/generate` 能返回可被客户端消费的流式数据; 基本 auth 与 audit 工作。

---

## 阶段 3: 用户故事实现 — US1: 笔记 CRUD (P1) (T025 - T036) 📝

目标: 实现完整的笔记列表与详情页，浏览器端持久化并保证响应式与可访问性。

### 测试 (T025-T026)
- [x] T025 [P] [US1] 在 `tests/unit/components/` 添加笔记组件单元测试（Vitest） `tests/unit/components/NoteItem.test.tsx`
- [x] T026 [P] [US1] 在 Playwright 中添加 E2E 流程测试 `tests/e2e/notes-crud.spec.ts`（创建、编辑、删除、刷新验证持久化）

### 实施 (T027-T033)
- [x] T027 [US1] 在 `client/src/components/NoteList/NoteList.tsx` 实现笔记列表 UI（使用 CSS Modules）
- [x] T028 [US1] 在 `client/src/components/NoteEditor/NoteEditor.tsx` 实现笔记编辑组件（受控组件、保存按钮、自动保存草稿）
- [ ] T029 [US1] 在 `client/src/pages/NotesList.tsx` 与 `client/src/pages/NoteDetail.tsx` 集成组件并实现导航
- [x] T030 [US1] 在 `client/src/hooks/useNotes.ts` 中封装读写逻辑并使用 IndexedDB DAO
- [x] T031 [US1] 实现删除确认对话框 `client/src/components/ConfirmDialog/ConfirmDialog.tsx`
- [x] T032 [P] [US1] 响应式与可访问性调整（CSS Modules / aria-*） `client/src/styles/*` 和 `client/src/components/*`
- [ ] T033 [US1] 将 UI 相关单元测试补齐并确保覆盖主要逻辑 `tests/unit/*`

**检查点**: CRUD 流程能通过 Playwright E2E 验证，刷新后数据仍存在。

---

## 阶段 4: 用户故事实现 — US2: AI 助手流式交互 (P1) 🤖

目标: 实现选中文本/全稿触发逻辑、流式生成悬浮框、接受/丢弃行为与错误/重试路径。

### 测试 (T034-T036)
- [x] T034 [P] [US2] 在 `tests/e2e/ai-assistant.spec.ts` 中添加 E2E 流程测试：选中文本触发、未选中文本触发、接受/丢弃、错误场景
- [ ] T035 [P] [US2] 单元测试 `tests/unit/components/AIFlow.*.test.tsx`：覆盖按钮、modal、流式状态机逻辑
- [ ] T036 [P] [US2] 集成测试：模拟 server 流式响应并验证客户端逐字显示行为 `tests/integration/client/streaming.test.ts`

### 实施 (T037-T046)
- [x] T037 [US2] 在 `client/src/components/AIButton/AIButton.tsx` 实现“AI 处理”触发按钮（处理选区判定）
- [ ] T038 [US2] 在 `client/src/utils/selection.ts` 实现安全的选区提取方法（跨浏览器）
- [x] T039 [US2] 在 `client/src/components/AIStreamModal/AIStreamModal.tsx` 实现流式悬浮框组件（逐字符渲染、展示 loading 占位）
- [x] T040 [US2] 在 `client/src/hooks/useAIStream.ts` 实现流式消费逻辑（连接 SSE/WebSocket，处理首字符、错误、取消）
- [x] T041 [US2] 将 `AIStreamModal` 的 “接受” 操作实现为：调用上层回调替换选中文本或整文，总是在本地状态中执行，直到确认保存到数据库
  - 文件: `client/src/components/AIStreamModal/AIStreamModal.tsx`
- [x] T042 [US2] 将 “丢弃” 实现为关闭 Modal 并释放流资源
- [x] T043 [US2] 在 `client/src/hooks/useNotes.ts` 中实现可原子替换被选中文本的 API（用于“接受”操作）
- [ ] T044 [US2] 实现客户端对流式数据的度量与记录（首字符延迟）并上报到监控
- [ ] T045 [US2] 在 server 端实现检验选区长度与分段处理策略，防止超长请求导致失败 `server/src/services/segmenter.ts`
- [ ] T046 [US2] 在 UI 中实现错误友好提示与重试按钮 `client/src/components/Toast/Toast.tsx`

**检查点**: 流式 Modal 能稳定展示逐字内容；接受/丢弃行为正确，且 E2E 测试通过。

---

## 阶段 5: 用户故事实现 — US3: API & 安全 (P2) 🔐

目标: 完成后端代理的安全配置、文档并提供示例部署脚本。

- [ ] T047 [US3] 在 `server/README.md` 中补充密钥管理、最小权限和本地部署步骤（示例: Docker Compose）
- [x] T048 [US3] 实现简单的访问控制中间件以限制不受信任的请求 `server/src/middleware/rate_limit.ts`
- [x] T049 [US3] 添加审计日志与请求追踪（扩展 T016）并编写集成测试 `tests/integration/server/audit.test.ts`
- [ ] T050 [US3] 提供一个“演示模式”配置（使用 mock LLM 响应）供面试官离线演示 `server/src/mock/mock-openai.ts`
- [ ] T051 [US3] 在 `quickstart.md` 中添加部署示例和演示脚本（包含如何配置 OpenAI Key）

**检查点**: 后端代理可安全运行，本地演示模式可用于离线演示。

---

## 阶段 6: 验证、可用性与投产准备 (T052 - T063) ✅

目标: 性能基线、可用性小规模测试、无障碍检查、响应式断言、文档完善、演示材料准备。

- [ ] T052 [P] 性能基线测试：运行 Playwright/perf 收集首字符延迟基线 `tests/e2e/perf/ai-latency.spec.ts`
- [ ] T053 [P] 可用性小规模测试与反馈收集（目标 5-10 位测试者）并在 issues 中记录改进项
- [ ] T054 [P] 无障碍 (a11y) 检查（使用 axe 或 Playwright 插件）并修复关键问题
- [ ] T055 [P] 响应式验证断言（Playwright 视口 375/414/768/1366）并在 CI 中添加回归检测
- [ ] T056 [P] 文档完善：README、quickstart、API Key 配置、安全说明、演示脚本
- [ ] T057 [P] 测试覆盖率与 lint gate：在 CI 中强制执行 lint、typecheck、基本测试覆盖阈值
- [ ] T058 准备示例数据并更新 `tests/e2e/fixtures/`（示例笔记、长文本测试案例）
- [ ] T059 [P] 最后演示准备：录制快速 demo 脚本与示例场景
- [ ] T060 [P] 发布和版本：更新章程/文档中记录的版本号并合并 PR
- [ ] T061 安全审计与依赖扫描（Snyk/Dependabot）
- [ ] T062 [P] 代码清理与重构（如需要）
- [ ] T063 [P] 运行 quickstart.md 验证并修正任何遗漏事项

**最终检查点**: 所有 P1 用户故事（US1, US2）在 CI/E2E 中通过，文档与演示材料准备就绪。

---

## 依赖关系与执行顺序

- 阶段 1 (T001-T010) 必须首先完成 (Setup)
- 阶段 2 (T011-T022) 在阶段 1 完成后开始
- US1 (T025-T033) 与 US2 (T037-T046) 都依赖于阶段 2 的基础设施 (尤其是 IndexedDB DAO 与 server 流式端点)
- US3 (T047-T051) 可在阶段 2 并行开始，但在合并演示脚本前需保证代理实现(T014)与安全中间件(T015/T048)

示例依赖序列:
- T001 → T002/T003/T004 → T006/T011 → T027 → T030 → T031 (notes flow)
- T014 → T017 → T037 → T039 → T040 → T041 (AI streaming flow)

---

## 并行执行示例 (每个故事)

- US1: 可以并行执行 `T027 NoteList` 与 `T028 NoteEditor` 与 `T030 useNotes`（标记为 [P]），因为它们位于不同文件/模块。
- US2: `T037 AIButton` 与 `T038 selection util` 与 `T039 AIStreamModal` 可以同时进行实现（标记为 [P]）。

---

## MVP 策略 (最小可行交付) 🎯

**MVP 范围**: 完成阶段 1 + 阶段 2 的最小 subset + 完成 US1 全部任务与 US2 的基本演示（T014, T017, T037, T039 with mock streaming），以便在可控安全边界内演示 AI 流式交互的端到端体验。

- 优先交付: T001-T013、T027-T033、T037、T039、T050 (mock LLM)、T051 (quickstart 的演示脚本)

---

## 实施注记

- 所有标记为 [P] 的任务可以并行执行（不同文件）。
- 相同文件的任务应顺序执行以避免冲突。
- 测试任务在实现前应先行编写（T025/T034 等），以支持 TDD 流程。

---

## 联系人与验收

- 任务应在完成后提交 PR，PR 应包含相应的测试、文档与 demo 脚本。
- 验收标准: 通过对应的 E2E 测试，且在 quickstart 说明下能够在本地 5 分钟内演示端到端流程。
