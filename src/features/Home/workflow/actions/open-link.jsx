import { useState, useEffect } from 'react'
import { Input } from 'antd'
import { resolveTemplate } from '../engine/compile'
import { systemService } from '../../../../services'

const OpenLinkConfig = ({ value = {}, onChange }) => {
  const [url, setUrl] = useState(value.url || '')
  useEffect(() => {
    setUrl(value.url || '')
  }, [value.url])
  return (
    <Input
      placeholder="例如 https://example.com/{{executor[0].result.value.id}}"
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
