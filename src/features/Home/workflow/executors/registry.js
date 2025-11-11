import { isExecutor } from './base'

/**
 * 执行器注册表
 * 管理所有可用的执行器定义
 */
class ExecutorRegistry {
  constructor() {
    this.map = new Map()
  }

  /**
   * 注册执行器
   * @param {Object} def - 执行器定义对象（需符合 isExecutor 契约）
   * @param {Object} options - 注册选项
   * @param {boolean} options.override - 是否允许覆盖已存在的执行器（默认 false）
   * @throws {Error} 当定义无效或 key 冲突时抛出
   *
   * @example
   * // 注册新执行器
   * executorRegistry.register(MyExecutorDef)
   *
   * // 强制覆盖已存在的执行器
   * executorRegistry.register(MyExecutorDef, { override: true })
   */
  register(def, options = {}) {
    if (!isExecutor(def)) {
      throw new Error(`Invalid executor definition: missing required fields`)
    }

    const { override = false } = options
    const existing = this.map.get(def.key)

    if (existing && !override) {
      console.warn(
        `[ExecutorRegistry] 执行器 "${def.key}" 已存在，跳过注册。如需覆盖请传入 { override: true }`
      )
      return
    }

    if (existing && override) {
      console.warn(`[ExecutorRegistry] 执行器 "${def.key}" 已存在，强制覆盖`)
    }

    this.map.set(def.key, def)
  }

  /**
   * 获取执行器定义
   * @param {string} key - 执行器唯一标识
   * @returns {Object|undefined}
   */
  get(key) {
    return this.map.get(key)
  }

  /**
   * 获取所有已注册的执行器
   * @returns {Array}
   */
  all() {
    return Array.from(this.map.values())
  }

  /**
   * 检查执行器是否已注册
   * @param {string} key - 执行器唯一标识
   * @returns {boolean}
   */
  has(key) {
    return this.map.has(key)
  }
}

export const executorRegistry = new ExecutorRegistry()
