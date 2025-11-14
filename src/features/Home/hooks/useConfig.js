import { useState, useEffect } from 'react'
import { configService } from '../../../services'

/**
 * 配置管理 Hook
 * 只负责响应式状态管理，业务逻辑在 service 层
 */
export default function useConfig() {
  const [config, setConfig] = useState(null)
  const [tabs, setTabs] = useState([])
  const [envVars, setEnvVars] = useState([])
  const [globalVars, setGlobalVars] = useState([])

  useEffect(() => {
    // 初始加载
    const data = configService.loadAll()
    setConfig(data.config)
    setTabs(data.tabs)
    setEnvVars(data.envVars)
    setGlobalVars(data.globalVars)

    // 订阅配置变化
    const unsubscribe = configService.subscribe((newData) => {
      setConfig(newData.config)
      setTabs(newData.tabs)
      setEnvVars(newData.envVars)
      setGlobalVars(newData.globalVars)
    })

    return unsubscribe
  }, [])

  return {
    config,
    tabs,
    envVars,
    globalVars,
    reload: () => {
      const data = configService.loadAll()
      setConfig(data.config)
      setTabs(data.tabs)
      setEnvVars(data.envVars)
      setGlobalVars(data.globalVars)
    }
  }
}
