import { useEffect, useState } from 'react'
import { ConfigProvider, theme, App as AntApp } from 'antd'
import Home from './features/Home'
import { systemService, configService, featureService, workflowService } from './services'
import { initializeRegistries } from './features/Home/workflow/bootstrap'
import { GlobalModalHost } from './shared/ui/modalHost'

// 在模块加载时立即初始化注册表（仅一次）
initializeRegistries()

export default function App() {
  const [enterAction, setEnterAction] = useState({})
  const [route, setRoute] = useState('')
  const [isDark, setIsDark] = useState(window.matchMedia('(prefers-color-scheme: dark)').matches)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
  }, [isDark])

  useEffect(() => {
    // 监听系统/uTools 主题变化
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e) => setIsDark(e.matches)
    mediaQuery.addEventListener('change', handleChange)
    
    // 初始化检查（处理 uTools 可能的非标准行为）
    if (window.utools && window.utools.isDarkColors) {
      setIsDark(window.utools.isDarkColors())
    }

    // 加载配置并同步动态指令
    configService.loadAll()
    const workflows = configService.getAllWorkflows()
    featureService.syncAllWorkflows(workflows)

    // 监听配置变化，实时同步动态指令
    const unsubscribe = configService.subscribe(() => {
      const updatedWorkflows = configService.getAllWorkflows()
      featureService.syncAllWorkflows(updatedWorkflows)
    })

    // 监听插件进入事件
    systemService.onPluginEnter((action) => {
      console.log('[App] onPluginEnter:', action)

      // 再次检查主题，确保进入时是最新的
      if (window.utools && window.utools.isDarkColors) {
        setIsDark(window.utools.isDarkColors())
      }

      // 检查是否是工作流的动态指令
      const workflow = featureService.findWorkflowByCode(action.code)

      if (workflow) {
        // 动态指令触发工作流
        console.log('[App] 触发工作流:', workflow.name, ', action:', action)

        workflowService.execute(workflow, {
          code: action.code,
          type: action.type,
          payload: action.payload
        })

        setRoute('home_by_dynamic')
        setEnterAction(action)

        return
      }

      // 原有的路由逻辑
      setRoute(action.code)
      setEnterAction(action)
    })

    systemService.onPluginOut(() => {
      setRoute('')
    })

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
      unsubscribe()
    }
  }, [])

  if (route === 'home_by_text' || route === 'home_by_dynamic') {
    return (
      <ConfigProvider
        theme={{
          algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
          token: isDark ? {
          } : {}
        }}
      >
        <AntApp>
          <GlobalModalHost />
          <Home enterAction={enterAction} />
        </AntApp>
      </ConfigProvider>
    )
  }

  return false
}
