// 模板解析（统一风格）
// 支持双花括号 {{ ... }} 是规则写法
// 访问形式：
//   {{executor[0].result.value.filePath}}
//   {{executors[1].enabled}}
//   {{env.PATH}}
//   {{trigger.filePath}}
//   {{values.filePath}}
// executor 索引与编辑时列表顺序一致，包含被禁用的项（其 result 可能为 null）。
export function resolveTemplate(str, context) {
  if (typeof str !== 'string') return str
  return str.replace(/\{\{([^}]+)\}\}/g, (_, expr) => safeEval(expr.trim(), context))
}

function safeEval(pathExpr, context) {
  try {
    // 简单路径解析 executor[0].result.value.x / env.PATH / trigger.filePath
    const value = getByPath(context, pathExpr)
    if (value == null) return ''
    // 如果是对象或数组，返回JSON格式，否则返回字符串
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2)
    }
    return String(value)
  } catch {
    return ''
  }
}

function getByPath(root, expr) {
  // 拆分成 tokens：支持 a.b, a[0].b[1].c
  const tokens = []
  expr.replace(/([^.[\]]+)|\[(\d+)\]/g, (m, name, index) => {
    if (name) tokens.push(name)
    else if (index != null) tokens.push(Number(index))
  })
  let cur = mapAlias(root, tokens[0])
  if (tokens.length && aliasNeedsSkip(tokens[0])) tokens.shift()
  // 重要修复：当去掉别名前缀后，应从索引0开始遍历，避免跳过第一个token（例如 executor[0] 中的 0）
  for (let i = 0; i < tokens.length; i++) {
    if (cur == null) return null
    const t = tokens[i]
    cur = cur[t]
  }
  return cur
}

function mapAlias(root, first) {
  if (first === 'executor' || first === 'executors') return root.executors
  if (first === 'env') return root.env
  if (first === 'trigger') return root.trigger
  if (first === 'values') return root.values
  return root[first]
}
function aliasNeedsSkip(first) {
  return ['executor', 'executors', 'env', 'trigger', 'values'].includes(first)
}
