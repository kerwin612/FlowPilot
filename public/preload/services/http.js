const { Buffer } = require('node:buffer')
const { URL } = require('node:url')

function toHeadersObj(h) {
  const out = {}
  if (!h) return out
  if (Array.isArray(h)) {
    for (const [k, v] of h) out[String(k || '').toLowerCase()] = String(v || '')
    return out
  }
  if (typeof h.forEach === 'function') {
    h.forEach((v, k) => { out[String(k || '').toLowerCase()] = String(v || '') })
    return out
  }
  const keys = Object.keys(h || {})
  for (const k of keys) out[String(k || '').toLowerCase()] = String(h[k] == null ? '' : h[k])
  return out
}

async function request(opts = {}, context = null) {
  const urlInput = String(opts.url || '')
  const u = new URL(urlInput)
  const q = opts.query && typeof opts.query === 'object' ? opts.query : null
  if (q) {
    Object.keys(q).forEach((k) => {
      const v = q[k]
      if (Array.isArray(v)) {
        for (const item of v) u.searchParams.append(k, String(item))
      } else if (v != null) {
        u.searchParams.set(k, String(v))
      }
    })
  }
  const method = String(opts.method || 'GET').toUpperCase()
  const headers = { ...(opts.headers || {}) }
  const bodyType = String(opts.bodyType || 'auto')
  const responseType = String(opts.responseType || 'auto')
  const redirect = opts.followRedirects === false ? 'manual' : 'follow'
  const controller = new AbortController()
  const timeout = typeof opts.timeout === 'number' && opts.timeout > 0 ? opts.timeout : 15000
  const timer = setTimeout(() => controller.abort(), timeout)
  let body = undefined
  if (method !== 'GET' && method !== 'HEAD') {
    if (bodyType === 'json' || (bodyType === 'auto' && typeof opts.body === 'object' && !Buffer.isBuffer(opts.body))) {
      if (!headers['Content-Type'] && !headers['content-type']) headers['Content-Type'] = 'application/json'
      body = JSON.stringify(opts.body || {})
    } else if (bodyType === 'text') {
      if (!headers['Content-Type'] && !headers['content-type']) headers['Content-Type'] = 'text/plain;charset=utf-8'
      body = String(opts.body == null ? '' : opts.body)
    } else if (bodyType === 'bytes') {
      body = Buffer.isBuffer(opts.body) ? opts.body : Buffer.from(opts.body || [])
    } else if (bodyType === 'form') {
      const data = opts.body || {}
      const sp = new URLSearchParams()
      Object.keys(data).forEach((k) => {
        const v = data[k]
        if (Array.isArray(v)) {
          for (const item of v) sp.append(k, String(item))
        } else if (v != null) {
          sp.append(k, String(v))
        }
      })
      if (!headers['Content-Type'] && !headers['content-type']) headers['Content-Type'] = 'application/x-www-form-urlencoded;charset=utf-8'
      body = sp.toString()
    } else {
      body = opts.body
    }
  }
  try {
    const res = await fetch(u.toString(), {
      method,
      headers,
      body,
      redirect,
      signal: controller.signal
    })
    clearTimeout(timer)
    const hdrs = toHeadersObj(res.headers)
    let data = null, text = null, bytes = null
    let finalType = responseType
    if (finalType === 'auto') {
      const ct = hdrs['content-type'] || ''
      if (ct.includes('application/json')) finalType = 'json'
      else if (ct.startsWith('text/') || ct.includes('charset=')) finalType = 'text'
      else finalType = 'bytes'
    }
    if (finalType === 'json') {
      try { data = await res.json() } catch { text = await res.text() }
    } else if (finalType === 'text') {
      text = await res.text()
    } else {
      const ab = await res.arrayBuffer()
      bytes = Buffer.from(ab)
    }
    return {
      ok: res.ok,
      status: res.status,
      url: res.url,
      headers: hdrs,
      data,
      text,
      bytes
    }
  } catch (e) {
    clearTimeout(timer)
    return {
      ok: false,
      status: undefined,
      url: u.toString(),
      error: String(e && e.message ? e.message : e)
    }
  }
}

module.exports = { request }

