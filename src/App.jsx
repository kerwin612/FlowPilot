import { useEffect, useState } from 'react'
import Home from './features/Home'
import { systemService, configService, featureService, workflowService } from './services'
import { initializeRegistries } from './features/Home/workflow/bootstrap'

// 在模块加载时立即初始化注册表（仅一次）
initializeRegistries()

export default function App() {
  const [enterAction, setEnterAction] = useState({})
  const [route, setRoute] = useState('')

  useEffect(() => {
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
      unsubscribe()
    }
  }, [])

  if (route === 'home_by_text' || route === 'home_by_dynamic') {
    return <Home enterAction={enterAction} />
  }

  return false
}
