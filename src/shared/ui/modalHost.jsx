import { useEffect } from 'react'
import { App as AntApp } from 'antd'

// 使用 window 对象存储实例，防止 HMR 导致实例丢失
const INSTANCE_KEY = '__FLOWPILOT_MODAL_INSTANCE__'
const WAITERS_KEY = '__FLOWPILOT_MODAL_WAITERS__'

if (!window[WAITERS_KEY]) {
  window[WAITERS_KEY] = []
}

export function GlobalModalHost() {
  const { modal } = AntApp.useApp()

  useEffect(() => {
    console.log('[GlobalModalHost] mounted, modal instance captured')
    window[INSTANCE_KEY] = modal
    
    // Resolve any pending waiters
    const waiters = window[WAITERS_KEY]
    if (waiters.length > 0) {
      console.log(`[GlobalModalHost] resolving ${waiters.length} waiters`)
      waiters.forEach((resolve) => resolve(modal))
      window[WAITERS_KEY] = []
    }
    
    return () => {
        console.log('[GlobalModalHost] unmounted')
    }
  }, [modal])

  // 每次渲染都更新（应对可能的闭包陈旧问题）
  window[INSTANCE_KEY] = modal

  return null
}

export function ensureModal() {
  const instance = window[INSTANCE_KEY]
  if (instance) {
    return Promise.resolve(instance)
  }
  
  console.log('[ensureModal] waiting for modal instance...')
  return new Promise((resolve) => {
    window[WAITERS_KEY].push(resolve)
  })
}
