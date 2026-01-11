import React, { useState, useEffect } from 'react'
import { Input, Select, Space } from 'antd'
import { resolveTemplate } from '../engine/compile'
import { ensureModal } from '../../../../shared/ui/modalHost'
import { systemService } from '../../../../services'
import { callApi, attachWindowApis } from '../engine/apis'
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
    attachWindowApis()
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
    // 注入暗黑模式适配样式
    const defaultStyles = `
      .modal-content-wrapper {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
        color: var(--color-text-primary, #000000e0);
      }
      .modal-content-wrapper img {
        max-width: 100%;
      }
      /* Dark mode adaptation */
      @media (prefers-color-scheme: dark) {
        .modal-content-wrapper {
          color: var(--color-text-primary, #ffffffd9);
        }
      }
      /* Explicit dark theme support via data-theme */
      :root[data-theme='dark'] .modal-content-wrapper {
        color: var(--color-text-primary, #ffffffd9);
      }
    `

    const fullHtml = `
      <style>${defaultStyles}</style>
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
            await callApi(action, arg ?? args)
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
              await callApi(name, payload)
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
            await callApi(name, payload)
          } catch (err) {
            systemService.showNotification(String(err?.message || err || '执行失败'))
          }
        }
      })
    }, 50)
  }
}

// 统一能力入口通过 callApi 提供

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
