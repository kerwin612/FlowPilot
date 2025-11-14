const { Logger, DAOError } = require('./logger')
const { CURRENT_VERSION, Version } = require('../model/models')

class VersionManager {
  constructor(storage) {
    this.storage = storage
    this.logger = new Logger('VersionManager')
  }

  _getKey() {
    return 'version'
  }

  getCurrentVersion() {
    try {
      const key = this._getKey()
      const versionData = this.storage.get(key)
      
      if (!versionData) {
        this.logger.info('No version found, checking for legacy data')
        
        const platform = this._getPlatform()
        const legacyKey = `workflows_${platform}`
        const legacyConfig = this.storage.get(legacyKey)
        
        if (legacyConfig) {
          this.logger.info('Found legacy 1.0 data')
          return '1.0'
        }
        
        this.logger.info('No data found, initializing as 2.0.0')
        const version = new Version(CURRENT_VERSION)
        this.storage.set(key, version)
        return CURRENT_VERSION
      }
      
      return versionData.version || CURRENT_VERSION
    } catch (error) {
      this.logger.error('Failed to get current version:', error)
      return CURRENT_VERSION
    }
  }

  _getPlatform() {
    if (typeof process !== 'undefined' && process.platform) {
      return process.platform === 'win32' ? 'win32' : 
             process.platform === 'darwin' ? 'darwin' : 'linux'
    }
    return 'linux'
  }

  setVersion(version) {
    try {
      const key = this._getKey()
      const versionData = new Version(version)
      this.storage.set(key, versionData)
      this.logger.info(`Version updated to ${version}`)
    } catch (error) {
      throw DAOError.storageError('Failed to set version', error)
    }
  }

  needsMigration() {
    const currentVersion = this.getCurrentVersion()
    const targetVersion = CURRENT_VERSION
    
    if (currentVersion === targetVersion) {
      return false
    }
    
    this.logger.info(`Migration needed: ${currentVersion} -> ${targetVersion}`)
    return true
  }
}

class Migration {
  constructor(fromVersion, toVersion, execute) {
    this.fromVersion = fromVersion
    this.toVersion = toVersion
    this.execute = execute
  }
}

class MigrationRunner {
  constructor(storage, versionManager) {
    this.storage = storage
    this.versionManager = versionManager
    this.logger = new Logger('MigrationRunner')
    this.migrations = []
  }

  registerMigration(fromVersion, toVersion, executeFn) {
    const migration = new Migration(fromVersion, toVersion, executeFn)
    this.migrations.push(migration)
    this.logger.debug(`Registered migration: ${fromVersion} -> ${toVersion}`)
  }

  async runMigrations() {
    const currentVersion = this.versionManager.getCurrentVersion()
    const targetVersion = CURRENT_VERSION
    
    if (currentVersion === targetVersion) {
      this.logger.info('No migrations needed')
      return
    }
    
    this.logger.info(`Starting migrations: ${currentVersion} -> ${targetVersion}`)
    
    const applicableMigrations = this.migrations.filter(migration => {
      return this._shouldApplyMigration(migration, currentVersion, targetVersion)
    })
    
    if (applicableMigrations.length === 0) {
      this.logger.warn('No applicable migrations found')
      this.versionManager.setVersion(targetVersion)
      return
    }
    
    applicableMigrations.sort((a, b) => {
      return this._compareVersions(a.fromVersion, b.fromVersion)
    })
    
    for (const migration of applicableMigrations) {
      try {
        this.logger.info(`Running migration: ${migration.fromVersion} -> ${migration.toVersion}`)
        await migration.execute(this.storage)
        this.logger.info(`Migration completed: ${migration.fromVersion} -> ${migration.toVersion}`)
      } catch (error) {
        this.logger.error(`Migration failed: ${migration.fromVersion} -> ${migration.toVersion}`, error)
        throw DAOError.migrationError(
          `Migration from ${migration.fromVersion} to ${migration.toVersion} failed`,
          error
        )
      }
    }
    
    this.versionManager.setVersion(targetVersion)
    this.logger.info(`All migrations completed. Version is now ${targetVersion}`)
  }

  _shouldApplyMigration(migration, currentVersion, targetVersion) {
    return this._compareVersions(migration.fromVersion, currentVersion) >= 0 &&
           this._compareVersions(migration.toVersion, targetVersion) <= 0
  }

  _compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number)
    const parts2 = v2.split('.').map(Number)
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0
      const p2 = parts2[i] || 0
      
      if (p1 > p2) return 1
      if (p1 < p2) return -1
    }
    
    return 0
  }
}

module.exports = {
  VersionManager,
  MigrationRunner,
  Migration
}
