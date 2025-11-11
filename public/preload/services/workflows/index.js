const fs = require('node:fs')
const command = require('../../core/command.js')
const getPlatform = require('../platform.js')
const defaults = require('./defaults.js')
const storage = require('./storage.js')
const { applyMigrations, CONFIG_VERSION } = require('./migrations.js')

function initDefaultConfig() {
  const platform = getPlatform()
  const defaultTabs = defaults[platform] || defaults.linux
  const config = {
    // 统一使用语义化字符串版本，迁移逻辑参见 migrations.js
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
  storage.set(config)
  return config
}

function loadWorkflows() {
  let config = storage.get()
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

  const migrated = applyMigrations(config)
  if (migrated.changed) {
    storage.set(migrated.config)
    return migrated.config
  }
  return config
}

function saveWorkflows(config) {
  storage.set(config)
  return true
}

function resetWorkflows() {
  storage.remove()
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

  // 责任边界说明：
  // 1. 本函数直接执行系统命令，不做内容审查或沙箱隔离
  // 2. 安全责任由调用方（工作流配置者）承担
  // 3. UI 层（CommandExecutor ConfigComponent）提供风险提示，但不强制拦截
  // 4. 建议：生产环境应根据需求增加权限控制、审计日志等措施
async function executeCommand(workflow, params = {}) {
  const cmd = buildCommand(workflow, params)
  try {
    const result = await command(cmd, {
      detached: workflow.runInBackground || false,
      timeout: workflow.timeout || 0,
      env: { ...process.env, ...(workflow.env || {}) },
      showWindow: workflow.showWindow !== false
    })
    return { success: true, result }
  } catch (error) {
    console.error('命令执行失败:', error)
    throw error
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
