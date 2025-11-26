import React, { useState, useEffect } from 'react'
import { Input, Select, Space } from 'antd'
import { resolveTemplate } from '../engine/compile'
import { ensureModal } from '../../../../shared/ui/modalHost'
import { systemService } from '../../../../services'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

const { TextArea } = Input

// 不再使用全局实例，由 modalHost 提供隔离的 modal

const ShowModalConfig = ({ value = {}, onChange }) => {
  const [title, setTitle] = useState(value.title || '')
  const [content, setContent] = useState(value.content || '')
  const [contentType, setContentType] = useState(value.contentType || 'text')
  const [customStyles, setCustomStyles] = useState(value.customStyles || '')

  useEffect(() => {
    setTitle(value.title || '')
  }, [value.title])
  useEffect(() => {
    setContent(value.content || '')
  }, [value.content])
  useEffect(() => {
    setContentType(value.contentType || 'text')
  }, [value.contentType])
  useEffect(() => {
    setCustomStyles(value.customStyles || '')
  }, [value.customStyles])

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Input
        placeholder="弹窗标题（可使用变量：{{executors[0].result.value.name}}）"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => onChange({ ...(value || {}), title })}
      />
      <Select
        style={{ width: '100%' }}
        value={contentType}
        onChange={(val) => {
          setContentType(val)
          onChange({ ...(value || {}), contentType: val })
        }}
        options={[
          { label: '纯文本', value: 'text' },
          { label: 'HTML', value: 'html' },
          { label: 'Markdown', value: 'markdown' }
        ]}
      />
      <TextArea
        rows={6}
        placeholder="弹窗内容（支持模板变量）"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onBlur={() => onChange({ ...(value || {}), content })}
        style={{ fontFamily: 'monospace' }}
      />
      <TextArea
        rows={4}
        placeholder="自定义 CSS 样式（可选，留空使用默认样式）&#10;例如：h2 { margin: 10px 0; } p { line-height: 1.5; }"
        value={customStyles}
        onChange={(e) => setCustomStyles(e.target.value)}
        onBlur={() => onChange({ ...(value || {}), customStyles })}
        style={{ fontFamily: 'monospace', fontSize: '12px' }}
      />
    </Space>
  )
}

// Render markdown using a professional library (marked) and sanitize with DOMPurify
function renderMarkdown(md) {
  const dirty = marked.parse(md, { gfm: true, breaks: true })
  const clean = DOMPurify.sanitize(dirty)
  return clean
}

export const ShowModalAction = {
  key: 'show-modal',
  label: '显示弹窗',
  getDefaultConfig() {
    return {
      title: '',
      content: '',
      contentType: 'text',
      customStyles: ''
    }
  },
  ConfigComponent: ShowModalConfig,
  async execute(trigger, context, config, options = {}) {
    const title = resolveTemplate(config.title || '提示', context)
    const content = resolveTemplate(config.content || '', context)
    const contentType = config.contentType || 'text'
    const customStyles = config.customStyles || ''

    if (!content.trim()) {
      throw new Error('弹窗内容为空')
    }

    // 根据内容类型生成 HTML
    let htmlContent
    if (contentType === 'html') {
      htmlContent = DOMPurify.sanitize(content)
    } else if (contentType === 'markdown') {
      htmlContent = renderMarkdown(content)
    } else {
      // 纯文本，转义 HTML 并保留换行
      htmlContent = content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br/>')
    }

    const modal = await ensureModal()

    // 构建完整的 HTML，包含样式和内容
    const fullHtml = `
      ${customStyles ? `<style>${customStyles}</style>` : ''}
      <div class="modal-content-wrapper">
        ${htmlContent}
      </div>
    `

    // 使用 dangerouslySetInnerHTML 渲染
    const contentElement = React.createElement('div', {
      dangerouslySetInnerHTML: { __html: fullHtml }
    })

    modal.info({
      title,
      content: contentElement,
      okText: '确定',
      width: 600,
      maskClosable: true
    })

    setTimeout(() => {
      const modalBody = document.querySelector('.ant-modal-body')
      if (!modalBody) return
      modalBody.addEventListener('click', async (e) => {
        const target = e.target
        const actEl = target.closest('[data-fp-action]')
        if (actEl) {
          e.preventDefault()
          e.stopPropagation()
          const action = String(actEl.getAttribute('data-fp-action') || '').trim()
          const arg = actEl.getAttribute('data-fp-arg')
          const args = actEl.getAttribute('data-fp-args')
          try {
            await executeAbility(action, arg ?? args)
          } catch (err) {
            systemService.showNotification(String(err?.message || err || '执行失败'))
          }
          return
        }

        const link = target.closest('a[href]')
        if (link) {
          const href = link.getAttribute('href') || ''
          if (href.startsWith('fp:') || href.startsWith('fp://')) {
            e.preventDefault()
            e.stopPropagation()
            try {
              const { name, payload } = parseFpHref(href)
              await executeAbility(name, payload)
            } catch (err) {
              systemService.showNotification(String(err?.message || err || '执行失败'))
            }
            return
          }
          if (href && href !== '#') {
            e.preventDefault()
            e.stopPropagation()
            systemService.openExternal(href)
            return
          }
        }

        const callText = target.getAttribute?.('data-fp-call') || target.textContent || ''
        if (/^\s*@\w+\s*\(.*\)\s*$/.test(callText)) {
          e.preventDefault()
          e.stopPropagation()
          try {
            const { name, payload } = parseAtCall(callText)
            await executeAbility(name, payload)
          } catch (err) {
            systemService.showNotification(String(err?.message || err || '执行失败'))
          }
        }
      })
    }, 50)
  }
}

