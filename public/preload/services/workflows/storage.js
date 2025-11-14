/**
 * ============================================================================
 * FlowPilot 工作流存储层 (storage.js)
 * ============================================================================
 * 
 * 【架构概述】
 * 本模块负责 FlowPilot 插件的持久化存储，采用"拆分存储"架构：
 * - 主配置 (workflows_${platform}): 只保存结构信息（tabs、ID引用关系）
 * - 环境变量 (envvars_${platform}): 独立存储环境变量数组
 * - 工作流 (workflow/${id}): 每个工作流独立一个存储键
 * - 文件夹 (folder/${id}): 每个文件夹独立一个存储键
 * 
 * 【历史演进】
 * 
 * 1. 旧版本存储方式（已废弃）
 *    - 所有数据保存在一个大 JSON 中 (workflows_${platform})
 *    - 结构：{ version, platform, tabs: [{ items: [完整的workflow/folder对象] }], envVars: [...] }
 *    - 问题：
 *      * 数据量大时性能差（每次保存/读取都要处理整个 JSON）
 *      * 无法按需加载单个工作流
 *      * 数据冗余，修改一个工作流需要重写整个配置
 * 
 * 2. 新版本存储方式（当前实现）
 *    - 拆分存储，参考 uTools 快捷指令的存储模式
 *    - 主配置只保存结构：{ version, platform, tabs: [{ items: [ID数组] }] }
 *    - 每个实体独立存储：workflow/${id}, folder/${id}, envvars_${platform}
 *    - 优势：
 *      * 性能优化：按需加载，增量更新
 *      * 易于管理：每个实体独立，便于调试
 *      * 数据一致性：通过垃圾回收机制防止脏数据
 * 
 * 【数据流转】
 * 
 * 加载流程 (loadFullConfig):
 *   1. 检查是否需要从旧格式迁移（tabs[0].items[0] 是对象 → 需要迁移）
 *   2. 如需迁移，调用 saveFullConfig 拆分保存，然后重新读取
 *   3. 读取主配置结构 (workflows_${platform})
 *   4. 读取环境变量 (envvars_${platform})
 *   5. 递归加载每个 tab 的 items（根据 ID 从 workflow/${id} 或 folder/${id} 读取）
 *   6. 组装成完整的配置对象返回给上层
 * 
 * 保存流程 (saveFullConfig):
 *   1. 垃圾清理：对比旧配置和新配置的 ID 差异，删除不再引用的实体
 *   2. 保存环境变量到 envvars_${platform}
 *   3. 递归保存每个 workflow 和 folder 到独立存储键
 *   4. 收集所有 ID，构建主配置结构并保存到 workflows_${platform}
 * 
 * 【关键机制】
 * 
 * 1. 自动迁移
 *    - 首次运行新版本代码时，自动检测旧格式并迁移
 *    - 迁移过程对用户透明，无需手动操作
 *    - 迁移后旧数据被覆盖为新格式，不可回退
 * 
 * 2. 垃圾回收（GC）
 *    - 问题场景：删除工作流/文件夹时，如果只删除父级的引用，子数据会残留成"脏数据"
 *    - 解决方案：每次保存前，自动对比引用关系，删除不再被引用的实体
 *    - 递归处理：删除 folder 时会递归删除其所有子项
 *    - 兼容性：支持旧格式对象和新格式 ID 字符串混合场景
 * 
 * 3. 递归加载/保存
 *    - Folder 可以包含 workflow 或 folder（支持多层嵌套）
 *    - 加载时：递归读取 folder 内的 items 并展开成完整对象
 *    - 保存时：递归保存 folder 内的 items 并收集 ID 数组
 * 
 * 【存储键规范】
 * 
 * - workflows_${platform}  : 主配置结构（仅包含 version, platform, tabs）
 * - envvars_${platform}    : 环境变量 { envVars: [{id, name, value, enabled, description}] }
 * - workflow/${workflowId} : 单个工作流的完整数据
 * - folder/${folderId}     : 单个文件夹的数据（items 字段为 ID 数组）
 * 
 * 【对外 API】
 * 
 * 主要接口（供上层业务调用）：
 * - loadFullConfig()  : 加载完整配置（自动组装）
 * - saveFullConfig()  : 保存完整配置（自动拆分 + 垃圾清理）
 * - removeFullConfig(): 删除所有配置（递归清理）
 * 
 * 底层接口（供内部或特殊场景使用）：
 * - getWorkflow/setWorkflow/removeWorkflow : 单个工作流的 CRUD
 * - getFolder/setFolder/removeFolder       : 单个文件夹的 CRUD
 * - getEnvVars/setEnvVars/removeEnvVars    : 环境变量的读写
 * 
 * 【注意事项】
 * 
 * 1. 所有 workflow 和 folder 必须包含 id 字段
 * 2. 直接调用底层接口（如 setWorkflow）不会触发垃圾回收，可能产生脏数据
 * 3. 建议始终使用 saveFullConfig 进行保存操作
 * 4. 迁移是单向的，新版本不兼容旧版本代码
 * 
 * ============================================================================
 */

