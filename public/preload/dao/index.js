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
    this.storage = storage
    this.logger = new Logger('DAO')
    
    this.config = new ConfigRepository(storage)
    this.workflows = new WorkflowRepository(storage)
    this.folders = new FolderRepository(storage)
    this.envVars = new EnvVarRepository(storage)
    this.globalVars = new GlobalVarRepository(storage)
    
    this.versionManager = new VersionManager(storage)
    this.migrationRunner = new MigrationRunner(storage, this.versionManager)
    
    registerAllMigrations(this.migrationRunner)
    
    this.logger.info('DAO initialized')
  }

  async initialize() {
    this.logger.info('Checking for migrations...')
    
    if (this.versionManager.needsMigration()) {
      await this.migrationRunner.runMigrations()
    }
    
    this.logger.info('DAO ready')
  }

  registerMigration(fromVersion, toVersion, executeFn) {
    this.migrationRunner.registerMigration(fromVersion, toVersion, executeFn)
  }
}

let daoInstance = null

function createDAO(storage = null) {
  if (!storage) {
    storage = new UToolsStorage()
  }
  
  daoInstance = new DAO(storage)
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
