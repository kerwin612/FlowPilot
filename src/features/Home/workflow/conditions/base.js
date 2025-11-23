export function isCondition(def) {
  return (
    def &&
    typeof def.key === 'string' &&
    typeof def.evaluate === 'function'
  )
}