const storageCore = require('../../core/storage.js')
const getPlatform = require('../platform.js')

// ==================== 存储键生成器 ====================

/**
 * 获取主配置的存储键（平台相关）
 * 例如：workflows_win32, workflows_darwin, workflows_linux
 */
function getConfigKey() {
  const platform = getPlatform()
  return `workflows_${platform}`
}

/**
 * 获取环境变量的存储键（平台相关）
 * 例如：envvars_win32, envvars_darwin, envvars_linux
 */
function getEnvVarsKey() {
  const platform = getPlatform()
  return `envvars_${platform}`
}

/**
 * 获取全局变量主索引的存储键（平台相关）
 * 例如：globalvars_win32, globalvars_darwin, globalvars_linux
 * 存储结构：{ ids: ['gvar1', 'gvar2', ...] }
 */
function getGlobalVarsKey() {
  const platform = getPlatform()
  return `globalvars_${platform}`
}

/**
 * 获取单个全局变量的存储键
 * 例如：globalvar/gvar_example
 */
function getGlobalVarKey(globalVarId) {
  return `globalvar/${globalVarId}`
}

/**
 * 获取单个工作流的存储键
 * 例如：workflow/demo-open-home
 */
function getWorkflowKey(workflowId) {
  return `workflow/${workflowId}`
}

/**
 * 获取单个文件夹的存储键
 * 例如：folder/folder_advanced
 */
function getFolderKey(folderId) {
  return `folder/${folderId}`
}

// ==================== 环境变量存储 ====================

/**
 * 读取环境变量配置
 * @returns {Object|null} 返回 { envVars: [...] } 或 null（如果不存在）
 */
function getEnvVars() {
  const key = getEnvVarsKey()
  const data = storageCore.settings.get(key)
  console.log(`[Storage] getEnvVars from key "${key}":`, data)
  return data
}

/**
 * 保存环境变量配置
 * @param {Array} envVars - 环境变量数组 [{id, name, value, enabled, description}]
 */
function setEnvVars(envVars) {
  const key = getEnvVarsKey()
  const data = { envVars } // 包装成对象格式
  console.log(`[Storage] setEnvVars to key "${key}":`, data)
  storageCore.settings.set(key, data)
}

/**
 * 删除环境变量配置
 */
function removeEnvVars() {
  storageCore.settings.remove(getEnvVarsKey())
}

// ==================== 全局变量存储 ====================

/**
 * 读取单个全局变量
 * @param {string} globalVarId - 全局变量 ID
 * @returns {Object|null} 全局变量对象或 null
 */
function getGlobalVar(globalVarId) {
  return storageCore.settings.get(getGlobalVarKey(globalVarId))
}

/**
 * 保存单个全局变量
 * @param {Object} globalVar - 全局变量对象（必须包含 id 字段）
 */
function setGlobalVar(globalVar) {
  if (!globalVar || !globalVar.id) {
    throw new Error('globalVar 必须包含 id')
  }
  storageCore.settings.set(getGlobalVarKey(globalVar.id), globalVar)
}

/**
 * 删除单个全局变量
 * @param {string} globalVarId - 全局变量 ID
 */
function removeGlobalVar(globalVarId) {
  storageCore.settings.remove(getGlobalVarKey(globalVarId))
}

/**
 * 读取全局变量主索引
 * @returns {Object|null} 返回 { ids: [...] } 或 null（如果不存在）
 */
function getGlobalVarsIndex() {
  const key = getGlobalVarsKey()
  const data = storageCore.settings.get(key)
  console.log(`[Storage] getGlobalVarsIndex from key "${key}":`, data)
  return data
}

