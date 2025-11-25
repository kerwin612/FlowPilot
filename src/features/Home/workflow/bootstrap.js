/**
 * 工作流引擎启动配置
 * 在应用启动时注册所有内置的执行器和动作器
 * 保证单一职责：仅负责注册，不负责执行逻辑
 */

import { executorRegistry } from './executors/registry'
import { actionRegistry } from './actions/registry'
import { conditionRegistry } from './conditions/registry'

// 内置执行器
import { ParamBuilderExecutor } from './executors/param-builder/index.jsx'
import { CommandExecutor } from './executors/command/index.jsx'
import { ScriptExecutor } from './executors/js-script/index.jsx'
import { EnvPatchExecutor } from './executors/env-patch/index.jsx'

// 内置动作器
import { OpenLinkAction } from './actions/open-link.jsx'
import { OpenPathAction } from './actions/open-path.jsx'
import { ShowModalAction } from './actions/show-modal.jsx'
import { WriteClipboardAction } from './actions/write-clipboard.jsx'
import { BrowserAction } from './actions/browser.jsx'
import { RedirectPluginAction } from './actions/redirect-plugin.jsx'

import { EnvVarEquals } from './conditions/builtin/env-var-equals.jsx'
import { ExecutorResultHas } from './conditions/builtin/executor-result-has.jsx'
import { JsExpressionCondition } from './conditions/builtin/js-expression.jsx'
import { JsFunctionCondition } from './conditions/builtin/js-function.jsx'

let initialized = false

/**
 * 初始化工作流引擎注册表
 * 幂等操作：可多次调用，仅首次生效
 * 在应用启动时调用一次即可
 */
export function initializeRegistries() {
  if (initialized) {
    return // 已初始化，静默跳过
  }

  // 注册所有内置执行器
  const executors = [ParamBuilderExecutor, CommandExecutor, ScriptExecutor, EnvPatchExecutor]
  executors.forEach((def) => {
    try {
      executorRegistry.register(def)
    } catch (error) {
      console.error(`[Bootstrap] 执行器注册失败: ${def.key}`, error)
    }
  })

  // 注册所有内置动作器
  const actions = [
    OpenLinkAction,
    OpenPathAction,
    ShowModalAction,
    WriteClipboardAction,
    BrowserAction,
    RedirectPluginAction
  ]
  actions.forEach((def) => {
    try {
      actionRegistry.register(def)
    } catch (error) {
      console.error(`[Bootstrap] 动作器注册失败: ${def.key}`, error)
    }
  })

  const conditions = [
    ExecutorResultHas,
    EnvVarEquals,
    JsExpressionCondition,
    JsFunctionCondition
  ]
  conditions.forEach((def) => {
    try {
      conditionRegistry.register(def)
    } catch (error) {
      console.error(`[Bootstrap] 条件插件注册失败: ${def.key}`, error)
    }
  })

  initialized = true
}

/**
 * 重置注册状态（仅用于测试或热重载）
 */
export function resetInitialization() {
  initialized = false
}
