import { useState, useEffect } from 'react'
import { Layout, Tabs, Button, Space, Empty, Row, Col, Spin, Drawer } from 'antd'
import { SettingOutlined } from '@ant-design/icons'
import useConfig from './hooks/useConfig'
import useNavigation from './hooks/useNavigation'
import useWorkflowExecution from './hooks/useWorkflowExecution'
import { systemService } from '../../services'
import WorkflowCard from './components/WorkflowCard'
import FolderCard from './components/FolderCard'
import ConfigManager from './components/ConfigManager'

export default function Home({ enterAction: _enterAction }) {
  const { config, tabs, envVars, globalVars, reload } = useConfig()
  const { currentTabIndex, currentItems, switchTab } = useNavigation(tabs)
  const { execute, loadingMap } = useWorkflowExecution()

  const [filter, setFilter] = useState('')
  const [showConfigManager, setShowConfigManager] = useState(false)
  const [openFolder, setOpenFolder] = useState(null)
  const [activeTabKey, setActiveTabKey] = useState(String(currentTabIndex))

  // no-op

  useEffect(() => {
    systemService.setSubInput((payload) => {
      const value = typeof payload === 'string' ? payload : (payload && payload.text) || ''
      setFilter(value)
    }, '搜索工作流名称')
  }, [])

  // 当搜索关键词变化时，自动切换到搜索 tab
  useEffect(() => {
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

  // 收集所有工作流（非文件夹，仅 type === 'workflow'）
  const allWorkflows = (tabs || []).flatMap((tab) =>
    (tab.items || []).flatMap((item) => {
      if (item.type === 'folder') {
        return (item.items || []).filter((sub) => sub && sub.type === 'workflow')
      }
      return item && item.type === 'workflow' ? [item] : []
    })
  )

  // 搜索结果（独立计算，不受 activeTabKey 影响）
  const searchResults = allWorkflows.filter((it) =>
    (it.name || '').toLowerCase().includes(filter.toLowerCase())
  )

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
          <FolderCard folder={item} onClick={() => setOpenFolder(item)} />
        </Col>
      )
    }

    return (
      <Col key={item.id}>
        <WorkflowCard
          workflow={item}
          loading={loadingMap[item.id]}
          onClick={() => handleWorkflowClick(item)}
          onTrigger={(val) => handleWorkflowTrigger(item, val)}
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
                <Button
                  type="text"
                  title="配置管理"
                  icon={<SettingOutlined />}
                  onClick={() => setShowConfigManager(true)}
                />
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
                  />
                </Col>
              ))}
            </Row>
          ) : (
            <Empty description="该文件夹暂无内容" />
          )}
        </Drawer>
      )}
    </Layout>
  )
}
