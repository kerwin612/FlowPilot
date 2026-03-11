import React, { useState } from 'react'

/**
 * 调试日志输出器
 * 用于在工作流执行过程中输出调试信息
 */

function ConfigComponent({ value, onChange }) {
  const [config, setConfig] = useState(
    value || {
      message: '',
      logLevel: 'info',
      showModal: false,
      logContext: false,
      contextPath: ''
    }
  )

  const handleChange = (field, val) => {
    const newConfig = { ...config, [field]: val }
    setConfig(newConfig)
    onChange?.(newConfig)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px' }}>
          日志消息（可使用模板）
        </label>
        <input
          type="text"
          value={config.message}
          onChange={(e) => handleChange('message', e.target.value)}
          placeholder="例如: 执行到步骤X，当前数据: {{executors[0].result.value}}"
          style={{ width: '100%', padding: '6px 8px', fontSize: '13px' }}
        />
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px' }}>
          日志级别
        </label>
        <select
          value={config.logLevel}
          onChange={(e) => handleChange('logLevel', e.target.value)}
          style={{ width: '100%', padding: '6px 8px', fontSize: '13px' }}
        >
          <option value="info">Info（普通信息）</option>
          <option value="warn">Warn（警告）</option>
          <option value="error">Error（错误）</option>
          <option value="debug">Debug（调试）</option>
        </select>
      </div>

      <div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
          <input
            type="checkbox"
            checked={config.showModal}
            onChange={(e) => handleChange('showModal', e.target.checked)}
          />
          使用弹窗显示（阻塞执行）
        </label>
      </div>

      <div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
          <input
            type="checkbox"
            checked={config.logContext}
            onChange={(e) => handleChange('logContext', e.target.checked)}
          />
          输出完整上下文到控制台
        </label>
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px' }}>
          输出指定路径的数据（可选）
        </label>
        <input
          type="text"
          value={config.contextPath}
          onChange={(e) => handleChange('contextPath', e.target.value)}
          placeholder="例如: executors[0].result.value"
          style={{ width: '100%', padding: '6px 8px', fontSize: '13px' }}
        />
        <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
          不带双大括号，直接写路径。为空则输出整个context
        </div>
      </div>
    </div>
  )
}

async function execute(trigger, context, config) {
  const { message, logLevel, showModal, logContext, contextPath } = config

  // 1. 输出配置的消息（已经通过模板解析了）
  const logMessage = `[Debug Logger] ${message || '调试输出'}`

  switch (logLevel) {
    case 'error':
      console.error(logMessage)
      break
    case 'warn':
      console.warn(logMessage)
      break
    case 'debug':
      console.debug(logMessage)
      break
    default:
      console.log(logMessage)
  }

  // 2. 输出上下文数据
  if (logContext) {
    console.group('[Debug Logger] 完整上下文')
    console.log('Context:', context)
    console.groupEnd()
  }

  // 3. 输出指定路径的数据
  if (contextPath) {
    try {
      // 安全地访问嵌套路径
      const value = contextPath.split('.').reduce((obj, key) => {
        // 处理数组索引 executors[0]
        const match = key.match(/^(.+?)\[(\d+)\]$/)
        if (match) {
          const prop = match[1]
          const index = parseInt(match[2], 10)
          return obj?.[prop]?.[index]
        }
        return obj?.[key]
      }, context)

      console.group(`[Debug Logger] 数据路径: ${contextPath}`)
      console.log('Value:', value)
      console.log('Type:', typeof value)
      console.log('JSON:', JSON.stringify(value, null, 2))
      console.groupEnd()
    } catch (err) {
      console.error(`[Debug Logger] 访问路径失败: ${contextPath}`, err)
    }
  }

  // 4. 如果需要弹窗显示
  if (showModal) {
    const systemService =
      (await import('../../../../services/systemService')).default ||
      (await import('../../../../services/systemService'))

    let displayContent = message || '调试断点'

    if (contextPath) {
      try {
        const value = contextPath.split('.').reduce((obj, key) => {
          const match = key.match(/^(.+?)\[(\d+)\]$/)
          if (match) {
            const prop = match[1]
            const index = parseInt(match[2], 10)
            return obj?.[prop]?.[index]
          }
          return obj?.[key]
        }, context)
        displayContent += '\n\n数据: ' + JSON.stringify(value, null, 2)
      } catch (err) {
        displayContent += '\n\n[错误] ' + err.message
      }
    }

    await systemService.showModal({
      title: '调试断点',
      content: displayContent,
      buttons: ['继续执行']
    })
  }

  return {
    value: {
      message,
      timestamp: Date.now()
    }
  }
}

export default {
  key: 'debug-logger',
  label: '🐛 调试日志',
  getDefaultConfig: () => ({
    message: '',
    logLevel: 'info',
    showModal: false,
    logContext: false,
    contextPath: ''
  }),
  ConfigComponent,
  execute
}
