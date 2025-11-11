// https://www.u-tools.cn/docs/developer/api-reference/ubrowser/ubrowser.html

function browser(info) {
  try {
    // 初始化 ubrowser
    let ubrowser = window.utools.ubrowser
    
    // 应用初始化配置
    if (info.useragent) {
      ubrowser = ubrowser.useragent(info.useragent)
    }
    if (info.viewport) {
      ubrowser = ubrowser.viewport(info.viewport.width, info.viewport.height)
    }
    if (info.device) {
      ubrowser = ubrowser.device(info.device)
    }
    if (info.clearCookies) {
      ubrowser = ubrowser.clearCookies(info.clearCookiesUrl)
    }
    
    // 导航到指定 URL
    ubrowser = ubrowser.goto(info.url, info?.headers ?? {}, info?.timeout ?? 30000)
    
    // 执行步骤序列
    const steps = info?.steps ?? []
    for (const step of steps) {
      ubrowser = executeStep(ubrowser, step)
    }
    
    // 执行并返回结果
    return ubrowser.run(info?.ubrowserId, info?.options ?? {})
  } catch (e) {
    console.error('浏览器操作失败:', e)
    // 显示友好错误提示
    browser({
      url: 'https://github.com',
      headers: {},
      timeout: 30000,
      steps: [
        { action: 'wait', value: '.search-input-container' },
        { action: 'wait', value: 100 },
        { action: 'click', value: '.search-input-container' },
        { action: 'wait', value: 300 },
        { action: 'focus', value: '#query-builder-test' },
        { action: 'wait', value: 500 },
        { action: 'value', value: '#query-builder-test', input: 'user:kerwin612' },
        { action: 'wait', value: 500 },
        { action: 'press', value: 'enter' },
        { action: 'wait', value: '.js-profile-editable-replace' },
        { action: 'wait', value: 800 },
        { action: 'evaluate', value: "() => alert('非常抱歉，让你看到这一幕，请联系我解决这个问题。')" }
      ],
      options: { width: 1200, height: 800 }
    })
  }
}

/**
 * 执行单个步骤
 * @param {UBrowser} ubrowser - ubrowser 实例
 * @param {Object} step - 步骤配置
 * @returns {UBrowser} 返回 ubrowser 实例以支持链式调用
 */
