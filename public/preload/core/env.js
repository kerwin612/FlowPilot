function expandEnvVars(customEnv, globals = {}) {
  if (!customEnv || typeof customEnv !== 'object') return {}
  const baseEnv = typeof process !== 'undefined' && process.env ? process.env : {}
  const expanded = {}
  const resolving = new Set()
  Object.keys(customEnv).forEach(key => {
    expanded[key] = resolveVar(key, customEnv, baseEnv, expanded, resolving, globals)
  })
  return expanded
}

function resolveVar(key, customEnv, baseEnv, expanded, resolving, globals = {}) {
  if (resolving.has(key)) return customEnv[key]
  let value = customEnv[key]
  if (typeof value !== 'string') return value
  resolving.add(key)
  value = value.replace(/%([^%]+)%/g, (match, varName) => {
    if (varName === key) return baseEnv[varName] || ''
    if (Object.prototype.hasOwnProperty.call(customEnv, varName)) {
      if (!Object.prototype.hasOwnProperty.call(expanded, varName)) {
        expanded[varName] = resolveVar(varName, customEnv, baseEnv, expanded, resolving, globals)
      }
      return expanded[varName]
    }
    return baseEnv[varName] || match
  })
  value = value.replace(/\$\{([^}]+)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g, (match, braced, simple) => {
    const varName = braced || simple
    if (varName === key) return baseEnv[varName] || ''
    if (Object.prototype.hasOwnProperty.call(customEnv, varName)) {
      if (!Object.prototype.hasOwnProperty.call(expanded, varName)) {
        expanded[varName] = resolveVar(varName, customEnv, baseEnv, expanded, resolving, globals)
      }
      return expanded[varName]
    }
    return baseEnv[varName] || match
  })
  if (globals && globals.map) {
    value = value.replace(/\{\{\s*vars\.([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g, (m, k) => {
      const v = globals.map[k]
      return typeof v === 'undefined' ? m : String(v)
    })
  }
  resolving.delete(key)
  return value
}

function expandStringWithEnv(str, env = {}, globals = {}) {
  if (typeof str !== 'string') return str
  const mergedEnv = {
    ...(typeof process !== 'undefined' && process.env ? process.env : {}),
    ...(env || {})
  }
  let value = str
  value = value.replace(/%([^%]+)%/g, (match, varName) => {
    const v = mergedEnv[varName]
    return typeof v === 'undefined' ? match : String(v)
  })
  value = value.replace(/\$\{([^}]+)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g, (match, braced, simple) => {
    const varName = braced || simple
    const v = mergedEnv[varName]
    return typeof v === 'undefined' ? match : String(v)
  })
  if (globals && globals.map) {
    value = value.replace(/\{\{\s*vars\.([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g, (m, k) => {
      const v = globals.map[k]
      return typeof v === 'undefined' ? m : String(v)
    })
  }
  return value
}

module.exports = { expandEnvVars, expandStringWithEnv }
