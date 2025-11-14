const fs = require('node:fs')
const command = require('../../core/command.js')
const getPlatform = require('../platform.js')
const defaults = require('./defaults.js')
const storage = require('./storage.js')

const CONFIG_VERSION = '1.0'

function initDefaultConfig() {
  const platform = getPlatform()
  const defaultTabs = defaults[platform] || defaults.linux
  const config = {
    version: CONFIG_VERSION,
    platform,
    tabs: defaultTabs,
    envVars: [
      {
        id: 'env_home',
        name: 'HOME',
        value: process.env.HOME || process.env.USERPROFILE || '',
        enabled: true,
        description: '用户主目录'
      },
      {
        id: 'env_temp',
        name: 'TEMP',
        value: process.env.TEMP || process.env.TMPDIR || '/tmp',
        enabled: true,
        description: '临时目录'
      }
    ]
  }
  
  // 使用新的拆分存储
  storage.saveFullConfig(config)
  return config
}

function loadWorkflows() {
  // 使用新的组装加载
  let config = storage.loadFullConfig()
  
  if (!config || !config.tabs) {
    config = initDefaultConfig()
    return config
  }

  // 兼容旧版本：若 version 为数字或缺失，转为字符串
  if (!config.version) {
    config.version = '0.0.0'
  } else if (typeof config.version === 'number') {
    config.version = String(config.version) + '.0'
  }

  return config
}

function saveWorkflows(config) {
  // 使用新的拆分存储
  storage.saveFullConfig(config)
  return true
}

function resetWorkflows() {
  // 使用新的删除方法
  storage.removeFullConfig()
  return initDefaultConfig()
}

function buildCommand(workflow, params = {}) {
  let cmd = workflow.command || ''
  
  // 如果命令中包含参数占位符 {参数名}，则替换
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
 * 支持 Windows 风格 %VAR% 和 Unix 风格 $VAR
 * @param {Object} customEnv - 用户自定义环境变量
 * @param {Object} baseEnv - 基础环境变量（通常是 process.env）
 * @returns {Object} 展开后的环境变量
 */
function expandEnvVars(customEnv, baseEnv) {
  if (!customEnv || typeof customEnv !== 'object') {
    return {}
  }

  const expanded = {}
  
  // 先收集所有已展开的值，用于处理变量间的依赖
  const resolving = new Set()

  Object.keys(customEnv).forEach(key => {
    expanded[key] = resolveVar(key, customEnv, baseEnv, expanded, resolving)
  })

  return expanded
}

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
    // 如果引用的是自己，使用 baseEnv 中的值
    if (varName === key) {
      return baseEnv[varName] || ''
    }
    // 如果引用的是其他自定义变量，递归展开
    if (customEnv.hasOwnProperty(varName)) {
      if (!expanded.hasOwnProperty(varName)) {
        expanded[varName] = resolveVar(varName, customEnv, baseEnv, expanded, resolving)
      }
      return expanded[varName]
    }
    // 否则从 baseEnv 中查找
    return baseEnv[varName] || match
  })

  // 展开 Unix 风格的 $VAR 和 ${VAR}
  value = value.replace(/\$\{([^}]+)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g, (match, braced, simple) => {
    const varName = braced || simple
    // 如果引用的是自己，使用 baseEnv 中的值
    if (varName === key) {
      return baseEnv[varName] || ''
    }
    // 如果引用的是其他自定义变量，递归展开
    if (customEnv.hasOwnProperty(varName)) {
      if (!expanded.hasOwnProperty(varName)) {
        expanded[varName] = resolveVar(varName, customEnv, baseEnv, expanded, resolving)
      }
      return expanded[varName]
    }
    // 否则从 baseEnv 中查找
    return baseEnv[varName] || match
  })

  resolving.delete(key)
  return value
}

  // 责任边界说明：
  // 1. 本函数直接执行系统命令，不做内容审查或沙箱隔离
  // 2. 安全责任由调用方（工作流配置者）承担
  // 3. UI 层（CommandExecutor ConfigComponent）提供风险提示，但不强制拦截
  // 4. 建议：生产环境应根据需求增加权限控制、审计日志等措施
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
    console.error('命令执行失败:', error)
    // 返回友好的错误信息而不是直接抛出
    return {
      success: false,
      error: error.message || '命令执行失败',
      code: error.code,
      details: error.toString()
    }
  }
}

module.exports = {
  _getConfigKey: storage.getConfigKey,
  _initDefaultConfig: initDefaultConfig,
  loadWorkflows,
  saveWorkflows,
  resetWorkflows,
  buildCommand,
  executeCommand
}
