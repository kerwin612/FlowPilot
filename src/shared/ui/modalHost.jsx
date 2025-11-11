import React from 'react'
import { createRoot } from 'react-dom/client'
import { App as AntApp } from 'antd'

let mounted = false
let modalInstance = null
let waiters = []

function mountHost() {
  if (mounted) return
  mounted = true
  const container = document.createElement('div')
  container.setAttribute('data-modal-host', 'true')
  document.body.appendChild(container)

  function Host() {
    const { modal } = AntApp.useApp()
    React.useEffect(() => {
      modalInstance = modal
      if (waiters.length) {
        waiters.forEach((r) => r(modal))
        waiters = []
      }
    }, [modal])
    return null
  }

  const root = createRoot(container)
  root.render(React.createElement(AntApp, null, React.createElement(Host, null)))
}

export function ensureModal() {
  if (!mounted) mountHost()
  if (modalInstance) return Promise.resolve(modalInstance)
  return new Promise((resolve) => waiters.push(resolve))
}
