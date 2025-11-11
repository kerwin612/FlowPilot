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
    loadWorkflows: workflowsService.loadWorkflows,
    saveWorkflows: workflowsService.saveWorkflows,
    resetWorkflows: workflowsService.resetWorkflows,
    executeCommand: workflowsService.executeCommand
  }
}
