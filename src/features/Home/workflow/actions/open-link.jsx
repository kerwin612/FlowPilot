import { useState, useEffect } from 'react'
import { Input } from 'antd'
import { resolveTemplate } from '../engine/compile'
import { systemService } from '../../../../services'
import { manualRegistry } from '../manual/registry'

const OpenLinkConfig = ({ value = {}, onChange }) => {
  const [url, setUrl] = useState(value.url || '')
  useEffect(() => {
    setUrl(value.url || '')
  }, [value.url])
  return (
    <Input
      placeholder="例如 https://example.com/{{executors[0].result.value.id}}"
      value={url}
      onChange={(e) => setUrl(e.target.value)}
      onBlur={() => onChange({ ...(value || {}), url })}
    />
  )
}

export const OpenLinkAction = {
  key: 'open-link',
  label: '打开链接',
  getDefaultConfig() {
    return { url: '' }
  },
  ConfigComponent: OpenLinkConfig,
  async execute(trigger, context, config, options = {}) {
    const url = resolveTemplate(config.url, context)
    if (!url) throw new Error('URL为空')
    await systemService.openExternal(url)
  }
}

try {
  manualRegistry.register({
    type: 'action',
    key: 'open-link',
    title: '打开链接（OpenLink）',
    summary: '解析 URL 模板并在系统默认浏览器打开。',
    usage: '添加“打开链接”，填写 URL 模板。',
    configFields: [{ name: 'url', label: '链接模板', required: true }]
  })
} catch {}
