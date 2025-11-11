// 配置迁移与版本管理
// 目的：在配置结构变更时，自动将旧数据迁移到新结构，避免手动干预

const CONFIG_VERSION = '1.0'

/**
 * 语义化版本比较
 * @param {string} a 
 * @param {string} b 
 * @returns {number} -1 a<b, 0 a==b, 1 a>b
 */
function cmp(a, b) {
  const pa = String(a).split('.').map(x => parseInt(x, 10) || 0)
  const pb = String(b).split('.').map(x => parseInt(x, 10) || 0)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const da = pa[i] || 0
    const db = pb[i] || 0
    if (da < db) return -1
    if (da > db) return 1
  }
  return 0
}

/**
 * 应用迁移脚本
 * @param {object} config - 原始配置对象
 * @returns {{ changed: boolean, config: object }}
 */
function applyMigrations(config) {
  let changed = false
  const next = { ...config }

  // 示例迁移：将数字版本转为字符串（已在 load 中处理，这里冗余兜底）
  if (typeof next.version === 'number') {
    next.version = String(next.version) + '.0'
    changed = true
  }

  // v1.0 基线：确保所有 workflow 的 mode 为 'composed'（若缺失则补齐）
  function ensureTabItems(items = []) {
    return (items || []).map(item => {
      if (item.type === 'workflow') {
        if (!item.mode) {
          item.mode = 'composed'
          changed = true
        }
      }
      if (item.type === 'folder' && Array.isArray(item.items)) {
        item.items = ensureTabItems(item.items)
      }
      return item
    })
  }

  if (next.tabs && Array.isArray(next.tabs)) {
    next.tabs = next.tabs.map(tab => ({
      ...tab,
      items: ensureTabItems(tab.items || [])
    }))
  }

  // 若当前版本小于目标版本，写入目标版本
  if (cmp(next.version, CONFIG_VERSION) < 0) {
    next.version = CONFIG_VERSION
    changed = true
  }

  return { changed, config: next }
}

module.exports = {
  CONFIG_VERSION,
  applyMigrations
}
