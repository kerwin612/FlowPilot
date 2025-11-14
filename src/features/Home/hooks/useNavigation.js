import { useState } from 'react'
import { configService } from '../../../services'

/**
 * 导航管理 Hook
 * 管理标签页切换和文件夹导航
 */
export default function useNavigation(tabs, initialTabIndex = 0) {
  const [currentTabIndex, setCurrentTabIndex] = useState(initialTabIndex)
  const [currentFolder, setCurrentFolder] = useState(null)

  const getCurrentItems = () => {
    if (!tabs || tabs.length === 0) return []

    if (currentFolder) {
      const tab = tabs[currentFolder.tabIndex]
      const folder = tab?.items?.find(
        (it) => it.id === currentFolder.folderId && it.type === 'folder'
      )
      return folder?.items || []
    }

    const tab = tabs[currentTabIndex]
    return tab?.items || []
  }

  const getCurrentTab = () => {
    return tabs && tabs[currentTabIndex]
  }

  const enterFolder = (folderId) => {
    setCurrentFolder({ tabIndex: currentTabIndex, folderId })
  }

  const exitFolder = () => {
    setCurrentFolder(null)
  }

  const switchTab = (index) => {
    setCurrentTabIndex(index)
    setCurrentFolder(null)
  }

  return {
    currentTabIndex,
    currentFolder,
    currentTab: getCurrentTab(),
    currentItems: getCurrentItems(),
    enterFolder,
    exitFolder,
    switchTab
  }
}
