import { useState, useEffect } from 'react'
import { configService } from '../../../services'

/**
 * 配置管理 Hook
 * 只负责响应式状态管理，业务逻辑在 service 层
 */
export default function useConfig() {
  const [config, setConfig] = useState(null)

  useEffect(() => {
    // 初始加载
    const cfg = configService.loadConfig()
    setConfig(cfg)

    // 订阅配置变化
    const unsubscribe = configService.subscribe((newConfig) => {
      setConfig(newConfig)
    })

    return unsubscribe
  }, [])

  return {
    config,
    reload: () => {
      const cfg = configService.loadConfig()
      setConfig(cfg)
    }
  }
}
