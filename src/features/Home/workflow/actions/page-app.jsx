import React, { useEffect, useState } from 'react'
import { Input, Checkbox } from 'antd'
import { resolveTemplate } from '../engine/compile'
import { ensureModal } from '../../../../shared/ui/modalHost'
import { systemService } from '../../../../services'

const PageAppConfig = ({ value = {}, onChange }) => {
  const [title, setTitle] = useState(value.title || '页面应用')
  const [allowScripts, setAllowScripts] = useState(value.allowScripts ?? true)
  const [allowPopups, setAllowPopups] = useState(value.allowPopups ?? true)
  const [allowSameOrigin, setAllowSameOrigin] = useState(value.allowSameOrigin ?? false)
  const [html, setHtml] = useState(value.html || '<div id="app"></div>')
  const [css, setCss] = useState(value.css || '')
  const [js, setJs] = useState(value.js || '(() => { document.getElementById("app").innerHTML = "Hello Page"; })()')
  const [fullscreen, setFullscreen] = useState(value.fullscreen ?? false)

  useEffect(() => {
    onChange?.({ title, allowScripts, allowPopups, allowSameOrigin, html, css, js, fullscreen })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, allowScripts, allowPopups, allowSameOrigin, html, js, css, fullscreen])

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <Input placeholder="标题" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Checkbox checked={allowScripts} onChange={(e) => setAllowScripts(e.target.checked)}>允许脚本</Checkbox>
      <Checkbox checked={allowPopups} onChange={(e) => setAllowPopups(e.target.checked)}>允许弹窗</Checkbox>
      <Checkbox checked={allowSameOrigin} onChange={(e) => setAllowSameOrigin(e.target.checked)}>允许同源（谨慎开启）</Checkbox>
      <Checkbox checked={fullscreen} onChange={(e) => setFullscreen(e.target.checked)}>全屏承载</Checkbox>
      <Input.TextArea rows={3} placeholder="HTML" value={html} onChange={(e) => setHtml(e.target.value)} />
      <Input.TextArea rows={4} placeholder="CSS" value={css} onChange={(e) => setCss(e.target.value)} />
      <Input.TextArea rows={8} placeholder="JS" value={js} onChange={(e) => setJs(e.target.value)} />
    </div>
  )
}

function buildSrcdoc({ html, css, js, payloadJSON }) {
  return `
<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>${css || ''}</style>
</head>
<body>
${html || ''}
<script>
  window.__PAYLOAD__ = ${payloadJSON};
  window.fp = {
    invoke: (name, payload) => new Promise((resolve) => {
      const id = Math.random().toString(36).slice(2)
      function onMessage(e){
        const d = e.data || {}
        if(d && d.type === 'fp:resp' && d.id === id){ window.removeEventListener('message', onMessage); resolve(d.result) }
      }
      window.addEventListener('message', onMessage)
      parent.postMessage({ type:'fp:invoke', id, name, payload }, '*')
    }),
    copy: (t) => window.fp.invoke('copy', t),
    open: (u) => window.fp.invoke('open', u),
    notify: (m) => window.fp.invoke('notify', m),
    download: (txt) => window.fp.invoke('download', txt),
    openPath: (p) => window.fp.invoke('openpath', p),
    writeFile: (x) => window.fp.invoke('writefile', x),
    run: (x) => window.fp.invoke('run', x)
  };
  try { ${js || ''} } catch (e) {
    parent.postMessage({ type:'fp:invoke', id:'__err__', name:'notify', payload: '页面脚本错误: ' + e.message })
  }
</script>
</body>
</html>`
}

