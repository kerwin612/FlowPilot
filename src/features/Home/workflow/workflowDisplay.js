import { WORKFLOW_MODE_COMPOSED } from '../../../shared/constants'

export function getWorkflowDisplayText(workflow) {
  if (!workflow || workflow.mode !== WORKFLOW_MODE_COMPOSED) return ''
  const parts = []
  ;(workflow.executors || []).forEach((ex) => {
    if (ex.key === 'command') {
      parts.push(`${ex.enabled === false ? '[禁用] ' : ''}命令: ${truncate(ex.config?.template)}`)
    } else if (ex.key === 'param-builder') {
      const n = ex.config?.params?.length || 0
      parts.push(`${ex.enabled === false ? '[禁用] ' : ''}参数(${n})`)
    } else if (ex.key === 'js-script') {
      const code = ex.config?.code || ''
      const first = code.split('\n')[0] || ''
      parts.push(`${ex.enabled === false ? '[禁用] ' : ''}脚本: ${truncate(first, 60)}`)
    } else {
      parts.push(`${ex.enabled === false ? '[禁用] ' : ''}执行器:${ex.key}`)
    }
  })
  ;(workflow.actions || []).forEach((act) => {
    if (act.key === 'open-link') {
      parts.push(`${act.enabled === false ? '[禁用] ' : ''}打开链接: ${truncate(act.config?.url)}`)
    } else if (act.key === 'open-path') {
      parts.push(`${act.enabled === false ? '[禁用] ' : ''}打开路径: ${truncate(act.config?.path)}`)
    } else if (act.key === 'ubrowser') {
      parts.push(
        `${act.enabled === false ? '[禁用] ' : ''}打开内置浏览器: ${truncate(act.config?.json)}`
      )
    } else if (act.key === 'write-clipboard') {
      parts.push(
        `${act.enabled === false ? '[禁用] ' : ''}写入剪贴板: ${truncate(act.config?.text)}`
      )
    } else if (act.key === 'show-modal') {
      parts.push(
        `${act.enabled === false ? '[禁用] ' : ''}显示弹窗: ${truncate(act.config?.title || act.config?.content)}`
      )
    } else {
      parts.push(`${act.enabled === false ? '[禁用] ' : ''}动作:${act.key}`)
    }
  })
  return parts.join(' | ')
}

function truncate(s, len = 40) {
  if (!s) return ''
  return s.length > len ? s.slice(0, len) + '…' : s
}
