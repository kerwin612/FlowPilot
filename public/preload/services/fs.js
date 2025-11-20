const fs = require('node:fs')
const path = require('node:path')

// Small, focused file APIs used by the renderer via preload
module.exports = {
  // Read file text synchronously (UTF-8)
  readFile(file) {
    return fs.readFileSync(file, { encoding: 'utf-8' })
  },

  // Write plain text into Downloads directory and return filepath
  writeTextFile(text) {
    const filePath = path.join(window.utools.getPath('downloads'), Date.now().toString() + '.txt')
    fs.writeFileSync(filePath, text, { encoding: 'utf-8' })
    return filePath
  },

  // Write text to specific path
  writeTextFileAt(filePath, text) {
    const dir = path.dirname(filePath)
    try { fs.mkdirSync(dir, { recursive: true }) } catch (e) {}
    try {
      fs.writeFileSync(filePath, text, { encoding: 'utf-8' })
      console.log('[fsService] writeTextFileAt ok', filePath)
    } catch (err) {
      console.error('[fsService] writeTextFileAt error', filePath, err)
      throw err
    }
    return filePath
  },

  // Write Base64 image data URL into Downloads directory and return filepath
  writeImageFile(base64Url) {
    const matchs = /^data:image\/([a-z]{1,20});base64,/i.exec(base64Url)
    if (!matchs) return
    const filePath = path.join(window.utools.getPath('downloads'), Date.now().toString() + '.' + matchs[1])
    fs.writeFileSync(filePath, base64Url.substring(matchs[0].length), { encoding: 'base64' })
    return filePath
  }
}
