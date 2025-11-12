const storageCore = require('../../core/storage.js')
const getPlatform = require('../platform.js')

function getConfigKey() {
  const platform = getPlatform()
  return `workflows_${platform}`
}

function getEnvVarsKey() {
  const platform = getPlatform()
  return `envvars_${platform}`
}

function getWorkflowKey(workflowId) {
  return `workflow/${workflowId}`
}

function getFolderKey(folderId) {
  return `folder/${folderId}`
}

// ==================== 环境变量存储 ====================

function getEnvVars() {
  const key = getEnvVarsKey()
  const data = storageCore.settings.get(key)
  console.log(`[Storage] getEnvVars from key "${key}":`, data)
  return data
}

function setEnvVars(envVars) {
  const key = getEnvVarsKey()
  const data = { envVars }
  console.log(`[Storage] setEnvVars to key "${key}":`, data)
  storageCore.settings.set(key, data)
}

function removeEnvVars() {
  storageCore.settings.remove(getEnvVarsKey())
}

// ==================== 工作流/文件夹存储 ====================

function getWorkflow(workflowId) {
  return storageCore.settings.get(getWorkflowKey(workflowId))
}

function setWorkflow(workflow) {
  if (!workflow || !workflow.id) {
    throw new Error('workflow 必须包含 id')
  }
  storageCore.settings.set(getWorkflowKey(workflow.id), workflow)
}

function removeWorkflow(workflowId) {
  storageCore.settings.remove(getWorkflowKey(workflowId))
}

function getFolder(folderId) {
  return storageCore.settings.get(getFolderKey(folderId))
}

function setFolder(folder) {
  if (!folder || !folder.id) {
    throw new Error('folder 必须包含 id')
  }
  storageCore.settings.set(getFolderKey(folder.id), folder)
}

function removeFolder(folderId) {
  storageCore.settings.remove(getFolderKey(folderId))
}

// ==================== 主配置存储（仅保存结构） ====================

function get() {
  return storageCore.settings.get(getConfigKey())
}

function set(config) {
  config.platform = getPlatform()
  storageCore.settings.set(getConfigKey(), config)
}

function remove() {
  storageCore.settings.remove(getConfigKey())
}

// ==================== 完整配置的组装和拆分 ====================

/**
 * 加载完整配置（自动组装）
 * 从主配置读取结构，然后递归加载所有 workflow 和 folder
 */
function loadFullConfig() {
  const oldKey = getConfigKey()
  const storedConfig = storageCore.settings.get(oldKey)
  
  // 检查是否需要迁移（判断依据：tabs[0].items[0] 是对象而非 ID 字符串）
  const needsMigration = storedConfig?.tabs?.some(tab => 
    tab.items?.length > 0 && 
    typeof tab.items[0] === 'object' && 
    tab.items[0].type
  )
  
  if (needsMigration) {
    // 旧格式：items 是完整对象数组，需要拆分保存
    console.log('[Storage] 检测到旧格式配置，执行迁移...')
    console.log('[Storage] 旧配置内容:', {
      hasEnvVars: !!storedConfig.envVars,
      envVarsCount: storedConfig.envVars?.length || 0,
      envVarsData: storedConfig.envVars,
      firstTab: storedConfig.tabs[0]?.name,
      firstItemType: storedConfig.tabs[0]?.items[0]?.type
    })
    
    // 执行迁移：将完整对象拆分到独立存储
    saveFullConfig(storedConfig)
    console.log('[Storage] 旧格式配置迁移完成')
  }
  
  // 读取主配置（结构信息）
  const mainConfig = get()
  if (!mainConfig) {
    console.warn('[Storage] 主配置不存在')
    return null
  }

  console.log('[Storage] loadFullConfig 开始', {
    version: mainConfig.version,
    platform: mainConfig.platform,
    tabsCount: mainConfig.tabs?.length
  })

  // 加载环境变量
  const envVarsData = getEnvVars()
  mainConfig.envVars = envVarsData?.envVars || []
  console.log('[Storage] 环境变量已加载', mainConfig.envVars.length, '个')

  // 递归加载 tabs 中的 items
  if (mainConfig.tabs && Array.isArray(mainConfig.tabs)) {
    mainConfig.tabs = mainConfig.tabs.map(tab => {
      const items = loadItems(tab.items || [])
      console.log(`[Storage] Tab "${tab.name}" 加载了 ${items.length} 个 items (原始 ${tab.items?.length || 0} 个 ID)`)
      return {
        ...tab,
        items
      }
    })
  }

  console.log('[Storage] loadFullConfig 完成')
  return mainConfig
}

/**
 * 递归加载 items（可能包含 workflow 或 folder）
 */
