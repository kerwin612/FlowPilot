const { Logger, DAOError } = require('../../util/logger')
const { Config, Tab } = require('../../model/models')
const { WorkflowRepository, FolderRepository } = require('./repositories')

class ConfigRepository {
  constructor(storage) {
    this.storage = storage
    this.logger = new Logger('ConfigRepository')
    this.workflowRepo = new WorkflowRepository(storage)
    this.folderRepo = new FolderRepository(storage)
  }

  _getKey() {
    const platform = this._getPlatform()
    return `config_${platform}`
  }

  _getPlatform() {
    if (typeof process !== 'undefined' && process.platform) {
      return process.platform === 'win32' ? 'win32' : 
             process.platform === 'darwin' ? 'darwin' : 'linux'
    }
    return 'linux'
  }

  load() {
    try {
      const key = this._getKey()
      let config = this.storage.get(key)
      
      if (!config) {
        this.logger.info('No config found, creating new one')
        config = new Config()
        config.platform = this._getPlatform()
        return config
      }
      
      if (config.tabs && Array.isArray(config.tabs)) {
        config.tabs = config.tabs.map(tab => {
          if (tab.items && Array.isArray(tab.items)) {
            tab.items = tab.items.map(itemId => {
              try {
                if (this.folderRepo.exists(itemId)) {
                  return this.folderRepo.findByIdWithChildren(itemId)
                }
                if (this.workflowRepo.exists(itemId)) {
                  return this.workflowRepo.findById(itemId)
                }
                this.logger.warn(`Item "${itemId}" not found`)
                return null
              } catch (error) {
                this.logger.warn(`Failed to load item "${itemId}":`, error.message)
                return null
              }
            }).filter(item => item !== null)
          }
          return tab
        })
      }
      
      this.logger.debug('Config loaded successfully')
      return config
    } catch (error) {
      throw DAOError.storageError('Failed to load config', error)
    }
  }

  save(config) {
    try {
      if (!config) {
        throw DAOError.validationError('Config cannot be null')
      }
      
      config.platform = this._getPlatform()
      
      const configToSave = {
        version: config.version,
        platform: config.platform,
        tabs: []
      }
      
      if (config.tabs && Array.isArray(config.tabs)) {
        for (const tab of config.tabs) {
          const itemIds = []
          
          if (tab.items && Array.isArray(tab.items)) {
            for (const item of tab.items) {
              if (typeof item === 'string') {
                itemIds.push(item)
              } else if (item && item.id) {
                if (item.type === 'folder') {
                  this.folderRepo.saveWithChildren(item)
                } else if (item.type === 'workflow') {
                  this.workflowRepo.save(item)
                }
                itemIds.push(item.id)
              }
            }
          }
          
          configToSave.tabs.push({
            id: tab.id,
            name: tab.name,
            items: itemIds
          })
        }
      }
      
      const key = this._getKey()
      this.storage.set(key, configToSave)
      
      this.logger.debug('Config saved successfully')
      return config
    } catch (error) {
      if (error instanceof DAOError) throw error
      throw DAOError.storageError('Failed to save config', error)
    }
  }

  delete() {
    try {
      const key = this._getKey()
      this.storage.remove(key)
      this.logger.debug('Config deleted')
    } catch (error) {
      throw DAOError.storageError('Failed to delete config', error)
    }
  }
}

module.exports = { ConfigRepository }
