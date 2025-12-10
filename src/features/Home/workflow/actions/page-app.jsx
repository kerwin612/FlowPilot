import React, { useEffect, useState } from 'react'
import { Input, Checkbox, Radio, Button, Space } from 'antd'
import { resolveTemplate } from '../engine/compile'

const PageAppConfig = ({ value = {}, onChange }) => {
  const [title, setTitle] = useState(value.title || '页面应用')
  const [allowPopups, setAllowPopups] = useState(value.allowPopups ?? true)
  const [singleton, setSingleton] = useState(value.singleton ?? false)
  const [mode, setMode] = useState(value.mode || 'split')
  const [html, setHtml] = useState(value.html || '<div id="app"></div>')
  const [css, setCss] = useState(value.css || '')
  const [js, setJs] = useState(value.js || '(() => { document.getElementById("app").innerHTML = "Hello Page"; })()')
  const [fullHtml, setFullHtml] = useState(value.fullHtml || '')
  const [htmlFilePath, setHtmlFilePath] = useState(value.htmlFilePath || '')
  const [fullscreen, setFullscreen] = useState(value.fullscreen ?? false)
  const [width, setWidth] = useState(value.width || 960)
  const [height, setHeight] = useState(value.height || 600)
  const [alwaysOnTop, setAlwaysOnTop] = useState(value.alwaysOnTop ?? false)
  const [resizable, setResizable] = useState(value.resizable ?? true)
  const [frameless, setFrameless] = useState(value.frameless ?? false)
  const [devTools, setDevTools] = useState(value.devTools ?? false)

  useEffect(() => {
    onChange?.({ title, allowPopups, singleton, mode, html, css, js, fullHtml, htmlFilePath, fullscreen, width, height, alwaysOnTop, resizable, frameless, devTools })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, allowPopups, singleton, mode, html, js, css, fullHtml, htmlFilePath, fullscreen, width, height, alwaysOnTop, resizable, frameless, devTools])

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <Input placeholder="标题" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Checkbox checked={allowPopups} onChange={(e) => setAllowPopups(e.target.checked)}>允许弹窗</Checkbox>
      <Checkbox checked={singleton} onChange={(e) => setSingleton(e.target.checked)}>单例模式（同一工作流只保留一个窗口）</Checkbox>
      <Checkbox checked={fullscreen} onChange={(e) => setFullscreen(e.target.checked)}>全屏承载</Checkbox>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Input placeholder="宽度" value={width} disabled={!!fullscreen} onChange={(e) => setWidth(Number(e.target.value) || 960)} />
        <Input placeholder="高度" value={height} disabled={!!fullscreen} onChange={(e) => setHeight(Number(e.target.value) || 600)} />
      </div>
      <Checkbox checked={alwaysOnTop} onChange={(e) => setAlwaysOnTop(e.target.checked)}>窗口置顶</Checkbox>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Checkbox checked={resizable} onChange={(e) => setResizable(e.target.checked)}>允许缩放</Checkbox>
        <Checkbox checked={frameless} onChange={(e) => setFrameless(e.target.checked)}>无边框</Checkbox>
      </div>
      <Checkbox checked={devTools} onChange={(e) => setDevTools(e.target.checked)}>打开开发者工具</Checkbox>
      <Radio.Group value={mode} onChange={(e) => setMode(e.target.value)}>
        <Radio.Button value="split">分离配置</Radio.Button>
        <Radio.Button value="full">完整HTML</Radio.Button>
        <Radio.Button value="file">HTML文件</Radio.Button>
      </Radio.Group>
      {mode === 'split' && (
        <>
          <Input.TextArea rows={3} placeholder="HTML" value={html} onChange={(e) => setHtml(e.target.value)} />
          <Input.TextArea rows={4} placeholder="CSS" value={css} onChange={(e) => setCss(e.target.value)} />
          <Input.TextArea rows={8} placeholder="JS" value={js} onChange={(e) => setJs(e.target.value)} />
        </>
      )}
      {mode === 'full' && (
        <Input.TextArea rows={12} placeholder="完整HTML内容" value={fullHtml} onChange={(e) => setFullHtml(e.target.value)} />
      )}
      {mode === 'file' && (
        <Space.Compact style={{ width: '100%' }}>
          <Input placeholder="HTML文件路径" value={htmlFilePath} onChange={(e) => setHtmlFilePath(e.target.value)} />
          <Button onClick={async () => {
            try {
              const sel = await window.services?.selectPath?.({
                title: '选择 HTML 文件',
                properties: ['openFile'],
                filters: [{ name: 'HTML', extensions: ['html', 'htm'] }]
              })
              const chosen = Array.isArray(sel) ? sel[0] : (sel && sel[0])
              if (chosen) setHtmlFilePath(String(chosen))
            } catch (e) {
              window.services?.showNotification?.('选择文件失败: ' + String(e?.message || e))
            }
          }}>选择文件</Button>
        </Space.Compact>
      )}
    </div>
  )
}

