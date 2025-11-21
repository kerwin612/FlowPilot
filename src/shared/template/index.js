const { resolveVarsTemplate, filterByTags } = require('./globalVarResolver')
const { getByPath, getByPathWithTags, tokenize, mapAlias, aliasNeedsSkip } = require('./pathResolver')

function resolveAll(str, context) {
  if (typeof str !== 'string') return str
  const varsCtx = {
    map: context?.vars || {},
    raw: context?.vars?._raw || []
  }
  return resolveVarsTemplate(str, varsCtx)
}

module.exports = {
  // 变量模板解析
  resolveVarsTemplate,
  filterByTags,
  // 路径解析
  getByPath,
  getByPathWithTags,
  tokenize,
  mapAlias,
  aliasNeedsSkip,
  // 高层统一入口（目前用于字符串二次解析）
  resolveAll
}