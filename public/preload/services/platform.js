const process = require('node:process')

// Return current OS platform string: 'win32' | 'darwin' | 'linux'
function getPlatform() {
  return process.platform
}

module.exports = getPlatform
