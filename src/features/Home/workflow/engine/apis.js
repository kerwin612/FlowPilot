import { systemService } from '../../../../services'

export function getApis(context = null) {
  const platform = {
    getPlatform: () => (typeof window !== 'undefined' && window.services?.getPlatform ? window.services.getPlatform() : 'unknown')
  }

  const fs = {
    readText: (p) => (typeof window !== 'undefined' && window.services?.readFile ? window.services.readFile(String(p)) : null),
    readBase64: (p) => (typeof window !== 'undefined' && window.services?.readBinaryFile ? window.services.readBinaryFile(String(p)) : null),
    readBytes: (p) => (typeof window !== 'undefined' && window.services?.readBinaryFileRaw ? window.services.readBinaryFileRaw(String(p)) : null),
    writeTextAt: (p, t) => {
      if (p && typeof p === 'object') { const { path, content } = p; p = path; t = content }
      const out = (typeof window !== 'undefined' && window.services?.writeTextFileAt ? window.services.writeTextFileAt(String(p), String(t ?? '')) : null)
      if (out) systemService.showNotification('已写入: ' + p)
      return out
    },
    writeBase64At: (p, b64) => {
      if (p && typeof p === 'object') { const { path, base64 } = p; p = path; b64 = base64 }
      const out = (typeof window !== 'undefined' && window.services?.writeBinaryFileAt ? window.services.writeBinaryFileAt(String(p), String(b64 ?? '')) : null)
      if (out) systemService.showNotification('已写入: ' + p)
      return out
    },
    writeBytesAt: (p, data) => {
      if (p && typeof p === 'object') { const { path, bytes } = p; p = path; data = bytes }
      const out = (typeof window !== 'undefined' && window.services?.writeBinaryFileRaw ? window.services.writeBinaryFileRaw(String(p), data) : null)
      if (out) systemService.showNotification('已写入: ' + p)
      return out
    },
    pathExists: (p) => (typeof window !== 'undefined' && window.services?.pathExists ? window.services.pathExists(String(p)) : false),
    resolveAbsolute: (p) => (typeof window !== 'undefined' && window.services?.getAbsolutePath ? window.services.getAbsolutePath(String(p || ''), context) : String(p || ''))
  }

  const clipboard = {
    copy: async (text) => {
      const ok = await systemService.writeClipboard(String(text || ''))
      if (ok) systemService.showNotification('已复制到剪贴板')
      return ok
    }
  }

  const system = {
    open: (url) => systemService.openExternal(String(url || '')),
    notify: (msg) => systemService.showNotification(String(msg || '')),
    download: (text) => {
      const p = systemService.writeTextFile(String(text || ''))
      if (p) systemService.showNotification('已保存到: ' + p)
      return p
    },
    openPath: (p) => systemService.openPath(String(p || ''))
  }

  const exec = {
    run: (req) => {
      const payload = req || {}
      const ctx = context || null
      return systemService.executeCommand(payload, ctx)
    }
  }

  return { platform, fs, clipboard, system, exec }
}

export async function callApi(name, payload) {
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
  if (parts.length === 1 && alias[parts[0]?.toLowerCase()]) {
    parts = alias[parts[0].toLowerCase()].split('.')
  }
  let target = apis
  for (const k of parts) {
    target = target?.[k]
  }
  if (typeof target !== 'function') throw new Error('未知能力: ' + name)

  let args = payload
  if (typeof args === 'string') {
    const s = args.trim()
    if ((s.startsWith('{') && s.endsWith('}')) || (s.startsWith('[') && s.endsWith(']'))) {
      try { args = JSON.parse(s) } catch {}
    }
  }

  if (Array.isArray(args)) return await target(...args)
  return await target(args)
}

export function attachWindowApis(context = null) {
  if (typeof window !== 'undefined') {
    if (!window.apis) {
      window.apis = getApis(context)
    }
  }
}
