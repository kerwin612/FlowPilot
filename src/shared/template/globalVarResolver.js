export function filterByTags(varsRaw, tags) {
  const arr = Array.isArray(varsRaw) ? varsRaw : []
  const t = Array.isArray(tags) ? tags : []
  return arr.filter((g) => Array.isArray(g?.tags) && t.every((tag) => g.tags.includes(tag)))
}

export function resolveVarsTemplate(str, ctx = {}) {
  if (typeof str !== 'string') return str
  const map = ctx && typeof ctx.map === 'object' ? ctx.map : {}
  const raw = Array.isArray(ctx.raw) ? ctx.raw : []

  let value = String(str)

  value = value.replace(/\{\{\s*(?:vars|global)\.\s*([A-Za-z0-9_]+)\s*\}\}/g, (m, key) => {
    const v = map[key]
    return v != null ? String(v) : ''
  })

  value = value.replace(/\{\{\s*(?:vars|global)\[['"]([^'"]+)['"]((?:,\s*['"][^'"]+['"])*)\](?:\[(\d+)\]|\.([A-Z_][A-Z0-9_]*))?\s*\}\}/g,
    (match, firstTag, otherTagsStr, indexStr, keyName) => {
      const tags = [firstTag]
      if (otherTagsStr) {
        const m = otherTagsStr.matchAll(/['"]([^'"]+)['"]/g)
        for (const t of m) tags.push(t[1])
      }
      const filtered = filterByTags(raw, tags)
      if (indexStr && indexStr.length) {
        const i = Number(indexStr)
        const item = filtered[i]
        return item ? String(item.value || '') : ''
      }
      if (keyName && keyName.length) {
        const item = filtered.find((g) => g.key === keyName)
        return item ? String(item.value || '') : ''
      }
      const first = filtered[0]
      return first ? String(first.value || '') : ''
    }
  )

  return value
}

export function resolveAll(str, context) {
  if (typeof str !== 'string') return str
  const varsCtx = {
    map: context?.vars || {},
    raw: context?.vars?._raw || []
  }
  return resolveVarsTemplate(str, varsCtx)
}