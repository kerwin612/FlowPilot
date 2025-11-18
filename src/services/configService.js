/**
 * ConfigService - 配置管理服务
 *
 * 职责：
 * 1. 统一管理所有配置的读取和保存（调用后端细粒度API）
 * 2. 封装 window.services.workflow.* 的CRUD调用
 * 3. 提供响应式配置订阅机制
 * 4. 管理本地缓存和状态
 *
 * 架构约定：
 * - UI 组件仅通过此服务访问配置，不直接调用 window.services
 * - 配置变更通过 subscribe/notify 机制广播
 * - 每个实体独立CRUD，不再传递大对象
 */

class ConfigService {
  constructor() {
    // 本地缓存
    this.profiles = []  // 配置文件列表
    this.activeProfileId = null  // 当前激活的配置文件ID
    this.config = null  // 主配置（版本、平台、tabs引用）
    this.tabs = []
    this.envVars = []
    this.globalVars = []
    
    this.listeners = []
  }

  /**
   * 加载所有配置到本地缓存
   */
  loadAll() {
    try {
      this.profiles = window.services.workflow.getProfiles()
      this.activeProfileId = window.services.workflow.getActiveProfileId()
      this.config = window.services.workflow.getConfig()
      this.tabs = window.services.workflow.getTabs()
      this.envVars = window.services.workflow.getEnvVars()
      this.globalVars = window.services.workflow.getGlobalVars()
      
      this.notifyListeners()
      
      return {
        profiles: this.profiles,
        activeProfileId: this.activeProfileId,
        config: this.config,
        tabs: this.tabs,
        envVars: this.envVars,
        globalVars: this.globalVars
      }
    } catch (error) {
      console.error('[ConfigService] 加载配置失败:', error)
      throw error
    }
  }

  /**
   * 重置所有配置
   */
  resetAll() {
    window.services.workflow.resetAll()
    return this.loadAll()
  }

  getProfiles() {
    return this.profiles?.profiles || []
  }

  getActiveProfileId () {
    return this.activeProfileId
  }

  addProfile(name) {
    const newProfile = window.services.workflow.addProfile(name)
    this.profiles = window.services.workflow.getProfiles()
    this.notifyListeners()
    return newProfile
  }

  setActiveProfile(profileId) {
    window.services.workflow.setActiveProfile(profileId)
    this.activeProfileId = window.services.workflow.getActiveProfileId()
    this.loadAll()  // 切换配置档后重新加载所有配置
  }

  deleteProfile(profileId) {
    const ok = window.services.workflow.deleteProfile(profileId)
    this.profiles = window.services.workflow.getProfiles()
    this.activeProfileId = window.services.workflow.getActiveProfileId()
    this.loadAll()
    return ok
  }

  /**
   * 获取当前本地缓存的配置
   */
  getConfig() {
    return this.config
  }

  // ==================== Tab 操作 ====================

  /**
   * 获取所有标签页
   */
  getTabs() {
    return this.tabs
  }

  /**
   * 获取指定标签页
   */
  getTab(tabIndex) {
    return this.tabs[tabIndex] || null
  }

  /**
   * 获取标签页的所有项目
   */
  getTabItems(tabIndex) {
    const tab = this.getTab(tabIndex)
    return tab?.items || []
  }

  /**
   * 添加标签页
   */
  addTab(tabName = '新标签页') {
    const newTab = {
      id: `tab_${Date.now()}`,
      name: tabName,
      items: []
    }
    
    window.services.workflow.saveTab(newTab)
    this.tabs = window.services.workflow.getTabs()
    this.notifyListeners()
    
    return newTab
  }

  /**
   * 更新标签页
   */
  updateTab(tabIndex, updates) {
    const tab = this.tabs[tabIndex]
    if (!tab) return
    
    const updatedTab = { ...tab, ...updates }
    window.services.workflow.saveTab(updatedTab)
    this.tabs = window.services.workflow.getTabs()
    this.notifyListeners()
  }

