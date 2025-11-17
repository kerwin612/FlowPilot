const browser = require('../core/browser.js')
const { showNotification } = require('../core/system.js')

// System- and shell-related helpers exposed to renderer
module.exports = {
  browser,
  showNotification,
  openExternal(url) {
    window.utools.shellOpenExternal(url)
  },
  openPath(filePath) {
    window.utools.shellOpenPath(filePath)
  },
  writeClipboard(text) {
    try {
      if (typeof text !== 'string') text = String(text ?? '')
      window.utools.copyText(text)
      return true
    } catch (err) {
      console.error('写入剪贴板失败:', err)
      return false
    }
  },
  async selectPath(options) {
    try {
      return await window.utools.showOpenDialog(options)
    } catch (err) {
      console.error('selectPath 错误:', err)
      return null
    }
  },
  /**
   * 跳转到其他插件
   * @param {string|[string, string]} label - 指令名称或 [插件名称, 指令名称]
   * @param {any} payload - 传递给目标插件的数据（可选）
   * @returns {boolean} 是否成功跳转
   * 
   * 使用示例：
   * 1. 只传递指令名称（会自动查找或让用户选择）：
   *    redirect('翻译', 'hello world')
   * 
   * 2. 传递插件名称和指令名称（精确定位）：
   *    redirect(['聚合翻译', '翻译'], 'hello world')
   * 
   * 3. 跳转功能指令（不需要 payload）：
   *    redirect(['JSON 编辑器', 'Json'])
   * 
   * 4. 传递复杂数据（如图片、文件）：
   *    redirect(['OCR 文字识别', 'OCR 文字识别'], {
   *      type: 'img',
   *      data: 'data:image/png;base64,...'
   *    })
   */
  redirect(label, payload) {
    try {
      if (!window.utools || typeof window.utools.redirect !== 'function') {
        console.error('utools.redirect 不可用')
        return false
      }

      // 参数校验
      if (!label) {
        console.error('redirect: label 参数不能为空')
        return false
      }

      // 标准化 label 参数
      let normalizedLabel = label
      if (Array.isArray(label)) {
        if (label.length !== 2 || !label[0] || !label[1]) {
          console.error('redirect: label 数组必须包含两个非空元素 [插件名称, 指令名称]')
          return false
        }
        normalizedLabel = [String(label[0]), String(label[1])]
      } else if (typeof label === 'string') {
        normalizedLabel = String(label)
      } else {
        console.error('redirect: label 必须是字符串或数组')
        return false
      }

      // 调用 utools.redirect
      const result = payload !== undefined 
        ? window.utools.redirect(normalizedLabel, payload)
        : window.utools.redirect(normalizedLabel)

      return result !== false
    } catch (err) {
      console.error('redirect 调用失败:', err)
      return false
    }
  },
  getNativeId() {
    if (typeof window !== 'undefined' && window.utools && typeof window.utools.getNativeId === 'function') {
      return window.utools.getNativeId()
    }
    return null
  }
}
