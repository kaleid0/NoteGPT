import { useState, useEffect } from 'react'
import { loadLLMConfig, saveLLMConfig, LLMConfig } from '../../lib/llmConfig'
import styles from './LLMSettings.module.css'

const PROVIDER_DEFAULTS: Record<
  string,
  Omit<LLMConfig, 'provider' | 'apiKey' | 'promptTemplate'>
> = {
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4',
  },
  deepseek: {
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-chat',
  },
  bailian: {
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-plus',
  },
  custom: {
    baseUrl: '',
    model: '',
  },
}

const DEFAULT_PROMPT_TEMPLATE = `<role>
你是一位写作助手，帮助用户整理和润色笔记内容。
</role>

<requirements>
- 在不改变原始含义的前提下进行优化
- 润色语言，使其更自然流畅
- 不要扩展内容、增加细节或解释
- 重写为markdown格式，使结构更清晰
- 请直接输出 Markdown，不要使用 \`\`\` Markdown \`\`\` 包裹内容
</requirements>

<user_input>
{{input}}
</user_input>`

export default function LLMSettings() {
  const [cfg, setCfg] = useState<LLMConfig>({})
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const loaded = loadLLMConfig()
    // Ensure promptTemplate has a default value
    if (!loaded.promptTemplate) {
      loaded.promptTemplate = DEFAULT_PROMPT_TEMPLATE
    }
    setCfg(loaded)
  }, [])

  function update<K extends keyof LLMConfig>(k: K, v: LLMConfig[K]) {
    setCfg((c) => ({ ...c, [k]: v }))
    setSaved(false)
  }

  function handleProviderChange(provider: string) {
    const defaults =
      PROVIDER_DEFAULTS[provider as keyof typeof PROVIDER_DEFAULTS] || PROVIDER_DEFAULTS.custom
    setCfg((c) => ({
      ...c,
      provider,
      baseUrl: defaults.baseUrl,
      model: defaults.model,
    }))
    setSaved(false)
  }

  function handleSave() {
    saveLLMConfig(cfg)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className={styles.container}>
      <h1>LLM 设置</h1>
      <form className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="provider">提供商: </label>
          <select
            id="provider"
            value={cfg.provider || 'openai'}
            onChange={(e) => handleProviderChange(e.target.value)}
            className={styles.select}
          >
            <option value="openai">OpenAI</option>
            <option value="deepseek">DeepSeek</option>
            <option value="bailian">百炼 (Bailian)</option>
            <option value="custom">自定义</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="apiKey">API Key: </label>
          <input
            id="apiKey"
            type="password"
            className={styles.input}
            value={cfg.apiKey || ''}
            onChange={(e) => update('apiKey', e.target.value)}
            placeholder="sk-..."
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="baseUrl">Base URL: </label>
          <input
            id="baseUrl"
            type="url"
            className={styles.input}
            value={cfg.baseUrl || ''}
            onChange={(e) => update('baseUrl', e.target.value)}
            placeholder="https://api.openai.com"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="model">Model: </label>
          <input
            id="model"
            type="text"
            className={styles.input}
            value={cfg.model || ''}
            onChange={(e) => update('model', e.target.value)}
            placeholder="gpt-3.5-turbo"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="promptTemplate">Prompt 模板 (可使用 {'{{input}}'} 占位符): </label>
          <textarea
            id="promptTemplate"
            className={styles.textarea}
            value={cfg.promptTemplate || DEFAULT_PROMPT_TEMPLATE}
            onChange={(e) => update('promptTemplate', e.target.value)}
          />
          <small className={styles.hint}>
            示例: 使用模板中的 {'{{input}}'} 占位符替换为用户输入的笔记。
          </small>
        </div>

        <div className={styles.actions}>
          <button type="button" onClick={handleSave} className={styles.button}>
            保存设置
          </button>
          {saved && <span className={styles.successMessage}>✓ 已保存</span>}
        </div>
      </form>
    </div>
  )
}
