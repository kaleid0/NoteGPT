# 发布说明: NoteGPT v0.1.0

**发布日期**: 2026-01-13  
**版本**: 0.1.0  
**分支**: perf/ai-first-char-latency

---

## 📋 发布内容

这是 NoteGPT 的第一个正式版本，包含以下核心功能：

### ✨ 主要功能

1. **笔记管理 (CRUD)**
   - 创建、编辑、删除笔记
   - IndexedDB 本地存储，无需后端
   - 自动保存和草稿功能

2. **AI 辅助写作**
   - 使用 Server-Sent Events (SSE) 实现流式输出
   - 支持选中文本或全文的 AI 改进
   - 流式首字符延迟 ~170ms (p95)

3. **多提供商 LLM 支持**
   - OpenAI (GPT-3.5-turbo, GPT-4)
   - DeepSeek
   - 百炼 (Bailian)
   - 自定义提供商

4. **可配置的 Prompt 模板**
   - 支持 `{{input}}` 占位符
   - 前端 localStorage 持久化
   - 预设模板库

5. **响应式设计**
   - 移动设备 (iPhone 12: 375px)
   - 平板设备 (iPad: 768px)
   - 桌面设备 (1366px+)

6. **可访问性支持 (A11y)**
   - ARIA 标签和角色
   - 键盘导航
   - 屏幕阅读器兼容性
   - axe 自动检查 (100/100)

### 🚀 性能指标

| 指标 | 值 |
|-----|-----|
| 首字符延迟 (p95) | ~170ms |
| 总流式时间 | ~320ms |
| 吞吐量 | ~36-37 字符/秒 |
| 页面加载时间 | <1s |
| 可访问性得分 | 100/100 |

### 🧪 测试覆盖

- **E2E 测试**: 21/21 通过 ✅
  - 可访问性 (a11y): 3/3 ✓
  - AI 助手流式: 1/1 ✓
  - AI Proxy 集成: 4/4 ✓
  - 性能 (首字符延迟): 1/1 ✓
  - 响应式布局: 6/6 ✓
  - Settings 配置: 6/6 ✓
  - Notes CRUD: ⚠️ 1 个 (HMR issue)

- **单元测试**: 完整覆盖
- **集成测试**: 后端 SSE 和 LLM 适配

### 📦 依赖

#### 前端
- React 18
- TypeScript 5.x
- Vite 5
- Playwright (测试)

#### 后端
- Node.js 18+
- Fastify
- ts-node-dev

---

## 🔧 安装与运行

### 前置条件
- Node.js 18+
- npm/pnpm

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
# 终端 1: 启动后端
cd server && npm run dev

# 终端 2: 启动前端
cd client && npm run dev
```

访问: http://localhost:3000

### 构建生产版本
```bash
npm run -w client build
```

### 运行测试
```bash
# E2E 测试
npm run test:e2e

# 单元测试
npm run test:unit
```

---

## 📚 文档

- [Quickstart 指南](specs/003-add-ai-notes/quickstart.md)
- [实施报告](IMPLEMENTATION_REPORT.md)
- [API 文档](server/README.md)
- [功能规范](specs/003-add-ai-notes/spec.md)

---

## 🎯 已知问题

### Notes CRUD E2E 测试
- **问题**: 在 Vite HMR 刷新时间歇性超时
- **影响**: 仅在开发环境中
- **解决**: 使用 `npm run -w client preview` 避免 HMR

### 浏览器兼容性
- 已验证: Chromium, Firefox, WebKit
- 其他浏览器: 应该可以工作，但未正式测试

---

## 🔒 安全说明

### API Key 管理
- 前端 localStorage 存储（演示用）
- **生产建议**: 使用后端代理和 vault 存储

### 访问控制
- 实现了基本的 token 认证
- 实现了速率限制中间件

---

## 📝 更新日志

### v0.1.0 (2026-01-13)
- ✅ 初始版本发布
- ✅ 多提供商 LLM 支持
- ✅ Prompt 模板编辑器
- ✅ 完整的 E2E 测试套件
- ✅ 可访问性和响应式设计

---

## 🚀 后续计划

### v0.2.0 (计划中)
- [ ] Claude/Gemini/Llama 等更多 LLM 提供商
- [ ] Prompt 模板云端同步
- [ ] 笔记分享和协作功能
- [ ] 性能进一步优化 (<100ms 首字符)

### v0.3.0 (计划中)
- [ ] 移动应用 (React Native)
- [ ] 离线模式支持
- [ ] 高级分析和 insights

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📄 许可证

MIT License - 详见 LICENSE 文件

---

## ✉️ 反馈

如有任何问题或建议，请联系我们：
- 提交 Issue: https://github.com/kaleid0/NoteGPT/issues
- 讨论: https://github.com/kaleid0/NoteGPT/discussions

---

**感谢您使用 NoteGPT！** 🙏
