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
    try {
      const items = Array.isArray(tab.items) ? tab.items : []
      for (const it of items) {
        const id = typeof it === 'string' ? it : it?.id
        if (id) window.services.workflow.cleanupIfUnreferenced(id)
      }
    } catch {}
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
    try { window.services.workflow.cleanupIfUnreferenced(itemId) } catch {}
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

  reorderFolderItems(tabIndex, folderId, newOrder) {
    const tab = this.tabs[tabIndex]
    if (!tab) return
    const folder = tab.items.find((i) => i.id === folderId && i.type === 'folder')
    if (!folder) return
    folder.items = newOrder
    window.services.workflow.saveTab(tab)
    this.tabs = window.services.workflow.getTabs()
    this.notifyListeners()
  }

  moveItemOutOfFolder(tabIndex, itemId, fromFolderId, targetIndex) {
    const tab = this.tabs[tabIndex]
    if (!tab) return
    const folder = tab.items.find((i) => i.id === fromFolderId && i.type === 'folder')
    if (!folder || !Array.isArray(folder.items)) return
    const idx = folder.items.findIndex((it) => it.id === itemId)
    if (idx < 0) return
    const [item] = folder.items.splice(idx, 1)
    const insertAt = typeof targetIndex === 'number' && targetIndex >= 0 ? Math.min(targetIndex, tab.items.length) : tab.items.length
    tab.items = [...tab.items.slice(0, insertAt), item, ...tab.items.slice(insertAt)]
    window.services.workflow.saveTab(tab)
    this.tabs = window.services.workflow.getTabs()
    this.notifyListeners()
  }

  moveItemBetweenFolders(tabIndex, itemId, fromFolderId, toFolderId) {
    const tab = this.tabs[tabIndex]
    if (!tab) return
    const from = tab.items.find((i) => i.id === fromFolderId && i.type === 'folder')
    const to = tab.items.find((i) => i.id === toFolderId && i.type === 'folder')
    if (!from || !to) return
    const idx = (from.items || []).findIndex((it) => it.id === itemId)
    if (idx < 0) return
    const [item] = from.items.splice(idx, 1)
    to.items = [...(to.items || []), item]
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
    const filtered = envVars.filter((v) => {
      if (!v.enabled || !v.name || !v.name.trim()) return false
      if (!v.deviceId) return true
      return v.deviceId === currentDeviceId
    })

    return filtered.reduce((map, v) => {
      map[v.name.trim()] = v.value || ''
      return map
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

  /**
   * 更新环境变量顺序
   */
  updateEnvVarOrder(envVarIds) {
    window.services.workflow.updateEnvVarOrder(envVarIds)
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

  exportWorkflow(workflowId) {
    try {
      const w = this.getAllWorkflows().find((it) => it.id === workflowId)
      if (!w) return false
      const refs = this._extractWorkflowRefs(w)
      const payload = {
        type: 'flowpilot/workflow-export',
        version: '1',
        workflow: w,
        envVars: this.envVars.filter((v) => refs.env.has(v.name)),
        globalVars: this.globalVars.filter((g) => refs.global.has(g.key))
      }
      return JSON.stringify(payload, null, 2)
    } catch (e) {
      console.error('[ConfigService] exportWorkflow error', e)
      return ''
    }
  }

  exportFolder(folderId) {
    try {
      const tabs = this.getTabs()
      const tabContaining = tabs.find((t) => (t.items || []).some((it) => it.id === folderId))
      const folder = tabContaining?.items?.find((it) => it.id === folderId && it.type === 'folder')
      if (!folder) return false

      const deepClone = (node) => {
        if (!node) return null
        if (node.type === 'workflow') return { ...node }
        if (node.type === 'folder') {
          return {
            ...node,
            items: (node.items || []).map(deepClone)
          }
        }
        return null
      }

      const clonedFolder = deepClone(folder)
      const envRefs = new Set()
      const globalRefs = new Set()
      const collectRefs = (n) => {
        if (!n) return
        if (Array.isArray(n)) { n.forEach(collectRefs); return }
        if (n.type === 'workflow') {
          const refs = this._extractWorkflowRefs(n)
          refs.env.forEach((x) => envRefs.add(x))
          refs.global.forEach((x) => globalRefs.add(x))
          return
        }
        if (n.type === 'folder') { (n.items || []).forEach(collectRefs) }
      }
      collectRefs(clonedFolder)

      const payload = {
        type: 'flowpilot/folder-export',
        version: '1',
        folderId,
        name: folder.name,
        iconType: folder.iconType,
        icon: folder.icon,
        iconKey: folder.iconKey,
        iconText: folder.iconText,
        iconEmoji: folder.iconEmoji,
        iconSvg: folder.iconSvg,
        iconColor: folder.iconColor,
        items: [clonedFolder],
        envVars: this.envVars.filter((v) => envRefs.has(v.name)),
        globalVars: this.globalVars.filter((g) => globalRefs.has(g.key))
      }
      return JSON.stringify(payload, null, 2)
    } catch {
      console.error('[ConfigService] exportFolder error')
      return ''
    }
  }

  exportToClipboard(text) {
    const ok = window.services.writeClipboard(text)
    return !!ok
  }

  exportToFile(text, filePath) {
    try {
      window.services.writeTextFileAt(filePath, text)
      console.log('[ConfigService] exportWorkflowToFile ok')
      return true
    } catch (e) {
      console.error('[ConfigService] exportWorkflowToFile error', e)
      return false
    }
  }

  async importWorkflowFromText(text, targetTabIndex = 0, targetFolderId = null) {
    try {
      const data = JSON.parse(text)
      if (!data || data.type !== 'flowpilot/workflow-export') return false
      const existingEnvNames = new Set(this.envVars.map((v) => v.name))
      const existingGlobalKeys = new Set(this.globalVars.map((g) => g.key))
      const toAddEnv = (data.envVars || []).filter((v) => v && v.name && !existingEnvNames.has(v.name))
      const toAddGlobal = (data.globalVars || []).filter((g) => g && g.key && !existingGlobalKeys.has(g.key))
      if (toAddEnv.length) this.saveEnvVars([...this.envVars, ...toAddEnv])
      if (toAddGlobal.length) this.saveGlobalVars([...this.globalVars, ...toAddGlobal])
      const wf = { ...data.workflow }
      const allIds = new Set(this.getAllWorkflows().map((x) => x.id))
      if (!wf.id || allIds.has(wf.id)) wf.id = `workflow_${Date.now()}`
      
      if (targetFolderId) {
        const tab = this.getTab(targetTabIndex)
        if (!tab) return false
        const folder = tab.items.find(it => it.id === targetFolderId && it.type === 'folder')
        if (!folder) return false
        folder.items = [...(folder.items || []), wf]
        this.updateItem(targetTabIndex, targetFolderId, folder)
      } else {
        const tab = this.getTab(targetTabIndex) || { id: `tab_${Date.now()}`, name: '导入', items: [] }
        if (!this.tabs.includes(tab)) {
          this.addTab(tab.name)
        }
        this.addItem(targetTabIndex, wf)
      }
      return true
    } catch (e) {
      return false
    }
  }

  async importFolderFromText(text, targetTabIndex = 0) {
    try {
      const data = JSON.parse(text)
      if (!data || data.type !== 'flowpilot/folder-export') return false

      const tab = this.getTab(targetTabIndex)
      const targetIndex = tab ? targetTabIndex : (this.tabs.length > 0 ? 0 : (this.addTab('导入'), 0))

      const existingEnvNames = new Set(this.envVars.map((v) => v.name))
      const existingGlobalKeys = new Set(this.globalVars.map((g) => g.key))
      const toAddEnv = (data.envVars || []).filter((v) => v && v.name && !existingEnvNames.has(v.name))
      const toAddGlobal = (data.globalVars || []).filter((g) => g && g.key && !existingGlobalKeys.has(g.key))
      if (toAddEnv.length) this.saveEnvVars([...this.envVars, ...toAddEnv])
      if (toAddGlobal.length) this.saveGlobalVars([...this.globalVars, ...toAddGlobal])

      const flattenWorkflows = (items) => {
        const out = []
        const seen = new Set()
        const walk = (node) => {
          if (!node) return
          if (Array.isArray(node)) { node.forEach(walk); return }
          if (node.type === 'workflow') {
            const id = node.id || ''
            if (!seen.has(id)) {
              seen.add(id)
              out.push({ ...node })
            }
          }
          else if (node.type === 'folder') { (node.items || []).forEach(walk) }
        }
        walk(items)
        return out
      }

      const workflows = flattenWorkflows(data.items || [])
      if (workflows.length === 0) return false

      const newFolderId = `folder_${Date.now()}`
      const sourceFolder = Array.isArray(data.items) && data.items[0] && data.items[0].type === 'folder' ? data.items[0] : null
      const newFolder = {
        id: newFolderId,
        type: 'folder',
        name: data.name || sourceFolder?.name || '导入的文件夹',
        iconType: data.iconType || sourceFolder?.iconType,
        icon: data.icon || sourceFolder?.icon,
        iconKey: data.iconKey || sourceFolder?.iconKey,
        iconText: data.iconText || sourceFolder?.iconText,
        iconEmoji: data.iconEmoji || sourceFolder?.iconEmoji,
        iconSvg: data.iconSvg || sourceFolder?.iconSvg,
        iconColor: data.iconColor || sourceFolder?.iconColor,
        items: []
      }
      const usedIds = new Set(this.getAllWorkflows().map((x) => x.id))
      newFolder.items = workflows.map((wf) => {
        const copied = { ...wf }
        if (!copied.id || usedIds.has(copied.id)) copied.id = `workflow_${Date.now()}_${Math.floor(Math.random()*1000)}`
        return copied
      })

      this.addItem(targetIndex, newFolder)
      return true
    } catch (e) {
      console.error('[ConfigService] importFolderFromText error', e)
      return false
    }
  }

  async importAutoFromText(text, targetTabIndex = 0, targetFolderId = null) {
    try {
      const data = JSON.parse(text)
      if (data && data.type === 'flowpilot/workflow-export') {
        return await this.importWorkflowFromText(text, targetTabIndex, targetFolderId)
      }
      if (data && data.type === 'flowpilot/folder-export') {
        // 文件夹不支持导入到文件夹中（目前架构不支持嵌套文件夹），所以忽略 targetFolderId
        return await this.importFolderFromText(text, targetTabIndex)
      }
      return false
    } catch {
      return false
    }
  }

  _extractWorkflowRefs(workflow) {
    const env = new Set()
    const global = new Set()
    const addFromString = (s) => {
      if (typeof s !== 'string') return
      s.replace(/%([^%\s]+)%/g, (_, name) => { env.add(name); return '' })
      s.replace(/\$\{([^}]+)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g, (_, braced, simple) => { env.add(braced || simple); return '' })
      s.replace(/\{\{\s*vars\.([A-Za-z0-9_]+)\s*\}\}/g, (_, key) => { global.add(key); return '' })
    }
    const scan = (obj) => {
      if (!obj) return
      if (typeof obj === 'string') { addFromString(obj); return }
      if (Array.isArray(obj)) { obj.forEach(scan); return }
      if (typeof obj === 'object') { Object.values(obj).forEach(scan); return }
    }
    scan(workflow)
    Object.keys(workflow.env || {}).forEach((k) => env.add(k))
    return { env, global }
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
