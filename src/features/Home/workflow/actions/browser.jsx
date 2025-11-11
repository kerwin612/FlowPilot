import { useState, useEffect } from 'react'
import { Input } from 'antd'
import { resolveTemplate } from '../engine/compile'
import { systemService } from '../../../../services'

const { TextArea } = Input

const BrowserConfig = ({ value = {}, onChange }) => {
  const [json, setJson] = useState(value.json || '')
  useEffect(() => {
    setJson(value.json || '')
  }, [value.json])

  return (
    <TextArea
      placeholder='JSON 配置，例如: {"url": "https://example.com/{{executor[0].result.value.id}}"}'
      value={json}
      onChange={(e) => setJson(e.target.value)}
      onBlur={() => onChange({ ...(value || {}), json })}
      rows={6}
      style={{ fontFamily: 'monospace' }}
    />
  )
}

export const BrowserAction = {
  key: 'ubrowser',
  label: '打开内置浏览器',
  getDefaultConfig() {
    return { json: '' }
  },
  ConfigComponent: BrowserConfig,
  async execute(trigger, context, config, options = {}) {
    const jsonStr = resolveTemplate(config.json, context)

    if (!jsonStr || !jsonStr.trim()) {
      throw new Error('JSON配置为空')
    }

    let info
    try {
      info = JSON.parse(jsonStr)
    } catch (err) {
      throw new Error(`JSON解析失败: ${err.message}`)
    }

    await systemService.openBrowser(info)
  }
}
