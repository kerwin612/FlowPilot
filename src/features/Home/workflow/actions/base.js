// 动作器基类（JS 约定接口）
// 每个动作器应导出一个对象：{ key, label, getDefaultConfig(), ConfigComponent, execute(trigger, context, config) }

export function isAction(def) {
  return def && typeof def.key === 'string' && typeof def.execute === 'function'
}