/**
 * 保存全局变量主索引
 * @param {Array} ids - 全局变量 ID 数组
 */
function setGlobalVarsIndex(ids) {
  const key = getGlobalVarsKey()
  const data = { ids } // 只保存 ID 数组
  console.log(`[Storage] setGlobalVarsIndex to key "${key}":`, data)
  storageCore.settings.set(key, data)
}

/**
 * 删除全局变量主索引
 */
function removeGlobalVarsIndex() {
  storageCore.settings.remove(getGlobalVarsKey())
}

/**
 * 加载完整的全局变量数组（根据主索引组装）
 * @returns {Array} 全局变量对象数组
 */
function getGlobalVars() {
  const index = getGlobalVarsIndex()
  if (!index || !Array.isArray(index.ids)) {
    console.log('[Storage] 全局变量索引不存在或为空')
    return []
  }

  const globalVars = []
  for (const id of index.ids) {
    const gvar = getGlobalVar(id)
    if (gvar) {
      globalVars.push(gvar)
    } else {
      console.warn(`[Storage] 找不到全局变量: ${id}`)
    }
  }

  console.log(`[Storage] 加载了 ${globalVars.length} 个全局变量`)
  return globalVars
}

/**
 * 保存完整的全局变量数组（拆分保存 + 更新索引）
 * @param {Array} globalVars - 全局变量对象数组
 */
function setGlobalVars(globalVars) {
  if (!Array.isArray(globalVars)) {
    console.warn('[Storage] setGlobalVars: globalVars 不是数组', globalVars)
    return
  }

  // 1. 保存每个全局变量到独立存储键
  const ids = []
  for (const gvar of globalVars) {
    if (gvar && gvar.id) {
      setGlobalVar(gvar)
      ids.push(gvar.id)
    } else {
      console.warn('[Storage] setGlobalVars: 全局变量缺少 id', gvar)
    }
  }

  // 2. 保存主索引（只包含 ID 数组）
  setGlobalVarsIndex(ids)
  console.log(`[Storage] 保存了 ${ids.length} 个全局变量`)
}

/**
 * 删除所有全局变量配置
 */
function removeGlobalVars() {
  const index = getGlobalVarsIndex()
  if (index && Array.isArray(index.ids)) {
    // 删除所有单个全局变量
    for (const id of index.ids) {
      removeGlobalVar(id)
    }
  }
  // 删除主索引
  removeGlobalVarsIndex()
}

// ==================== 工作流/文件夹存储 ====================

/**
 * 读取单个工作流
 * @param {string} workflowId - 工作流 ID
 * @returns {Object|null} 工作流对象或 null
 */
function getWorkflow(workflowId) {
  return storageCore.settings.get(getWorkflowKey(workflowId))
}

/**
 * 保存单个工作流
 * @param {Object} workflow - 工作流对象（必须包含 id 字段）
 */
function setWorkflow(workflow) {
  if (!workflow || !workflow.id) {
    throw new Error('workflow 必须包含 id')
  }
  storageCore.settings.set(getWorkflowKey(workflow.id), workflow)
}

/**
 * 删除单个工作流
 * @param {string} workflowId - 工作流 ID
 */
function removeWorkflow(workflowId) {
  storageCore.settings.remove(getWorkflowKey(workflowId))
}

/**
 * 读取单个文件夹
 * @param {string} folderId - 文件夹 ID
 * @returns {Object|null} 文件夹对象或 null
 */
function getFolder(folderId) {
  return storageCore.settings.get(getFolderKey(folderId))
}

/**
 * 保存单个文件夹
 * @param {Object} folder - 文件夹对象（必须包含 id 字段）
 */
function setFolder(folder) {
  if (!folder || !folder.id) {
    throw new Error('folder 必须包含 id')
  }
  storageCore.settings.set(getFolderKey(folder.id), folder)
}

/**
 * 删除单个文件夹
 * @param {string} folderId - 文件夹 ID
 */
function removeFolder(folderId) {
  storageCore.settings.remove(getFolderKey(folderId))
}

// ==================== 主配置存储（仅保存结构） ====================

/**
 * 读取主配置结构（不包含具体的 workflow/folder 内容）
 * @returns {Object|null} 主配置对象：{ version, platform, tabs: [{ id, name, items: [ID数组] }] }
 */
function get() {
  return storageCore.settings.get(getConfigKey())
}

