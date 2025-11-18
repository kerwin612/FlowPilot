const { UToolsStorage } = require('./impl/storage/storage-utools')
const { ConfigRepository } = require('./impl/repository/config-repository')
const {
  WorkflowRepository,
  FolderRepository,
  EnvVarRepository,
  GlobalVarRepository
} = require('./impl/repository/repositories')
const { VersionManager, MigrationRunner } = require('./util/version')
const { Logger } = require('./util/logger')
const { registerAllMigrations } = require('./migrations')

class DAO {
  constructor(storage) {
    this.logger = new Logger('DAO')

    this.rootStorage = storage || new UToolsStorage()
    this.rootStorage.setScope(null)

    this.scopedStorage = new UToolsStorage()
    this.activeProfileId = null

    this._bindRepositories()

    this.versionManager = new VersionManager(this.scopedStorage)
    this.migrationRunner = new MigrationRunner(this.scopedStorage, this.versionManager)
    registerAllMigrations(this.migrationRunner)

    this.logger.info('DAO initialized')
  }

  _bindRepositories() {
    this.config = new ConfigRepository(this.scopedStorage)
    this.workflows = new WorkflowRepository(this.scopedStorage)
    this.folders = new FolderRepository(this.scopedStorage)
    this.envVars = new EnvVarRepository(this.scopedStorage)
    this.globalVars = new GlobalVarRepository(this.scopedStorage)
  }

  async initialize() {
    this.logger.info('Checking for migrations...')
    if (this.versionManager.needsMigration()) {
      await this.migrationRunner.runMigrations()
    }
    this.logger.info('DAO ready')
  }

  setProfileScope(profileId) {
    this.activeProfileId = profileId || null
    this.scopedStorage.setScope(this.activeProfileId)
    this._bindRepositories()
    this.versionManager = new VersionManager(this.scopedStorage)
    this.migrationRunner = new MigrationRunner(this.scopedStorage, this.versionManager)
  }

  getProfiles() {
    const data = this.rootStorage.get('profiles')
    return data && Array.isArray(data.profiles) ? data : { profiles: [], updatedAt: Date.now() }
  }

  saveProfiles(profileList) {
    const payload = { profiles: profileList || [], updatedAt: Date.now() }
    this.rootStorage.set('profiles', payload)
    return payload
  }

  getDeviceProfileMap() {
    return this.rootStorage.get('profile_device_map') || {}
  }

  setDeviceProfile(deviceId, profileId) {
    const map = this.getDeviceProfileMap()
    map[deviceId] = profileId
    this.rootStorage.set('profile_device_map', map)
    this.setProfileScope(profileId)
    return profileId
  }

