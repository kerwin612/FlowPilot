/**
 * 工作流取消错误
 * 用于标识用户主动取消工作流执行（非系统错误）
 */
export class WorkflowCancelError extends Error {
  constructor(message = '工作流已取消') {
    super(message)
    this.name = 'WorkflowCancelError'
    this.isCancel = true
  }
}

/**
 * 检查是否为取消错误
 */
export function isCancelError(error) {
  return error?.isCancel === true || error?.name === 'WorkflowCancelError'
}
