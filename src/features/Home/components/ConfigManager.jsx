import { useState, useEffect, useMemo } from 'react'
import {
  Modal,
  Tabs,
  Button,
  Input,
  Space,
  List,
  Card,
  Empty,
  Popconfirm,
  Tag,
  Typography,
  Select
} from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  FolderOutlined,
  EditOutlined,
  RightOutlined,
  DownOutlined,
  ThunderboltOutlined,
  ImportOutlined,
  ExportOutlined
} from '@ant-design/icons'
import WorkflowEditor from './WorkflowEditor'
import EnvVarEditor from './EnvVarEditor'
import GlobalVarEditor from './GlobalVarEditor'
import { configService } from '../../../services'
import { HolderOutlined } from '@ant-design/icons'
import { DndContext, useSensor, useSensors, PointerSensor, closestCenter, KeyboardSensor } from '@dnd-kit/core'
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { getWorkflowDisplayText } from '../workflow/workflowDisplay'
import {
  ITEM_TYPE_WORKFLOW,
  ITEM_TYPE_FOLDER
} from '../../../shared/constants'

const { Title, Text } = Typography

export default function ConfigManager({ config, onClose }) {
  const [tabs, setTabs] = useState(configService.getTabs())
  const [currentTabIndex, setCurrentTabIndex] = useState(0)
  const [editingItem, setEditingItem] = useState(null)
  const [editingTabName, setEditingTabName] = useState(null)
  const [expandedFolders, setExpandedFolders] = useState([])
  const [envVars, setEnvVars] = useState(configService.getEnvVars())
  const [globalVars, setGlobalVars] = useState(configService.getGlobalVars())
  const [activeKey, setActiveKey] = useState('tabs')
  const [profiles, setProfiles] = useState(configService.getProfiles())
  const [activeProfileId, setActiveProfileId] = useState(configService.getActiveProfileId())

  useEffect(() => {
    try {
      const data = configService.loadAll()
      setTabs(data.tabs)
      setEnvVars(data.envVars)
      setGlobalVars(data.globalVars)
      setProfiles(data.profiles?.profiles || [])
      setActiveProfileId(configService.getActiveProfileId())
    } catch { }
    const unsubscribe = configService.subscribe(({ tabs, envVars, globalVars, profiles, activeProfileId }) => {
      setTabs(tabs)
      setEnvVars(envVars)
      setGlobalVars(globalVars)
      setProfiles(profiles?.profiles || [])
      setActiveProfileId(activeProfileId)
    })
    return unsubscribe
  }, [])

  // 标签页操作
  const addTab = () => {
    const newTab = configService.addTab(`标签页 ${tabs.length + 1}`)
    setTabs(configService.getTabs())
    setCurrentTabIndex(tabs.length)
  }

  const deleteTab = (index) => {
    configService.deleteTab(index)
    const newTabs = configService.getTabs()
    setTabs(newTabs)
    if (currentTabIndex >= newTabs.length) {
      setCurrentTabIndex(Math.max(0, newTabs.length - 1))
    }
  }

  const updateTabName = (index, name) => {
    // 验证名称不能为空
    const trimmedName = name?.trim()
    if (!trimmedName) {
      setEditingTabName(null)
      return
    }

    configService.updateTab(index, { name: trimmedName })
    setTabs(configService.getTabs())
    setEditingTabName(null)
  }

  // 项目操作
  const addItem = (type) => {
    setEditingItem({ type, data: {}, isNew: true })
  }

  const editItem = (item) => {
    setEditingItem({ type: item.type, data: { ...item }, isNew: false })
  }

  const deleteItem = (itemId) => {
    configService.deleteItem(currentTabIndex, itemId)
    setTabs(configService.getTabs())
  }

  const saveItem = (itemData) => {
    if (editingItem.isNew) {
      // Generate ID and force type 'workflow' for non-folder
      const elementType =
        editingItem.type === ITEM_TYPE_FOLDER ? ITEM_TYPE_FOLDER : ITEM_TYPE_WORKFLOW
      const newItem = {
        ...itemData,
        id: `${elementType}_${Date.now()}`,
        type: elementType,
        executors: elementType === ITEM_TYPE_FOLDER ? undefined : itemData.executors || [],
        actions: elementType === ITEM_TYPE_FOLDER ? undefined : itemData.actions || []
      }
      // For folders, ensure items array exists
      if (editingItem.type === ITEM_TYPE_FOLDER && !newItem.items) {
        newItem.items = []
      }
      configService.addItem(currentTabIndex, newItem)
    } else {
      const tab = tabs[currentTabIndex]
      const index = tab.items.findIndex((it) => it.id === itemData.id)
      if (index !== -1) {
        const prev = tab.items[index]
        const isFolder = prev.type === ITEM_TYPE_FOLDER
        const updatedItem = {
          ...prev,
          ...itemData,
          id: prev.id,
          type: isFolder ? ITEM_TYPE_FOLDER : ITEM_TYPE_WORKFLOW,
          executors: isFolder
            ? undefined
            : Array.isArray(itemData.executors)
              ? itemData.executors
              : prev.executors || [],
          actions: isFolder
            ? undefined
            : Array.isArray(itemData.actions)
              ? itemData.actions
              : prev.actions || []
        }
        configService.updateItem(currentTabIndex, updatedItem.id, updatedItem)
      }
    }

    setTabs(configService.getTabs())
    setEditingItem(null)
  }

  // 删除文件夹内的项目
  const deleteItemInFolder = (folderId, itemId) => {
    const tab = tabs[currentTabIndex]
    const folder = tab.items.find((it) => it.id === folderId)
    if (folder && folder.items) {
      folder.items = folder.items.filter((it) => it.id !== itemId)
      configService.updateItem(currentTabIndex, folderId, folder)
      setTabs(configService.getTabs())
      try { window.services?.workflow?.cleanupIfUnreferenced?.(itemId) } catch {}
    }
  }

  // 编辑文件夹内的项目
  const editItemInFolder = (folderId, item) => {
    setEditingItem({ type: item.type, data: { ...item }, folderId, isNew: false })
  }

  // 保存文件夹内的项目
  const saveItemInFolder = (itemData, folderId) => {
    const tab = tabs[currentTabIndex]
    const folder = tab.items.find((it) => it.id === folderId)

    if (!folder) return

    if (editingItem.isNew) {
      // Force type workflow for new items in folder
      const newItem = {
        ...itemData,
        id: `${ITEM_TYPE_WORKFLOW}_${Date.now()}`,
        type: ITEM_TYPE_WORKFLOW
      }
      folder.items = [...(folder.items || []), newItem]
    } else {
      const index = folder.items.findIndex((it) => it.id === itemData.id)
      if (index !== -1) {
        const prev = folder.items[index]
        folder.items[index] = {
          ...prev,
          ...itemData,
          id: prev.id,
          type: ITEM_TYPE_WORKFLOW,
          executors: Array.isArray(itemData.executors) ? itemData.executors : prev.executors || [],
          actions: Array.isArray(itemData.actions) ? itemData.actions : prev.actions || []
        }
      }
    }

    configService.updateItem(currentTabIndex, folderId, folder)
    setTabs(configService.getTabs())
    setEditingItem(null)
  }

  // 向文件夹添加新项目
  const addItemToFolder = (folderId) => {
    setEditingItem({ type: 'workflow', data: {}, folderId, isNew: true })
  }

  const currentTab = tabs[currentTabIndex]
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  )

  const SortableItem = ({ id, children }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
    const style = { transform: CSS.Transform.toString(transform), transition, position: 'relative' }
    return (
      <div ref={setNodeRef} style={style} {...attributes} className="drag-wrap">
        <span {...listeners} className="drag-handle" onMouseDown={(e) => e.stopPropagation()}><HolderOutlined /></span>
        {children}
      </div>
    )
  }

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (!over) return
    const activeId = active.id
    const overId = over.id
    const tab = tabs[currentTabIndex]
    const rootIds = (tab.items || []).map(i => i.id)
    const findFolderOf = (itemId) => tab.items.find(it => it.type === ITEM_TYPE_FOLDER && (it.items || []).some(s => s.id === itemId))
    const fromFolder = findFolderOf(activeId)
    const overFolder = tab.items.find(it => it.id === overId && it.type === ITEM_TYPE_FOLDER)
    const overSubFolder = findFolderOf(overId)

    if (fromFolder && rootIds.includes(overId)) {
      const targetIndex = tab.items.findIndex(i => i.id === overId)
      configService.moveItemOutOfFolder(currentTabIndex, activeId, fromFolder.id, targetIndex)
      setTabs(configService.getTabs())
      return
    }

    if (overFolder) {
      if (fromFolder && fromFolder.id !== overFolder.id) {
        configService.moveItemBetweenFolders(currentTabIndex, activeId, fromFolder.id, overFolder.id)
        setTabs(configService.getTabs())
        return
      }
      if (!fromFolder) {
        configService.moveItemToFolder(currentTabIndex, activeId, overFolder.id)
        setTabs(configService.getTabs())
        return
      }
    }

    if (!fromFolder && overSubFolder) {
      configService.moveItemToFolder(currentTabIndex, activeId, overSubFolder.id)
      setTabs(configService.getTabs())
      return
    }

    if (fromFolder && overSubFolder && fromFolder.id === overSubFolder.id) {
      const folder = tab.items.find(it => it.id === fromFolder.id)
      const oldIndex = (folder.items || []).findIndex(i => i.id === activeId)
      const newIndex = (folder.items || []).findIndex(i => i.id === overId)
      if (oldIndex < 0 || newIndex < 0) return
      const next = arrayMove(folder.items, oldIndex, newIndex)
      configService.reorderFolderItems(currentTabIndex, folder.id, next)
      setTabs(configService.getTabs())
      return
    }

    if (rootIds.includes(activeId) && rootIds.includes(overId)) {
      const oldIndex = tab.items.findIndex(i => i.id === activeId)
      const newIndex = tab.items.findIndex(i => i.id === overId)
      if (oldIndex < 0 || newIndex < 0) return
      const next = arrayMove(tab.items, oldIndex, newIndex)
      configService.reorderItems(currentTabIndex, next)
      setTabs(configService.getTabs())
      return
    }
  }
  const [choiceVisible, setChoiceVisible] = useState(false)
  const [choice, setChoice] = useState({ mode: null, entityId: null, tabIndex: null })
  const [configText, setConfigText] = useState('')
  const [importError, setImportError] = useState('')

  const openChoice = (mode, payload) => {
    console.log('[ConfigManager] openChoice', mode, payload)
    setChoice({ mode, entityId: payload?.entityId || null, tabIndex: payload?.tabIndex ?? null })
    setChoiceVisible(true)
  }

  const runChoice = async (target) => {
    console.log('[ConfigManager] runChoice start', choice, target)
    try {
      if (choice.mode === 'export') {
        if (target === 'clipboard') {
          const ok = configService.exportToClipboard(configText || '')
          console.log('[ConfigManager] export clipboard result', ok)
          window.services.showNotification(ok ? '已复制到剪贴板' : '复制失败')
        } else {
          const sel = await window.services.selectPath({ properties: ['openDirectory', 'createDirectory'] })
          const dirPath = Array.isArray(sel) ? sel[0] : (sel && sel[0])
          if (!dirPath) { window.services.showNotification('未选择目录'); return }
          const sep = dirPath.includes('\\') ? '\\' : '/'
          const normalized = dirPath.endsWith(sep) ? dirPath : (dirPath + sep)
          const baseName = (choice.entityId || 'export') + '_' + Date.now() + '.json'
          const finalPath = normalized + baseName
          console.log('[ConfigManager] export file path', finalPath)
          const ok = configService.exportToFile(configText || '', finalPath)
          console.log('[ConfigManager] export file result', ok)
          window.services.showNotification(ok ? '已导出到文件' : '导出失败')
        }
      } else if (choice.mode === 'import') {
        if (target === 'clipboard') {
          try {
            const text = await (navigator.clipboard && navigator.clipboard.readText ? navigator.clipboard.readText() : Promise.resolve(''))
            setConfigText(text || '')
            setImportError('')
            window.services.showNotification(text ? '已写入剪贴板内容到输入框' : '剪贴板为空，请输入或从文件导入')
          } catch {
            window.services.showNotification('读取剪贴板失败，请输入或从文件导入')
          }
        } else {
          const sel = await window.services.selectPath({ properties: ['openFile'] })
          const filePath = Array.isArray(sel) ? sel[0] : (sel && sel[0])
          if (!filePath) { window.services.showNotification('未选择文件'); return }
          console.log('[ConfigManager] import file path', filePath)
          try {
            const content = await window.services.readFile(filePath)
            setConfigText(content || '')
            setImportError('')
            window.services.showNotification(content ? '已写入文件内容到输入框' : '文件为空，请输入或从剪贴板导入')
          } catch {
            window.services.showNotification('读取文件失败')
          }
        }
      } else if (choice.mode === 'import-wf') {
        const tabIndex = choice.tabIndex ?? currentTabIndex
        const folderId = choice.entityId
        const addWorkflowIntoFolder = (wf) => {
          const tab = tabs[tabIndex]
          if (!tab) return false
          const folder = tab.items.find((it) => it.id === folderId && it.type === 'folder')
          if (!folder) return false
          const allIds = new Set(configService.getAllWorkflows().map((x) => x.id))
          const final = { ...wf }
          if (!final.id || allIds.has(final.id)) final.id = `workflow_${Date.now()}_${Math.floor(Math.random()*1000)}`
          folder.items = [...(folder.items || []), final]
          configService.updateItem(tabIndex, folderId, folder)
          setTabs(configService.getTabs())
          return true
        }

        if (target === 'clipboard') {
          try {
            const text = await (navigator.clipboard && navigator.clipboard.readText ? navigator.clipboard.readText() : Promise.resolve(''))
            if (!text) { window.services.showNotification('剪贴板为空，请改用文件导入'); return }
            const data = JSON.parse(text)
            if (data?.type === 'flowpilot/workflow-export' && data.workflow) {
              const ok = addWorkflowIntoFolder(data.workflow)
              window.services.showNotification(ok ? '已导入工作流至文件夹' : '导入失败')
            } else if (data?.type === 'flowpilot/folder-export') {
              window.services.showNotification('文件夹内只能导入工作流')
            } else {
              window.services.showNotification('导入失败：格式不正确')
            }
          } catch (e) {
            window.services.showNotification('导入失败：无法读取剪贴板')
          }
        } else {
          const sel = await window.services.selectPath({ properties: ['openFile'] })
          const filePath = Array.isArray(sel) ? sel[0] : (sel && sel[0])
          if (!filePath) { window.services.showNotification('未选择文件'); return }
          try {
            const text = await window.services.readFile(filePath)
            const data = JSON.parse(text)
            if (data?.type === 'flowpilot/workflow-export' && data.workflow) {
              const ok = addWorkflowIntoFolder(data.workflow)
              window.services.showNotification(ok ? '已导入工作流至文件夹' : '导入失败')
            } else if (data?.type === 'flowpilot/folder-export') {
              window.services.showNotification('文件夹内只能导入工作流')
            } else {
              window.services.showNotification('导入失败：格式不正确')
            }
          } catch (e) {
            window.services.showNotification('导入失败：读取文件出错')
          }
        }
      }
    } finally {
      console.log('[ConfigManager] runChoice end')
      if (choiceVisible && (choice.mode !== 'import')) {
        setChoiceVisible(false)
        setChoice({ mode: null, entityId: null, tabIndex: null })
      }
    }
  }

  const promptExport = async (entityId) => {
    try {
      const json = configService.exportWorkflow(entityId) || configService.exportFolder(entityId) || ''
      setConfigText(json)
    } catch { setConfigText('') }
    openChoice('export', { entityId })
  }

  const promptImport = async (targetTabIndex) => {
    try {
      const text = await (navigator.clipboard && navigator.clipboard.readText ? navigator.clipboard.readText() : Promise.resolve(''))
      setConfigText(text || '')
    } catch { setConfigText('') }
    openChoice('import', { tabIndex: targetTabIndex })
  }

  // 渲染文件夹内的项目
  const renderFolderItem = (item, folderId) => {
    const displayText = getWorkflowDisplayText(item)

    return (
      <List.Item
        key={item.id}
        style={{ paddingLeft: 84 }}
        actions={[
          <Button
            key="edit"
            type="text"
            size="small"
            title="编辑"
            icon={<EditOutlined />}
            onClick={() => editItemInFolder(folderId, item)}
          />,
          <Button
            key="export-entity-in-folder"
            type="text"
            size="small"
            title="导出工作流"
            icon={<ExportOutlined />}
            onClick={() => promptExport(item.id)}
          />,
          <Popconfirm
            key="delete"
            title="确定删除？"
            onConfirm={() => deleteItemInFolder(folderId, item.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="text" size="small" title="删除" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        ]}
      >
        <List.Item.Meta
          title={<Text strong>{item.name || '未命名'}</Text>}
          description={
            displayText && (
              <Text type="secondary" ellipsis style={{ maxWidth: 350 }}>
                {displayText}
              </Text>
            )
          }
        />
      </List.Item>
    )
  }

  // 渲染列表项
  const renderListItem = (item) => {
    const displayText = getWorkflowDisplayText(item)

    return (
      <List.Item
        key={item.id}
        style={{ paddingLeft: 28 }}
        actions={[
          <Button
            key="edit"
            type="text"
            size="small"
            title="编辑"
            icon={<EditOutlined />}
            onClick={() => editItem(item)}
          />,
          <Button
            key="export-entity"
            type="text"
            size="small"
            title="导出工作流"
            icon={<ExportOutlined />}
            onClick={() => promptExport(item.id)}
          />,
          <Popconfirm
            key="delete"
            title="确定删除？"
            onConfirm={() => deleteItem(item.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="text" size="small" title="删除" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        ]}
      >
        <List.Item.Meta
          title={<Text strong>{item.name || '未命名'}</Text>}
          description={
            displayText && (
              <Text type="secondary" ellipsis style={{ maxWidth: 400 }}>
                {displayText}
              </Text>
            )
          }
        />
      </List.Item>
    )
  }

  // 标签页配置
  const handleTabReorder = (event) => {
    const { active, over } = event
    if (!over) return
    const activeKey = String(active.id)
    const overKey = String(over.id)
    if (activeKey === overKey) return
    const oldIndex = tabs.findIndex((t, i) => String(i) === activeKey)
    const newIndex = tabs.findIndex((t, i) => String(i) === overKey)
    if (oldIndex < 0 || newIndex < 0) return
    const next = arrayMove(tabs, oldIndex, newIndex)
    configService.updateTabs(next)
    setTabs(configService.getTabs())
    setCurrentTabIndex(next.findIndex((_, i) => i === newIndex))
  }

  const SortableTabLabel = ({ id, children }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
    const style = { transform: CSS.Transform.toString(transform), transition, display: 'inline-flex', alignItems: 'center', gap: 6 }
    return (
      <span ref={setNodeRef} style={style} {...attributes} {...listeners}>
        <span className="tab-drag-handle" style={{ display: 'inline-flex', alignItems: 'center', opacity: 0.35 }}>
          <HolderOutlined />
        </span>
        {children}
      </span>
    )
  }

  const tabItems = tabs.map((tab, index) => ({
    key: String(index),
    label: (
      <SortableTabLabel id={String(index)}>
        <Space size={4}>
          <span>{tab.name}</span>
        </Space>
      </SortableTabLabel>
    ),
    children: (
      <Card
        title={
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Space>
              {editingTabName === index ? (
                <Input
                  size="small"
                  defaultValue={tab.name}
                  onPressEnter={(e) => updateTabName(index, e.target.value)}
                  onBlur={(e) => updateTabName(index, e.target.value)}
                  autoFocus
                  style={{ width: 200 }}
                  placeholder="标签页名称"
                />
              ) : (
                <>
                  <Title level={5} style={{ margin: 0 }}>
                    {tab.name}
                  </Title>
                  <Button
                    type="text"
                    size="small"
                    title="重命名"
                    icon={<EditOutlined />}
                    onClick={() => setEditingTabName(index)}
                  ></Button>
                  {tabs.length > 1 && (
                    <Popconfirm
                      title="确定删除此标签页？"
                      description="删除后将无法恢复"
                      onConfirm={() => deleteTab(index)}
                      okText="确定"
                      cancelText="取消"
                    >
                      <Button
                        type="text"
                        size="small"
                        title="删除"
                        danger
                        icon={<DeleteOutlined />}
                      ></Button>
                    </Popconfirm>
                  )}
                </>
              )}
            </Space>
            <Space>
              <Button
                icon={<ThunderboltOutlined />}
                title="添加工作流"
                onClick={() => addItem('workflow')}
              ></Button>
              <Button
                icon={<FolderOutlined />}
                title="添加文件夹"
                onClick={() => addItem('folder')}
              ></Button>
              <Button
                icon={<ImportOutlined />}
                title="导入工作流/文件夹"
                onClick={() => promptImport(currentTabIndex)}
              ></Button>
            </Space>
          </Space>
        }
        bordered={false}
      >
        {currentTab?.items && currentTab.items.length > 0 ? (
          <>
            <style>{`
              .drag-wrap{position:relative;}
              .drag-wrap .drag-handle{position:absolute;left:6px;top:50%;transform:translateY(-50%);display:inline-flex;align-items:center;justify-content:center;color:var(--color-text-secondary);cursor:grab;}
            `}</style>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={currentTab.items.flatMap((item)=>{
                const folderExpanded = expandedFolders.includes(item.id)
                if (item.type === ITEM_TYPE_FOLDER && folderExpanded && item.items) {
                  return [item.id, ...item.items.map(sub=>sub.id)]
                }
                return [item.id]
              })} strategy={verticalListSortingStrategy}>
            <List
              dataSource={currentTab.items.flatMap((item) => {
                if (item.type === ITEM_TYPE_FOLDER) {
                  const folderExpanded = expandedFolders.includes(item.id)
                  return [
                    { ...item, _isFolder: true },
                  ...(folderExpanded && item.items
                    ? item.items.map((subItem) => ({
                      ...subItem,
                      _isSubItem: true,
                      _parentId: item.id
                    }))
                    : [])
                ]
              }
              return [item]
            })}
            renderItem={(item) => {
              if (item._isSubItem) return (
                <SortableItem id={item.id}>{renderFolderItem(item, item._parentId)}</SortableItem>
              )
              if (item._isFolder) {
                const isExpanded = expandedFolders.includes(item.id)
                const toggleExpand = (e) => {
                  if (e.target.closest('.ant-list-item-action')) return
                  setExpandedFolders((prev) =>
                    isExpanded ? prev.filter((id) => id !== item.id) : [...prev, item.id]
                  )
                }
                return (
                  <SortableItem id={item.id}>
                  <List.Item
                    key={item.id}
                    style={{ cursor: 'pointer' }}
                    onClick={toggleExpand}
                    actions={[
                      <Button
                        key="export-entity-folder"
                        type="text"
                        size="small"
                        title="导出文件夹"
                        icon={<ExportOutlined />}
                        onClick={(e) => { e.stopPropagation(); promptExport(item.id) }}
                      />, 
                      <Button
                        key="import-wf-into-folder"
                        type="text"
                        size="small"
                        title="导入工作流"
                        icon={<ImportOutlined />}
                        onClick={(e) => { e.stopPropagation(); openChoice('import-wf', { entityId: item.id, tabIndex: currentTabIndex }) }}
                      />, 
                      <Button
                        key="add"
                        type="text"
                        size="small"
                        title="添加工作流"
                        icon={<ThunderboltOutlined />}
                        onClick={(e) => {
                          e.stopPropagation()
                          addItemToFolder(item.id)
                        }}
                      />,
                      <Button
                        key="edit"
                        type="text"
                        size="small"
                        title="编辑"
                        icon={<EditOutlined />}
                        onClick={(e) => {
                          e.stopPropagation()
                          editItem(item)
                        }}
                      />,
                      <Popconfirm
                        key="delete"
                        title="确定删除此文件夹？"
                        description="文件夹内的所有项目也会被删除"
                        onConfirm={() => deleteItem(item.id)}
                        okText="确定"
                        cancelText="取消"
                      >
                        <Button
                          type="text"
                          size="small"
                          title="删除"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </Popconfirm>
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        <Button
                          type="text"
                          size="small"
                          icon={isExpanded ? <DownOutlined /> : <RightOutlined />}
                          style={{ marginRight: -8, marginLeft: 28 }}
                        />
                      }
                      title={
                        <Space>
                          <FolderOutlined style={{ fontSize: 16, color: 'var(--color-warning)' }} />
                          <Text strong>{item.name || '未命名文件夹'}</Text>
                          <Tag color="orange">{item.items?.length || 0}项</Tag>
                        </Space>
                      }
                    />
                  </List.Item>
                  </SortableItem>
                )
              }
              return (
                <SortableItem id={item.id}>{renderListItem(item)}</SortableItem>
              )
            }}
            />
              </SortableContext>
            </DndContext>
          </>
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无内容，点击上方按钮添加" />
        )}
      </Card>
    )
  }))

  return (
    <>
      <Modal
        open
        title={
          <Title level={4} style={{ margin: 0 }}>
            配置管理
          </Title>
        }
        onCancel={onClose}
        width={'95%'}
        style={{ maxWidth: 880 }}
        destroyOnClose
        footer={null}
      >
        <Tabs
          activeKey={activeKey}
          onChange={setActiveKey}
          tabBarExtraContent={
            <Space size={8}>
              <Select
                value={activeProfileId || undefined}
                placeholder="选择配置档 (Profile)"
                style={{ width: 200 }}
                options={(profiles || []).map((p) => ({ value: p.id, label: p.name }))}
                onChange={(val) => configService.setActiveProfile(val)}
              />
              {profiles?.length > 1 && activeProfileId && activeProfileId !== 'default' && (
                <Popconfirm
                  title="确定删除当前配置档？"
                  description="删除后与其关联的工作流/变量也将移除"
                  onConfirm={() => {
                    configService.deleteProfile(activeProfileId)
                  }}
                  okText="删除"
                  cancelText="取消"
                >
                  <Button danger icon={<DeleteOutlined />} title="删除当前配置档" />
                </Popconfirm>
              )}
              <Button
                icon={<PlusOutlined />}
                title="新增配置档"
                onClick={async () => {
                  const p = await configService.addProfile(null)
                  configService.setActiveProfile(p.id)
                }}
              />
            </Space>
          }
          items={[
            {
              key: 'tabs',
              label: '工作流',
              children: (
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                  {tabs.length > 0 ? (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleTabReorder}>
                      <SortableContext items={tabs.map((_, i) => String(i))} strategy={verticalListSortingStrategy}>
                        <Tabs
                          activeKey={String(currentTabIndex)}
                          onChange={(key) => setCurrentTabIndex(Number(key))}
                          items={tabItems}
                          tabBarExtraContent={
                            <Button
                              icon={<PlusOutlined />}
                              title="新建标签页"
                              onClick={addTab}
                            ></Button>
                          }
                        />
                      </SortableContext>
                    </DndContext>
                  ) : (
                    <Card>
                      <Empty description="暂无标签页">
                        <Button type="primary" icon={<PlusOutlined />} onClick={addTab}>
                          创建第一个标签页
                        </Button>
                      </Empty>
                    </Card>
                  )}
                </Space>
              )
            },
            {
              key: 'env',
              label: <Space>环境变量</Space>,
              children: (
                <EnvVarEditor
                  envVars={envVars}
                  onDelete={(id) => {
                    configService.deleteEnvVar(id)
                    setEnvVars(configService.getEnvVars())
                  }}
                  onChange={(newEnvVars, meta) => {
                    const ids = newEnvVars.map(item => item.id)
                    if (meta && meta.type === 'reorder') {
                      configService.updateEnvVarOrder(ids)
                    } else {
                      configService.saveEnvVars(newEnvVars)
                      configService.updateEnvVarOrder(ids)
                    }
                  }}
                />
              )
            },
            {
              key: 'globalvars',
              label: <Space>全局变量</Space>,
              children: (
                <GlobalVarEditor
                  globalVars={globalVars}
                  allTags={configService.getAllTags(globalVars)}
                  onChange={(newGlobalVars) => {
                    configService.saveGlobalVars(newGlobalVars)
                    setGlobalVars(configService.getGlobalVars())
                  }}
                />
              )
            }
          ]}
        />
      </Modal>

      {editingItem && (
        <WorkflowEditor
          open={true}
          type={editingItem.type}
          initialData={editingItem.data}
          onSave={(data) => {
            // Merge id if editing existing item
            const finalData = editingItem.isNew ? data : { ...data, id: editingItem.data.id }

            if (editingItem.folderId) {
              saveItemInFolder(finalData, editingItem.folderId)
            } else {
              saveItem(finalData)
            }
          }}
          onCancel={() => setEditingItem(null)}
        />
      )}

      <Modal
        open={choiceVisible}
        title={choice.mode === 'export' ? '导出' : '导入'}
        onCancel={() => { setChoiceVisible(false); setChoice({ mode: null, entityId: null, tabIndex: null }) }}
        footer={null}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Input.TextArea rows={20} value={configText} onChange={(e) => setConfigText(e.target.value)} placeholder={choice.mode === 'export' ? '请输入要导出的配置' : '请输入要导入的配置'} />
          {choice.mode === 'import' && !!importError && (
            <Text type="danger">{importError}</Text>
          )}
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            {choice.mode === 'export' ? (
              <>
                <Button onClick={() => runChoice('file')}>导出到文件</Button>
                <Button type="primary" onClick={() => runChoice('clipboard')}>导出到剪贴板</Button>
              </>
            ) : (
              <>
                <Button onClick={() => runChoice('file')}>从文件导入</Button>
                <Button type="primary" onClick={async () => {
                  try {
                    const parsed = JSON.parse(configText || '')
                    if (!parsed || !parsed.type || (parsed.type !== 'flowpilot/workflow-export' && parsed.type !== 'flowpilot/folder-export')) {
                      setImportError('格式不正确：缺少或错误的 type 字段')
                      return
                    }
                    setImportError('')
                    const ok = await configService.importAutoFromText(configText || '', choice.tabIndex ?? currentTabIndex)
                    window.services.showNotification(ok ? '已导入' : '导入失败或格式不正确')
                    if (ok) {
                      setEnvVars(configService.getEnvVars())
                      setGlobalVars(configService.getGlobalVars())
                      setTabs(configService.getTabs())
                      setChoiceVisible(false)
                      setChoice({ mode: null, entityId: null, tabIndex: null })
                    }
                  } catch (e) {
                    setImportError('JSON 解析失败，请检查内容')
                  }
                }}>确认导入</Button>
              </>
            )}
          </Space>
        </Space>
      </Modal>
    </>
  )
}