/**
 * 保存主配置结构
 * @param {Object} config - 主配置对象
 */
function set(config) {
  config.platform = getPlatform()
  storageCore.settings.set(getConfigKey(), config)
}

/**
 * 删除主配置
 */
function remove() {
  storageCore.settings.remove(getConfigKey())
}

// ==================== 完整配置的组装和拆分 ====================

/**
 * 加载完整配置（自动组装）
 * 
 * 工作流程：
 * 1. 检测并执行旧格式迁移（如果需要）
 * 2. 读取主配置结构
 * 3. 加载环境变量
 * 4. 递归加载所有 workflow 和 folder（根据 ID 从独立存储键读取）
 * 5. 组装成完整配置返回
 * 
 * @returns {Object|null} 完整配置对象，包含所有 workflow/folder 的完整数据
 */
function loadFullConfig() {
  const oldKey = getConfigKey()
  const storedConfig = storageCore.settings.get(oldKey)
  
  // ========== 步骤 1: 检查是否需要从旧格式迁移 ==========
  // 判断依据：tabs[0].items[0] 是完整对象（包含 type 字段）而非 ID 字符串
  const needsMigration = storedConfig?.tabs?.some(tab => 
    tab.items?.length > 0 && 
    typeof tab.items[0] === 'object' && 
    tab.items[0].type
  )
  
  if (needsMigration) {
    // 旧格式检测到，执行一次性迁移
    console.log('[Storage] 检测到旧格式配置，执行迁移...')
    console.log('[Storage] 旧配置内容:', {
      hasEnvVars: !!storedConfig.envVars,
      envVarsCount: storedConfig.envVars?.length || 0,
      envVarsData: storedConfig.envVars,
      firstTab: storedConfig.tabs[0]?.name,
      firstItemType: storedConfig.tabs[0]?.items[0]?.type
    })
    
    // 调用 saveFullConfig 将旧格式拆分保存到新格式
    saveFullConfig(storedConfig)
    console.log('[Storage] 旧格式配置迁移完成')
  }
  
  // ========== 步骤 2: 读取主配置结构 ==========
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

  // ========== 步骤 3: 加载环境变量 ==========
  const envVarsData = getEnvVars()
  mainConfig.envVars = envVarsData?.envVars || [] // 解包 { envVars: [...] }
  console.log('[Storage] 环境变量已加载', mainConfig.envVars.length, '个')

  // ========== 步骤 3.5: 加载全局变量 ==========
  // 尝试新格式（拆分存储）
  let globalVarsArray = getGlobalVars() // 已经返回数组
  
  // 检查是否需要从旧格式迁移
  if (globalVarsArray.length === 0) {
    const oldGlobalVarsData = storageCore.settings.get(getGlobalVarsKey())
    // 旧格式：{ globalVars: [...] }
    // 新格式：{ ids: [...] }
    if (oldGlobalVarsData && Array.isArray(oldGlobalVarsData.globalVars)) {
      console.log('[Storage] 检测到旧格式全局变量，执行迁移...')
      console.log('[Storage] 旧格式全局变量数量:', oldGlobalVarsData.globalVars.length)
      
      // 执行迁移：调用 setGlobalVars 会自动拆分保存
      setGlobalVars(oldGlobalVarsData.globalVars)
      globalVarsArray = oldGlobalVarsData.globalVars // 使用旧数据填充
      
      console.log('[Storage] 全局变量迁移完成')
    }
  }
  
  mainConfig.globalVars = globalVarsArray
  console.log('[Storage] 全局变量已加载', mainConfig.globalVars.length, '个')

  // ========== 步骤 4: 递归加载所有 tab 的 items ==========
  if (mainConfig.tabs && Array.isArray(mainConfig.tabs)) {
    mainConfig.tabs = mainConfig.tabs.map(tab => {
      const items = loadItems(tab.items || []) // 根据 ID 数组加载完整对象
      console.log(`[Storage] Tab "${tab.name}" 加载了 ${items.length} 个 items (原始 ${tab.items?.length || 0} 个 ID)`) 
      return {
        ...tab,
        items // 替换 ID 数组为完整对象数组
      }
    })
  }

  console.log('[Storage] loadFullConfig 完成')
  return mainConfig
}

