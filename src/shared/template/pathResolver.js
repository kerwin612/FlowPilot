function tokenize(expr) {
  const tokens = []
  expr.replace(/([^.[\]]+)|\[(\d+)\]/g, (m, name, index) => {
    if (name) tokens.push(name)
    else if (index != null) tokens.push(Number(index))
  })
  return tokens
}

function mapAlias(root, first) {
  if (first === 'executor' || first === 'executors') return root.executors
  if (first === 'env') return root.env
  if (first === 'vars' || first === 'global') return root.vars
  if (first === 'trigger') return root.trigger
  if (first === 'values') return root.values
  return root[first]
}

function aliasNeedsSkip(first) {
  return ['executor', 'executors', 'env', 'vars', 'global', 'trigger', 'values'].includes(first)
}

function getByPath(root, expr) {
  // 标签筛选语法在 compile.js 的上层已处理，这里只做常规路径
  const tokens = tokenize(expr)
  let cur = mapAlias(root, tokens[0])
  if (tokens.length && aliasNeedsSkip(tokens[0])) tokens.shift()
  for (let i = 0; i < tokens.length; i++) {
    if (cur == null) return null
    const t = tokens[i]
    cur = cur[t]
  }
  return cur
}

function getByPathWithTags(root, expr) {
  const tagFilterMatch = expr.match(/^(vars|global)\[['"]([^'"]+)['"]((?:,\s*['"][^'"]+['"])*)\](.*)$/)
  if (tagFilterMatch) {
    const [, alias, firstTag, otherTagsStr, restPath] = tagFilterMatch
    const tags = [firstTag]
    if (otherTagsStr) {
      const matches = otherTagsStr.matchAll(/['"]([^'"]+)['"]/g)
      for (const match of matches) tags.push(match[1])
    }
    const globalVarsArray = root.vars?._raw || []
    const filtered = filterByTags(globalVarsArray, tags)
    if (!restPath || restPath === '') return filtered
    const nextPathMatch = restPath.match(/^\[(\d+)\](.*)$/)
    if (nextPathMatch) {
      const [, indexStr, furtherPath] = nextPathMatch
      const index = Number(indexStr)
      const item = filtered[index]
      if (!item) return null
      if (furtherPath) return getByPath({ _item: item.value }, '_item' + furtherPath)
      return item.value
    }
    const keyMatch = restPath.match(/^\.([A-Z_][A-Z0-9_]*)(.*)$/)
    if (keyMatch) {
      const [, key, furtherPath] = keyMatch
      const item = filtered.find((gvar) => gvar.key === key)
      if (!item) return null
      if (furtherPath) return getByPath({ _item: item.value }, '_item' + furtherPath)
      return item.value
    }
    return null
  }
  return getByPath(root, expr)
}

module.exports = { getByPath, getByPathWithTags, tokenize, mapAlias, aliasNeedsSkip }
const { filterByTags } = require('./globalVarResolver')