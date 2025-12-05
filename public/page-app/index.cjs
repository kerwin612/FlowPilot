const { ipcRenderer } = require("electron")
const fs = (() => { try { return require('fs') } catch { return null } })()
const pathMod = (() => { try { return require('path') } catch { return null } })()
try { require("../preload/services.js") } catch {}
const apis = require("./apis.cjs")
console.log("[page-app preload] loaded")

ipcRenderer.on("page-app:init", (event, payload) => {
  console.log("[page-app preload] init payload", payload && Object.keys(payload))
  const p = payload || {}
  try {
    const ctx = p && p.payload && p.payload.context
    apis.attachWindowApis(ctx)
    console.log("[page-app preload] apis:", window.apis)
    const exLen = Array.isArray(ctx && ctx.executors) ? ctx.executors.length : 0
    console.log("[page-app preload] executors length:", exLen)
    if (exLen > 0) {
      const last = ctx.executors[exLen - 1]
      console.log("[page-app preload] last executor keys:", last && Object.keys(last || {}))
      console.log("[page-app preload] last.result path preview:", last && last.result && last.result.value && Object.keys(last.result.value || {}))
    }
  } catch (e) {
    console.error("[page-app preload] init error:", e)
  }
  try { document.title = String(p.title || "页面应用") } catch (e) {
    console.error("[page-app preload] set title error:", e)
  }
  try { window.__PAYLOAD__ = p.payload } catch (e) {
    console.error("[page-app preload] set payload error:", e)
  }
  try {
    const mode = String(p.mode || 'split')
    if (mode === 'split') {
      try {
        const style = document.createElement("style")
        style.textContent = String(p.css || "")
        document.head.appendChild(style)
      } catch (e) {
        console.error("[page-app preload] add css error:", e)
      }
      try {
        const container = document.createElement("div")
        container.innerHTML = String(p.html || "")
        document.body.innerHTML = ""
        document.body.appendChild(container)
      } catch (e) {
        console.error("[page-app preload] add html error:", e)
      }
      try {
        const fn = new Function(String(p.js || ""))
        fn()
      } catch (e) {
        try { window.apis.notify("页面脚本错误: " + String(e && e.message ? e.message : e)) } catch (e2) {
          console.error("[page-app preload] notify error:", e2)
        }
      }
    } else if (mode === 'full' || mode === 'file') {
      let htmlContent = ''
      let baseHref = ''
      if (mode === 'full') {
        htmlContent = String(p.fullHtml || '')
      } else {
        try {
          const path = String(p.htmlFilePath || '')
          if (!path) throw new Error('HTML文件路径为空')
          if (!fs) throw new Error('fs 不可用')
          htmlContent = String(fs.readFileSync(path, 'utf-8'))
          try {
            const dir = pathMod && pathMod.dirname ? pathMod.dirname(path) : ''
            if (dir) {
              const normalized = String(dir).replace(/\\/g, '/')
              baseHref = '<base href="file://' + (normalized.endsWith('/') ? normalized : normalized + '/') + '">'
            }
          } catch {}
        } catch (e) {
          console.error('[page-app preload] read html file error:', e)
          try { window.apis.notify('读取HTML文件失败: ' + String(e && e.message ? e.message : e)) } catch {}
        }
      }
      try {
        const iframe = document.createElement('iframe')
        iframe.style.width = '100%'
        iframe.style.height = '100%'
        iframe.style.border = '0'
        iframe.style.display = 'block'
        const prefix = (baseHref || '') + '<script>try{window.apis=parent.apis}catch(e){};try{window.__PAYLOAD__=parent.__PAYLOAD__}catch(e){}<\/script>'
        iframe.srcdoc = prefix + htmlContent
        const mount = document.getElementById('root') || document.body
        mount.innerHTML = ''
        mount.appendChild(iframe)
      } catch (e) {
        console.error('[page-app preload] render full/html file error:', e)
      }
    }
  } catch (e) {
    console.error('[page-app preload] render mode error:', e)
  }
})
