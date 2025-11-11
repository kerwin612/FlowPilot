export function createExecutionContext(workflow, trigger = {}, env = {}) {
  return {
    workflow,
    trigger,
    env,
    timestamp: new Date(),
    values: {},
    executors: []
  }
}

export function pushExecutorResult(context, key, enabled, result) {
  context.executors.push({ key, enabled, result })
  if (result && typeof result === 'object' && result.value && typeof result.value === 'object') {
    Object.assign(context.values, result.value)
  }
}
