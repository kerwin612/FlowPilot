import { useState, useEffect } from 'react'
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
  Typography
} from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  FolderOutlined,
  EditOutlined,
  ReloadOutlined,
  RightOutlined,
  DownOutlined,
  ThunderboltOutlined
} from '@ant-design/icons'
import WorkflowEditor from './WorkflowEditor'
import EnvVarEditor from './EnvVarEditor'
import { configService } from '../../../services'
import { getWorkflowDisplayText } from '../workflow/workflowDisplay'
import {
  ITEM_TYPE_WORKFLOW,
  ITEM_TYPE_FOLDER
} from '../../../shared/constants'

const { Title, Text } = Typography

export default function ConfigManager({ config, onClose }) {
  const [tabs, setTabs] = useState(config.tabs || [])
  const [currentTabIndex, setCurrentTabIndex] = useState(0)
  const [editingItem, setEditingItem] = useState(null)
  const [editingTabName, setEditingTabName] = useState(null)
  const [expandedFolders, setExpandedFolders] = useState([])
  const [envVars, setEnvVars] = useState(config.envVars || [])
  const [activeKey, setActiveKey] = useState('tabs')

  // 实时保存：tabs 或 envVars 变化时立刻持久化
  useEffect(() => {
    const newConfig = { ...config, tabs, envVars }
    configService.saveConfig(newConfig)
  }, [tabs, envVars])

  const handleReset = () => {
    const defaultConfig = configService.resetConfig()
    setTabs(defaultConfig.tabs || [])
    setEnvVars(defaultConfig.envVars || [])
    setCurrentTabIndex(0)
  }

  // 标签页操作
  const addTab = () => {
    const newTab = {
      id: `tab_${Date.now()}`,
      name: `标签页 ${tabs.length + 1}`,
      items: []
    }
    const newTabs = [...tabs, newTab]
    setTabs(newTabs)
    setCurrentTabIndex(newTabs.length - 1)
  }

  const deleteTab = (index) => {
    const newTabs = tabs.filter((_, i) => i !== index)
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
    
    const newTabs = [...tabs]
    newTabs[index].name = trimmedName
    setTabs(newTabs)
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
    const newTabs = [...tabs]
    newTabs[currentTabIndex].items = newTabs[currentTabIndex].items.filter((it) => it.id !== itemId)
    setTabs(newTabs)
  }

  const saveItem = (itemData) => {
    const newTabs = [...tabs]
    const currentTab = newTabs[currentTabIndex]

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
      currentTab.items = [...(currentTab.items || []), newItem]
    } else {
      const index = currentTab.items.findIndex((it) => it.id === itemData.id)
      if (index !== -1) {
        const prev = currentTab.items[index]
        const isFolder = prev.type === ITEM_TYPE_FOLDER
        currentTab.items[index] = {
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
      }
    }

    setTabs(newTabs)
    setEditingItem(null)
  }

  // 删除文件夹内的项目
  const deleteItemInFolder = (folderId, itemId) => {
    const newTabs = [...tabs]
    const folder = newTabs[currentTabIndex].items.find((it) => it.id === folderId)
    if (folder && folder.items) {
      folder.items = folder.items.filter((it) => it.id !== itemId)
      setTabs(newTabs)
    }
  }

  // 编辑文件夹内的项目
  const editItemInFolder = (folderId, item) => {
    setEditingItem({ type: item.type, data: { ...item }, folderId, isNew: false })
  }

  // 保存文件夹内的项目
  const saveItemInFolder = (itemData, folderId) => {
    const newTabs = [...tabs]
    const folder = newTabs[currentTabIndex].items.find((it) => it.id === folderId)

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

    setTabs(newTabs)
    setEditingItem(null)
  }

  // 向文件夹添加新项目
  const addItemToFolder = (folderId) => {
    setEditingItem({ type: 'workflow', data: {}, folderId, isNew: true })
  }

  const currentTab = tabs[currentTabIndex]

  // 渲染文件夹内的项目
  const renderFolderItem = (item, folderId) => {
    const displayText = getWorkflowDisplayText(item)

    return (
      <List.Item
        key={item.id}
        style={{ paddingLeft: 40 }}
        actions={[
          <Button
            key="edit"
            type="text"
            size="small"
            title="编辑"
            icon={<EditOutlined />}
            onClick={() => editItemInFolder(folderId, item)}
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
        actions={[
          <Button
            key="edit"
            type="text"
            size="small"
            title="编辑"
            icon={<EditOutlined />}
            onClick={() => editItem(item)}
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
  const tabItems = tabs.map((tab, index) => ({
    key: String(index),
    label: (
      <Space size={4}>
        <span>{tab.name}</span>
      </Space>
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
            </Space>
          </Space>
        }
        bordered={false}
      >
        {currentTab?.items && currentTab.items.length > 0 ? (
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
              if (item._isSubItem) return renderFolderItem(item, item._parentId)
              if (item._isFolder) {
                const isExpanded = expandedFolders.includes(item.id)
                const toggleExpand = (e) => {
                  if (e.target.closest('.ant-list-item-action')) return
                  setExpandedFolders((prev) =>
                    isExpanded ? prev.filter((id) => id !== item.id) : [...prev, item.id]
                  )
                }
                return (
                  <List.Item
                    key={item.id}
                    style={{ cursor: 'pointer' }}
                    onClick={toggleExpand}
                    actions={[
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
                          style={{ marginRight: -8 }}
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
                )
              }
              return renderListItem(item)
            }}
          />
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
            <Popconfirm
              title="确定重置配置吗？"
              description="这将清空所有自定义配置并恢复默认设置"
              onConfirm={handleReset}
              okText="确定重置"
              cancelText="取消"
              okButtonProps={{ danger: true }}
            >
              <Button danger icon={<ReloadOutlined />} title="重置配置"></Button>
            </Popconfirm>
          }
          items={[
            {
              key: 'tabs',
              label: '工作流',
              children: (
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                  {tabs.length > 0 ? (
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
              children: <EnvVarEditor envVars={envVars} onChange={setEnvVars} />
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
    </>
  )
}
