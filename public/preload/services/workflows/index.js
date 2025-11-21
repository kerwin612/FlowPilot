/**
 * ============================================================================
 * FlowPilot 工作流服务层 (workflows/index.js)
 * ============================================================================
 * 
 * 职责：
 * - 提供细粒度的CRUD API（Tab、Workflow、Folder、EnvVar、GlobalVar）
 * - 提供命令构建和执行功能
 * - 处理环境变量展开和模板替换
 * 
 * 架构说明：
 * - 本层调用 DAO 层（public/preload/dao）进行数据持久化
 * - DAO 层负责版本管理、数据迁移、存储拆分等底层逻辑
 * - 本层提供标准的CRUD接口，前端按需调用
 * - 拆解组装逻辑仅存在于 DAO impl 层（uTools存储实现）
 * 
 * ============================================================================
 */

const command = require('../../core/command.js')
const getPlatform = require('../platform.js')
const defaults = require('./defaults.js')
const { getDAO } = require('../../dao')
const { Config, Tab, Workflow, Folder, EnvVar, GlobalVar, Profile } = require('../../dao/model/models')

// ==================== 初始化和重置 ====================

/**
 * 初始化默认配置
 * 
 * 使用场景：
 * - 首次安装插件
 * - 用户主动重置配置
 */
function initDefault() {
  const dao = getDAO()
  const platform = getPlatform()
  const defaultTabs = defaults[platform] || defaults.linux

  console.log('[Workflow Service] 初始化默认配置', { platform, tabsCount: defaultTabs.length })

  // 1. 创建主配置
  const config = new Config()
  config.platform = platform
  config.tabs = defaultTabs.map(tabData => {
    const tab = new Tab(tabData.id, tabData.name)
    tab.items = tabData.items || []
    return tab
  })
  dao.config.save(config)

  // 2. 创建默认环境变量
  const defaultEnvVars = [
    new EnvVar('env_home', 'HOME', process.env.HOME || process.env.USERPROFILE || ''),
    new EnvVar('env_temp', 'TEMP', process.env.TEMP || process.env.TMPDIR || '/tmp')
  ]
  defaultEnvVars[0].description = '用户主目录'
  defaultEnvVars[1].description = '临时目录'
  defaultEnvVars.forEach(envVar => dao.envVars.save(envVar))

  // 3. 创建示例全局变量
  const exampleGlobalVar = new GlobalVar('globalvar_example', 'EXAMPLE_VAR', 'example_value')
  exampleGlobalVar.name = '示例变量'
  exampleGlobalVar.tags = ['example', 'demo']
  exampleGlobalVar.description = '这是一个全局变量示例，可用于所有工作流'
  dao.globalVars.save(exampleGlobalVar)

  console.log('[Workflow Service] 默认配置初始化完成')
}

/**
 * 重置所有配置
 */
function resetAll() {
  const dao = getDAO()

  try {
    console.log('[Workflow Service] 开始重置所有配置')

    // 1. 删除主配置
    dao.config.delete()

    // 2. 删除所有环境变量
    dao.envVars.findAll().forEach(item => dao.envVars.delete(item.id))

    // 3. 删除所有全局变量
    dao.globalVars.findAll().forEach(item => dao.globalVars.delete(item.id))

    // 4. 删除所有工作流
    dao.workflows.findAll().forEach(item => dao.workflows.delete(item.id))

    // 5. 删除所有文件夹（会递归删除子项）
    dao.folders.findAll().forEach(item => dao.folders.deleteWithChildren(item.id))

    console.log('[Workflow Service] 配置重置完成')

    // 6. 重新初始化默认配置
    initDefault()
  } catch (error) {
    console.error('[Workflow Service] 配置重置失败:', error)
    throw error
  }
}

function _ensureProfileInitialized() {
  const dao = getDAO()
  const deviceId = (typeof window !== 'undefined' && window.utools && typeof window.utools.getNativeId === 'function') ? window.utools.getNativeId() : null
  const meta = dao.getProfiles()
  const map = dao.getDeviceProfileMap()
  let activeProfileId = map[deviceId] || null

  if (!meta.profiles || meta.profiles.length === 0) {
    const p = new Profile('default', '默认配置')
    meta.profiles = [p]
    dao.saveProfiles(meta.profiles)
    activeProfileId = p.id
    dao.setProfileScope(activeProfileId)
    dao.migrateRootToCurrentScope()
    if (deviceId) dao.setDeviceProfile(deviceId, activeProfileId)
  } else {
    const exists = meta.profiles.find(p => p.id === activeProfileId)
    if (!exists) {
      activeProfileId = meta.profiles[0]?.id || null
      if (activeProfileId) {
        dao.setProfileScope(activeProfileId)
        if (deviceId) dao.setDeviceProfile(deviceId, activeProfileId)
      }
    } else {
      dao.setProfileScope(activeProfileId)
    }
  }

  return { meta, deviceId, activeProfileId }
}