async function executePageApp(trigger, context, config) {
  const title = resolveTemplate(config.title || '页面应用', context)
  const html = resolveTemplate(config.html || '<div id="app"></div>', context)
  const css = resolveTemplate(config.css || '', context)
  const js = resolveTemplate(config.js || '', context)

  const modal = await ensureModal()
  const sandboxFlags = [
    config.allowScripts !== false ? 'allow-scripts' : '',
    config.allowPopups !== false ? 'allow-popups' : '',
    config.allowSameOrigin ? 'allow-same-origin' : ''
  ].filter(Boolean).join(' ')

  const payloadJSON = JSON.stringify({ trigger, context }, (_, v) => v)
  const srcdoc = buildSrcdoc({ html, css, js, payloadJSON })

  let frame
  const useFullscreen = !!config.fullscreen
  if (useFullscreen) {
    const overlay = document.createElement('div')
    overlay.style.position = 'fixed'
    overlay.style.inset = '0'
    overlay.style.zIndex = '9999'
    overlay.style.background = 'rgba(0,0,0,0.45)'
    overlay.style.display = 'flex'
    overlay.style.alignItems = 'center'
    overlay.style.justifyContent = 'center'

    const panel = document.createElement('div')
    panel.style.background = '#fff'
    panel.style.width = '100vw'
    panel.style.height = '100vh'
    panel.style.display = 'flex'
    panel.style.flexDirection = 'column'
    panel.style.boxShadow = 'none'
    panel.style.borderRadius = '0'

    const header = document.createElement('div')
    header.style.height = '44px'
    header.style.display = 'flex'
    header.style.alignItems = 'center'
    header.style.justifyContent = 'space-between'
    header.style.padding = '0 12px'
    header.style.borderBottom = '1px solid #e5e7eb'
    header.style.background = '#f9fafc'
    const ttl = document.createElement('div')
    ttl.textContent = title
    ttl.style.fontWeight = '600'
    header.appendChild(ttl)
    const closeBtn = document.createElement('button')
    closeBtn.textContent = '关闭'
    closeBtn.style.borderRadius = '6px'
    closeBtn.style.background = '#f9fafb'
    closeBtn.style.color = '#111827'
    closeBtn.style.fontWeight = '600'
    closeBtn.onmouseenter = () => { closeBtn.style.background = '#eef2ff' }
    closeBtn.onmouseleave = () => { closeBtn.style.background = '#f9fafb' }
    closeBtn.onclick = () => { cleanup(); }
    header.appendChild(closeBtn)

    frame = document.createElement('iframe')
    frame.setAttribute('sandbox', sandboxFlags)
    frame.style.width = '100%'
    frame.style.height = '100%'
    frame.style.border = '0'
    frame.srcdoc = srcdoc

    panel.appendChild(header)
    panel.appendChild(frame)
    overlay.appendChild(panel)
    document.body.appendChild(overlay)

    function cleanup(){
      try { overlay.remove() } catch {}
      closeCleanup()
    }

    window.addEventListener('keydown', function esc(e){ if(e.key==='Escape'){ cleanup(); window.removeEventListener('keydown', esc) } })
    overlay.addEventListener('click', (e)=>{ if(e.target===overlay){ cleanup() } })
  } else {
    const mountId = `fp-page-app-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const contentElement = React.createElement('div', { id: mountId, style: { display:'flex', flexDirection:'column', width:'100%', height: String(config.height || 600)+'px', padding:0, margin:0 } })
    modal.info({ title, width: Number(config.width || 960), icon: null, content: contentElement, onOk() {}, onCancel() {}, okText: '关闭' })
    setTimeout(() => {
      const mount = document.getElementById(mountId)
      if (!mount) return
      frame = document.createElement('iframe')
      frame.setAttribute('sandbox', sandboxFlags)
      frame.style.width = '100%'
      frame.style.flex = '1 1 auto'
      frame.style.border = '0'
      frame.srcdoc = srcdoc
      mount.appendChild(frame)
    }, 0)
  }

  async function onMessage(e) {
    const d = e.data || {}
    if (d.type !== 'fp:invoke') return
    const { id, name, payload } = d
    const resp = (result) => {
      try { frame.contentWindow.postMessage({ type:'fp:resp', id, result }, '*') } catch {}
    }
    const done = (v) => resp(v ?? true)
    try {
      switch (name) {
        case 'copy':
          systemService.writeClipboard(String(payload || ''))
          systemService.showNotification('已复制到剪贴板')
          return done(true)
        case 'open':
          systemService.openExternal(String(payload || ''))
          return done(true)
        case 'notify':
          systemService.showNotification(String(payload || ''))
          return done(true)
        case 'download': {
          const p = systemService.writeTextFile(String(payload || ''))
          systemService.showNotification('已保存到: ' + p)
          return done(p)
        }
        case 'openpath':
          systemService.openPath(String(payload || ''))
          return done(true)
        case 'writefile': {
          const { path, content } = payload || {}
          if (!path) throw new Error('缺少 path')
          await window.services.writeTextFileAt(String(path), String(content ?? ''))
          systemService.showNotification('已写入: ' + path)
          return done(true)
        }
        case 'run': {
          const req = payload || {}
          const res = await systemService.executeCommand(req)
          return done(res)
        }
        default:
          systemService.showNotification('未知能力: ' + name)
          return done(false)
      }
    } catch (err) {
      systemService.showNotification('能力调用失败: ' + (err?.message || err))
      resp({ error: String(err?.message || err) })
    }
  }

  window.addEventListener('message', onMessage)
  const closeCleanup = () => {
    window.removeEventListener('message', onMessage)
    try { /* no-op */ } catch {}
  }
  // AntD Modal 在关闭后会销毁 content，这里不额外 hook；如果需要可在 modal 返回值上监听关闭
}

export const PageAppAction = {
  key: 'page-app',
  label: '页面应用',
  getDefaultConfig() {
    return {
      title: '页面应用',
      allowScripts: true,
      allowPopups: true,
      allowSameOrigin: false,
      html: '<div id="app"></div>',
      css: '',
      js: '(() => { document.getElementById("app").innerHTML = "Hello Page"; })()'
    }
  },
  ConfigComponent: PageAppConfig,
  execute: executePageApp
}
