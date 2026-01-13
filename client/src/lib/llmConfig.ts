export type LLMConfig = {
  provider?: 'openai' | 'deepseek' | 'bailian' | string
  apiKey?: string
  baseUrl?: string
  model?: string
  promptTemplate?: string
}

const KEY = 'notegpt.llm.config'

export function loadLLMConfig(): LLMConfig {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

export function saveLLMConfig(cfg: LLMConfig) {
  try {
    localStorage.setItem(KEY, JSON.stringify(cfg))
  } catch {
    // ignore
  }
}