function getProfiles() {
  const dao = getDAO()
  const { meta } = _ensureProfileInitialized()
  return meta
}

function getActiveProfileId() {
  const { activeProfileId } = _ensureProfileInitialized()
  return activeProfileId
}

function addProfile(name) {
  const dao = getDAO()
  const { meta, deviceId } = _ensureProfileInitialized()
  const p = new Profile(`${Date.now()}`, name || `配置档_${(meta.profiles?.length || 0)}`)
  meta.profiles = [...(meta.profiles || []), p]
  dao.saveProfiles(meta.profiles)
  try { dao.cloneCurrentScopeToProfile(p.id) } catch {}
  return p
}

function setActiveProfile(profileId) {
  const dao = getDAO()
  const { meta, deviceId } = _ensureProfileInitialized()
  const exists = (meta.profiles || []).find(p => p.id === profileId)
  if (!exists) return null
  if (deviceId) dao.setDeviceProfile(deviceId, profileId)
  dao.setProfileScope(profileId)
  return profileId
}

function deleteProfile(profileId) {
  const dao = getDAO()
  const { deviceId } = _ensureProfileInitialized()
  const ok = dao.deleteProfile(profileId)
  if (ok) {
    const meta = dao.getProfiles()
    const newActive = meta.profiles[0]?.id || null
    if (deviceId && newActive) dao.setDeviceProfile(deviceId, newActive)
    if (newActive) dao.setProfileScope(newActive)
  }
  return ok
}

// ==================== Config CRUD ====================

/**
 * 获取主配置（版本、平台、tabs引用）
 */
function getConfig() {
  const dao = getDAO()
  const config = dao.config.load()
  
  if (!config || !config.tabs || config.tabs.length === 0) {
    console.log('[Workflow Service] 配置为空，初始化默认配置')
    initDefault()
    return dao.config.load()
  }
  
  return config
}

/**
 * 保存主配置
 */
function saveConfig(config) {
  const dao = getDAO()
  dao.config.save(config)
}

// ==================== Tab CRUD ====================

/**
 * 获取所有标签页
 */
function getTabs() {
  return getConfig().tabs || []
}

/**
 * 获取单个标签页
 */
function getTab(tabId) {
  const tabs = getTabs()
  return tabs.find(t => t.id === tabId)
}

/**
 * 保存标签页（新增或更新）
 */
function saveTab(tab) {
  const config = getConfig()
  const index = config.tabs.findIndex(t => t.id === tab.id)
  
  if (index >= 0) {
    config.tabs[index] = tab
  } else {
    config.tabs.push(tab)
  }
  
  saveConfig(config)
}

/**
 * 删除标签页
 */
function deleteTab(tabId) {
  const config = getConfig()
  config.tabs = config.tabs.filter(t => t.id !== tabId)
  saveConfig(config)
}

/**
 * 更新所有标签页（用于重新排序等批量操作）
 */
function updateTabs(tabs) {
  const config = getConfig()
  config.tabs = tabs
  saveConfig(config)
}

// ==================== EnvVar CRUD ====================

/**
 * 获取所有环境变量
 */
function getEnvVars() {
  const dao = getDAO()
  return dao.envVars.findAll()
}

/**
 * 获取单个环境变量
 */
function getEnvVar(id) {
  const dao = getDAO()
  return dao.envVars.findById(id)
}

/**
 * 保存环境变量
 */
function saveEnvVar(envVar) {
  const dao = getDAO()
  dao.envVars.save(envVar)
}

/**
 * 删除环境变量
 */
function deleteEnvVar(id) {
  const dao = getDAO()
  dao.envVars.delete(id)
}

/**
 * 批量保存环境变量
 */
function saveEnvVars(envVars) {
  const dao = getDAO()
  // 先删除不在新列表中的旧变量，再保存新列表（替换式保存）
  const existing = dao.envVars.findAll()
  const keepIds = new Set((envVars || []).map(v => v.id))
  for (const old of existing) {
    if (!keepIds.has(old.id)) {
      dao.envVars.delete(old.id)
    }
  }
  ;(envVars || []).forEach(envVar => dao.envVars.save(envVar))
}

