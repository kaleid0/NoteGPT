$desc = @'
项目名称: web 端 AI笔记应用; 构建微型 AI 驱动笔记应用，支持记录与润色想法；目标双端可用、实时流畅、用户友好；功能要求：笔记列表/详情、CRUD、浏览器端持久化（加分: 后端存储）；AI 助手：AI 处理按钮、选中文本或全文处理、弹出流式响应悬浮框、接受/丢弃交互；API Key 配置友好和安全。
'@

& ".\.specify\scripts\powershell\create-new-feature.ps1" -Json -ShortName "add-ai-notes" -FeatureDescription $desc