/**
 * 递归加载 items（可能包含 workflow 或 folder）
 * 
 * 输入：ID 字符串数组（新格式）或对象数组（旧格式，迁移过程中可能遇到）
 * 输出：完整的 workflow/folder 对象数组（folder 的 items 也会递归展开）
 * 
 * @param {Array} itemIds - ID 数组或对象数组
 * @returns {Array} 完整对象数组
 */
function loadItems(itemIds) {
  if (!Array.isArray(itemIds)) {
    console.warn('[Storage] loadItems: itemIds 不是数组', itemIds)
    return []
  }

  const results = []
  for (const itemId of itemIds) {
    // ========== 情况 1: 旧格式（对象）防御性处理 ==========
    // 在迁移完成后，正常情况下不应该遇到对象，这里是为了防止异常情况
    if (typeof itemId === 'object') {
      console.warn('[Storage] loadItems: 遇到完整对象（应该已迁移）', itemId.id)
      // 如果是 folder，递归处理其 items
      if (itemId.type === 'folder' && itemId.items) {
        itemId.items = loadItems(itemId.items)
      }
      results.push(itemId)
      continue
    }
    
    // ========== 情况 2: 新格式（ID 字符串）正常流程 ==========
    
    // 尝试作为 workflow 加载
    let item = getWorkflow(itemId)
    if (item) {
      results.push(item)
      continue
    }

    // 尝试作为 folder 加载
    item = getFolder(itemId)
    if (item) {
      // 递归加载 folder 内的 items（folder 存储的 items 字段是 ID 数组）
      if (item.items && Array.isArray(item.items)) {
        item.items = loadItems(item.items) // 递归展开
      }
      results.push(item)
      continue
    }

    // ID 既不是 workflow 也不是 folder，可能是脏数据
    console.warn('[Storage] loadItems: 找不到 item', itemId)
  }

  return results
}

