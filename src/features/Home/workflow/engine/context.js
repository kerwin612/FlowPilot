import { getApis, attachWindowApis } from './apis'

export function createExecutionContext(workflow, trigger = {}, envs = {}, vars = {}) {
  const context = {
    workflow,
    trigger,
    envs,
    vars,
    timestamp: new Date(),
    executors: [],
    apis: null
  }
  attachWindowApis(context)
  return {
    ...context,
    apis: getApis(context)
  }
}

export function pushExecutorResult(context, key, enabled, result) {
  context.executors.push({ key, enabled, result })
}
