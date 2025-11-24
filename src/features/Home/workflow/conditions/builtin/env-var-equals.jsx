import { resolveAll } from '../../../../../shared/template/globalVarResolver'
import { Input, Space } from 'antd'

const EnvVarEqualsConfig = ({ value = {}, onChange }) => {
  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Input
        placeholder="变量名，如: API_URL"
        defaultValue={value.name || ''}
        onBlur={(e) => onChange({ ...(value || {}), name: e.target.value })}
      />
      <Input
        placeholder="期望值，可使用 {{vars.KEY}} 模板"
        defaultValue={value.value || ''}
        onBlur={(e) => onChange({ ...(value || {}), value: e.target.value })}
      />
    </Space>
  )
}

export const EnvVarEquals = {
  key: 'env-var-equals',
  label: '环境变量等于',
  getDefaultConfig() {
    return { name: '', value: '' }
  },
  ConfigComponent: EnvVarEqualsConfig,
  async evaluate(trigger, context, config) {
    const name = String(config?.name || '')
    const expectRaw = String(config?.value ?? '')
    const envVal = context?.envs ? context.envs[name] : undefined
    const expect = resolveAll(expectRaw, { vars: context?.vars || {} })
    return String(envVal ?? '') === String(expect)
  }
}