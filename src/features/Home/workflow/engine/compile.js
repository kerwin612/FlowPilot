import { resolveAll } from '../../../../shared/template/globalVarResolver';
import { getByPath as sharedGetByPath, getByPathWithTags } from '../../../../shared/template/pathResolver';
// 模板解析（统一风格）
// 支持双花括号 {{ ... }} 是规则写法
// 访问形式：
//   {{executor[0].result.value.filePath}}
//   {{executors[1].enabled}}
//   {{env.PATH}}
//   {{vars.API_URL}}                    // 全局变量（通过 key，如有重复取第一个）
//   {{vars['tag1','tag2'][0]}}          // 通过标签筛选第一个匹配的变量
//   {{vars['tag1','tag2'].API_URL}}     // 通过标签筛选后再用 key 访问（如有重复取第一个）
//   {{trigger.filePath}}
//   {{values.filePath}}
// 注意：key 可以重复，相同 key 的变量可以通过不同的 tags 区分
// executor 索引与编辑时列表顺序一致，包含被禁用的项（其 result 可能为 null）。
export function resolveTemplate(str, context) {
  if (typeof str !== 'string') return str
  return str.replace(/\{\{([^}]+)\}\}/g, (_, expr) => safeEval(expr.trim(), context))
}

function safeEval(pathExpr, context) {
  try {
    // 简单路径解析 executor[0].result.value.x / env.PATH / trigger.filePath
    let value
    try {
      value = getByPathWithTags(context, pathExpr)
    } catch {
      // 回退到本地解析
      value = getByPath(context, pathExpr)
    }
    if (value == null) return ''
    // 如果是对象或数组，返回JSON格式，否则返回字符串
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2)
    }
    // 支持在字符串结果中继续解析全局变量模板（与环境变量值解析保持一致）
    try {
      return resolveAll(String(value), context)
    } catch {
      return String(value)
    }
  } catch {
    return ''
  }
}

function getByPath(root, expr) {
  // 处理标签筛选语法: vars['tag1','tag2']
  // 匹配模式: (vars|global)['tag1','tag2',...] 或 (vars|global)["tag1","tag2",...]
  const tagFilterMatch = expr.match(/^(vars|global)\[['"]([^'"]+)['"]((?:,\s*['"][^'"]+['"])*)\](.*)$/)
  
  if (tagFilterMatch) {
    const [, alias, firstTag, otherTagsStr, restPath] = tagFilterMatch
    // 解析所有标签
    const tags = [firstTag]
    if (otherTagsStr) {
      const matches = otherTagsStr.matchAll(/['"]([^'"]+)['"]/g)
      for (const match of matches) {
        tags.push(match[1])
      }
    }
    
    // 获取全局变量数组（原始格式）
    const globalVarsArray = root.vars?._raw || []
    
    // 筛选匹配指定标签的变量（必须包含所有指定标签 - AND 逻辑）
    const filtered = globalVarsArray.filter((gvar) => {
      if (!gvar.tags || !Array.isArray(gvar.tags)) return false
      return tags.every((tag) => gvar.tags.includes(tag))
    })
    
    // 如果没有后续路径，返回数组本身
    if (!restPath || restPath === '') {
      return filtered
    }
    
    // 处理后续路径: [0], [1], .API_URL 等
    const nextPathMatch = restPath.match(/^\[(\d+)\](.*)$/)
    if (nextPathMatch) {
      // 数组索引访问: vars['tag1','tag2'][0]
      const [, indexStr, furtherPath] = nextPathMatch
      const index = Number(indexStr)
      const item = filtered[index]
      if (!item) return null
      
      // 如果还有更深的路径，继续解析
      if (furtherPath) {
        return getByPath({ _item: item.value }, '_item' + furtherPath)
      }
      // 默认返回 value
      return item.value
    }
    
    const keyMatch = restPath.match(/^\.([A-Z_][A-Z0-9_]*)(.*)$/)
    if (keyMatch) {
      // 通过 key 访问: vars['tag1','tag2'].API_URL
      const [, key, furtherPath] = keyMatch
      const item = filtered.find((gvar) => gvar.key === key)
      if (!item) return null
      
      // 如果还有更深的路径，继续解析
      if (furtherPath) {
        return getByPath({ _item: item.value }, '_item' + furtherPath)
      }
      return item.value
    }
    
    // 无法解析的路径
    return null
  }
  try {
    return sharedGetByPath(root, expr)
  } catch {
    const tokens = []
    expr.replace(/([^.[\]]+)|\[(\d+)\]/g, (m, name, index) => {
      if (name) tokens.push(name)
      else if (index != null) tokens.push(Number(index))
    })
    const mapAliasLocal = (r, first) => {
      if (first === 'executor' || first === 'executors') return r.executors
      if (first === 'env') return r.env
      if (first === 'vars' || first === 'global') return r.vars
      if (first === 'trigger') return r.trigger
      if (first === 'values') return r.values
      return r[first]
    }
    const aliasNeedsSkipLocal = (first) => ['executor', 'executors', 'env', 'vars', 'global', 'trigger', 'values'].includes(first)
    let cur = mapAliasLocal(root, tokens[0])
    if (tokens.length && aliasNeedsSkipLocal(tokens[0])) tokens.shift()
    for (let i = 0; i < tokens.length; i++) {
      if (cur == null) return null
      const t = tokens[i]
      cur = cur[t]
    }
    return cur
  }
}
