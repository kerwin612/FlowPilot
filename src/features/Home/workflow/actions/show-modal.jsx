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

    // 为链接添加点击事件（使用事件委托）
    setTimeout(() => {
      const modalBody = document.querySelector('.ant-modal-body')
      if (modalBody) {
        // 使用事件委托，只绑定一次
        modalBody.addEventListener('click', (e) => {
          // 向上查找最近的 a 标签
          const link = e.target.closest('a[href]')
          if (link) {
            e.preventDefault()
            e.stopPropagation()
            const href = link.getAttribute('href')
            if (href && href !== '#') {
              systemService.openExternal(href)
            }
          }
        })
      }
    }, 100)
  }
}