// 存储工作流对应的窗口实例（key: workflowId）
const pageAppWindows = new Map()

async function executePageApp(trigger, context, config) {
  // 定义工具函数
  const toBool = (v) => {
    if (typeof v === 'boolean') return v
    const s = String(v || '').trim().toLowerCase()
    if (s === 'true' || s === '1' || s === 'yes') return true
    if (s === 'false' || s === '0' || s === 'no') return false
    return !!v
  }
  const toNum = (v, fallback) => {
    const n = Number(v)
    return Number.isFinite(n) ? n : Number(fallback)
  }

  const title = resolveTemplate(config.title || '页面应用', context)
  const mode = String(resolveTemplate(config.mode || 'split', context))
  const singleton = toBool(resolveTemplate(String(config.singleton ?? false), context))
  
  // 如果开启单例模式且存在旧窗口，先关闭它
  const workflowId = context?.workflow?.id
  if (singleton && workflowId && pageAppWindows.has(workflowId)) {
    try {
      const oldWin = pageAppWindows.get(workflowId)
      if (oldWin && typeof oldWin.close === 'function') {
        oldWin.close()
      }
      pageAppWindows.delete(workflowId)
    } catch (e) {
      console.error('[page-app] close old window error:', e)
    }
  }
  const html = resolveTemplate(config.html || '<div id="app"></div>', context)
  const css = resolveTemplate(config.css || '', context)
  const js = resolveTemplate(config.js || '', context)
  const fullHtml = resolveTemplate(config.fullHtml || '', context)
  const htmlFilePath = resolveTemplate(config.htmlFilePath || '', context)

  const width = toNum(resolveTemplate(String(config.width ?? 960), context), 960)
  const height = toNum(resolveTemplate(String(config.height ?? 600), context), 600)
  const devTools = toBool(resolveTemplate(String(config.devTools ?? false), context))
  const fullscreen = toBool(resolveTemplate(String(config.fullscreen ?? false), context))
  const alwaysOnTop = toBool(resolveTemplate(String(config.alwaysOnTop ?? false), context))
  const resizable = toBool(resolveTemplate(String(config.resizable ?? true), context))
  const frameless = toBool(resolveTemplate(String(config.frameless ?? false), context))
  const allowPopups = toBool(resolveTemplate(String(config.allowPopups ?? true), context))

  const slimContext = {
    trigger,
    executors: Array.isArray(context?.executors)
      ? context.executors.map((e) => ({ key: e.key, enabled: !!e.enabled, result: e.result }))
      : [],
    envs: context?.envs || [],
    vars: context?.vars || []
  }

  const options = {
    show: false,
    title,
    width,
    height,
    resizable,
    frame: frameless ? false : true,
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: 'page-app/index.cjs',
      nativeWindowOpen: allowPopups
    }
  }
  const win = utools.createBrowserWindow('page-app/index.html', options, () => {
    // 如果开启单例模式，保存窗口实例
    if (singleton && workflowId) {
      pageAppWindows.set(workflowId, win)
      // 监听窗口关闭事件，清理 Map
      try {
        win.on('closed', () => {
          if (pageAppWindows.get(workflowId) === win) {
            pageAppWindows.delete(workflowId)
          }
        })
      } catch (e) {
        console.error('[page-app] setup close listener error:', e)
      }
    }
    
    try { if (fullscreen) win.setFullScreen(true) } catch (e) {
      console.error("[page-app preload] set fullscreen error:", e)
    }
    try { if (alwaysOnTop) win.setAlwaysOnTop(true) } catch (e) {
      console.error("[page-app preload] set always on top error:", e)
    }
    try { win.webContents.send('page-app:init', { title, mode, html, css, js, fullHtml, htmlFilePath, payload: { trigger, context: slimContext } }) } catch (e) {
      console.error("[page-app preload] send init error:", e)
    }
    try { win.show() } catch (e) {
      console.error("[page-app preload] show error:", e)
    }
    try { if (devTools) win.webContents.openDevTools({ mode: 'detach' }) } catch (e) {
      console.error("[page-app preload] open dev tools error:", e)
    }
  })
}

export const PageAppAction = {
  key: 'page-app',
  label: '页面应用',
  getDefaultConfig() {
    return {
      title: '页面应用',
      devTools: false,
      allowPopups: true,
      singleton: false,
      mode: 'split',
      html: '<div id="app"></div>',
      css: '',
      js: '(() => { document.getElementById("app").innerHTML = "Hello Page"; })()',
      fullHtml: '',
      htmlFilePath: '',
      width: 960,
      height: 600,
      fullscreen: false,
      alwaysOnTop: false
    }
  },
  ConfigComponent: PageAppConfig,
  execute: executePageApp
}
