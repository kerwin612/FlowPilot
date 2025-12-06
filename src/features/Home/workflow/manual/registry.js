import { isManual } from './base'

class ManualRegistry {
  constructor() {
    this.map = new Map()
  }

  register(def, options = {}) {
    if (!isManual(def)) {
      throw new Error('Invalid manual definition: missing required fields')
    }
    const { override = false } = options
    const existing = this.map.get(def.key)
    if (existing && !override) return
    this.map.set(def.key, def)
  }

  get(key) { return this.map.get(key) }
  all() { return Array.from(this.map.values()) }
  has(key) { return this.map.has(key) }
}

export const manualRegistry = new ManualRegistry()