/**
 * 更新环境变量顺序
 */
function updateEnvVarOrder(envVarIds) {
  const dao = getDAO()
  dao.envVars.updateIndex(envVarIds)
}

// ==================== GlobalVar CRUD ====================

/**
 * 获取所有全局变量
 */
function getGlobalVars() {
  const dao = getDAO()
  return dao.globalVars.findAll()
}

/**
 * 获取单个全局变量
 */
function getGlobalVar(id) {
  const dao = getDAO()
  return dao.globalVars.findById(id)
}

/**
 * 保存全局变量
 */
function saveGlobalVar(globalVar) {
  const dao = getDAO()
  dao.globalVars.save(globalVar)
}

/**
 * 删除全局变量
 */
function deleteGlobalVar(id) {
  const dao = getDAO()
  dao.globalVars.delete(id)
}

/**
 * 批量保存全局变量
 */
function saveGlobalVars(globalVars) {
  const dao = getDAO()
  // 替换式保存：删除旧的未包含项，保存/更新传入项
  const existing = dao.globalVars.findAll()
  const keepIds = new Set((globalVars || []).map(v => v.id))
  for (const old of existing) {
    if (!keepIds.has(old.id)) {
      dao.globalVars.delete(old.id)
    }
  }
  ;(globalVars || []).forEach(globalVar => dao.globalVars.save(globalVar))
}

// ==================== Workflow CRUD ====================

/**
 * 获取所有工作流
 */
function getWorkflows() {
  const dao = getDAO()
  return dao.workflows.findAll()
}

/**
 * 获取单个工作流
 */
function getWorkflow(id) {
  const dao = getDAO()
  return dao.workflows.findById(id)
}

/**
 * 保存工作流
 */
function saveWorkflow(workflow) {
  const dao = getDAO()
  dao.workflows.save(workflow)
}

/**
 * 删除工作流
 */
function deleteWorkflow(id) {
  const dao = getDAO()
  dao.workflows.delete(id)
}

// ==================== Folder CRUD ====================

/**
 * 获取所有文件夹
 */
function getFolders() {
  const dao = getDAO()
  return dao.folders.findAll()
}

/**
 * 获取单个文件夹
 */
function getFolder(id) {
  const dao = getDAO()
  return dao.folders.findById(id)
}

/**
 * 保存文件夹
 */
function saveFolder(folder) {
  const dao = getDAO()
  dao.folders.save(folder)
}

/**
 * 删除文件夹（递归删除子项）
 */
function deleteFolder(id) {
  const dao = getDAO()
  dao.folders.deleteWithChildren(id)
}

// ==================== 业务逻辑 ====================

/**
 * 构建命令字符串
 * 
 * 功能：
 * - 将命令模板中的参数占位符替换为实际值
 * - 占位符格式：{参数名}
 * 
 * @param {Object} workflow - 工作流对象
 * @param {Object} params - 参数对象 { 参数名: 参数值 }
 * @returns {string} 构建后的命令字符串
 */
function buildCommand(workflow, params = {}) {
  let cmd = workflow.command || ''

  // 替换参数占位符 {参数名}
  if (params && Object.keys(params).length > 0) {
    Object.keys(params).forEach(key => {
      const value = params[key] || ''
      cmd = cmd.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
    })
  }

  return cmd
}

/**
 * 展开环境变量中的引用
 * 
 * 支持两种格式：
 * - Windows 风格: %VAR%
 * - Unix 风格: $VAR 或 ${VAR}
 * 
 * 特性：
 * - 支持变量间的相互引用
 * - 防止循环引用
 * - 优先使用自定义变量，找不到时回退到系统环境变量
 * 
 * @param {Object} customEnv - 用户自定义环境变量
 * @param {Object} baseEnv - 基础环境变量（通常是 process.env）
 * @returns {Object} 展开后的环境变量
 */
function expandEnvVars(customEnv, baseEnv) {
  if (!customEnv || typeof customEnv !== 'object') {
    return {}
  }

  const expanded = {}
  const resolving = new Set()

  Object.keys(customEnv).forEach(key => {
    expanded[key] = resolveVar(key, customEnv, baseEnv, expanded, resolving)
  })

  return expanded
}