  /**
   * 删除标签页
   */
  deleteTab(tabIndex) {
    const tab = this.tabs[tabIndex]
    if (!tab) return
    
    window.services.workflow.deleteTab(tab.id)
    this.tabs = window.services.workflow.getTabs()
    this.notifyListeners()
  }

  /**
   * 批量更新标签页（用于重新排序等）
   */
  updateTabs(newTabs) {
    window.services.workflow.updateTabs(newTabs)
    this.tabs = newTabs
    this.notifyListeners()
  }

  // ==================== Tab 内项目操作 ====================

  /**
   * 添加项目到标签页
   */
  addItem(tabIndex, item) {
    const tab = this.tabs[tabIndex]
    if (!tab) return
    
    tab.items = [...(tab.items || []), item]
    window.services.workflow.saveTab(tab)
    this.tabs = window.services.workflow.getTabs()
    this.notifyListeners()
  }

  /**
   * 更新项目
   */
  updateItem(tabIndex, itemId, updates) {
    const tab = this.tabs[tabIndex]
    if (!tab) return
    
    const itemIndex = tab.items.findIndex((item) => item.id === itemId)
    if (itemIndex === -1) return
    
    tab.items[itemIndex] = { ...tab.items[itemIndex], ...updates }
    window.services.workflow.saveTab(tab)
    this.tabs = window.services.workflow.getTabs()
    this.notifyListeners()
  }

  /**
   * 删除项目
   */
  deleteItem(tabIndex, itemId) {
    const tab = this.tabs[tabIndex]
    if (!tab) return
    
    tab.items = tab.items.filter((item) => item.id !== itemId)
    window.services.workflow.saveTab(tab)
    this.tabs = window.services.workflow.getTabs()
    this.notifyListeners()
  }

  /**
   * 重新排序项目
   */
  reorderItems(tabIndex, newOrder) {
    const tab = this.tabs[tabIndex]
    if (!tab) return
    
    tab.items = newOrder
    window.services.workflow.saveTab(tab)
    this.tabs = window.services.workflow.getTabs()
    this.notifyListeners()
  }

  /**
   * 将项目移动到文件夹
   */
  moveItemToFolder(tabIndex, itemId, folderId) {
    const tab = this.tabs[tabIndex]
    if (!tab) return

    // 找到要移动的项目
    const item = tab.items.find((i) => i.id === itemId)
    if (!item) return

    // 从原位置移除
    tab.items = tab.items.filter((i) => i.id !== itemId)

    // 添加到文件夹
    const folder = tab.items.find((i) => i.id === folderId)
    if (folder && folder.type === 'folder') {
      folder.items = [...(folder.items || []), item]
    }

    window.services.workflow.saveTab(tab)
    this.tabs = window.services.workflow.getTabs()
    this.notifyListeners()
  }

  // ==================== EnvVar 操作 ====================

  /**
   * 获取所有环境变量
   */
  getEnvVars() {
    return this.envVars
  }

  /**
   * 获取启用的环境变量（用于执行时注入）
   */
  getEnabledEnvVars() {
    const envVars = this.getEnvVars()
    const currentDeviceId = typeof window !== 'undefined' && window.services?.getNativeId ? window.services.getNativeId() : null
    return envVars
      .filter((v) => {
        // 必须启用且有变量名
        if (!v.enabled || !v.name || !v.name.trim()) return false
        // 如果没有设备限制，全局生效
        if (!v.deviceId) return true
        // 如果有设备限制，只返回本机的
        return v.deviceId === currentDeviceId
      })
      .reduce((acc, v) => {
        acc[v.name.trim()] = v.value || ''
        return acc
      }, {})
  }

  /**
   * 保存单个环境变量
   */
  saveEnvVar(envVar) {
    window.services.workflow.saveEnvVar(envVar)
    this.envVars = window.services.workflow.getEnvVars()
    this.notifyListeners()
  }

