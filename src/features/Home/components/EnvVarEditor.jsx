import { useState } from 'react'
import {
  Card,
  Table,
  Button,
  Space,
  Input,
  Switch,
  Popconfirm,
  Empty,
  message,
  Typography,
  Tooltip,
  Alert
} from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  CheckOutlined,
  CloseOutlined,
  CopyOutlined,
  DownOutlined,
  UpOutlined,
  InfoCircleOutlined
} from '@ant-design/icons'

const { Title, Text } = Typography

export default function EnvVarEditor({ envVars = [], onChange }) {
  const [editingKey, setEditingKey] = useState('')
  const [editingName, setEditingName] = useState('')
  const [editingValue, setEditingValue] = useState('')
  const [expandedMap, setExpandedMap] = useState({})
  const [copiedKey, setCopiedKey] = useState('')

  const handleAdd = () => {
    const newVar = {
      id: `env_${Date.now()}`,
      name: '',
      value: '',
      enabled: true
    }
    onChange([...envVars, newVar])
    setEditingKey(newVar.id)
    setEditingName('')
    setEditingValue('')
  }

  const handleDelete = (id) => {
    onChange(envVars.filter((v) => v.id !== id))
    message.success('已删除')
  }

  const handleEdit = (record) => {
    setEditingKey(record.id)
    setEditingName(record.name)
    setEditingValue(record.value)
  }

  const handleSave = (id) => {
    if (!editingName.trim()) {
      message.error('变量名不能为空')
      return
    }

    // 检查是否有重名（排除自己）
    const duplicate = envVars.find((v) => v.id !== id && v.name === editingName.trim())
    if (duplicate) {
      message.error('变量名已存在')
      return
    }

    onChange(
      envVars.map((v) =>
        v.id === id ? { ...v, name: editingName.trim(), value: editingValue } : v
      )
    )
    setEditingKey('')
    message.success('已保存')
  }

  const handleCancel = (id) => {
    // 如果是新添加的空项，取消时删除
    const item = envVars.find((v) => v.id === id)
    if (item && !item.name && !item.value) {
      onChange(envVars.filter((v) => v.id !== id))
    }
    setEditingKey('')
  }

  const handleToggle = (id, enabled) => {
    onChange(envVars.map((v) => (v.id === id ? { ...v, enabled } : v)))
  }

  const copyValue = async (id, value) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(value || '')
      } else {
        // 退化方案
        const ta = document.createElement('textarea')
        ta.value = value || ''
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      // 轻量提示：在拷贝按钮上方短暂显示“已复制”
      setCopiedKey(id)
      window.setTimeout(() => setCopiedKey(''), 900)
    } catch (e) {
      message.error('复制失败')
    }
  }

  const toggleExpand = (id) => {
    setExpandedMap((m) => ({ ...m, [id]: !m[id] }))
  }

  const columns = [
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 60,
      render: (enabled, record) => (
        <Switch
          checked={enabled}
          size="small"
          onChange={(checked) => handleToggle(record.id, checked)}
        />
      )
    },
    {
      title: '变量名',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      render: (text, record) => {
        if (editingKey === record.id) {
          return (
            <Input
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              placeholder="例如：NODE_ENV"
              autoFocus
              onPressEnter={() => handleSave(record.id)}
            />
          )
        }
        return (
          <Text
            style={{
              color: record.enabled ? 'inherit' : 'var(--color-text-disabled)',
              fontFamily: 'monospace'
            }}
          >
            {text || <Text type="secondary">未设置</Text>}
          </Text>
        )
      }
    },
    {
      title: '变量值',
      dataIndex: 'value',
      key: 'value',
      className: 'env-var-value-cell',
      render: (text, record) => {
        if (editingKey === record.id) {
          return (
            <Input.TextArea
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              placeholder="例如：C:\Program Files\MyApp 或 %PATH%;C:\MyApp"
              autoSize={{ minRows: 2, maxRows: 6 }}
              style={{ fontFamily: 'monospace' }}
            />
          )
        }
        const expanded = !!expandedMap[record.id]
        const display = text || ''
        return (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, maxWidth: '100%' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {!expanded ? (
                <Tooltip title={display} placement="topLeft">
                  <Text
                    style={{
                      color: record.enabled ? 'inherit' : 'var(--color-text-disabled)',
                      fontFamily: 'monospace',
                      display: 'block',
                      maxWidth: '100%',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {display || <Text type="secondary">未设置</Text>}
                  </Text>
                </Tooltip>
              ) : (
                <pre
                  style={{
                    margin: 0,
                    fontFamily: 'monospace',
                    maxHeight: 180,
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all'
                  }}
                >
                  {display || '(空)'}
                </pre>
              )}
            </div>
            <Space size={4} wrap>
              {display && (
                <Tooltip title={expanded ? '收起' : '展开'}>
                  <Button
                    size="small"
                    type="text"
                    icon={expanded ? <UpOutlined /> : <DownOutlined />}
                    onClick={() => toggleExpand(record.id)}
                  />
                </Tooltip>
              )}
              <Tooltip
                title={copiedKey === record.id ? '已复制' : '复制值'}
                open={copiedKey === record.id ? true : undefined}
              >
                <Button
                  size="small"
                  type="text"
                  icon={<CopyOutlined />}
                  onClick={() => copyValue(record.id, display)}
                />
              </Tooltip>
            </Space>
          </div>
        )
      }
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_, record) => {
        if (editingKey === record.id) {
          return (
            <Space size="small">
              <Button
                type="text"
                size="small"
                title="确认"
                icon={<CheckOutlined />}
                onClick={() => handleSave(record.id)}
                style={{ color: 'var(--color-success)' }}
              ></Button>
              <Button
                type="text"
                size="small"
                title="取消"
                icon={<CloseOutlined />}
                onClick={() => handleCancel(record.id)}
              ></Button>
            </Space>
          )
        }
        return (
          <Space size="small">
            <Button
              type="text"
              size="small"
              title="编辑"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            ></Button>
            <Popconfirm
              title="确定删除？"
              onConfirm={() => handleDelete(record.id)}
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
          </Space>
        )
      }
    }
  ]

  return (
    <Card
      title={
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space direction="vertical" size={0}>
            <Title level={5} style={{ margin: 0 }}>
              全局环境变量
            </Title>
            <Text type="secondary" style={{ fontSize: 12 }}>
              这些环境变量将在所有快捷指令执行前注入，已禁用的变量不会生效
            </Text>
          </Space>
          <Button title="添加变量" icon={<PlusOutlined />} onClick={handleAdd}></Button>
        </Space>
      }
      bordered={false}
    >
      <Alert
        message="环境变量引用说明"
        description={
          <div style={{ fontSize: 12 }}>
            <div>在变量值中可以引用其他环境变量：</div>
            <ul style={{ marginTop: 4, marginBottom: 0, paddingLeft: 20 }}>
              <li>
                <strong>Windows 风格：</strong> 使用 <code>%变量名%</code>，例如{' '}
                <code>PATH=%PATH%;C:\MyApp</code>
              </li>
              <li>
                <strong>Unix 风格：</strong> 使用 <code>$变量名</code> 或 <code>${'{变量名}'}</code>
                ，例如 <code>MYPATH=$HOME/bin</code>
              </li>
              <li>
                <strong>引用自己：</strong> 使用 <code>PATH=%PATH%;新路径</code> 可以追加到现有 PATH
                末尾
              </li>
            </ul>
          </div>
        }
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        style={{ marginBottom: 16 }}
        closable
      />
      {envVars.length > 0 ? (
        <div className="env-vars-table-wrap" style={{ width: '100%', overflowX: 'hidden' }}>
          {/* 说明：横向滚动条最初被隐藏导致最右侧内容被裁剪，这里通过给外层留出 paddingRight (≈ 系统滚动条宽度) 避免裁剪 */}
          <style>{`
            .env-vars-table-wrap .ant-table-container { /* 保持内部默认 overflow 逻辑，允许自适应宽度 */ }
            /* 如果仍出现极端长单词导致的水平滚动，可考虑为 value 列增加 word-break: break-all; （已在展开态处理） */
          `}</style>
          <Table
            dataSource={envVars}
            columns={columns}
            rowKey="id"
            pagination={false}
            size="small"
            tableLayout="fixed"
            style={{ width: '100%' }}
          />
        </div>
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无环境变量，点击上方按钮添加" />
      )}
    </Card>
  )
}
