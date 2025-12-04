function getApis(context = null) {
  const platform = {
    getPlatform: () => (typeof window !== 'undefined' && window.services && window.services.getPlatform ? window.services.getPlatform() : 'unknown')
  }

  const fs = {
    readText: (p) => (typeof window !== 'undefined' && window.services && window.services.readFile ? window.services.readFile(String(p)) : null),
    readBase64: (p) => (typeof window !== 'undefined' && window.services && window.services.readBinaryFile ? window.services.readBinaryFile(String(p)) : null),
    readBytes: (p) => (typeof window !== 'undefined' && window.services && window.services.readBinaryFileRaw ? window.services.readBinaryFileRaw(String(p)) : null),
    writeTextAt: (p, t) => {
      if (p && typeof p === 'object') { const o = p; p = o.path; t = o.content }
      const out = (typeof window !== 'undefined' && window.services && window.services.writeTextFileAt ? window.services.writeTextFileAt(String(p), String(t == null ? '' : t)) : null)
      if (out && window.services && window.services.showNotification) window.services.showNotification('已写入: ' + p)
      return out
    },
    writeBase64At: (p, b64) => {
      if (p && typeof p === 'object') { const o = p; p = o.path; b64 = o.base64 }
      const out = (typeof window !== 'undefined' && window.services && window.services.writeBinaryFileAt ? window.services.writeBinaryFileAt(String(p), String(b64 == null ? '' : b64)) : null)
      if (out && window.services && window.services.showNotification) window.services.showNotification('已写入: ' + p)
      return out
    },
    writeBytesAt: (p, data) => {
      if (p && typeof p === 'object') { const o = p; p = o.path; data = o.bytes }
      const out = (typeof window !== 'undefined' && window.services && window.services.writeBinaryFileRaw ? window.services.writeBinaryFileRaw(String(p), data) : null)
      if (out && window.services && window.services.showNotification) window.services.showNotification('已写入: ' + p)
      return out
    },
    pathExists: (p) => (typeof window !== 'undefined' && window.services && window.services.pathExists ? window.services.pathExists(String(p)) : false),
    resolveAbsolute: (p) => (typeof window !== 'undefined' && window.services && window.services.getAbsolutePath ? window.services.getAbsolutePath(String(p || ''), context) : String(p || ''))
  }

  const clipboard = {
    copy: async (text) => {
      const ok = await (typeof window !== 'undefined' && window.services && window.services.writeClipboard ? window.services.writeClipboard(String(text || '')) : false)
      if (ok && window.services && window.services.showNotification) window.services.showNotification('已复制到剪贴板')
      return ok
    }
  }

  const system = {
    open: (url) => (typeof window !== 'undefined' && window.services && window.services.openExternal ? window.services.openExternal(String(url || '')) : null),
    notify: (msg) => (typeof window !== 'undefined' && window.services && window.services.showNotification ? window.services.showNotification(String(msg || '')) : null),
    download: (text) => {
      const p = (typeof window !== 'undefined' && window.services && window.services.writeTextFile ? window.services.writeTextFile(String(text || '')) : null)
      if (p && window.services && window.services.showNotification) window.services.showNotification('已保存到: ' + p)
      return p
    },
    openPath: (p) => (typeof window !== 'undefined' && window.services && window.services.openPath ? window.services.openPath(String(p || '')) : null)
  }

  const exec = {
    run: (req) => {
      const payload = req || {}
      const ctx = context || null
      return (typeof window !== 'undefined' && window.services && window.services.executeCommand ? window.services.executeCommand(payload, ctx) : null)
    }
  }

  return { platform, fs, clipboard, system, exec }
}

async function callApi(name, payload) {
  const apis = getApis()
  const alias = {
    copy: 'clipboard.copy',
    open: 'system.open',
    notify: 'system.notify',
    download: 'system.download',
    openpath: 'system.openPath',
    writefile: 'fs.writeTextAt',
    writefileb64: 'fs.writeBase64At',
    writefilebytes: 'fs.writeBytesAt',
    readfile: 'fs.readText',
    readfileb64: 'fs.readBase64',
    readfilebytes: 'fs.readBytes',
    run: 'exec.run',
    getplatform: 'platform.getPlatform'
  }
  let parts = String(name || '').split('.').filter(Boolean)
  if (parts.length === 1) {
    var key = (parts[0] || '').toLowerCase()
    if (alias[key]) parts = alias[key].split('.')
  }
  let target = apis
  for (var i = 0; i < parts.length; i++) {
    var k = parts[i]
    target = target && target[k]
  }
  if (typeof target !== 'function') throw new Error('未知能力: ' + name)

  let args = payload
  if (typeof args === 'string') {
    var s = args.trim()
    if ((s.indexOf('{') === 0 && s.lastIndexOf('}') === s.length - 1) || (s.indexOf('[') === 0 && s.lastIndexOf(']') === s.length - 1)) {
      try { args = JSON.parse(s) } catch (e) {}
    }
  }

  if (Array.isArray(args)) return await target(...args)
  return await target(args)
}

function attachWindowApis(context = null) {
  if (typeof window !== 'undefined') {
    window.apis = getApis(context)
  }
}

module.exports = { getApis, callApi, attachWindowApis }
