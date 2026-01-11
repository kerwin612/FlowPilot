import { useState, useEffect } from 'react'
import { Layout, Tabs, Button, Space, Empty, Row, Col, Spin, Drawer, App } from 'antd'
import { SettingOutlined, GithubOutlined, ShareAltOutlined, RobotOutlined } from '@ant-design/icons'
import useConfig from './hooks/useConfig'
import useNavigation from './hooks/useNavigation'
import useWorkflowExecution from './hooks/useWorkflowExecution'
import { systemService, configService } from '../../services'
import WorkflowCard from './components/WorkflowCard'
import FolderCard from './components/FolderCard'
import ConfigManager from './components/ConfigManager'
import AiChatbot from './components/AiChatbot'
import WorkflowEditor from './components/WorkflowEditor'
import { ITEM_TYPE_FOLDER, ITEM_TYPE_WORKFLOW } from '../../shared/constants'

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

  const renderItem = (item) => {
    if (item.type === 'folder') {
      return (
        <Col key={item.id}>
          <FolderCard
            folder={item}
            onClick={() => setOpenFolder(item)}
            onEdit={() => handleEditItem(item)}
            onDelete={() => handleDeleteItem(item)}
          />
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
        <WorkflowCard
          workflow={item}
          loading={loadingMap[item.id]}
          onClick={handleCardClick}
          onTrigger={(val) => handleWorkflowTrigger(item, val)}
          onEdit={() => handleEditItem(item)}
          onDelete={() => handleDeleteItem(item)}
        />
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
        {displayItems.length > 0 ? (
          <Row gutter={[16, 16]}>{displayItems.map(renderItem)}</Row>
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
          {openFolder.items && openFolder.items.length > 0 ? (
            <Row gutter={[16, 16]}>
              {openFolder.items.map((item) => (
                <Col key={item.id}>
                  <WorkflowCard
                    workflow={item}
                    loading={loadingMap[item.id]}
                    onClick={() => handleWorkflowClick(item)}
                    onTrigger={(val) => handleWorkflowTrigger(item, val)}
                    onEdit={() => handleEditItem(item)}
                    onDelete={() => handleDeleteItem(item)}
                  />
                </Col>
              ))}
            </Row>
          ) : (
            <Empty description="该文件夹暂无内容" />
          )}
        </Drawer>
      )}

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
    </Layout>
  )
}
