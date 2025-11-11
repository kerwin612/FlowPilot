import { createExecutionContext, pushExecutorResult } from './context'
import { executorRegistry } from '../executors/registry'
import { actionRegistry } from '../actions/registry'
import configService from '../../../../services/configService'
import { WorkflowCancelError, isCancelError } from './errors'

/**
 * 执行组合式工作流
 * @param {Object} workflow - 工作流定义
 * @param {Object} trigger - 触发上下文
 * @param {Object} options - 执行选项
 * @param {Function} options.onEvent - 事件回调 (type, data) => void
 * @param {AbortSignal} options.signal - 中断信号
 * @returns {Promise<Object>} 执行上下文
 *
 * 事件类型:
 * - workflow:start { workflowId, workflowName }
 * - executor:start { stepIndex, key, enabled, config }
 * - executor:end { stepIndex, key, enabled, result, error }
 * - action:start { stepIndex, key, enabled, config }
 * - action:end { stepIndex, key, enabled, error }
 * - workflow:cancel { reason }
 * - workflow:end { success, context, error }
 */
export async function runComposedWorkflow(workflow, trigger = {}, options = {}) {
  const { onEvent, signal } = options
  const env = configService.getEnabledEnvVars()
  const context = createExecutionContext(workflow, trigger, env)

  const emitEvent = (type, data) => {
    if (typeof onEvent === 'function') {
      try {
        onEvent(type, data)
      } catch (err) {
        console.error(`[runComposedWorkflow] 事件回调异常: ${type}`, err)
      }
    }
  }

  emitEvent('workflow:start', {
    workflowId: workflow.id,
    workflowName: workflow.name
  })

  try {
    // 执行器阶段
    const executors = workflow.executors || []
    for (let i = 0; i < executors.length; i++) {
      // 检查中断信号
      if (signal?.aborted) {
        const cancelError = signal.reason || new WorkflowCancelError()
        emitEvent('workflow:cancel', { reason: cancelError.message })
        throw cancelError
      }

      const ex = executors[i]
      const def = executorRegistry.get(ex.key)

      if (!def) {
        const error = new Error(`执行器未注册: ${ex.key}`)
        emitEvent('executor:end', { stepIndex: i, key: ex.key, enabled: ex.enabled, error })
        throw error
      }

      const cfg = ex.config || def.getDefaultConfig?.() || {}

      emitEvent('executor:start', {
        stepIndex: i,
        key: ex.key,
        enabled: ex.enabled !== false,
        config: cfg
      })

      if (ex.enabled === false) {
        pushExecutorResult(context, ex.key, false, null)
        emitEvent('executor:end', {
          stepIndex: i,
          key: ex.key,
          enabled: false,
          result: null
        })
        continue
      }

      try {
        const result = await def.execute(trigger, context, cfg, { signal })
        pushExecutorResult(context, ex.key, true, result)
        emitEvent('executor:end', {
          stepIndex: i,
          key: ex.key,
          enabled: true,
          result
        })
      } catch (error) {
        // 如果是取消错误，直接上抛
        if (isCancelError(error)) {
          emitEvent('workflow:cancel', { reason: error.message })
          throw error
        }

        emitEvent('executor:end', {
          stepIndex: i,
          key: ex.key,
          enabled: true,
          error
        })
        // 包装友好错误
        const friendlyError = new Error(
          `执行器 "${def.label || ex.key}" (步骤 ${i + 1}) 执行失败: ${error.message}`
        )
        friendlyError.originalError = error
        friendlyError.stepIndex = i
        friendlyError.executorKey = ex.key
        throw friendlyError
      }
    }

    // 动作器阶段
    const actions = workflow.actions || []
    for (let i = 0; i < actions.length; i++) {
      // 检查中断信号
      if (signal?.aborted) {
        const cancelError = signal.reason || new WorkflowCancelError()
        emitEvent('workflow:cancel', { reason: cancelError.message })
        throw cancelError
      }

      const act = actions[i]
      const def = actionRegistry.get(act.key)

      if (!def) {
        const error = new Error(`动作器未注册: ${act.key}`)
        emitEvent('action:end', { stepIndex: i, key: act.key, enabled: act.enabled, error })
        throw error
      }

      const cfg = act.config || def.getDefaultConfig?.() || {}

      emitEvent('action:start', {
        stepIndex: i,
        key: act.key,
        enabled: act.enabled !== false,
        config: cfg
      })

      if (act.enabled === false) {
        emitEvent('action:end', {
          stepIndex: i,
          key: act.key,
          enabled: false
        })
        continue
      }

      try {
        await def.execute(trigger, context, cfg, { signal })
        emitEvent('action:end', {
          stepIndex: i,
          key: act.key,
          enabled: true
        })
      } catch (error) {
        // 如果是取消错误，直接上抛
        if (isCancelError(error)) {
          emitEvent('workflow:cancel', { reason: error.message })
          throw error
        }

        emitEvent('action:end', {
          stepIndex: i,
          key: act.key,
          enabled: true,
          error
        })
        // 包装友好错误
        const friendlyError = new Error(
          `动作器 "${def.label || act.key}" (步骤 ${i + 1}) 执行失败: ${error.message}`
        )
        friendlyError.originalError = error
        friendlyError.stepIndex = i
        friendlyError.actionKey = act.key
        throw friendlyError
      }
    }

    emitEvent('workflow:end', { success: true, context })
    return context
  } catch (error) {
    emitEvent('workflow:end', { success: false, error, context })
    throw error
  }
}