function loadItems(itemIds) {
  if (!Array.isArray(itemIds)) {
    console.warn('[Storage] loadItems: itemIds 不是数组', itemIds)
    return []
  }

  const results = []
  for (const itemId of itemIds) {
    // itemId 应该是字符串 ID，如果是对象说明是旧格式（已在迁移时处理）
    if (typeof itemId === 'object') {
      console.warn('[Storage] loadItems: 遇到完整对象（应该已迁移）', itemId.id)
      // 防御性处理：直接返回对象（不应该发生）
      if (itemId.type === 'folder' && itemId.items) {
        itemId.items = loadItems(itemId.items)
      }
      results.push(itemId)
      continue
    }
    
    // 尝试作为 workflow 加载
    let item = getWorkflow(itemId)
    if (item) {
      results.push(item)
      continue
    }

    // 尝试作为 folder 加载
    item = getFolder(itemId)
    if (item) {
      // 递归加载 folder 内的 items
      if (item.items && Array.isArray(item.items)) {
        item.items = loadItems(item.items)
      }
      results.push(item)
      continue
    }

    console.warn('[Storage] loadItems: 找不到 item', itemId)
  }

  return results
}

/**
 * 保存完整配置（自动拆分）
 * 将完整配置拆分存储到各个独立的 key
 */
function saveFullConfig(config) {
  if (!config) {
    throw new Error('config 不能为空')
  }

  console.log('[Storage] saveFullConfig 开始', {
    version: config.version,
    platform: config.platform,
    tabsCount: config.tabs?.length,
    envVarsCount: config.envVars?.length
  })

  // 1. 保存环境变量
  if (config.envVars) {
    setEnvVars(config.envVars)
    console.log('[Storage] 环境变量已保存', config.envVars.length)
  }

  // 2. 递归保存所有 workflow 和 folder，收集 ID
  const tabs = []
  if (config.tabs && Array.isArray(config.tabs)) {
    for (const tab of config.tabs) {
      const itemIds = saveItems(tab.items || [])
      tabs.push({
        id: tab.id,
        name: tab.name,
        items: itemIds
      })
      console.log(`[Storage] Tab "${tab.name}" 保存了 ${itemIds.length} 个 items`)
    }
  }

  // 3. 保存主配置（只保存结构，不保存具体内容）
  const mainConfig = {
    version: config.version,
    platform: config.platform || getPlatform(),
    tabs: tabs
  }
  set(mainConfig)
  console.log('[Storage] 主配置已保存', mainConfig)
}

/**
 * 递归保存 items，返回 ID 数组
 */
function saveItems(items) {
  if (!Array.isArray(items)) {
    console.warn('[Storage] saveItems: items 不是数组', items)
    return []
  }

  const ids = []
  for (const item of items) {
    if (!item || !item.id) {
      console.warn('[Storage] saveItems: item 无效或缺少 id', item)
      continue
    }

    if (item.type === 'workflow') {
      setWorkflow(item)
      ids.push(item.id)
    } else if (item.type === 'folder') {
      // 递归保存 folder 内的 items
      const childIds = saveItems(item.items || [])
      const folderData = {
        ...item,
        items: childIds
      }
      setFolder(folderData)
      ids.push(item.id)
    } else {
      console.warn(`[Storage] saveItems: 未知类型 "${item.type}"`, item.id)
    }
  }

  return ids
}

/**
 * 删除完整配置（包括所有关联的 workflow 和 folder）
 */
function removeFullConfig() {
  const mainConfig = get()
  if (!mainConfig) {
    return
  }

  // 1. 删除所有 workflow 和 folder
  if (mainConfig.tabs && Array.isArray(mainConfig.tabs)) {
    for (const tab of mainConfig.tabs) {
      removeItems(tab.items || [])
    }
  }

  // 2. 删除环境变量
  removeEnvVars()

  // 3. 删除主配置
  remove()
}

/**
 * 递归删除 items
 */
function removeItems(itemIds) {
  if (!Array.isArray(itemIds)) {
    return
  }

  for (const itemId of itemIds) {
    // 尝试作为 folder 删除（需要递归删除子项）
    const folder = getFolder(itemId)
    if (folder) {
      if (folder.items && Array.isArray(folder.items)) {
        removeItems(folder.items)
      }
      removeFolder(itemId)
      continue
    }

    // 作为 workflow 删除
    removeWorkflow(itemId)
  }
}

module.exports = {
  // 旧的 API（保持兼容）
  getConfigKey,
  get,
  set,
  remove,
  
  // 新的拆分存储 API
  getEnvVarsKey,
  getEnvVars,
  setEnvVars,
  removeEnvVars,
  
  getWorkflowKey,
  getWorkflow,
  setWorkflow,
  removeWorkflow,
  
  getFolderKey,
  getFolder,
  setFolder,
  removeFolder,
  
  // 完整配置的组装/拆分 API
  loadFullConfig,
  saveFullConfig,
  removeFullConfig
}