async function executeAbility(name, payload) {
  const n = String(name || '').toLowerCase()
  switch (n) {
    case 'copy': {
      const text = String(payload || '')
      if (!text.trim()) throw new Error('复制内容为空')
      const ok = await systemService.writeClipboard(text)
      if (!ok) throw new Error('写入剪贴板失败')
      systemService.showNotification('已复制到剪贴板')
      return
    }
    case 'open': {
      const url = String(payload || '')
      if (!url.trim()) throw new Error('URL 为空')
      systemService.openExternal(url)
      return
    }
    case 'notify': {
      const msg = String(payload || '')
      if (!msg.trim()) throw new Error('通知内容为空')
      systemService.showNotification(msg)
      return
    }
    case 'download': {
      const text = String(payload || '')
      if (!text.trim()) throw new Error('下载内容为空')
      const path = systemService.writeTextFile(text)
      if (!path) throw new Error('下载失败')
      systemService.showNotification(`已保存到: ${path}`)
      return
    }
    case 'openpath': {
      const p = String(payload || '')
      if (!p.trim()) throw new Error('路径为空')
      await systemService.openPath(p)
      return
    }
    case 'writefile': {
      const json = String(payload || '')
      if (!json.trim()) throw new Error('写文件参数为空')
      let args
      try { args = JSON.parse(json) } catch { throw new Error('写文件参数需为JSON') }
      const filePath = String(args.path || '')
      const content = String(args.content || '')
      if (!filePath.trim()) throw new Error('写文件路径为空')
      const out = window.services?.writeTextFileAt ? window.services.writeTextFileAt(filePath, content) : null
      if (!out) throw new Error('写文件失败')
      systemService.showNotification(`已写入: ${out}`)
      return
    }
    case 'run': {
      const json = String(payload || '')
      if (!json.trim()) throw new Error('命令参数为空')
      let req
      try { req = JSON.parse(json) } catch { throw new Error('命令参数需为JSON') }
      const { command, runInBackground, timeout, env, showWindow } = req || {}
      if (!String(command || '').trim()) throw new Error('command 为空')
      const res = await systemService.executeCommand({ command, runInBackground, timeout, env, showWindow })
      if (!res?.success) throw new Error('命令执行失败')
      systemService.showNotification('命令已执行')
      return
    }
    default:
      throw new Error(`未知能力: ${name}`)
  }
}

function parseFpHref(href) {
  if (href.startsWith('fp://')) {
    try {
      const u = new URL(href)
      const name = u.hostname
      const payload = u.searchParams.get('text') || u.searchParams.get('url') || ''
      return { name, payload }
    } catch {
      throw new Error('fp:// 链接解析失败')
    }
  }
  const m = href.match(/^fp:(\w+):(.*)$/)
  if (m) {
    const [, name, payload] = m
    return { name, payload }
  }
  throw new Error('不支持的 fp 链接格式')
}

function parseAtCall(text) {
  const m = String(text || '').trim().match(/^@(?<name>\w+)\((?<payload>.*)\)$/)
  if (!m || !m.groups) throw new Error('文本指令格式错误')
  return { name: m.groups.name, payload: m.groups.payload }
}
