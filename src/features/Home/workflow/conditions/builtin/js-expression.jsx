import { resolveTemplate } from '../../../workflow/engine/compile'
import { Input } from 'antd'

const JsExpressionConfig = ({ value = {}, onChange }) => {
  return (
    <Input
      placeholder="布尔表达式，如: values.count > 0 && trigger.type === 'files'"
      defaultValue={value.code || ''}
      onBlur={(e) => onChange({ ...(value || {}), code: e.target.value })}
    />
  )
}

export const JsExpressionCondition = {
  key: 'js-expression',
  label: 'JS 表达式',
  getDefaultConfig() {
    return { code: '' }
  },
  ConfigComponent: JsExpressionConfig,
  async evaluate(trigger, context, config) {
    const raw = String(config?.code || '')
    if (!raw.trim()) return true
    const rendered = resolveTemplate(raw, context)
    const fn = eval(`(function(context){ return !!(${rendered}) })`)
    return !!fn(context)
  }
}