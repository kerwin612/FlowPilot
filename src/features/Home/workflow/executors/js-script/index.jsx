import { useState, useEffect } from 'react'
import { Input } from 'antd'
import { resolveTemplate } from '../../engine/compile'
import { systemService } from '../../../../../services'

const { TextArea } = Input

/*
脚本执行器说明:
1. 配置为一个 JS 函数文本，可使用: 
   - function(context) { ... }
   - (context) => { ... }
   - context => expr
   - async function(context) { ... }
   - async (context) => { ... }
   - new Function('context', 'return ...') // 也支持，但推荐使用常规形式
2. 模板变量可在脚本中之前先解析 (只对脚本整体的 {{ }} 进行替换)；脚本内部字符串不再二次解析。
3. 执行时会向函数传递完整 context（包含 executors 列表等）。
4. 函数返回的任何值会被包装为 { value: { <返回值> } } 。
*/

const ScriptConfig = ({ value = {}, onChange }) => {
  const [code, setCode] = useState(value.code || '')
  useEffect(() => {
    setCode(value.code || '')
  }, [value.code])
  return (
    <TextArea
      rows={8}
      placeholder={`示例:\n(context) => {\n  const text = String(context.executors[0]?.result?.value?.execResult?.result || '');\n  const list = text.split(/\\r?\\n/).map(s=>s.trim()).filter(Boolean);\n  return { value: { list } }\n}`}
      value={code}
      onChange={(e) => setCode(e.target.value)}
      onBlur={() => onChange({ ...(value || {}), code })}
      style={{ fontFamily: 'monospace' }}
    />
  )
}

function buildFn(raw) {
  const trimmed = raw.trim()
  if (!trimmed) throw new Error('脚本为空')
  // 如果是 new Function 形式
  if (/^new\s+Function\s*\(/.test(trimmed)) {
    try {
      // 直接 eval 生成函数实例
      // 安全性：用户自定义，本地受控环境；不做沙箱隔离
      // eslint-disable-next-line no-eval
      const fn = eval(trimmed)
      if (typeof fn !== 'function') throw new Error('new Function 未生成函数')
      return fn
    } catch (e) {
      throw new Error('解析 new Function 失败: ' + e.message)
    }
  }
  // 如果是 function (...) 或 async function
  if (/^(async\s+)?function\s*\(/.test(trimmed)) {
    // 包一层括号，使用 eval 解析
    try {
      // eslint-disable-next-line no-eval
      const fn = eval('(' + trimmed + ')')
      if (typeof fn !== 'function') throw new Error('解析 function 失败')
      return fn
    } catch (e) {
      throw new Error('解析 function 失败: ' + e.message)
    }
  }
  // 箭头函数 (async 可选)
  if (/^(async\s+)?\(?[a-zA-Z_$][^=]*=>/.test(trimmed) || /^(async\s+)?\(.*\)\s*=>/.test(trimmed)) {
    try {
      // eslint-disable-next-line no-eval
      const fn = eval(trimmed)
      if (typeof fn !== 'function') throw new Error('解析箭头函数失败')
      return fn
    } catch (e) {
      throw new Error('解析箭头函数失败: ' + e.message)
    }
  }
  // 兜底：尝试作为表达式返回 (context) => { ... } 或 context => expr
  try {
    // eslint-disable-next-line no-eval
    const fn = eval(trimmed)
    if (typeof fn !== 'function') throw new Error('脚本不是函数')
    return fn
  } catch (e) {
    throw new Error('无法解析脚本为函数: ' + e.message)
  }
}

export const ScriptExecutor = {
  key: 'js-script',
  label: '脚本执行',
  getDefaultConfig() {
    return { code: '' }
  },
  ConfigComponent: ScriptConfig,
  async execute(trigger, context, config, options = {}) {
    // 先做模板解析（只处理最外层，不递归内部字符串）
    const raw = resolveTemplate(config.code || '', context)
    let fn
    try {
      fn = buildFn(raw)
    } catch (e) {
      systemService.showNotification('脚本解析失败: ' + e.message)
      throw e
    }
    let result
    try {
      result = await fn(context)
    } catch (e) {
      const msg = '脚本运行错误: ' + (e && e.message ? e.message : String(e))
      systemService.showNotification(msg)
      const err = new Error(msg)
      err.original = e
      throw err
    }
    // 标准化返回，便于后续引用
    // 如果返回对象或数组，则合并其 value 字段或整个对象
    let valueObj
    if (result && typeof result === 'object') {
      // 若用户直接返回 { value: {...} } 结构，则保持一致
      if (result.value && typeof result.value === 'object') {
        valueObj = result
      } else {
        valueObj = { value: { scriptResult: result } }
      }
    } else {
      valueObj = { value: { scriptResult: result } }
    }
    return valueObj
  }
}
