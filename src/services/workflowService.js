import { systemService } from './index'
import { runComposedWorkflow } from '../features/Home/workflow/engine/runWorkflow'
import { isCancelError } from '../features/Home/workflow/engine/errors'

class WorkflowService {
  constructor() {
    this.executingMap = new Map()
    this.abortControllers = new Map()
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
        signal: abortController.signal
      }

      await runComposedWorkflow(workflow, trigger, options)
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
}

export default new WorkflowService()
