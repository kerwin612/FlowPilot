import { isAction } from './base'

/**
 * 动作器注册表
 * 管理所有可用的动作器定义
 */
class ActionRegistry {
  constructor() {
    this.map = new Map()
  }

  /**
   * 注册动作器
   * @param {Object} def - 动作器定义对象（需符合 isAction 契约）
   * @param {Object} options - 注册选项
   * @param {boolean} options.override - 是否允许覆盖已存在的动作器（默认 false）
   * @throws {Error} 当定义无效或 key 冲突时抛出
   *
   * @example
   * // 注册新动作器
   * actionRegistry.register(MyActionDef)
   *
   * // 强制覆盖已存在的动作器
   * actionRegistry.register(MyActionDef, { override: true })
   */
  register(def, options = {}) {
    if (!isAction(def)) {
      throw new Error(`Invalid action definition: missing required fields`)
    }

    const { override = false } = options
    const existing = this.map.get(def.key)

    if (existing && !override) {
      console.warn(
        `[ActionRegistry] 动作器 "${def.key}" 已存在，跳过注册。如需覆盖请传入 { override: true }`
      )
      return
    }

    if (existing && override) {
      console.warn(`[ActionRegistry] 动作器 "${def.key}" 已存在，强制覆盖`)
    }

    this.map.set(def.key, def)
  }

  /**
   * 获取动作器定义
   * @param {string} key - 动作器唯一标识
   * @returns {Object|undefined}
   */
  get(key) {
    return this.map.get(key)
  }

  /**
   * 获取所有已注册的动作器
   * @returns {Array}
   */
  all() {
    return Array.from(this.map.values())
  }

  /**
   * 检查动作器是否已注册
   * @param {string} key - 动作器唯一标识
   * @returns {boolean}
   */
  has(key) {
    return this.map.has(key)
  }
}

export const actionRegistry = new ActionRegistry()
