const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const { expandStringWithEnv } = require('../core/env.js')

// Small, focused file APIs used by the renderer via preload
module.exports = {
  // Read file text synchronously (UTF-8)
  readFile(file) {
    return fs.readFileSync(file, { encoding: 'utf-8' })
  },

  // Read file as base64
  readBinaryFile(file) {
    const buf = fs.readFileSync(file)
    return buf.toString('base64')
  },

  // Read file as Uint8Array (raw bytes)
  readBinaryFileRaw(file) {
    const buf = fs.readFileSync(file)
    return new Uint8Array(buf)
  },

  // Check if path exists
  pathExists(filePath) {
    try { 
      console.log('[fsService] pathExists check', filePath)
      return fs.existsSync(filePath)
    } catch { 
      return false
    }
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

  // Write base64 data to specific path
  writeBinaryFileAt(filePath, base64) {
    const dir = path.dirname(filePath)
    try { fs.mkdirSync(dir, { recursive: true }) } catch (e) {}
    try {
      const buf = Buffer.from(base64, 'base64')
      fs.writeFileSync(filePath, buf)
      console.log('[fsService] writeBinaryFileAt ok', filePath)
    } catch (err) {
      console.error('[fsService] writeBinaryFileAt error', filePath, err)
      throw err
    }
    return filePath
  },

  // Write raw bytes (Uint8Array/ArrayBuffer/Buffer) to specific path
  writeBinaryFileRaw(filePath, data) {
    const dir = path.dirname(filePath)
    try { fs.mkdirSync(dir, { recursive: true }) } catch (e) {}
    let buf
    if (typeof data === 'string') {
      buf = Buffer.from(data, 'base64')
    } else if (data instanceof Uint8Array) {
      buf = Buffer.from(data)
    } else if (data && data.buffer instanceof ArrayBuffer) {
      buf = Buffer.from(new Uint8Array(data.buffer))
    } else if (data instanceof Buffer) {
      buf = data
    } else {
      throw new Error('Unsupported data type for writeBinaryFileRaw')
    }
    try {
      fs.writeFileSync(filePath, buf)
      console.log('[fsService] writeBinaryFileRaw ok', filePath)
    } catch (err) {
      console.error('[fsService] writeBinaryFileRaw error', filePath, err)
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
  ,
  // Resolve to absolute path with env expansion; input can be relative or contains env vars
  getAbsolutePath(inputPath, context = null) {
    const env = (context && (context.env || context.envs)) ? (context.env || context.envs) : {}
    const globals = (context && context.vars) ? { map: context.vars } : {}
    const expanded = expandStringWithEnv(inputPath, env, globals)
    const isAbsolute = path.isAbsolute(expanded)
    const base = (() => {
      try { return window.utools.getPath('home') } catch { return process.cwd() }
    })()
    const abs = isAbsolute ? expanded : path.resolve(base, expanded)
    return abs
  }
}
