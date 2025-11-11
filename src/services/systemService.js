/**
 * SystemService - 系统能力服务层
 *
 * 设计原则：
 * 1. 统一代理 uTools 和 window.services.* 相关 API
 * 2. 避免业务代码直接访问 window.utools 或 window.services
 * 3. 提供降级兼容（如环境不可用时的 fallback）
 * 4. 便于未来适配其他平台（Electron、Tauri 等）
 *
 * 边界约定：
 * - UI 组件和工作流引擎仅通过此服务访问系统能力
 * - preload 层负责注入 window.services，本层负责封装调用
 */

class SystemService {
  // 安全获取 utools 引用，避免未注入时报错
  get utools() {
    return typeof window !== 'undefined' ? window.utools || null : null
  }

  onPluginEnter(callback) {
    const u = this.utools
    if (u && typeof u.onPluginEnter === 'function') {
      return u.onPluginEnter(callback)
    }
  }

  onPluginOut(callback) {
    const u = this.utools
    if (u && typeof u.onPluginOut === 'function') {
      return u.onPluginOut(callback)
    }
  }

  // 弹出系统文件/目录选择
  async showOpenDialog(options = { properties: ['openFile'] }) {
    const u = this.utools
    if (u && typeof u.showOpenDialog === 'function') {
      try {
        return await u.showOpenDialog(options)
      } catch (e) {
        console.error('uTools.showOpenDialog 调用失败:', e)
        return null
      }
    }
    console.warn('uTools 不可用：showOpenDialog 调用被忽略')
    return null
  }

  // 设置顶部 SubInput 事件处理
  setSubInput(handler, placeholder = '') {
    const u = this.utools
    if (u && typeof u.setSubInput === 'function') {
      return u.setSubInput(handler, placeholder)
    }
  }

  setSubInputValue(value) {
    const u = this.utools
    if (u && typeof u.setSubInputValue === 'function') {
      return u.setSubInputValue(value)
    }
  }

  subInputSelect() {
    const u = this.utools
    if (u && typeof u.subInputSelect === 'function') {
      return u.subInputSelect()
    }
  }

  // 系统通知
  showNotification(message) {
    const u = this.utools
    if (u && typeof u.showNotification === 'function') {
      return u.showNotification(message)
    }
    // 退化为 console
    console.info('[Notification]', message)
  }

  // ==================== 文件系统 ====================

  /**
   * 读取文件内容
   * @param {string} filePath - 文件路径
   * @returns {string|null} 文件内容
   */
  readFile(filePath) {
    if (typeof window !== 'undefined' && window.services?.readFile) {
      return window.services.readFile(filePath)
    }
    console.warn('window.services.readFile 不可用')
    return null
  }

  /**
   * 写入文本文件（用于 Write 功能）
   * @param {string} content - 文本内容
   * @returns {string|null} 输出路径
   */
  writeTextFile(content) {
    if (typeof window !== 'undefined' && window.services?.writeTextFile) {
      return window.services.writeTextFile(content)
    }
    console.warn('window.services.writeTextFile 不可用')
    return null
  }

  /**
   * 写入图片文件（用于 Write 功能）
   * @param {string} dataUrl - 图片 base64
   * @returns {string|null} 输出路径
   */
  writeImageFile(dataUrl) {
    if (typeof window !== 'undefined' && window.services?.writeImageFile) {
      return window.services.writeImageFile(dataUrl)
    }
    console.warn('window.services.writeImageFile 不可用')
    return null
  }

  // ==================== 路径与外部链接 ====================

  /**
   * 选择路径（文件或目录）
   * @param {Object} options - 选择选项 { type: 'file'|'directory', title, defaultPath }
   * @returns {Promise<string|null>}
   */
  async selectPath(options = {}) {
    if (typeof window !== 'undefined' && window.services?.selectPath) {
      return await window.services.selectPath(options)
    }
    console.warn('window.services.selectPath 不可用')
    return null
  }

  /**
   * 打开文件路径（用系统默认应用）
   * @param {string} path - 文件或目录路径
   * @returns {Promise<void>}
   */
  async openPath(path) {
    if (typeof window !== 'undefined' && window.services?.openPath) {
      return await window.services.openPath(path)
    }
    console.warn('window.services.openPath 不可用')
  }

