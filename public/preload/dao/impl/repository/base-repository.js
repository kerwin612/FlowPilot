const { IRepository } = require('../../api/interfaces')
const { Logger, DAOError } = require('../../util/logger')

class BaseRepository extends IRepository {
  constructor(storage, keyPrefix, entityName) {
    super()
    this.storage = storage
    this.keyPrefix = keyPrefix
    this.entityName = entityName
    this.logger = new Logger(`${entityName}Repository`)
  }

  _getKey(id) {
    return `${this.keyPrefix}/${id}`
  }

  _getIndexKey() {
    const platform = this._getPlatform()
    return `${this.keyPrefix}_index_${platform}`
  }

  _getPlatform() {
    if (typeof process !== 'undefined' && process.platform) {
      return process.platform === 'win32' ? 'win32' : 
             process.platform === 'darwin' ? 'darwin' : 'linux'
    }
    return 'linux'
  }

  findById(id) {
    try {
      const key = this._getKey(id)
      const entity = this.storage.get(key)
      
      if (!entity) {
        throw DAOError.notFound(id, this.entityName)
      }
      
      this.logger.debug(`findById("${id}") found`)
      return entity
    } catch (error) {
      if (error instanceof DAOError) throw error
      throw DAOError.storageError(`Failed to find ${this.entityName}`, error)
    }
  }

  findAll() {
    try {
      const indexKey = this._getIndexKey()
      const index = this.storage.get(indexKey)
      
      if (!index || !Array.isArray(index.ids)) {
        this.logger.debug('findAll() no index found, returning []')
        return []
      }
      
      const entities = []
      for (const id of index.ids) {
        try {
          const entity = this.findById(id)
          entities.push(entity)
        } catch (error) {
          this.logger.warn(`findAll() skip missing entity: ${id}`)
        }
      }
      
      this.logger.debug(`findAll() loaded ${entities.length} entities`)
      return entities
    } catch (error) {
      throw DAOError.storageError(`Failed to load ${this.entityName} list`, error)
    }
  }

  save(entity) {
    try {
      if (!entity || !entity.id) {
        throw DAOError.validationError(`${this.entityName} must have an id`)
      }
      
      entity.updatedAt = Date.now()
      
      const key = this._getKey(entity.id)
      this.storage.set(key, entity)
      
      this._updateIndex(entity.id)
      
      this.logger.debug(`save("${entity.id}") success`)
      return entity
    } catch (error) {
      if (error instanceof DAOError) throw error
      throw DAOError.storageError(`Failed to save ${this.entityName}`, error)
    }
  }

  delete(id) {
    try {
      const key = this._getKey(id)
      
      if (!this.storage.has(key)) {
        throw DAOError.notFound(id, this.entityName)
      }
      
      this.storage.remove(key)
      this._removeFromIndex(id)
      
      this.logger.debug(`delete("${id}") success`)
    } catch (error) {
      if (error instanceof DAOError) throw error
      throw DAOError.storageError(`Failed to delete ${this.entityName}`, error)
    }
  }

  exists(id) {
    const key = this._getKey(id)
    return this.storage.has(key)
  }

  count() {
    const indexKey = this._getIndexKey()
    const index = this.storage.get(indexKey)
    return index && Array.isArray(index.ids) ? index.ids.length : 0
  }

  _updateIndex(id) {
    const indexKey = this._getIndexKey()
    let index = this.storage.get(indexKey)
    
    if (!index) {
      index = { ids: [] }
    }
    
    if (!Array.isArray(index.ids)) {
      index.ids = []
    }
    
    if (!index.ids.includes(id)) {
      index.ids.push(id)
    }
    
    this.storage.set(indexKey, index)
  }

  _removeFromIndex(id) {
    const indexKey = this._getIndexKey()
    const index = this.storage.get(indexKey)
    
    if (index && Array.isArray(index.ids)) {
      index.ids = index.ids.filter(existingId => existingId !== id)
      this.storage.set(indexKey, index)
    }
  }
}

module.exports = { BaseRepository }
