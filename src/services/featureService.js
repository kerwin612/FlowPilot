/**
 * FeatureService - 动态指令管理服务
 *
 * 职责：
 * 1. 将工作流注册为 uTools 动态指令
 * 2. 管理工作流与 feature code 的映射关系
 * 3. 同步工作流配置变更到 uTools
 *
 * 设计原则：
 * - 完全遵循 uTools 动态指令 API 规范
 * - 工作流系统与 uTools 解耦，通过此服务桥接
 * - 每个工作流的 feature.code 建议格式：'wf-' + workflow.id
 */

class FeatureService {
  constructor() {
    // 工作流 ID -> feature code 映射
    this.workflowFeatureMap = new Map()
    // feature code -> 工作流对象 映射
    this.featureWorkflowMap = new Map()
  }

  /**
   * 获取 uTools API 引用
   */
  get utools() {
    return typeof window !== 'undefined' ? window.utools : null
  }

  /**
   * 注册单个工作流为动态指令
   * @param {Object} workflow - 工作流配置对象
   * @returns {boolean} 是否成功注册
   */
  registerWorkflow(workflow) {
    if (!workflow || !workflow.id) {
      console.warn('[FeatureService] 工作流缺少 id，无法注册')
      return false
    }

    // 检查工作流是否启用了动态指令
    const feature = workflow.feature
    if (!feature || !feature.enabled) {
      return false
    }

    // 生成或使用配置的 feature code
    const code = feature.code || `wf-${workflow.id}`
    const explain = feature.explain || workflow.name || '工作流'

    // 构建 uTools feature 对象（直接透传 feature 配置）
    const utoolsFeature = {
      code,
      explain,
      cmds: feature.cmds || [explain]
    }

    // 可选：mainHide
    if (feature.mainHide !== undefined) {
      utoolsFeature.mainHide = feature.mainHide
    }

    // 可选：添加图标
    if (feature.icon) {
      utoolsFeature.icon = feature.icon
    }

    // 可选：限制平台
    if (feature.platform) {
      utoolsFeature.platform = feature.platform
    }

    try {
      const u = this.utools
      if (!u || typeof u.setFeature !== 'function') {
        console.warn('[FeatureService] uTools API 不可用')
        return false
      }

      // 注册到 uTools
      u.setFeature(utoolsFeature)

      // 记录映射关系
      this.workflowFeatureMap.set(workflow.id, code)
      this.featureWorkflowMap.set(code, workflow)

      console.log(
        `[FeatureService] 注册工作流: ${workflow.name} (${code})`,
        'Feature: ',
        utoolsFeature,
        ' | Config: ',
        feature
      )
      return true
    } catch (error) {
      console.error(`[FeatureService] 注册工作流失败:`, error)
      return false
    }
  }

  /**
   * 移除工作流的动态指令
   * @param {string} workflowId - 工作流 ID
   * @returns {boolean} 是否成功移除
   */
  removeWorkflow(workflowId) {
    const code = this.workflowFeatureMap.get(workflowId)
    if (!code) {
      return false
    }

    try {
      const u = this.utools
      if (u && typeof u.removeFeature === 'function') {
        u.removeFeature(code)
      }

      // 清除映射
      this.workflowFeatureMap.delete(workflowId)
      this.featureWorkflowMap.delete(code)

      console.log(`[FeatureService] 移除工作流: ${workflowId} (${code})`)
      return true
    } catch (error) {
      console.error(`[FeatureService] 移除工作流失败:`, error)
      return false
    }
  }

  /**
   * 根据 feature code 查找对应的工作流
   * @param {string} code - feature code
   * @returns {Object|null} 工作流对象
   */
  findWorkflowByCode(code) {
    return this.featureWorkflowMap.get(code) || null
  }

  /**
   * 同步所有工作流到 uTools
   * @param {Array} workflows - 所有工作流配置数组（扁平化）
   */
  syncAllWorkflows(workflows) {
    // 清除现有注册
    this.clearAll()

    if (!Array.isArray(workflows)) {
      console.warn('[FeatureService] workflows 不是数组')
      return
    }

    // 注册所有启用动态指令的工作流
    let successCount = 0
    workflows.forEach((workflow) => {
      if (this.registerWorkflow(workflow)) {
        successCount++
      }
    })

    console.log(`[FeatureService] 同步完成: ${successCount}/${workflows.length} 个工作流已注册`)
  }

  /**
   * 清除所有动态指令注册
   */
  clearAll() {
    const codes = Array.from(this.workflowFeatureMap.values())
    const u = this.utools

    if (u && typeof u.removeFeature === 'function') {
      codes.forEach((code) => {
        try {
          u.removeFeature(code)
        } catch (e) {
          console.error(`[FeatureService] 移除失败: ${code}`, e)
        }
      })
    }

    this.workflowFeatureMap.clear()
    this.featureWorkflowMap.clear()
    console.log('[FeatureService] 已清除所有动态指令')
  }

  /**
   * 获取当前已注册的工作流数量
   */
  getRegisteredCount() {
    return this.workflowFeatureMap.size
  }

  /**
   * 获取所有已注册的 feature codes
   */
  getAllCodes() {
    return Array.from(this.workflowFeatureMap.values())
  }
}

export default new FeatureService()
