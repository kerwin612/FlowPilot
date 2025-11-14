const { IStorage } = require('../../api/interfaces')
const { Logger } = require('../../util/logger')

class UToolsStorage extends IStorage {
  constructor() {
    super()
    this.logger = new Logger('UToolsStorage')
    this.prefix = 'settings_'
  }

  _getFullKey(key) {
    return `${this.prefix}${key}`
  }

  get(key) {
    try {
      const fullKey = this._getFullKey(key)
      const value = window.utools.dbStorage.getItem(fullKey)
      this.logger.debug(`get("${key}")`, value ? 'found' : 'null')
      return value
    } catch (error) {
      this.logger.error(`get("${key}") failed:`, error)
      throw error
    }
  }

  set(key, value) {
    try {
      const fullKey = this._getFullKey(key)
      window.utools.dbStorage.setItem(fullKey, value)
      this.logger.debug(`set("${key}")`)
    } catch (error) {
      this.logger.error(`set("${key}") failed:`, error)
      throw error
    }
  }

  remove(key) {
    try {
      const fullKey = this._getFullKey(key)
      window.utools.dbStorage.removeItem(fullKey)
      this.logger.debug(`remove("${key}")`)
    } catch (error) {
      this.logger.error(`remove("${key}") failed:`, error)
      throw error
    }
  }

  has(key) {
    try {
      const fullKey = this._getFullKey(key)
      const value = window.utools.dbStorage.getItem(fullKey)
      return value !== null && value !== undefined
    } catch (error) {
      this.logger.error(`has("${key}") failed:`, error)
      return false
    }
  }

  keys(prefix = '') {
    this.logger.warn('keys() not fully supported by uTools dbStorage')
    return []
  }

  clear(prefix = '') {
    this.logger.warn('clear() not supported by uTools dbStorage')
  }
}

module.exports = { UToolsStorage }
