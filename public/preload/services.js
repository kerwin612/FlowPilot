const fsService = require('./services/fs.js')
const systemService = require('./services/system.js')
const workflowsService = require('./services/workflows/index.js')

window.services = {
  readFile: fsService.readFile,
  writeTextFile: fsService.writeTextFile,
  writeImageFile: fsService.writeImageFile,

  browser: systemService.browser,
  openExternal: systemService.openExternal,
  openPath: systemService.openPath,
  writeClipboard: systemService.writeClipboard,
  selectPath: systemService.selectPath,
  redirect: systemService.redirect,
  showNotification: systemService.showNotification,

  workflow: {
    // 初始化和重置
    initDefault: workflowsService.initDefault,
    resetAll: workflowsService.resetAll,
    
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
    
    // 业务逻辑
    buildCommand: workflowsService.buildCommand,
    executeCommand: workflowsService.executeCommand
  }
}
