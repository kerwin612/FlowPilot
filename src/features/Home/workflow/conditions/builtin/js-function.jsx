import { useState, useEffect } from 'react'
import { Input } from 'antd'
import { resolveTemplate } from '../../../workflow/engine/compile'

const { TextArea } = Input

const JsFunctionConfig = ({ value = {}, onChange }) => {
  const [code, setCode] = useState(value.code || '')
  useEffect(() => {
    setCode(value.code || '')
  }, [value.code])
  return (
    <TextArea
      rows={6}
      placeholder={`示例:\n(context) => context.executors.count > 0\n\n或\nasync function(context){ return !!context.executors[0].result.ok }`}
      value={code}
      onChange={(e) => setCode(e.target.value)}
      onBlur={() => onChange({ ...(value || {}), code })}
      style={{ fontFamily: 'monospace' }}
    />
  )
}

function buildFn(raw) {
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (/^new\s+Function\s*\(/.test(trimmed)) {
    // eslint-disable-next-line no-eval
    const fn = eval(trimmed)
    return typeof fn === 'function' ? fn : null
  }
  if (/^(async\s+)?function\s*\(/.test(trimmed)) {
    // eslint-disable-next-line no-eval
    const fn = eval('(' + trimmed + ')')
    return typeof fn === 'function' ? fn : null
  }
  if (/^(async\s+)?\(?[a-zA-Z_$][^=]*=>/.test(trimmed) || /^(async\s+)?\(.*\)\s*=>/.test(trimmed)) {
    // eslint-disable-next-line no-eval
    const fn = eval(trimmed)
    return typeof fn === 'function' ? fn : null
  }
  // 兜底尝试表达式
  // eslint-disable-next-line no-eval
  const fn = eval(trimmed)
  return typeof fn === 'function' ? fn : null
}

export const JsFunctionCondition = {
  key: 'js-function',
  label: 'JS 函数',
  getDefaultConfig() {
    return { code: '' }
  },
  ConfigComponent: JsFunctionConfig,
  async evaluate(trigger, context, config) {
    const raw = String(config?.code || '')
    if (!raw.trim()) return true
    const rendered = resolveTemplate(raw, context)
    const fn = buildFn(rendered)
    if (!fn) return true
    const res = await fn(context)
    return !!res
  }
}