import { isCondition } from './base'

class ConditionRegistry {
  constructor() {
    this.map = new Map()
  }

  register(def, options = {}) {
    if (!isCondition(def)) {
      throw new Error('Invalid condition definition: missing required fields')
    }
    const { override = false } = options
    const existing = this.map.get(def.key)
    if (existing && !override) {
      console.warn(
        `[ConditionRegistry] 条件插件 "${def.key}" 已存在，跳过注册。如需覆盖请传入 { override: true }`
      )
      return
    }
    if (existing && override) {
      console.warn(`[ConditionRegistry] 条件插件 "${def.key}" 已存在，强制覆盖`)
    }
    this.map.set(def.key, def)
  }

  get(key) {
    return this.map.get(key)
  }

  all() {
    return Array.from(this.map.values())
  }

  has(key) {
    return this.map.has(key)
  }
}

export const conditionRegistry = new ConditionRegistry()