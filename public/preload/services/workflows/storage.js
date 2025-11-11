const storageCore = require('../../core/storage.js')
const getPlatform = require('../platform.js')

function getConfigKey() {
  const platform = getPlatform()
  return `workflows_${platform}`
}

function get() {
  return storageCore.settings.get(getConfigKey())
}

function set(config) {
  config.platform = getPlatform()
  storageCore.settings.set(getConfigKey(), config)
}

function remove() {
  storageCore.settings.remove(getConfigKey())
}

module.exports = {
  getConfigKey,
  get,
  set,
  remove
}
