const { BaseRepository } = require('./base-repository')
const { DAOError } = require('../../util/logger')

class WorkflowRepository extends BaseRepository {
  constructor(storage) {
    super(storage, 'workflow', 'Workflow')
  }
}

class FolderRepository extends BaseRepository {
  constructor(storage) {
    super(storage, 'folder', 'Folder')
  }

  findByIdWithChildren(id) {
    const folder = this.findById(id)
    
    if (folder.items && Array.isArray(folder.items)) {
      folder.items = folder.items.map(item => {
        const itemId = typeof item === 'string' ? item : (item?.id || item)
        
        if (typeof itemId !== 'string') {
          this.logger.warn(`Invalid item in folder.items:`, item)
          return null
        }
        
        try {
          const folderRepo = new FolderRepository(this.storage)
          try {
            return folderRepo.findById(itemId)
          } catch (error) {
            const workflowRepo = new WorkflowRepository(this.storage)
            return workflowRepo.findById(itemId)
          }
        } catch (error) {
          this.logger.warn(`Child item "${itemId}" not found`)
          return null
        }
      }).filter(item => item !== null)
    }
    
    return folder
  }

  saveWithChildren(folder) {
    if (folder.items && Array.isArray(folder.items)) {
      const itemIds = []
      
      for (const item of folder.items) {
        if (typeof item === 'string') {
          itemIds.push(item)
        } else if (item && item.id) {
          if (item.type === 'folder') {
            const folderRepo = new FolderRepository(this.storage)
            folderRepo.save(item)
          } else if (item.type === 'workflow') {
            const workflowRepo = new WorkflowRepository(this.storage)
            workflowRepo.save(item)
          }
          itemIds.push(item.id)
        }
      }
      
      folder.items = itemIds
    }
    
    return this.save(folder)
  }

  deleteWithChildren(id) {
    const folder = this.findById(id)
    
    if (folder.items && Array.isArray(folder.items)) {
      for (const itemId of folder.items) {
        try {
          const folderRepo = new FolderRepository(this.storage)
          if (folderRepo.exists(itemId)) {
            folderRepo.deleteWithChildren(itemId)
            continue
          }
        } catch (error) {
          this.logger.debug(`Item "${itemId}" is not a folder`)
        }
        
        try {
          const workflowRepo = new WorkflowRepository(this.storage)
          if (workflowRepo.exists(itemId)) {
            workflowRepo.delete(itemId)
          }
        } catch (error) {
          this.logger.warn(`Failed to delete child item "${itemId}"`)
        }
      }
    }
    
    this.delete(id)
  }
}

class EnvVarRepository extends BaseRepository {
  constructor(storage) {
    super(storage, 'envvar', 'EnvVar')
  }
}

class GlobalVarRepository extends BaseRepository {
  constructor(storage) {
    super(storage, 'globalvar', 'GlobalVar')
  }

  findByTags(tags) {
    const allVars = this.findAll()
    
    if (!tags || tags.length === 0) {
      return allVars
    }
    
    return allVars.filter(gvar => {
      if (!gvar.tags || !Array.isArray(gvar.tags)) {
        return false
      }
      return tags.every(tag => gvar.tags.includes(tag))
    })
  }

  findByKey(key) {
    const allVars = this.findAll()
    return allVars.filter(gvar => gvar.key === key)
  }
}

module.exports = {
  WorkflowRepository,
  FolderRepository,
  EnvVarRepository,
  GlobalVarRepository
}
