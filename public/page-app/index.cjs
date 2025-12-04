const { ipcRenderer } = require("electron")
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
  try { window.__PAYLOAD__ = p.payload } catch (e) {
    console.error("[page-app preload] set payload error:", e)
  }
  try {
    const fn = new Function(String(p.js || ""))
    fn()
  } catch (e) {
    try { window.apis.notify("页面脚本错误: " + String(e && e.message ? e.message : e)) } catch (e) {
      console.error("[page-app preload] notify error:", e)
    }
  }
})
