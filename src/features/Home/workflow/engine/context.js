export function createExecutionContext(workflow, trigger = {}, envs = {}, vars = {}) {
  return {
    workflow,
    trigger,
    envs,
    vars,
    timestamp: new Date(),
    executors: []
  }
}

export function pushExecutorResult(context, key, enabled, result) {
  context.executors.push({ key, enabled, result })
}
