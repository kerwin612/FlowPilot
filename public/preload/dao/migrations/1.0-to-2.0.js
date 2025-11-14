const { Logger } = require('../util/logger')

const logger = new Logger('Migration_1.0_to_2.0')

function migrate(storage) {
  logger.info('开始迁移: 1.0 -> 2.0')
  
  const platform = getPlatform(storage)
  const oldKey = `workflows_${platform}`
  
  const oldConfig = storage.get(oldKey)
  
  if (!oldConfig) {
    logger.info('没有找到旧配置，跳过迁移')
    return
  }
  
  logger.info('旧配置结构:', {
    version: oldConfig.version,
    platform: oldConfig.platform,
    tabsCount: oldConfig.tabs?.length,
    envVarsCount: oldConfig.envVars?.length,
    globalVarsCount: oldConfig.globalVars?.length
  })
  
  if (needsMigration(oldConfig)) {
    logger.info('检测到旧格式（完整对象存储），执行迁移...')
    
    migrateEnvVars(storage, platform, oldConfig.envVars || [])
    
    migrateGlobalVars(storage, platform, oldConfig.globalVars || [])
    
    const newConfig = {
      version: '2.0.0',
      platform: platform,
      tabs: []
    }
    
    if (oldConfig.tabs && Array.isArray(oldConfig.tabs)) {
      for (const tab of oldConfig.tabs) {
        const itemIds = migrateTabItems(storage, tab.items || [])
        newConfig.tabs.push({
          id: tab.id,
          name: tab.name,
          items: itemIds
        })
      }
    }
    
    storage.set(`config_${platform}`, newConfig)
    
    logger.info('迁移完成，新配置:', {
      version: newConfig.version,
      tabsCount: newConfig.tabs.length
    })
  } else {
    logger.info('已经是新格式，无需迁移')
  }
}

function getPlatform(storage) {
  if (typeof process !== 'undefined' && process.platform) {
    return process.platform === 'win32' ? 'win32' : 
           process.platform === 'darwin' ? 'darwin' : 'linux'
  }
  return 'linux'
}

function needsMigration(config) {
  if (!config.tabs || !Array.isArray(config.tabs) || config.tabs.length === 0) {
    return false
  }
  
  const firstTab = config.tabs[0]
  if (!firstTab.items || !Array.isArray(firstTab.items) || firstTab.items.length === 0) {
    return false
  }
  
  const firstItem = firstTab.items[0]
  return typeof firstItem === 'object' && firstItem !== null && firstItem.type
}

function migrateEnvVars(storage, platform, envVars) {
  if (!Array.isArray(envVars) || envVars.length === 0) {
    logger.info('没有环境变量需要迁移')
    return
  }
  
  logger.info(`迁移 ${envVars.length} 个环境变量`)
  
  const envVarIds = []
  for (const envVar of envVars) {
    if (!envVar.id) {
      logger.warn('环境变量缺少id，跳过:', envVar)
      continue
    }
    
    const normalized = {
      id: envVar.id,
      name: envVar.name || '',
      value: envVar.value || '',
      enabled: envVar.enabled !== false,
      description: envVar.description || '',
      createdAt: envVar.createdAt || Date.now(),
      updatedAt: Date.now()
    }
    
    storage.set(`envvar/${envVar.id}`, normalized)
    envVarIds.push(envVar.id)
  }
  
  storage.set(`envvar_index_${platform}`, { ids: envVarIds })
  logger.info(`环境变量迁移完成: ${envVarIds.length} 个`)
}

function migrateGlobalVars(storage, platform, globalVars) {
  if (!Array.isArray(globalVars) || globalVars.length === 0) {
    logger.info('没有全局变量需要迁移')
    return
  }
  
  logger.info(`迁移 ${globalVars.length} 个全局变量`)
  
  const globalVarIds = []
  for (const gvar of globalVars) {
    if (!gvar.id) {
      logger.warn('全局变量缺少id，跳过:', gvar)
      continue
    }
    
    const normalized = {
      id: gvar.id,
      key: gvar.key || '',
      value: gvar.value || '',
      name: gvar.name || '',
      tags: Array.isArray(gvar.tags) ? gvar.tags : [],
      description: gvar.description || '',
      createdAt: gvar.createdAt || Date.now(),
      updatedAt: Date.now()
    }
    
    storage.set(`globalvar/${gvar.id}`, normalized)
    globalVarIds.push(gvar.id)
  }
  
  storage.set(`globalvar_index_${platform}`, { ids: globalVarIds })
  logger.info(`全局变量迁移完成: ${globalVarIds.length} 个`)
}

function migrateTabItems(storage, items) {
  if (!Array.isArray(items)) {
    return []
  }
  
  const itemIds = []
  
  for (const item of items) {
    if (!item || !item.id || !item.type) {
      logger.warn('无效的item，跳过:', item)
      continue
    }
    
    if (item.type === 'workflow') {
      migrateWorkflow(storage, item)
      itemIds.push(item.id)
    } else if (item.type === 'folder') {
      migrateFolder(storage, item)
      itemIds.push(item.id)
    }
  }
  
  return itemIds
}

function migrateWorkflow(storage, workflow) {
  const normalized = {
    id: workflow.id,
    type: 'workflow',
    name: workflow.name || '',
    mode: workflow.mode || 'composed',
    icon: workflow.icon || null,
    createdAt: workflow.createdAt || Date.now(),
    updatedAt: Date.now()
  }
  
  if (workflow.mode === 'command') {
    normalized.cmds = Array.isArray(workflow.cmds) ? workflow.cmds.map(cmd => ({
      match: cmd.match || '',
      command: cmd.command || '',
      timeout: cmd.timeout || 0,
      runInBackground: cmd.runInBackground || false,
      showWindow: cmd.showWindow !== false,
      env: cmd.env || {}
    })) : []
  } else {
    normalized.cmds = []
    normalized.executors = Array.isArray(workflow.executors) ? workflow.executors.map(executor => ({
      key: executor.key || '',
      config: executor.config || {}
    })) : []
    normalized.actions = Array.isArray(workflow.actions) ? workflow.actions.map(action => ({
      key: action.key || '',
      config: action.config || {}
    })) : []
  }
  
  storage.set(`workflow/${workflow.id}`, normalized)
  logger.debug(`迁移工作流: ${workflow.id} - ${workflow.name}`)
}

function migrateFolder(storage, folder) {
  const childIds = migrateTabItems(storage, folder.items || [])
  
  const normalized = {
    id: folder.id,
    type: 'folder',
    name: folder.name || '',
    icon: folder.icon || null,
    items: childIds,
    createdAt: folder.createdAt || Date.now(),
    updatedAt: Date.now()
  }
  
  storage.set(`folder/${folder.id}`, normalized)
  logger.debug(`迁移文件夹: ${folder.id} - ${folder.name} (${childIds.length} items)`)
}

module.exports = {
  version: '1.0->2.0',
  fromVersion: '1.0',
  toVersion: '2.0',
  migrate
}