function executeStep(ubrowser, step) {
  const action = step.action
  
  switch (action) {
    // 等待操作
    case 'wait':
      if (typeof step.value === 'number') {
        // 等待指定毫秒数
        return ubrowser.wait(step.value)
      } else if (typeof step.value === 'string') {
        // 等待元素出现
        return ubrowser.wait(step.value, step.timeout)
      } else if (typeof step.value === 'function' || step.func) {
        // 等待函数返回 true
        const fn = createFunction(step.value || step.func)
        return ubrowser.wait(fn, step.timeout, ...(step.args || []))
      }
      return ubrowser
    
    // 条件判断
    case 'when':
      if (typeof step.value === 'string') {
        return ubrowser.when(step.value)
      } else if (typeof step.value === 'function' || step.func) {
        const fn = createFunction(step.value || step.func)
        return ubrowser.when(fn, ...(step.args || []))
      }
      return ubrowser
    
    case 'end':
      return ubrowser.end()
    
    // 窗口控制
    case 'hide':
      return ubrowser.hide()
    
    case 'show':
      return ubrowser.show()
    
    case 'devTools':
      ubrowser.devTools(step.mode || step.value)
      return ubrowser
    
    // 页面导航和设置
    case 'useragent':
      return ubrowser.useragent(step.value)
    
    case 'viewport':
      return ubrowser.viewport(step.width || step.value, step.height)
    
    case 'device':
      return ubrowser.device(step.value)
    
    // 元素交互
    case 'click':
      return ubrowser.click(step.value)
    
    case 'mousedown':
      return ubrowser.mousedown(step.value)
    
    case 'mouseup':
      return ubrowser.mouseup(step.value)
    
    case 'focus':
      return ubrowser.focus(step.value)
    
    case 'value':
      return ubrowser.value(step.value, step.input || step.payload)
    
    case 'check':
      return ubrowser.check(step.value, step.checked)
    
    case 'file':
      return ubrowser.file(step.value, step.payload || step.path)
    
    // 键盘操作
    case 'press':
      if (step.modifiers && step.modifiers.length > 0) {
        return ubrowser.press(step.value, ...step.modifiers)
      }
      return ubrowser.press(step.value)
    
    case 'paste':
      return ubrowser.paste(step.value || step.text)
    
    // 滚动操作
    case 'scroll':
      if (typeof step.value === 'string') {
        return ubrowser.scroll(step.value)
      } else if (step.y !== undefined && step.x === undefined) {
        return ubrowser.scroll(step.y)
      } else if (step.x !== undefined && step.y !== undefined) {
        return ubrowser.scroll(step.x, step.y)
      } else if (typeof step.value === 'number') {
        if (step.y !== undefined) {
          return ubrowser.scroll(step.value, step.y)
        }
        return ubrowser.scroll(step.value)
      }
      return ubrowser
    
    // 代码执行
    case 'css':
      return ubrowser.css(step.value)
    
    case 'evaluate':
      const fn = createFunction(step.value || step.func)
      return ubrowser.evaluate(fn, ...(step.args || step.params || []))
    
    // Cookie 操作
    case 'cookies':
      if (typeof step.value === 'string') {
        return ubrowser.cookies(step.value)
      } else if (typeof step.value === 'object') {
        return ubrowser.cookies(step.value)
      }
      return ubrowser.cookies()
    
    case 'setCookies':
      if (Array.isArray(step.value)) {
        return ubrowser.setCookies(step.value)
      } else if (step.name && step.value !== undefined) {
        return ubrowser.setCookies(step.name, step.value)
      }
      return ubrowser
    
    case 'removeCookies':
      return ubrowser.removeCookies(step.value || step.name)
    
    case 'clearCookies':
      return ubrowser.clearCookies(step.value || step.url)
    
    // 内容提取
    case 'screenshot':
      if (step.target) {
        return ubrowser.screenshot(step.target, step.savePath)
      } else if (step.rect) {
        return ubrowser.screenshot(step.rect, step.savePath)
      }
      return ubrowser.screenshot(undefined, step.savePath)
    
    case 'markdown':
      return ubrowser.markdown(step.selector || step.value)
    
    case 'pdf':
      return ubrowser.pdf(step.options || step.value, step.savePath)
    
    // 下载操作
    case 'download':
      if (typeof step.value === 'string') {
        // URL 下载
        return ubrowser.download(step.value, step.savePath)
      } else if (typeof step.value === 'function' || step.func) {
        // 函数下载
        const fn = createFunction(step.value || step.func)
        return ubrowser.download(fn, step.savePath, ...(step.args || []))
      }
      return ubrowser
    
    default:
      console.warn(`未知的操作类型: ${action}`)
      return ubrowser
  }
}

/**
 * 创建函数的通用方法
 * @param {string|Function} funcOrStr - 函数或函数字符串
 * @returns {Function} 返回创建的函数
 */
function createFunction(funcOrStr) {
  if (typeof funcOrStr === 'function') {
    return funcOrStr
  }
  
  const funcStr = String(funcOrStr).trim()
  
  try {
    // 尝试直接执行，支持箭头函数、匿名函数等
    const fn = eval(`(${funcStr})`)
    if (typeof fn === 'function') {
      return fn
    }
  } catch (e) {
    // 继续尝试其他方式
  }
  
  try {
    // 尝试作为函数表达式
    return new Function(`return (${funcStr})`)()
  } catch (e) {
    // 继续尝试其他方式
  }
  
  try {
    // 尝试作为函数体创建
    return new Function(funcStr)
  } catch (err) {
    console.error('函数创建失败:', err)
    return () => {}
  }
}

module.exports = browser
