const fsService = require('./services/fs.js')
const systemService = require('./services/system.js')
const platformService = require('./services/platform.js')
const workflowsService = require('./services/workflows/index.js')

  window.services = {
  getPlatform: platformService.getPlatform,
  readFile: fsService.readFile,
  readBinaryFile: fsService.readBinaryFile,
  readBinaryFileRaw: fsService.readBinaryFileRaw,
  pathExists: fsService.pathExists,
  writeTextFile: fsService.writeTextFile,
  writeTextFileAt: fsService.writeTextFileAt,
  writeBinaryFileAt: fsService.writeBinaryFileAt,
  writeBinaryFileRaw: fsService.writeBinaryFileRaw,
  writeImageFile: fsService.writeImageFile,
  getAbsolutePath: (p, context) => fsService.getAbsolutePath(p, context),

  browser: systemService.browser,
  openExternal: systemService.openExternal,
  openPath: systemService.openPath,
  writeClipboard: systemService.writeClipboard,
  selectPath: systemService.selectPath,
  redirect: systemService.redirect,
  showNotification: systemService.showNotification,
  getNativeId: systemService.getNativeId,
  allAiModels: systemService.allAiModels,
  ai: systemService.ai,

  workflow: {
    // 初始化和重置
    initDefault: workflowsService.initDefault,
    resetAll: workflowsService.resetAll,

    getProfiles: workflowsService.getProfiles,
    getActiveProfileId: workflowsService.getActiveProfileId,
    addProfile: workflowsService.addProfile,
    setActiveProfile: workflowsService.setActiveProfile,
    deleteProfile: workflowsService.deleteProfile,
    
    // Config
    getConfig: workflowsService.getConfig,
    saveConfig: workflowsService.saveConfig,
    
    // Tab CRUD
    getTabs: workflowsService.getTabs,
    getTab: workflowsService.getTab,
    saveTab: workflowsService.saveTab,
    deleteTab: workflowsService.deleteTab,
    updateTabs: workflowsService.updateTabs,
    
    // EnvVar CRUD
    getEnvVars: workflowsService.getEnvVars,
    getEnvVar: workflowsService.getEnvVar,
    saveEnvVar: workflowsService.saveEnvVar,
    deleteEnvVar: workflowsService.deleteEnvVar,
    saveEnvVars: workflowsService.saveEnvVars,
    updateEnvVarOrder: workflowsService.updateEnvVarOrder,
    
    // GlobalVar CRUD
    getGlobalVars: workflowsService.getGlobalVars,
    getGlobalVar: workflowsService.getGlobalVar,
    saveGlobalVar: workflowsService.saveGlobalVar,
    deleteGlobalVar: workflowsService.deleteGlobalVar,
    saveGlobalVars: workflowsService.saveGlobalVars,
    
    // Workflow CRUD
    getWorkflows: workflowsService.getWorkflows,
    getWorkflow: workflowsService.getWorkflow,
    saveWorkflow: workflowsService.saveWorkflow,
    deleteWorkflow: workflowsService.deleteWorkflow,
    
    // Folder CRUD
    getFolders: workflowsService.getFolders,
    getFolder: workflowsService.getFolder,
    saveFolder: workflowsService.saveFolder,
    deleteFolder: workflowsService.deleteFolder,
    cleanupIfUnreferenced: workflowsService.cleanupIfUnreferenced,
    
    // 业务逻辑
    buildCommand: workflowsService.buildCommand,
    executeCommand: workflowsService.executeCommand
  }
}

const defaults = require('./services/workflows/defaults.js')

window.fpGetPlatformType = () => {
  return platformService.getPlatform()
}

window.fpGetDefaultWorkflowExamples = (opts = {}) => {
  const platform = platformService()
  const tabs = defaults[platform] || []
  const examples = []
  const deepClone = (node) => {
    if (!node) return null
    if (node.type === 'workflow') return { ...node }
    if (node.type === 'folder') {
      return { ...node, items: (node.items || []).map(deepClone) }
    }
    return null
  }
  tabs.forEach((t) => {
    (t.items || []).forEach((it) => {
      if (it.type === 'workflow') {
        const payload = {
          type: 'flowpilot/workflow-export',
          version: '1',
          workflow: it,
          envVars: [],
          globalVars: []
        }
        examples.push({ type: 'workflow', name: it.name, json: JSON.stringify(payload, null, 2) })
      } else if (it.type === 'folder') {
        const cloned = deepClone(it)
        const payload = {
          type: 'flowpilot/folder-export',
          version: '1',
          folderId: it.id,
          name: it.name,
          iconType: it.iconType,
          icon: it.icon,
          iconKey: it.iconKey,
          iconText: it.iconText,
          iconEmoji: it.iconEmoji,
          iconSvg: it.iconSvg,
          iconColor: it.iconColor,
          items: [cloned],
          envVars: [],
          globalVars: []
        }
        examples.push({ type: 'folder', name: it.name, json: JSON.stringify(payload, null, 2) })
      }
    })
  })
  const limit = typeof opts.limit === 'number' && opts.limit > 0 ? opts.limit : null
  const out = limit ? examples.slice(0, limit) : examples
  return { platform, examples: out }
}

window.fpGetCurrentConfigExports = (opts = {}) => {
  const platform = platformService()
  const tabs = workflowsService.getTabs()
  const examples = []
  const deepClone = (node) => {
    if (!node) return null
    if (node.type === 'workflow') return { ...node }
    if (node.type === 'folder') {
      return { ...node, items: (node.items || []).map(deepClone) }
    }
    return null
  }
  ;(tabs || []).forEach((t) => {
    (t.items || []).forEach((it) => {
      if (it.type === 'workflow') {
        const payload = { type: 'flowpilot/workflow-export', version: '1', workflow: it, envVars: [], globalVars: [] }
        examples.push({ type: 'workflow', name: it.name, json: JSON.stringify(payload, null, 2) })
      } else if (it.type === 'folder') {
        const cloned = deepClone(it)
        const payload = { type: 'flowpilot/folder-export', version: '1', folderId: it.id, name: it.name, iconType: it.iconType, icon: it.icon, iconKey: it.iconKey, iconText: it.iconText, iconEmoji: it.iconEmoji, iconSvg: it.iconSvg, iconColor: it.iconColor, items: [cloned], envVars: [], globalVars: [] }
        examples.push({ type: 'folder', name: it.name, json: JSON.stringify(payload, null, 2) })
      }
    })
  })
  const limit = typeof opts.limit === 'number' && opts.limit > 0 ? opts.limit : null
  const out = limit ? examples.slice(0, limit) : examples
  return { platform, examples: out }
}