  /**
   * 打开外部链接（浏览器）
   * @param {string} url - URL 地址
   * @returns {Promise<void>}
   */
  async openExternal(url) {
    if (typeof window !== 'undefined' && window.services?.openExternal) {
      return await window.services.openExternal(url)
    }
    console.warn('window.services.openExternal 不可用，尝试 window.open')
    if (typeof window !== 'undefined') {
      window.open(url, '_blank')
    }
  }

  // ==================== 剪贴板 ====================

  /**
   * 写入剪贴板
   * @param {string} text - 文本内容
   * @returns {Promise<boolean>} 是否成功
   */
  async writeClipboard(text) {
    if (typeof window !== 'undefined' && window.services?.writeClipboard) {
      return await window.services.writeClipboard(text)
    }
    console.warn('window.services.writeClipboard 不可用')
    return false
  }

  // ==================== 内置浏览器 ====================

  /**
   * 打开内置浏览器（uTools ubrowser）
   * @param {Object} options - 浏览器选项 { url, json }
   * @returns {Promise<void>}
   */
  async openBrowser(options) {
    if (typeof window !== 'undefined' && window.services?.browser) {
      return await window.services.browser(options)
    }
    console.warn('window.services.browser 不可用')
  }

  // ==================== 插件跳转 ====================

  /**
   * 跳转到其他 uTools 插件
   * @param {string|[string, string]} label - 指令名称或 [插件名称, 指令名称]
   * @param {any} payload - 传递给目标插件的数据（可选）
   * @returns {Promise<boolean>} 是否成功跳转
   *
   * 使用说明：
   * - label 为 string 时：只传递指令名称，uTools 会查找所有拥有该指令的插件
   *   - 找到唯一插件：直接打开
   *   - 找到多个插件：让用户选择
   *   - 未找到插件：跳转到插件市场搜索
   *
   * - label 为 [string, string] 时：[插件名称, 指令名称]，精确定位
   *   - 插件已安装：直接打开对应指令
   *   - 插件未安装：跳转到插件市场下载后打开
   *
   * - payload：
   *   - 跳转「功能指令」时可不传或传 undefined
   *   - 跳转「匹配指令」时必须传入指令可匹配的内容
   *
   * 示例：
   * ```js
   * // 1. 跳转到翻译指令（自动查找或让用户选择）
   * await redirect('翻译', 'hello world')
   *
   * // 2. 跳转到指定插件的翻译功能
   * await redirect(['聚合翻译', '翻译'], 'hello world')
   *
   * // 3. 跳转到 JSON 编辑器（功能指令，无需 payload）
   * await redirect(['JSON 编辑器', 'Json'])
   *
   * // 4. 跳转到 OCR 识别（传递图片数据）
   * await redirect(['OCR 文字识别', 'OCR 文字识别'], {
   *   type: 'img',
   *   data: 'data:image/png;base64,...'
   * })
   *
   * // 5. 跳转到 JSON 编辑器查看文件
   * await redirect(['JSON 编辑器', 'Json'], {
   *   type: 'files',
   *   data: '/path/to/file.json'
   * })
   * ```
   */
  async redirect(label, payload) {
    if (typeof window !== 'undefined' && window.services?.redirect) {
      return await window.services.redirect(label, payload)
    }
    console.warn('window.services.redirect 不可用')
    return false
  }

  // ==================== 命令执行（工作流） ====================

  /**
   * 执行系统命令（通过 preload workflow.executeCommand）
   * @param {Object} request - { command, runInBackground, timeout, env, showWindow }
   * @param {Object} extra - 预留扩展
   * @returns {Promise<{success: boolean, result: any}>}
   */
  async executeCommand(request, extra = {}) {
    const api = typeof window !== 'undefined' && window.services?.workflow?.executeCommand
    if (!api) {
      console.warn('window.services.workflow.executeCommand 不可用')
      return { success: false, result: null }
    }
    return await api(request, extra)
  }
}

export default new SystemService()