/**
 * 递归解析单个环境变量
 * 
 * @param {string} key - 变量名
 * @param {Object} customEnv - 自定义环境变量
 * @param {Object} baseEnv - 基础环境变量
 * @param {Object} expanded - 已展开的变量（缓存）
 * @param {Set} resolving - 正在解析的变量（防止循环引用）
 * @returns {string} 解析后的变量值
 */
function resolveVar(key, customEnv, baseEnv, expanded, resolving) {
  // 防止循环引用
  if (resolving.has(key)) {
    return customEnv[key]
  }

  let value = customEnv[key]
  if (typeof value !== 'string') {
    return value
  }

  resolving.add(key)

  // 展开 Windows 风格的 %VAR%
  value = value.replace(/%([^%]+)%/g, (match, varName) => {
    if (varName === key) {
      // 引用自己，使用 baseEnv 中的值
      return baseEnv[varName] || ''
    }
    if (customEnv.hasOwnProperty(varName)) {
      // 引用其他自定义变量，递归展开
      if (!expanded.hasOwnProperty(varName)) {
        expanded[varName] = resolveVar(varName, customEnv, baseEnv, expanded, resolving)
      }
      return expanded[varName]
    }
    // 从 baseEnv 中查找
    return baseEnv[varName] || match
  })

  // 展开 Unix 风格的 $VAR 和 ${VAR}
  value = value.replace(/\$\{([^}]+)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g, (match, braced, simple) => {
    const varName = braced || simple
    if (varName === key) {
      return baseEnv[varName] || ''
    }
    if (customEnv.hasOwnProperty(varName)) {
      if (!expanded.hasOwnProperty(varName)) {
        expanded[varName] = resolveVar(varName, customEnv, baseEnv, expanded, resolving)
      }
      return expanded[varName]
    }
    return baseEnv[varName] || match
  })

  resolving.delete(key)
  return value
}

/**
 * 执行命令
 * 
 * 流程：
 * 1. 构建命令字符串（替换参数占位符）
 * 2. 展开环境变量（处理变量引用）
 * 3. 调用底层命令执行器
 * 4. 返回执行结果
 * 
 * 责任边界说明：
 * 1. 本函数直接执行系统命令，不做内容审查或沙箱隔离
 * 2. 安全责任由调用方（工作流配置者）承担
 * 3. UI 层（CommandExecutor ConfigComponent）提供风险提示，但不强制拦截
 * 4. 建议：生产环境应根据需求增加权限控制、审计日志等措施
 * 
 * @param {Object} workflow - 工作流对象
 * @param {Object} params - 参数对象
 * @returns {Promise<Object>} 执行结果 { success, result?, error?, code?, details? }
 */
async function executeCommand(workflow, params = {}) {
  const cmd = buildCommand(workflow, params)
  
  try {
    // 展开用户环境变量中的引用（如 %PATH%、$HOME 等）
    const expandedEnv = expandEnvVars(workflow.env || {}, process.env)
    const finalEnv = { ...process.env, ...expandedEnv }

    const result = await command(cmd, {
      detached: workflow.runInBackground || false,
      timeout: workflow.timeout || 0,
      env: finalEnv,
      showWindow: workflow.showWindow !== false
    })

    return { success: true, result }
  } catch (error) {
    console.error('[Workflow Service] 命令执行失败:', error)
    // 返回友好的错误信息而不是直接抛出
    return {
      success: false,
      error: error.message || '命令执行失败',
      code: error.code,
      details: error.toString()
    }
  }
}

// ==================== 模块导出 ====================

module.exports = {
  // 初始化和重置
  initDefault,
  resetAll,

  getProfiles,
  getActiveProfileId,
  addProfile,
  setActiveProfile,
  deleteProfile,
  
  // Config
  getConfig,
  saveConfig,
  
  // Tab CRUD
  getTabs,
  getTab,
  saveTab,
  deleteTab,
  updateTabs,
  
  // EnvVar CRUD
  getEnvVars,
  getEnvVar,
  saveEnvVar,
  deleteEnvVar,
  saveEnvVars,
  updateEnvVarOrder,
  
  // GlobalVar CRUD
  getGlobalVars,
  getGlobalVar,
  saveGlobalVar,
  deleteGlobalVar,
  saveGlobalVars,
  
  // Workflow CRUD
  getWorkflows,
  getWorkflow,
  saveWorkflow,
  deleteWorkflow,
  
  // Folder CRUD
  getFolders,
  getFolder,
  saveFolder,
  deleteFolder,
  
  // 业务逻辑
  buildCommand,
  executeCommand
}
