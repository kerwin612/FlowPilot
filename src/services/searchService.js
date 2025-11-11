/**
 * 搜索和过滤服务
 * 统一管理搜索和过滤逻辑
 */

class SearchService {
  /**
   * 搜索项目
   */
  search(items, query) {
    if (!query || !query.trim()) return items

    const lowerQuery = query.toLowerCase().trim()

    return items.filter((item) => {
      // 搜索名称
      if (item.name?.toLowerCase().includes(lowerQuery)) {
        return true
      }

      // 搜索描述
      if (item.description?.toLowerCase().includes(lowerQuery)) {
        return true
      }

      // 搜索命令
      if (item.command?.toLowerCase().includes(lowerQuery)) {
        return true
      }

      // 如果是文件夹，搜索内部项目
      if (item.type === 'folder' && item.items) {
        return this.search(item.items, query).length > 0
      }

      return false
    })
  }

  /**
   * 根据类型过滤
   */
  filterByType(items, type) {
    if (!type) return items
    return items.filter((item) => item.type === type)
  }

  /**
   * 获取所有工作流（包括文件夹内的）
   */
  getAllWorkflows(items) {
    const workflows = []
    items.forEach((item) => {
      if (item.type === 'workflow') {
        workflows.push(item)
      } else if (item.type === 'folder' && item.items) {
        workflows.push(...this.getAllWorkflows(item.items))
      }
    })
    return workflows
  }

  /**
   * 获取所有文件夹
   */
  getAllFolders(items) {
    return items.filter((item) => item.type === 'folder')
  }
}

// 导出单例
export default new SearchService()