/**
 * 保存完整配置（自动拆分 + 垃圾回收）
 * 
 * 工作流程：
 * 0. 垃圾回收：清理不再被引用的 workflow/folder（防止脏数据）
 * 1. 保存环境变量到独立存储键
 * 2. 递归保存所有 workflow/folder 到独立存储键，收集 ID 数组
 * 3. 保存主配置结构（只包含 tabs 和 ID 引用关系）
 * 
 * @param {Object} config - 完整配置对象（包含完整的 workflow/folder 对象）
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

  // ========== 步骤 0: 垃圾回收（清理不再被引用的数据）==========
  // 
  // 问题场景：
  // 用户删除了一个 workflow/folder，如果只从父级的 items 中移除 ID，
  // 实际的 workflow/${id} 或 folder/${id} 存储键还在，成为"脏数据"。
  // 
  // 解决方案：
  // 1. 收集"之前引用的所有 ID"（从当前存储中）
  // 2. 收集"现在引用的所有 ID"（从传入的 config 中）
  // 3. 删除差集（之前有、现在没有的）
  //
  try {
    const prevMain = get() // 读取保存前的主配置
    if (prevMain && Array.isArray(prevMain.tabs)) {
      // ---------- 收集之前引用的所有 ID ----------
      const prevIds = new Set()
      
      /**
       * 递归收集函数：兼容旧格式对象和新格式 ID 字符串
       * 
       * 为什么要兼容旧格式？
       * 因为在迁移过程中，可能存在部分数据已迁移、部分未迁移的混合状态
       */
      const collectPrev = (list) => {
        if (!Array.isArray(list)) return
        
        for (const entry of list) {
          if (!entry) continue
          
          // 情况 1: 新格式（ID 字符串）
          if (typeof entry === 'string') {
            if (prevIds.has(entry)) continue // 避免重复处理
            
            // 判断是 folder 还是 workflow
            const folder = getFolder(entry)
            if (folder) {
              prevIds.add(entry)
              // 递归处理 folder 的子项（存储中的 folder.items 是 ID 数组）
              if (Array.isArray(folder.items)) collectPrev(folder.items)
            } else {
              const wf = getWorkflow(entry)
              if (wf) prevIds.add(entry)
            }
          } 
          // 情况 2: 旧格式（完整对象）
          else if (typeof entry === 'object') {
            const id = entry.id
            if (!id || prevIds.has(id)) continue
            
            prevIds.add(id)
            // 如果是 folder，递归处理其 items
            if (entry.type === 'folder' && Array.isArray(entry.items)) {
              collectPrev(entry.items)
            }
          }
        }
      }
      
      // 遍历所有 tab，收集其 items
      for (const tab of prevMain.tabs) collectPrev(tab.items || [])

      // ---------- 收集现在引用的所有 ID ----------
      const nextIds = new Set()
      
      /**
       * 递归收集函数：主要处理对象形式（保存时传入的是完整对象）
       * 兼容字符串是为了防止异常情况
       */
      const collectNext = (items) => {
        if (!Array.isArray(items)) return
        
        for (const it of items) {
          if (!it) continue
          
          // 情况 1: 字符串 ID（兜底，正常不应该出现）
          if (typeof it === 'string') {
            nextIds.add(it)
            continue
          }
          
          // 情况 2: 对象（正常情况）
          const id = it.id
          if (!id) continue
          
          nextIds.add(id)
          // 如果是 folder，递归处理其 items
          if (it.type === 'folder' && Array.isArray(it.items)) {
            collectNext(it.items)
          }
        }
      }
      
      // 遍历所有 tab，收集其 items
      if (Array.isArray(config.tabs)) {
        for (const tab of config.tabs) collectNext(tab.items || [])
      }

      // ---------- 计算差集并删除 ----------
      const toDelete = []
      for (const id of prevIds) {
        if (!nextIds.has(id)) toDelete.push(id) // 之前有、现在没有 → 需要删除
      }
      
      if (toDelete.length) {
        console.log('[Storage] 垃圾清理：将删除不再引用的项目', toDelete)
        removeItems(toDelete) // 递归删除（包括 folder 的子项）
      }

      // ---------- 清理全局变量 ----------
      const prevGlobalVarsIndex = getGlobalVarsIndex()
      if (prevGlobalVarsIndex && Array.isArray(prevGlobalVarsIndex.ids)) {
        const prevGlobalVarIds = new Set(prevGlobalVarsIndex.ids)
        const nextGlobalVarIds = new Set(
          (config.globalVars || []).map(gvar => gvar.id).filter(Boolean)
        )

        const toDeleteGlobalVars = []
        for (const id of prevGlobalVarIds) {
          if (!nextGlobalVarIds.has(id)) {
            toDeleteGlobalVars.push(id)
          }
        }

        if (toDeleteGlobalVars.length) {
          console.log('[Storage] 垃圾清理：将删除不再引用的全局变量', toDeleteGlobalVars)
          for (const id of toDeleteGlobalVars) {
            removeGlobalVar(id)
          }
        }
      }
    }
  } catch (e) {
    // 垃圾清理失败不应该阻止保存流程，记录错误后继续
    console.warn('[Storage] 垃圾清理阶段出错（已跳过）:', e?.message || e)
  }

  // ========== 步骤 1: 保存环境变量 ==========
  if (config.envVars) {
    setEnvVars(config.envVars)
    console.log('[Storage] 环境变量已保存', config.envVars.length)
  }

  // ========== 步骤 1.5: 保存全局变量 ==========
  if (config.globalVars) {
    setGlobalVars(config.globalVars)
    console.log('[Storage] 全局变量已保存', config.globalVars.length)
  }

  // ========== 步骤 2: 递归保存所有 workflow 和 folder ==========
  const tabs = []
  if (config.tabs && Array.isArray(config.tabs)) {
    for (const tab of config.tabs) {
      const itemIds = saveItems(tab.items || []) // 递归保存，返回 ID 数组
      tabs.push({
        id: tab.id,
        name: tab.name,
        items: itemIds // 只保存 ID 数组，不保存完整对象
      })
      console.log(`[Storage] Tab "${tab.name}" 保存了 ${itemIds.length} 个 items`)
    }
  }

  // ========== 步骤 3: 保存主配置结构 ==========
  const mainConfig = {
    version: config.version,
    platform: config.platform || getPlatform(),
    tabs: tabs // 只包含结构信息和 ID 引用
  }
  set(mainConfig)
  console.log('[Storage] 主配置已保存', mainConfig)
}