  deleteProfile(profileId) {
    try {
      const meta = this.getProfiles()
      meta.profiles = meta.profiles.filter(p => p.id !== profileId)
      this.rootStorage.set('profiles', meta)

      const map = this.getDeviceProfileMap()
      Object.keys(map).forEach(did => { if (map[did] === profileId) delete map[did] })
      this.rootStorage.set('profile_device_map', map)

      const prev = this.activeProfileId
      this.setProfileScope(profileId)
      const platform = (process && process.platform === 'win32') ? 'win32' : (process && process.platform === 'darwin') ? 'darwin' : 'linux'

      // 尝试基于原始存储递归清理工作流/文件夹（即使索引损坏也能删除）
      const cfgRaw = this.scopedStorage.get(`config_${platform}`)
      const removeWorkflowKey = (id) => { try { this.scopedStorage.remove(`workflow/${id}`) } catch {} }
      const removeFolderTree = (id) => {
        try {
          const folder = this.scopedStorage.get(`folder/${id}`)
          if (folder && Array.isArray(folder.items)) {
            for (const childId of folder.items) {
              // 递归尝试当作文件夹，失败则当作工作流
              const childFolder = this.scopedStorage.get(`folder/${childId}`)
              if (childFolder) {
                removeFolderTree(childId)
              } else {
                removeWorkflowKey(childId)
              }
            }
          }
        } catch {}
        try { this.scopedStorage.remove(`folder/${id}`) } catch {}
      }

      try {
        const tabs = Array.isArray(cfgRaw?.tabs) ? cfgRaw.tabs : []
        for (const tab of tabs) {
          const items = Array.isArray(tab.items) ? tab.items : []
          for (const itemId of items) {
            const f = this.scopedStorage.get(`folder/${itemId}`)
            if (f) removeFolderTree(itemId)
            else removeWorkflowKey(itemId)
          }
        }
      } catch {}

      try { this.config.delete() } catch {}
      try { (this.envVars.findAll() || []).forEach(e => this.envVars.delete(e.id)) } catch {}
      try { (this.globalVars.findAll() || []).forEach(g => this.globalVars.delete(g.id)) } catch {}
      try { (this.workflows.findAll() || []).forEach(w => this.workflows.delete(w.id)) } catch {}
      try { (this.folders.findAll() || []).forEach(f => this.folders.deleteWithChildren(f.id)) } catch {}
      try {
        this.scopedStorage.remove(`workflow_index_${platform}`)
        this.scopedStorage.remove(`folder_index_${platform}`)
        this.scopedStorage.remove(`envvar_index_${platform}`)
        this.scopedStorage.remove(`globalvar_index_${platform}`)
        this.scopedStorage.remove(`config_${platform}`)
      } catch {}
      this.setProfileScope(prev)
      return true
    } catch (err) {
      this.logger.error('deleteProfile failed:', err)
      return false
    }
  }

  migrateRootToCurrentScope() {
    const rootConfigRepo = new ConfigRepository(this.rootStorage)
    const rootEnvRepo = new EnvVarRepository(this.rootStorage)
    const rootGlobalRepo = new GlobalVarRepository(this.rootStorage)
    const rootWorkflowRepo = new WorkflowRepository(this.rootStorage)
    const rootFolderRepo = new FolderRepository(this.rootStorage)

    try {
      const cfg = rootConfigRepo.load()
      if (cfg && (cfg.tabs || []).length) {
        this.config.save(cfg)
      }
    } catch {}
    try { (rootEnvRepo.findAll() || []).forEach(e => this.envVars.save(e)) } catch {}
    try { (rootGlobalRepo.findAll() || []).forEach(g => this.globalVars.save(g)) } catch {}
    try { (rootWorkflowRepo.findAll() || []).forEach(w => this.workflows.save(w)) } catch {}
    try { (rootFolderRepo.findAll() || []).forEach(f => this.folders.saveWithChildren(f)) } catch {}
  }

  cloneCurrentScopeToProfile(targetProfileId) {
    try {
      const sourceCfg = (() => { try { return this.config.load() } catch { return null } })()
      const sourceEnv = (() => { try { return this.envVars.findAll() } catch { return [] } })()
      const sourceG = (() => { try { return this.globalVars.findAll() } catch { return [] } })()
      const sourceW = (() => { try { return this.workflows.findAll() } catch { return [] } })()
      const sourceF = (() => { try { return this.folders.findAll() } catch { return [] } })()

      const prev = this.activeProfileId
      this.setProfileScope(targetProfileId)
      try { if (sourceCfg) this.config.save(sourceCfg) } catch {}
      try { sourceEnv.forEach(e => this.envVars.save(e)) } catch {}
      try { sourceG.forEach(g => this.globalVars.save(g)) } catch {}
      try { sourceW.forEach(w => this.workflows.save(w)) } catch {}
      try { sourceF.forEach(f => this.folders.saveWithChildren(f)) } catch {}
      this.setProfileScope(prev)
      return true
    } catch (err) {
      this.logger.error('cloneCurrentScopeToProfile failed:', err)
      return false
    }
  }
}

let daoInstance = null

function createDAO(storage = null) {
  daoInstance = new DAO(storage || null)
  return daoInstance
}

function getDAO() {
  if (!daoInstance) {
    daoInstance = createDAO()
  }
  return daoInstance
}

module.exports = {
  DAO,
  createDAO,
  getDAO
}
