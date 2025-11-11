import { useState } from 'react'
import { workflowService } from '../../../services'

export default function useWorkflowExecution() {
  const [loadingMap, setLoadingMap] = useState({})

  const execute = async (workflow, params = {}) => {
    const key = workflow.id

    setLoadingMap((prev) => ({ ...prev, [key]: true }))

    try {
      await workflowService.execute(workflow, params)
    } finally {
      setLoadingMap((prev) => ({ ...prev, [key]: false }))
    }
  }

  const isLoading = (workflowId) => {
    return loadingMap[workflowId] || false
  }

  return {
    execute,
    isLoading,
    loadingMap
  }
}
