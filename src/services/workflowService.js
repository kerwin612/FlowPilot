import { systemService } from './index'
import { runComposedWorkflow } from '../features/Home/workflow/engine/runWorkflow'
import { isCancelError } from '../features/Home/workflow/engine/errors'

class WorkflowService {
  constructor() {
    this.executingMap = new Map()
    this.abortControllers = new Map()
    // 调试模式开关（可通过 localStorage 或环境变量控制）
    this.debugMode = false
    this.enableDebugMode()
  }

  enableDebugMode(enabled = true) {
    this.debugMode = enabled
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('flowpilot_debug', enabled ? '1' : '0')
    }
  }

  isDebugMode() {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('flowpilot_debug') === '1'
    }
    return this.debugMode
  }

  /**
   * 执行工作流
   * @param {Object} workflow - 工作流配置
   * @param {Object} triggerData - 触发数据
   * @param {string} triggerData.code - feature code（动态指令触发时）
   * @param {string} triggerData.type - 触发类型（files/img/over/regex/window）
   * @param {any} triggerData.payload - 触发数据（文件路径、文本、图片等）
   * @param {Object} triggerData.userParams - 用户自定义参数（点击触发时）
   */
  async execute(workflow, triggerData = {}) {
    const key = workflow?.id
    if (!key) throw new Error('工作流缺少 id')
    if (this.executingMap.get(key)) return

    // 创建 AbortController
    const abortController = new AbortController()

    this.executingMap.set(key, true)
    this.abortControllers.set(key, abortController)

    try {
      // 构建完整的 trigger 对象
      const trigger = {
        entryMenuValue: triggerData.entryMenuValue || undefined,
        // 动态指令数据（从 uTools onPluginEnter 传入）
        code: triggerData.code || undefined,
        type: triggerData.type || undefined,
        payload: triggerData.payload || undefined,

        // 手动触发标识
        manual: !triggerData.code,

        // 兼容旧的 userParams（点击触发时使用）
        userParams: triggerData.userParams || {},
        filePath: triggerData.userParams?.__filePath
      }

      const options = {
        signal: abortController.signal,
        onEvent: this.isDebugMode() ? this.createDebugEventHandler(workflow) : undefined
      }

      await runComposedWorkflow(workflow, trigger, options)

      // 工作流执行完成后，退出插件（隐藏到后台）
      // 调试模式下不自动关闭，方便查看控制台输出
      if (!this.isDebugMode()) {
        systemService.outPlugin()
      } else {
        console.log('🐛 [调试模式] 工作流执行完成，主窗口保持打开以便查看日志')
      }
    } catch (error) {
      // 取消错误：显示轻量提示
      if (isCancelError(error)) {
        console.log('工作流已取消:', error.message)
        systemService.showNotification('⚠️ 工作流已取消')
        return // 不再向上抛出
      }

      // 其他错误：显示错误通知
      console.error('执行工作流失败:', error)
      systemService.showNotification(error.message || '执行失败')
      throw error
    } finally {
      this.executingMap.delete(key)
      this.abortControllers.delete(key)
    }
  }

  /**
   * 手动中止工作流执行
   */
  abort(workflowId, reason = '用户手动停止') {
    const controller = this.abortControllers.get(workflowId)
    if (controller) {
      controller.abort(new Error(reason))
    }
  }

  isExecuting(workflowId) {
    return this.executingMap.get(workflowId) || false
  }

  /**
   * 创建调试事件处理器
   */
  createDebugEventHandler(workflow) {
    const workflowName = workflow.name || workflow.id
    const startTime = Date.now()
    let executorIndex = 0
    let actionIndex = 0

    return (type, data) => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2)
      const prefix = `[${elapsed}s] [${workflowName}]`

      switch (type) {
        case 'workflow:start':
          console.group(`🚀 ${prefix} 工作流开始`)
          console.log('工作流ID:', data.workflowId)
          console.log('工作流名称:', data.workflowName)
          console.groupEnd()
          break

        case 'executor:start':
          executorIndex = data.stepIndex
          console.group(`⚙️ ${prefix} Executor #${executorIndex + 1} 开始: ${data.key}`)
          console.log('启用状态:', data.enabled)
          console.log('配置:', data.config)
          console.groupEnd()
          break

        case 'executor:end':
          console.group(
            data.error
              ? `❌ ${prefix} Executor #${data.stepIndex + 1} 失败: ${data.key}`
              : `✅ ${prefix} Executor #${data.stepIndex + 1} 完成: ${data.key}`
          )
          if (data.error) {
            console.error('错误:', data.error)
          } else if (data.result) {
            console.log('结果:', data.result)
            // 特别输出 command executor 的执行结果
            if (data.key === 'command' && data.result.value?.execResult) {
              console.log('命令输出:', data.result.value.execResult.result)
              if (data.result.value.execResult.error) {
                console.error('命令错误:', data.result.value.execResult.error)
              }
            }
          }
          console.groupEnd()
          break

        case 'action:start':
          actionIndex = data.stepIndex
          console.group(`🎬 ${prefix} Action #${actionIndex + 1} 开始: ${data.key}`)
          console.log('启用状态:', data.enabled)
          console.log('配置:', data.config)
          console.groupEnd()
          break

        case 'action:end':
          console.group(
            data.error
              ? `❌ ${prefix} Action #${data.stepIndex + 1} 失败: ${data.key}`
              : `✅ ${prefix} Action #${data.stepIndex + 1} 完成: ${data.key}`
          )
          if (data.error) {
            console.error('错误:', data.error)
          }
          console.groupEnd()
          break

        case 'workflow:cancel':
          console.warn(`⚠️ ${prefix} 工作流已取消:`, data.reason)
          break

        case 'workflow:end':
          console.group(
            data.success
              ? `🎉 ${prefix} 工作流完成`
              : `💥 ${prefix} 工作流失败`
          )
          if (data.error) {
            console.error('错误:', data.error)
          }
          if (data.context) {
            console.log('最终上下文:', data.context)
          }
          console.groupEnd()
          break

        default:
          console.log(`${prefix} ${type}:`, data)
      }
    }
  }
}

export default new WorkflowService()
