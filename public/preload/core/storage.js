function storage(key) {
  return {
    set: (subKey, value) => {
      const fullKey = subKey ? `${key}_${subKey}` : key
      window.utools.dbStorage.setItem(fullKey, value)
    },
    get: (subKey) => {
      const fullKey = subKey ? `${key}_${subKey}` : key
      return window.utools.dbStorage.getItem(fullKey)
    },
    remove: (subKey) => {
      const fullKey = subKey ? `${key}_${subKey}` : key
      window.utools.dbStorage.removeItem(fullKey)
    }
  }
}

module.exports = {
  settings: storage('settings')
}
