export function isManual(def) {
  return (
    def &&
    typeof def.key === 'string' &&
    typeof def.type === 'string' &&
    typeof def.title === 'string'
  )
}