  /**
   * 删除环境变量
   */
  deleteEnvVar(id) {
    window.services.workflow.deleteEnvVar(id)
    this.envVars = window.services.workflow.getEnvVars()
    this.notifyListeners()
  }

  /**
   * 批量保存环境变量
   */
  saveEnvVars(envVars) {
    window.services.workflow.saveEnvVars(envVars)
    this.envVars = window.services.workflow.getEnvVars()
    this.notifyListeners()
  }

  // ==================== GlobalVar 操作 ====================

  /**
   * 获取所有全局变量
   */
  getGlobalVars() {
    return this.globalVars
  }

  /**
   * 获取全局变量 Map（用于模板解析）
   * 返回的对象包含：
   * - 直接 key-value 映射（用于 {{vars.KEY}} 访问，取第一个匹配的值）
   * - _raw 属性（原始数组，用于标签筛选）
   */
  getGlobalVarsMap() {
    const map = {}
    
    // key 可以重复，相同 key 的变量按顺序保存
    // 直接访问 vars.KEY 时取第一个匹配的值
    this.globalVars.forEach((v) => {
      if (v.key && v.key.trim()) {
        const key = v.key.trim()
        // 只保存第一个出现的 key 对应的 value（用于直接访问）
        if (!(key in map)) {
          map[key] = v.value || ''
        }
      }
    })
    
    // 附加原始数组，用于标签筛选和索引访问
    map._raw = this.globalVars
    return map
  }

  /**
   * 获取所有已使用的标签（用于筛选和自动补全）
   * @param {Array} globalVars - 可选：直接传入全局变量数组（用于实时获取，不依赖缓存）
   * @returns {Array} 排序后的标签数组
   */
  getAllTags(globalVars) {
    const vars = globalVars || this.globalVars
    const tagsSet = new Set()
    vars.forEach((v) => {
      if (v.tags && Array.isArray(v.tags)) {
        v.tags.forEach((tag) => tagsSet.add(tag))
      }
    })
    return Array.from(tagsSet).sort()
  }

  /**
   * 保存单个全局变量
   */
  saveGlobalVar(globalVar) {
    window.services.workflow.saveGlobalVar(globalVar)
    this.globalVars = window.services.workflow.getGlobalVars()
    this.notifyListeners()
  }

  /**
   * 删除全局变量
   */
  deleteGlobalVar(id) {
    window.services.workflow.deleteGlobalVar(id)
    this.globalVars = window.services.workflow.getGlobalVars()
    this.notifyListeners()
  }

  /**
   * 批量保存全局变量
   */
  saveGlobalVars(globalVars) {
    window.services.workflow.saveGlobalVars(globalVars)
    this.globalVars = window.services.workflow.getGlobalVars()
    this.notifyListeners()
  }

  // ==================== 工具方法 ====================

  /**
   * 获取所有工作流（扁平化，包括文件夹内的）
   * 用于注册动态指令
   */
  getAllWorkflows() {
    const workflows = []
    
    const collectWorkflows = (items) => {
      items.forEach((item) => {
        if (item.type === 'workflow') {
          workflows.push(item)
        } else if (item.type === 'folder' && Array.isArray(item.items)) {
          collectWorkflows(item.items)
        }
      })
    }

    this.tabs.forEach((tab) => {
      if (Array.isArray(tab.items)) {
        collectWorkflows(tab.items)
      }
    })

    return workflows
  }

  // ==================== 订阅机制 ====================

  /**
   * 订阅配置变化
   */
  subscribe(listener) {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }

  /**
   * 通知所有订阅者
   */
  notifyListeners() {
    this.listeners.forEach((listener) => listener({
      profiles: this.profiles,
      activeProfileId: this.activeProfileId,
      config: this.config,
      tabs: this.tabs,
      envVars: this.envVars,
      globalVars: this.globalVars
    }))
  }
}

// 导出单例
export default new ConfigService()
