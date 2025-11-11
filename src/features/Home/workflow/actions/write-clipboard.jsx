import { useState, useEffect } from 'react'
import { Input } from 'antd'
import { resolveTemplate } from '../engine/compile'
import { systemService } from '../../../../services'

const { TextArea } = Input

const WriteClipboardConfig = ({ value = {}, onChange }) => {
  const [text, setText] = useState(value.text || '')
  useEffect(() => {
    setText(value.text || '')
  }, [value.text])

  return (
    <TextArea
      placeholder="要写入剪贴板的文本，可使用变量：例如 {{executor[0].result.value.file}}"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => onChange({ ...(value || {}), text })}
      rows={4}
      style={{ fontFamily: 'monospace' }}
    />
  )
}

export const WriteClipboardAction = {
  key: 'write-clipboard',
  label: '写入剪贴板',
  getDefaultConfig() {
    return { text: '' }
  },
  ConfigComponent: WriteClipboardConfig,
  async execute(trigger, context, config, options = {}) {
    const text = resolveTemplate(config.text, context)
    if (!text || !String(text).trim()) throw new Error('文本为空')
    const ok = await systemService.writeClipboard(String(text))
    if (!ok) throw new Error('写入剪贴板失败')
    systemService.showNotification('已写入剪贴板')
  }
}
