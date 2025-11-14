/**
 * ConfigService - 配置管理服务
 *
 * 职责：
 * 1. 统一管理所有配置的读取和保存
 * 2. 封装 window.services.workflow.* 配置持久化调用
 * 3. 提供响应式配置订阅机制
 * 4. 管理环境变量配置
 *
 * 边界约定：
 * - UI 组件仅通过此服务访问配置，不直接调用 window.services
 * - 配置变更通过 subscribe/notify 机制广播
 */

class ConfigService {
  constructor() {
    this.config = null
    this.listeners = []
  }

  /**
   * 加载配置
   */
  loadConfig() {
    this.config = window.services.workflow.loadWorkflows()
    this.notifyListeners()
    return this.config
  }

  /**
   * 保存配置
   */
  saveConfig(newConfig) {
    window.services.workflow.saveWorkflows(newConfig)
    this.config = newConfig
    this.notifyListeners()
  }

  /**
   * 重置配置
   */
  resetConfig() {
    const defaultConfig = window.services.workflow.resetWorkflows()
    this.config = defaultConfig
    this.notifyListeners()
    return defaultConfig
  }

  /**
   * 获取当前配置
   */
  getConfig() {
    return this.config
  }

  /**
   * 获取所有标签页
   */
  getTabs() {
    return this.config?.tabs || []
  }

  /**
   * 获取环境变量配置
   */
  getEnvVars() {
    return this.config?.envVars || []
  }

  /**
   * 获取启用的环境变量（用于执行时注入）
   */
  getEnabledEnvVars() {
    const envVars = this.getEnvVars()
    return envVars
      .filter((v) => v.enabled && v.name && v.name.trim())
      .reduce((acc, v) => {
        acc[v.name.trim()] = v.value || ''
        return acc
      }, {})
  }

  /**
   * 获取全局变量配置
   */
  getGlobalVars() {
    return this.config?.globalVars || []
  }

  /**
   * 获取全局变量 Map（用于模板解析）
   * 返回的对象包含：
   * - 直接 key-value 映射（用于 {{vars.KEY}} 访问，取第一个匹配的值）
   * - _raw 属性（原始数组，用于标签筛选）
   */
  getGlobalVarsMap() {
    const globalVars = this.getGlobalVars()
    const map = {}
    
    // key 可以重复，相同 key 的变量按顺序保存
    // 直接访问 vars.KEY 时取第一个匹配的值
    globalVars.forEach((v) => {
      if (v.key && v.key.trim()) {
        const key = v.key.trim()
        // 只保存第一个出现的 key 对应的 value（用于直接访问）
        if (!(key in map)) {
          map[key] = v.value || ''
        }
      }
    })
    
    // 附加原始数组，用于标签筛选和索引访问
    map._raw = globalVars
    return map
  }

  /**
   * 获取所有已使用的标签（用于筛选和自动补全）
   * @param {Array} globalVars - 可选：直接传入全局变量数组（用于实时获取，不依赖 this.config）
   * @returns {Array} 排序后的标签数组
   */
  getAllTags(globalVars) {
    // 如果没有传入参数，从 config 中获取
    const vars = globalVars || this.getGlobalVars()
    const tagsSet = new Set()
    vars.forEach((v) => {
      if (v.tags && Array.isArray(v.tags)) {
        v.tags.forEach((tag) => tagsSet.add(tag))
      }
    })
    return Array.from(tagsSet).sort()
  }

  /**
   * 获取指定标签页
   */
  getTab(tabIndex) {
    const tabs = this.getTabs()
    return tabs[tabIndex] || null
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
    const tabs = [...this.getTabs(), newTab]
    this.saveConfig({ ...this.config, tabs })
    return newTab
  }

  /**
   * 更新标签页
   */
  updateTab(tabIndex, updates) {
    const tabs = [...this.getTabs()]
    if (tabs[tabIndex]) {
      tabs[tabIndex] = { ...tabs[tabIndex], ...updates }
      this.saveConfig({ ...this.config, tabs })
    }
  }

  /**
   * 删除标签页
   */
  deleteTab(tabIndex) {
    const tabs = this.getTabs().filter((_, i) => i !== tabIndex)
    this.saveConfig({ ...this.config, tabs })
  }

  /**
   * 添加项目到标签页
   */
  addItem(tabIndex, item) {
    const tabs = [...this.getTabs()]
    const tab = tabs[tabIndex]
    if (tab) {
      tab.items = [...(tab.items || []), item]
      this.saveConfig({ ...this.config, tabs })
    }
  }

  /**
   * 更新项目
   */
  updateItem(tabIndex, itemId, updates) {
    const tabs = [...this.getTabs()]
    const tab = tabs[tabIndex]
    if (tab) {
      const itemIndex = tab.items.findIndex((item) => item.id === itemId)
      if (itemIndex !== -1) {
        tab.items[itemIndex] = { ...tab.items[itemIndex], ...updates }
        this.saveConfig({ ...this.config, tabs })
      }
    }
  }

  /**
   * 删除项目
   */
  deleteItem(tabIndex, itemId) {
    const tabs = [...this.getTabs()]
    const tab = tabs[tabIndex]
    if (tab) {
      tab.items = tab.items.filter((item) => item.id !== itemId)
      this.saveConfig({ ...this.config, tabs })
    }
  }

  /**
   * 重新排序项目
   */
  reorderItems(tabIndex, newOrder) {
    const tabs = [...this.getTabs()]
    const tab = tabs[tabIndex]
    if (tab) {
      tab.items = newOrder
      this.saveConfig({ ...this.config, tabs })
    }
  }

  /**
   * 将项目移动到文件夹
   */
  moveItemToFolder(tabIndex, itemId, folderId) {
    const tabs = [...this.getTabs()]
    const tab = tabs[tabIndex]
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

    this.saveConfig({ ...this.config, tabs })
  }

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
    this.listeners.forEach((listener) => listener(this.config))
  }

  /**
   * 获取所有工作流（扁平化，包括文件夹内的）
   * 用于注册动态指令
   */
  getAllWorkflows() {
    const workflows = []
    const tabs = this.getTabs()

    const collectWorkflows = (items) => {
      items.forEach((item) => {
        if (item.type === 'workflow') {
          workflows.push(item)
        } else if (item.type === 'folder' && Array.isArray(item.items)) {
          collectWorkflows(item.items)
        }
      })
    }

    tabs.forEach((tab) => {
      if (Array.isArray(tab.items)) {
        collectWorkflows(tab.items)
      }
    })

    return workflows
  }
}

// 导出单例
export default new ConfigService()
