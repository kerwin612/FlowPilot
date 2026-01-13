import { useState, useEffect } from 'react'
import { Layout, Tabs, Button, Space, Empty, Row, Col, Spin, Drawer, App, Dropdown } from 'antd'
import { SettingOutlined, GithubOutlined, ShareAltOutlined, RobotOutlined, ImportOutlined, PlusOutlined, FolderOutlined, HolderOutlined } from '@ant-design/icons'
import useConfig from './hooks/useConfig'
import useNavigation from './hooks/useNavigation'
import useWorkflowExecution from './hooks/useWorkflowExecution'
import { systemService, configService } from '../../services'
import WorkflowCard from './components/WorkflowCard'
import FolderCard from './components/FolderCard'
import ConfigManager from './components/ConfigManager'
import AiChatbot from './components/AiChatbot'
import WorkflowEditor from './components/WorkflowEditor'
import TransferModal from './components/TransferModal'
import { ITEM_TYPE_FOLDER, ITEM_TYPE_WORKFLOW } from '../../shared/constants'
import { DndContext, useSensor, useSensors, PointerSensor, closestCenter, KeyboardSensor, DragOverlay, useDroppable, pointerWithin, rectIntersection } from '@dnd-kit/core'
import { SortableContext, useSortable, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export default function Home({ enterAction: _enterAction }) {
  const { modal, message } = App.useApp()
  const { config, tabs, envVars, globalVars, reload } = useConfig()
  const { currentTabIndex, currentItems, switchTab } = useNavigation(tabs)
  const { execute, loadingMap } = useWorkflowExecution()

  const [filter, setFilter] = useState('')
  const [showConfigManager, setShowConfigManager] = useState(false)
  const [openFolder, setOpenFolder] = useState(null)
  const [activeTabKey, setActiveTabKey] = useState(String(currentTabIndex))
  const [showChatbot, setShowChatbot] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [activeId, setActiveId] = useState(null)
  
  const [transferModal, setTransferModal] = useState({
    open: false,
    mode: 'export',
    title: '',
    content: '',
    defaultFileName: '',
    onImportConfirm: null
  })

  // 拖拽传感器配置
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  )

  // no-op

  useEffect(() => {
    systemService.setSubInput((payload) => {
      const value = typeof payload === 'string' ? payload : (payload && payload.text) || ''
      setFilter(value)
    }, '搜索工作流名称')
  }, [])

  // 当搜索关键词变化时，自动切换到搜索 tab
  useEffect(() => {
    console.log(`[搜索框] 输入变化: "${filter}"`)
    if (filter) {
      setActiveTabKey('search')
    }
  }, [filter])

  // 同步 currentTabIndex 变化
  useEffect(() => {
    if (!filter) {
      setActiveTabKey(String(currentTabIndex))
    }
  }, [currentTabIndex, filter])

  // 检测并修正无效的 activeTabKey（当删除当前 tab 后）
  useEffect(() => {
    if (tabs && !filter) {
      const validKeys = tabs.map((_, i) => String(i))
      if (validKeys.length > 0 && !validKeys.includes(activeTabKey)) {
        // 当前 activeTabKey 无效，切换到第一个 tab
        setActiveTabKey('0')
        switchTab(0)
      }
    }
  }, [tabs, filter, activeTabKey, switchTab])

  const findItemLocation = (itemId, searchTabs = tabs) => {
    if (!searchTabs) return null
    for (let i = 0; i < searchTabs.length; i++) {
      const tab = searchTabs[i]
      const items = tab.items || []
      
      // Check root items
      const rootItem = items.find(it => it.id === itemId)
      if (rootItem) return { tabIndex: i, folderId: null, item: rootItem }

      // Check inside folders
      for (const item of items) {
        if (item.type === ITEM_TYPE_FOLDER && item.items) {
          const subItem = item.items.find(sub => sub.id === itemId)
          if (subItem) return { tabIndex: i, folderId: item.id, item: subItem }
        }
      }
    }
    return null
  }

  // Update openFolder when tabs change to keep it in sync
  useEffect(() => {
    if (openFolder && tabs) {
      for (const tab of tabs) {
        const found = (tab.items || []).find(it => it.id === openFolder.id)
        if (found) {
          setOpenFolder(found)
          return
        }
      }
      setOpenFolder(null)
    }
  }, [tabs])

  const handleEditItem = (item) => {
    const loc = findItemLocation(item.id)
    if (loc) {
        setEditingItem({ ...item, _location: loc })
    } else {
        message.error('未找到该项目，可能已被删除')
    }
  }

  const handleDeleteItem = (item) => {
    modal.confirm({
      title: `确定删除 "${item.name}"?`,
      content: '删除后无法恢复',
      okType: 'danger',
      okText: '确定',
      cancelText: '取消',
      onOk: () => {
        try {
          // 使用 configService.getTabs() 获取最新数据，避免闭包中的 tabs 过期
          const currentTabs = configService.getTabs()
          const loc = findItemLocation(item.id, currentTabs)

          if (!loc) {
            message.error('删除失败：未找到该项目，可能已被删除')
            return
          }
          
          if (loc.folderId) {
               // Delete from folder
               const tab = currentTabs[loc.tabIndex]
               const folder = tab.items.find(it => it.id === loc.folderId)
               if (folder) {
                   folder.items = folder.items.filter(it => it.id !== item.id)
                   configService.updateItem(loc.tabIndex, loc.folderId, folder)
               }
          } else {
              // Delete from root
              configService.deleteItem(loc.tabIndex, item.id)
          }
          message.success('已删除')
          reload()
        } catch (error) {
          console.error('[Delete] Error occurred:', error)
          message.error('删除出错: ' + error.message)
        }
      }
    })
  }

  const handleSaveItem = (values) => {
     // Handle new item creation from context menu
     if (editingItem?.isNew && editingItem.tabIndex !== undefined) {
       const tabIndex = editingItem.tabIndex
       const folderId = editingItem.folderId
       const itemType = editingItem.type === ITEM_TYPE_FOLDER ? ITEM_TYPE_FOLDER : ITEM_TYPE_WORKFLOW
       
       const newItem = {
         ...values,
         id: `${itemType}_${Date.now()}`,
         type: itemType,
         executors: itemType === ITEM_TYPE_FOLDER ? undefined : values.executors || [],
         actions: itemType === ITEM_TYPE_FOLDER ? undefined : values.actions || []
       }
       
       if (itemType === ITEM_TYPE_FOLDER && !newItem.items) {
         newItem.items = []
       }
       
       if (folderId) {
         // Add to folder
         const tab = tabs[tabIndex]
         const folder = tab.items.find(it => it.id === folderId)
         if (folder) {
           folder.items = [...(folder.items || []), newItem]
           configService.updateItem(tabIndex, folderId, folder)
         }
       } else {
         // Add to tab root
         configService.addItem(tabIndex, newItem)
       }
       
       setEditingItem(null)
       reload()
       return
     }
     
     // Handle existing item update
     if (!editingItem || !editingItem._location) return
     
     const { tabIndex, folderId } = editingItem._location
     const newItem = { ...editingItem, ...values }
     delete newItem._location
     
     if (folderId) {
         const tab = tabs[tabIndex]
         const folder = tab.items.find(it => it.id === folderId)
         if (folder) {
             const idx = folder.items.findIndex(it => it.id === editingItem.id)
             if (idx > -1) {
                 folder.items[idx] = { ...folder.items[idx], ...values }
                 configService.updateItem(tabIndex, folderId, folder)
             }
         }
     } else {
         configService.updateItem(tabIndex, editingItem.id, newItem)
     }
     setEditingItem(null)
     reload()
  }

  const handleExportWorkflow = async (workflow) => {
    try {
      const json = configService.exportWorkflow(workflow.id)
      setTransferModal({
        open: true,
        mode: 'export',
        title: `导出工作流 - ${workflow.name}`,
        content: json,
        defaultFileName: `${workflow.name}.json`,
        onImportConfirm: null
      })
    } catch {
      message.error('导出准备失败')
    }
  }

  const handleExportFolder = async (folder) => {
    try {
      const json = configService.exportFolder(folder.id)
      setTransferModal({
        open: true,
        mode: 'export',
        title: `导出文件夹 - ${folder.name}`,
        content: json,
        defaultFileName: `${folder.name}.json`,
        onImportConfirm: null
      })
    } catch {
      message.error('导出准备失败')
    }
  }

  const handleImportToTab = async () => {
    setTransferModal({
      open: true,
      mode: 'import',
      title: '导入配置到当前标签页',
      content: '',
      defaultFileName: '',
      onImportConfirm: async (text) => {
        const ok = await configService.importAutoFromText(text, currentTabIndex)
        if (ok) {
          message.success('导入成功')
          reload()
          return true
        }
        return false
      }
    })
  }

  const handleImportToFolder = async (folder) => {
    setTransferModal({
      open: true,
      mode: 'import',
      title: `导入配置到文件夹 - ${folder.name}`,
      content: '',
      defaultFileName: '',
      onImportConfirm: async (text) => {
        const ok = await configService.importAutoFromText(text, currentTabIndex, folder.id)
        if (ok) {
          message.success('导入成功')
          reload()
          return true
        }
        return false
      }
    })
  }

  const handleAddWorkflow = () => {
    setEditingItem({ type: ITEM_TYPE_WORKFLOW, data: {}, isNew: true, tabIndex: currentTabIndex })
  }

  const handleAddFolder = () => {
    setEditingItem({ type: ITEM_TYPE_FOLDER, data: {}, isNew: true, tabIndex: currentTabIndex })
  }

  const handleAddWorkflowToFolder = (folder) => {
    setEditingItem({ type: ITEM_TYPE_WORKFLOW, data: {}, isNew: true, tabIndex: currentTabIndex, folderId: folder.id })
  }

  // 拖拽处理逻辑
  const handleDragStart = (event) => {
    setActiveId(event.active.id)
  }

  const handleDragEnd = (event) => {
    const { active, over } = event
    setActiveId(null)
    
    if (!over) return
    
    const activeId = active.id
    const overId = over.id
    
    if (activeId === overId) return
    
    const tab = tabs[currentTabIndex]
    if (!tab) return
    
    // 检查 over 的类型：如果是 droppable (folder-drop-xxx)，说明是拖入文件夹
    const isDropIntoFolder = String(overId).startsWith('folder-drop-')
    const folderId = isDropIntoFolder ? String(overId).replace('folder-drop-', '') : null
    
    const rootIds = (tab.items || []).map(i => i.id)
    const findFolderOf = (itemId) => tab.items.find(it => it.type === ITEM_TYPE_FOLDER && (it.items || []).some(s => s.id === itemId))
    const fromFolder = findFolderOf(activeId)
    
    // 情况1：拖入文件夹 drop zone
    if (isDropIntoFolder && folderId) {
      if (fromFolder) {
        // 从其他文件夹或同一文件夹拖入
        if (fromFolder.id === folderId) {
          // 同一文件夹，不做处理
          return
        }
        configService.moveItemBetweenFolders(currentTabIndex, activeId, fromFolder.id, folderId)
      } else {
        // 从根级别拖入文件夹
        configService.moveItemToFolder(currentTabIndex, activeId, folderId)
      }
      reload()
      return
    }
    
    // 情况2：从文件夹拖出到根级别
    if (fromFolder && rootIds.includes(overId)) {
      const targetIndex = tab.items.findIndex(i => i.id === overId)
      configService.moveItemOutOfFolder(currentTabIndex, activeId, fromFolder.id, targetIndex)
      reload()
      // 如果当前打开的就是这个文件夹，刷新视图
      if (openFolder && openFolder.id === fromFolder.id) {
        const updatedTab = configService.getTab(currentTabIndex)
        setOpenFolder(updatedTab?.items?.find(it => it.id === fromFolder.id) || null)
      }
      return
    }
    
    // 情况3：根级别排序
    if (rootIds.includes(activeId) && rootIds.includes(overId)) {
      const oldIndex = tab.items.findIndex(i => i.id === activeId)
      const newIndex = tab.items.findIndex(i => i.id === overId)
      if (oldIndex < 0 || newIndex < 0) return
      const next = arrayMove(tab.items, oldIndex, newIndex)
      configService.reorderItems(currentTabIndex, next)
      reload()
      return
    }
    
    // 情况4：文件夹内部排序
    const overSubFolder = findFolderOf(overId)
    if (fromFolder && overSubFolder && fromFolder.id === overSubFolder.id) {
      const folder = tab.items.find(it => it.id === fromFolder.id)
      if (folder) {
        const oldIndex = folder.items.findIndex(i => i.id === activeId)
        const newIndex = folder.items.findIndex(i => i.id === overId)
        if (oldIndex >= 0 && newIndex >= 0) {
          const next = arrayMove(folder.items, oldIndex, newIndex)
          configService.reorderFolderItems(currentTabIndex, folder.id, next)
          reload()
          // 刷新 openFolder
          if (openFolder && openFolder.id === folder.id) {
            const updatedTab = configService.getTab(currentTabIndex)
            setOpenFolder(updatedTab?.items?.find(it => it.id === folder.id) || null)
          }
        }
      }
    }
  }

  const handleDragCancel = () => {
    setActiveId(null)
  }

  // 收集所有工作流（非文件夹，仅 type === 'workflow'）
  const allWorkflows = (tabs || []).flatMap((tab) =>
    (tab.items || []).flatMap((item) => {
      if (item.type === 'folder') {
        return (item.items || []).filter((sub) => sub && sub.type === 'workflow')
      }
      return item && item.type === 'workflow' ? [item] : []
    })
  )

  // 搜索元数据：记录每个工作流的匹配信息
  const searchMetadata = {}

  // 搜索结果（独立计算，不受 activeTabKey 影响）
  // 兼容 uTools 的搜索和匹配逻辑
  const searchResults = allWorkflows.filter((it) => {
    searchMetadata[it.id] = { matched: false }

    // 按名称搜索
    if ((it.name || '').toLowerCase().includes(filter.toLowerCase())) {
      searchMetadata[it.id].matched = true
      return true
    }

    // 按【快捷触发配置（动态指令）】搜索 - 兼容 uTools cmds 逻辑
    if (it.feature?.enabled && it.feature?.cmds) {
      const cmds = it.feature.cmds

      for (const cmd of cmds) {
        // 功能指令：字符串类型，直接字符串匹配
        if (typeof cmd === 'string') {
          const matches = cmd.toLowerCase().includes(filter.toLowerCase())
          if (matches) {
            searchMetadata[it.id].matched = true
            console.log(`[搜索] ✓ 工作流 "${it.name}" 通过功能指令 "${cmd}" 匹配`)
            return true
          }
        }

        // 匹配指令：对象类型
        if (typeof cmd === 'object' && cmd !== null) {
          const cmdType = cmd.type

          // regex：正则匹配
          if (cmdType === 'regex') {
            try {
              const regexPattern = cmd.match
              if (!regexPattern) {
                console.log(`[搜索] regex 指令缺少 match 字段`)
                continue
              }

              // 解析正则表达式（支持 /pattern/flags 格式）
              let regex
              if (regexPattern.startsWith('/')) {
                const lastSlashIdx = regexPattern.lastIndexOf('/')
                const pattern = regexPattern.slice(1, lastSlashIdx)
                const flags = regexPattern.slice(lastSlashIdx + 1)
                regex = new RegExp(pattern, flags)
              } else {
                regex = new RegExp(regexPattern)
              }

              // 检查长度限制
              if (cmd.minLength && filter.length < cmd.minLength) {
                console.log(`[搜索] regex 长度不符: ${filter.length} < ${cmd.minLength}`)
                continue
              }
              if (cmd.maxLength && filter.length > cmd.maxLength) {
                console.log(`[搜索] regex 长度不符: ${filter.length} > ${cmd.maxLength}`)
                continue
              }

              // 检查搜索输入是否匹配 regex
              let regexMatches = regex.test(filter)
              if (regexMatches) {
                searchMetadata[it.id].matched = true
                searchMetadata[it.id].cmdType = 'regex'
                searchMetadata[it.id].matchedCmd = cmd
                searchMetadata[it.id].matchedValue = filter
                console.log(`[搜索] ✓ 工作流 "${it.name}" 通过 regex 匹配 "${filter}"`)
                return true
              }
            } catch (e) {
              console.warn(`[搜索] regex 正则表达式解析失败: ${cmd.match}`, e)
              console.warn(`[搜索] 错误详情:`, e.message)
            }
          }

          // over：匹配任意文本
          if (cmdType === 'over') {
            // 检查长度限制
            if (cmd.minLength && filter.length < cmd.minLength) {
              console.log(`[搜索] over 长度不符: ${filter.length} < ${cmd.minLength}`)
              continue
            }
            if (cmd.maxLength && filter.length > cmd.maxLength) {
              console.log(`[搜索] over 长度不符: ${filter.length} > ${cmd.maxLength}`)
              continue
            }

            // 检查排除条件
            if (cmd.exclude) {
              try {
                let excludeRegex
                if (cmd.exclude.startsWith('/')) {
                  const lastSlashIdx = cmd.exclude.lastIndexOf('/')
                  const pattern = cmd.exclude.slice(1, lastSlashIdx)
                  const flags = cmd.exclude.slice(lastSlashIdx + 1)
                  excludeRegex = new RegExp(pattern, flags)
                } else {
                  excludeRegex = new RegExp(cmd.exclude)
                }
                // 如果匹配排除条件，跳过
                if (excludeRegex.test(filter)) {
                  console.log(`[搜索] over 被排除条件过滤`)
                  continue
                }
              } catch (e) {
                console.warn(`[搜索] over 排除正则表达式解析失败: ${cmd.exclude}`, e)
              }
            }

            // over 类型匹配任意文本
            searchMetadata[it.id].matched = true
            searchMetadata[it.id].cmdType = 'over'
            searchMetadata[it.id].matchedCmd = cmd
            searchMetadata[it.id].matchedValue = filter
            console.log(`[搜索] ✓ 工作流 "${it.name}" 通过 over 匹配 "${filter}"`)
            return true
          }

          // 其他 cmd 类型（img、files、window）在搜索框场景下暂不支持
          // 仅在 over 类型时匹配任意文本
        }
      }
    } else {
      if (it.feature?.enabled) {
        console.log(`[搜索] 工作流 "${it.name}" feature.enabled=true 但 feature.cmds 为空`)
      }
    }

    return false
  })

  console.log(`[搜索] 搜索词="${filter}", 总工作流数=${allWorkflows.length}, 匹配工作流数=${searchResults.length}`, searchResults)

  // 当前显示的内容
  const displayItems = activeTabKey === 'search' ? searchResults : currentItems

  const handleWorkflowClick = (workflow) => {
    execute(workflow, {})
  }
  const handleWorkflowTrigger = (workflow, value) => {
    execute(workflow, { entryMenuValue: value })
  }

  // 可排序卡片组件
  const SortableCard = ({ id, children }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging
    } = useSortable({ id })

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
      position: 'relative'
    }

    return (
      <div ref={setNodeRef} style={style} {...attributes}>
        <div
          {...listeners}
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            zIndex: 10,
            cursor: 'grab',
            width: 24,
            height: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
            backgroundColor: 'var(--color-drag-handle-bg)',
            opacity: 0,
            transition: 'opacity 0.2s'
          }}
          className="drag-handle-home"
        >
          <HolderOutlined style={{ fontSize: 12, color: 'var(--color-text-secondary)' }} />
        </div>
        {children}
      </div>
    )
  }

  // 文件夹 Drop Zone 组件
  const FolderDropZone = ({ folderId, children }) => {
    const { setNodeRef, isOver } = useDroppable({
      id: `folder-drop-${folderId}`
    })

    return (
      <div
        ref={setNodeRef}
        style={{
          position: 'relative',
          outline: isOver ? '2px solid #1890ff' : 'none',
          outlineOffset: '-2px',
          borderRadius: '8px',
          transition: 'outline 0.2s'
        }}
      >
        {children}
      </div>
    )
  }

  // 用于文件夹内的可排序工作流项组件
  const SortableFolderItem = ({ item, loading }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging
    } = useSortable({ id: item.id })

    const style = {
      position: 'relative',
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1
    }

    return (
      <Col>
        <div ref={setNodeRef} style={style} {...attributes}>
          <div
            {...listeners}
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              zIndex: 10,
              cursor: 'grab',
              width: 24,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
              backgroundColor: 'var(--color-drag-handle-bg)'
            }}
            className="drag-handle-folder"
          >
            <HolderOutlined style={{ fontSize: 12, color: 'var(--color-text-secondary)' }} />
          </div>
          <WorkflowCard
            workflow={item}
            loading={loading}
            onClick={() => handleWorkflowClick(item)}
            onTrigger={(val) => handleWorkflowTrigger(item, val)}
            onEdit={() => handleEditItem(item)}
            onDelete={() => handleDeleteItem(item)}
            onExport={handleExportWorkflow}
          />
        </div>
      </Col>
    )
  }

  const renderItem = (item) => {
    if (item.type === 'folder') {
      return (
        <Col key={item.id}>
          <SortableCard id={item.id}>
            <FolderDropZone folderId={item.id}>
              <FolderCard
                folder={item}
                onClick={() => setOpenFolder(item)}
                onEdit={() => handleEditItem(item)}
                onDelete={() => handleDeleteItem(item)}
                onExport={handleExportFolder}
                onImport={handleImportToFolder}
              />
            </FolderDropZone>
          </SortableCard>
        </Col>
      )
    }

    // 在搜索模式下，检查是否有搜索匹配信息
    const isSearchMode = activeTabKey === 'search'
    const matchInfo = isSearchMode ? searchMetadata[item.id] : null

    // 判断是否通过 regex/over 等指令匹配
    const cmdType = matchInfo?.cmdType
    const matchedValue = matchInfo?.matchedValue

    // 构造点击时的触发参数
    const handleCardClick = () => {
      if (!isSearchMode || !matchInfo?.matched) {
        // 非搜索模式或未匹配：正常触发
        handleWorkflowClick(item)
        return
      }

      // 搜索模式下的匹配处理
      if (cmdType === 'regex' || cmdType === 'over') {
        // regex 或 over 类型匹配：模拟 uTools onPluginEnter 的 payload 结构
        execute(item, {
          code: item.feature?.code,
          type: cmdType,
          payload: matchedValue
        })
      } else {
        // 功能指令或名称匹配：直接触发
        handleWorkflowTrigger(item, filter)
      }
    }

    return (
      <Col key={item.id}>
        <SortableCard id={item.id}>
          <WorkflowCard
            workflow={item}
            loading={loadingMap[item.id]}
            onClick={handleCardClick}
            onTrigger={(val) => handleWorkflowTrigger(item, val)}
            onEdit={() => handleEditItem(item)}
            onDelete={() => handleDeleteItem(item)}
            onExport={handleExportWorkflow}
          />
        </SortableCard>
      </Col>
    )
  }

  if (!config) {
    return (
      <Layout
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Spin size="large" tip="加载中..." />
      </Layout>
    )
  }

  // 构建 Tab 项目：搜索结果 tab + 普通 tabs
  const tabItems = []

  // 如果有搜索关键词，搜索结果 tab 放在第一位
  if (filter) {
    tabItems.push({
      key: 'search',
      label: `🔍 搜索结果 (${searchResults.length})`
    })
  }

  // 添加普通 tabs
  tabItems.push(
    ...(tabs || []).map((t, i) => ({
      key: String(i),
      label: t.name
    }))
  )

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <Layout style={{ minHeight: '100vh', padding: '0px 16px 16px 16px' }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {/* 顶部导航：将配置按钮放入 Tabs 的 tabBarExtraContent，避免被挤压并启用溢出 ... */}
          {tabItems.length > 0 && (
            <Tabs
              activeKey={activeTabKey}
              onChange={(k) => {
                setActiveTabKey(k)
                if (k !== 'search') {
                  switchTab(Number(k))
                }
              }}
              items={tabItems}
              tabBarExtraContent={{
                right: (
                  <Space>
                    <Button type="text" title="项目主页" icon={<GithubOutlined />} onClick={() => systemService.openExternal('https://github.com/kerwin612/FlowPilot')} />
                    <Button type="text" title="查阅/分享工作流" icon={<ShareAltOutlined />} onClick={() => systemService.openExternal('https://github.com/kerwin612/FlowPilot/issues/1')} />
                    <Button type="text" title="配置管理" icon={<SettingOutlined />} onClick={() => setShowConfigManager(true)} />
                  </Space>
                )
              }}
            />
          )}

        {/* 内容区域 */}
        <Dropdown
          menu={{
            items: [
              {
                key: 'add-workflow',
                label: '新增工作流',
                icon: <PlusOutlined />,
                onClick: handleAddWorkflow
              },
              {
                key: 'add-folder',
                label: '新增文件夹',
                icon: <FolderOutlined />,
                onClick: handleAddFolder
              },
              {
                type: 'divider'
              },
              {
                key: 'import',
                label: '导入工作流/文件夹',
                icon: <ImportOutlined />,
                onClick: handleImportToTab
              }
            ]
          }}
          trigger={['contextMenu']}
        >
          <div style={{ minHeight: 'calc(100vh - 120px)' }}>
            <style>{`
              .drag-handle-home {
                opacity: 0;
                transition: opacity 0.2s;
              }
              .ant-col:hover .drag-handle-home {
                opacity: 1 !important;
              }
            `}</style>
            {displayItems.length > 0 ? (
              // 搜索模式下禁用拖拽
              activeTabKey === 'search' ? (
                <Row gutter={[16, 16]}>
                  {displayItems.map((item) => (
                    <Col key={item.id}>
                      {item.type === 'folder' ? (
                        <FolderCard
                          folder={item}
                          onClick={() => setOpenFolder(item)}
                          onEdit={() => handleEditItem(item)}
                          onDelete={() => handleDeleteItem(item)}
                          onExport={handleExportFolder}
                          onImport={handleImportToFolder}
                        />
                      ) : (
                        <WorkflowCard
                          workflow={item}
                          loading={loadingMap[item.id]}
                          onClick={() => {
                            const matchInfo = searchMetadata[item.id]
                            const cmdType = matchInfo?.cmdType
                            const matchedValue = matchInfo?.matchedValue
                            if (!matchInfo?.matched) {
                              handleWorkflowClick(item)
                            } else if (cmdType === 'regex' || cmdType === 'over') {
                              execute(item, {
                                code: item.feature?.code,
                                type: cmdType,
                                payload: matchedValue
                              })
                            } else {
                              handleWorkflowTrigger(item, filter)
                            }
                          }}
                          onTrigger={(val) => handleWorkflowTrigger(item, val)}
                          onEdit={() => handleEditItem(item)}
                          onDelete={() => handleDeleteItem(item)}
                          onExport={handleExportWorkflow}
                        />
                      )}
                    </Col>
                  ))}
                </Row>
              ) : (
                <SortableContext items={displayItems.map(item => item.id)} strategy={rectSortingStrategy}>
                  <Row gutter={[16, 16]}>{displayItems.map(renderItem)}</Row>
                </SortableContext>
              )
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  filter
                    ? '没有找到匹配的工作流'
                    : tabs && tabs.length > 0
                      ? '当前标签页暂无内容，点击右上角配置添加'
                      : '暂无标签页，点击右上角配置开始添加'
                }
              />
              )}
            </div>
        </Dropdown>
      </Space>

      {showConfigManager && (
        <ConfigManager
          config={config}
          onClose={() => {
            setShowConfigManager(false)
            reload()
          }}
        />
      )}

      {openFolder && (
        <Drawer
          title={openFolder.name}
          placement="bottom"
          height="70%"
          onClose={() => setOpenFolder(null)}
          open={true}
        >
          <Dropdown
            menu={{
              items: [
                {
                  key: 'add-workflow-to-folder',
                  label: '新增工作流',
                  icon: <PlusOutlined />,
                  onClick: () => handleAddWorkflowToFolder(openFolder)
                },
                {
                  type: 'divider'
                },
                {
                  key: 'import-to-folder',
                  label: '导入工作流到此文件夹',
                  icon: <ImportOutlined />,
                  onClick: () => handleImportToFolder(openFolder)
                }
              ]
            }}
            trigger={['contextMenu']}
          >
            <div style={{ minHeight: '100%' }}>
              <style>{`
                .drag-handle-folder {
                  opacity: 0;
                  transition: opacity 0.2s;
                }
                .ant-col:hover .drag-handle-folder {
                  opacity: 1 !important;
                }
              `}</style>
              {openFolder.items && openFolder.items.length > 0 ? (
                <SortableContext items={openFolder.items.map(item => item.id)} strategy={rectSortingStrategy}>
                  <Row gutter={[16, 16]}>
                    {openFolder.items.map((item) => (
                      <SortableFolderItem key={item.id} item={item} loading={loadingMap[item.id]} />
                    ))}
                  </Row>
                </SortableContext>
              ) : (
                <Empty description="该文件夹暂无内容" />
              )}
            </div>
          </Dropdown>
        </Drawer>
      )}

      <DragOverlay dropAnimation={null} zIndex={2000}>
        {activeId ? (
          <div style={{ opacity: 0.9, transform: 'scale(1.05)', cursor: 'grabbing' }}>
            {(() => {
              // 先在 displayItems 中找
              let item = displayItems.find(it => it.id === activeId)
              // 如果没找到且有打开的文件夹，在文件夹中找
              if (!item && openFolder) {
                item = openFolder.items?.find(it => it.id === activeId)
              }
              if (!item) return null
              if (item.type === 'folder') {
                return (
                  <FolderCard
                    folder={item}
                    onClick={() => {}}
                    onEdit={() => {}}
                    onDelete={() => {}}
                    onExport={() => {}}
                    onImport={() => {}}
                  />
                )
              }
              return (
                <WorkflowCard
                  workflow={item}
                  loading={false}
                  onClick={() => {}}
                  onTrigger={() => {}}
                  onEdit={() => {}}
                  onDelete={() => {}}
                  onExport={() => {}}
                />
              )
            })()}
          </div>
        ) : null}
      </DragOverlay>

      <div style={{ position: 'fixed', right: 24, bottom: 24, zIndex: 1000 }}>
        <Button
          type="primary"
          shape="circle"
          size="large"
          icon={<RobotOutlined />}
          title="AI 生成工作流"
          onClick={() => setShowChatbot(true)}
        />
      </div>

      {showChatbot && (
        <AiChatbot open={showChatbot} onClose={() => setShowChatbot(false)} />
      )}

      {editingItem && (
        <WorkflowEditor
          open={true}
          type={editingItem.type}
          initialData={editingItem}
          onSave={handleSaveItem}
          onCancel={() => setEditingItem(null)}
        />
      )}

      <TransferModal
        open={transferModal.open}
        mode={transferModal.mode}
        title={transferModal.title}
        initialContent={transferModal.content}
        defaultFileName={transferModal.defaultFileName}
        onImportConfirm={transferModal.onImportConfirm}
        onCancel={() => setTransferModal(prev => ({ ...prev, open: false }))}
      />
    </Layout>
    </DndContext>
  )
}
