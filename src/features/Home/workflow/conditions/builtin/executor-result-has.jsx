import { Input } from 'antd'

const ExecutorResultHasConfig = ({ value = {}, onChange }) => {
  return (
    <Input
      placeholder="上下文值键名，如: filePath"
      defaultValue={value.key || ''}
      onBlur={(e) => onChange({ ...(value || {}), key: e.target.value })}
    />
  )
}

export const ExecutorResultHas = {
  key: 'executor-result-has',
  label: '前置结果包含键',
  getDefaultConfig() {
    return { key: '' }
  },
  ConfigComponent: ExecutorResultHasConfig,
  async evaluate(trigger, context, config) {
    const k = String(config?.key || '')
    if (!k) return true
    const values = context?.values || {}
    return Object.prototype.hasOwnProperty.call(values, k)
  }
}