/**
 * 递归保存 items，返回 ID 数组
 * 
 * 输入：完整的 workflow/folder 对象数组
 * 输出：ID 字符串数组（保存到主配置的 tabs.items 中）
 * 
 * 副作用：将每个 workflow/folder 保存到独立的存储键
 * 
 * @param {Array} items - workflow/folder 对象数组
 * @returns {Array} ID 字符串数组
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
      // 保存 workflow 到独立存储键
      setWorkflow(item)
      ids.push(item.id)
    } else if (item.type === 'folder') {
      // 递归保存 folder 内的 items，获取子项的 ID 数组
      const childIds = saveItems(item.items || [])
      
      // 保存 folder 时，items 字段存储的是 ID 数组（而非完整对象）
      const folderData = {
        ...item,
        items: childIds // 将完整对象数组替换为 ID 数组
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
 * 
 * 使用场景：重置配置、卸载插件等
 * 
 * 清理顺序：
 * 1. 删除所有 workflow 和 folder（递归）
 * 2. 删除环境变量
 * 3. 删除主配置
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

  // 3. 删除全局变量
  removeGlobalVars()

  // 4. 删除主配置
  remove()
}

/**
 * 递归删除 items
 * 
 * 兼容两种输入格式：
 * 1. ID 字符串数组（新格式，正常情况）
 * 2. 完整对象数组（旧格式或特殊场景）
 * 
 * 删除逻辑：
 * - 对于 folder：先递归删除其所有子项，再删除 folder 本身
 * - 对于 workflow：直接删除
 * 
 * @param {Array} itemIds - ID 数组或对象数组
 */
function removeItems(itemIds) {
  if (!Array.isArray(itemIds)) {
    return
  }

  for (const itemId of itemIds) {
    // ========== 情况 1: 输入是对象（兼容旧格式或垃圾清理场景）==========
    if (typeof itemId === 'object' && itemId) {
      const id = itemId.id
      if (!id) continue
      
      // 如果是 folder，先递归删除其子项
      if (itemId.type === 'folder' && Array.isArray(itemId.items)) {
        removeItems(itemId.items)
      }
      
      // 删除 folder 和 workflow 的存储键（防御性：两个都尝试删除）
      removeFolder(id)
      removeWorkflow(id)
      continue
    }

    // ========== 情况 2: 输入是 ID 字符串（新格式，正常情况）==========
    
    // 尝试作为 folder 删除
    const folder = getFolder(itemId)
    if (folder) {
      // 先递归删除 folder 内的所有子项
      if (folder.items && Array.isArray(folder.items)) {
        removeItems(folder.items)
      }
      // 再删除 folder 本身
      removeFolder(itemId)
      continue
    }

    // 作为 workflow 删除
    removeWorkflow(itemId)
  }
}

// ==================== 模块导出 ====================

module.exports = {
  // ---------- 存储键生成器 ----------
  getConfigKey,      // 主配置键
  getEnvVarsKey,     // 环境变量键
  getGlobalVarsKey,  // 全局变量主索引键
  getGlobalVarKey,   // 单个全局变量键
  getWorkflowKey,    // 单个工作流键
  getFolderKey,      // 单个文件夹键
  
  // ---------- 主配置 CRUD（底层接口，一般不直接使用）----------
  get,               // 读取主配置结构
  set,               // 保存主配置结构
  remove,            // 删除主配置
  
  // ---------- 环境变量 CRUD ----------
  getEnvVars,        // 读取环境变量
  setEnvVars,        // 保存环境变量
  removeEnvVars,     // 删除环境变量
  
  // ---------- 全局变量 CRUD ----------
  getGlobalVarsIndex,  // 读取全局变量主索引
  setGlobalVarsIndex,  // 保存全局变量主索引
  removeGlobalVarsIndex, // 删除全局变量主索引
  
  getGlobalVar,      // 读取单个全局变量
  setGlobalVar,      // 保存单个全局变量
  removeGlobalVar,   // 删除单个全局变量
  
  getGlobalVars,     // 读取全局变量（组装）
  setGlobalVars,     // 保存全局变量（拆分）
  removeGlobalVars,  // 删除全局变量（递归清理）
  
  // ---------- 单个实体 CRUD（底层接口，直接调用不会触发垃圾回收）----------
  getWorkflow,       // 读取单个工作流
  setWorkflow,       // 保存单个工作流
  removeWorkflow,    // 删除单个工作流
  
  getFolder,         // 读取单个文件夹
  setFolder,         // 保存单个文件夹
  removeFolder,      // 删除单个文件夹
  
  // ---------- 完整配置的高级接口（推荐使用）----------
  loadFullConfig,    // 加载完整配置（自动组装 + 迁移）
  saveFullConfig,    // 保存完整配置（自动拆分 + 垃圾清理）
  removeFullConfig   // 删除完整配置（递归清理所有关联数据）
}

