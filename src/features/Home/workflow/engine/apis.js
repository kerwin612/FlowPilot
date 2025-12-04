export function getApis(context = null) {
  if (typeof window !== 'undefined') {
    if (typeof window.attachWindowApis === 'function') {
      window.attachWindowApis(context)
    }
    if (window.apis) return window.apis
  }
  return { platform: {}, fs: {}, clipboard: {}, system: {}, exec: {} }
}

export async function callApi(name, payload) {
  if (typeof window !== 'undefined' && typeof window.callApi === 'function') {
    return await window.callApi(name, payload)
  }
  throw new Error('系统能力未注入')
}

export function attachWindowApis(context = null) {
  if (typeof window !== 'undefined' && typeof window.attachWindowApis === 'function') {
    return window.attachWindowApis(context)
  }
}
