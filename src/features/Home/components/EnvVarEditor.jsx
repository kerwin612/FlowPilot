import { useState, useMemo, useCallback, createContext, useContext } from 'react'
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
  Alert,
  Tag
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
  InfoCircleOutlined,
  LaptopOutlined,
  HolderOutlined
} from '@ant-design/icons'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const { Title, Text } = Typography

import systemService from '../../../services/systemService'

const DragActivatorContext = createContext(null)

// 可排序的环境变量行组件
const SortableEnvVarRow = ({ record, ...props }) => {
  // 检查 record 是否存在
  if (!record) {
    return <tr {...props} />;
  }

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: record.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1
  }

  return (
    <DragActivatorContext.Provider value={{ listeners }}>
      <tr ref={setNodeRef} style={style} {...attributes}>
        {props.children}
      </tr>
    </DragActivatorContext.Provider>
  )
}

const DragHandle = () => {
  const ctx = useContext(DragActivatorContext)
  return (
    <span {...(ctx?.listeners || {})} style={{ display: 'inline-flex' }}>
      <HolderOutlined className="drag-handle" style={{ cursor: 'grab' }} role="button" aria-label="拖拽排序" />
    </span>
  )
}

export default function EnvVarEditor({ envVars = [], onChange, onDelete }) {
  const deviceId = systemService.getNativeId()
  const [editingKey, setEditingKey] = useState('')
  const [editingName, setEditingName] = useState('')
  const [editingValue, setEditingValue] = useState('')
  const [expandedMap, setExpandedMap] = useState({})
  const [copiedKey, setCopiedKey] = useState('')
  

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const tableComponents = useMemo(() => ({
    body: {
      row: (props) => {
        const record = envVars.find(v => v.id === props['data-row-key'])
        return <SortableEnvVarRow record={record} {...props} />
      }
    }
  }), [envVars])

  const handleAdd = useCallback(() => {
    const newVar = {
      id: `env_${Date.now()}`,
      name: '',
      value: '',
      enabled: true,
      deviceId: null,
      deviceName: null
    }
    onChange([...envVars, newVar])
    setEditingKey(newVar.id)
    setEditingName('')
    setEditingValue('')
  }, [envVars, onChange])

  const handleDelete = useCallback((id) => {
    try { if (typeof onDelete === 'function') onDelete(id) } catch {}
    onChange(envVars.filter((v) => v.id !== id))
    message.success('已删除')
  }, [envVars, onChange, onDelete])

  const handleEdit = useCallback((record) => {
    setEditingKey(record.id)
    setEditingName(record.name)
    setEditingValue(record.value)
  }, [])

  const handleSave = useCallback((id) => {
    if (!editingName.trim()) {
      message.error('变量名不能为空')
      return
    }

    onChange(
      envVars.map((v) =>
        v.id === id ? { ...v, name: editingName.trim(), value: editingValue } : v
      )
    )
    setEditingKey('')
    message.success('已保存')
  }, [editingName, editingValue, envVars, onChange])

  const handleCancel = useCallback((id) => {
    const item = envVars.find((v) => v.id === id)
    if (item && !item.name && !item.value) {
      onChange(envVars.filter((v) => v.id !== id))
    }
    setEditingKey('')
  }, [envVars, onChange])

  const handleToggle = useCallback((id, enabled) => {
    onChange(envVars.map((v) => (v.id === id ? { ...v, enabled } : v)))
  }, [envVars, onChange])

  const copyValue = useCallback(async (id, value) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(value || '')
      } else {
        const ta = document.createElement('textarea')
        ta.value = value || ''
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopiedKey(id)
      setTimeout(() => setCopiedKey(''), 900)
    } catch (e) {
      message.error('复制失败')
    }
  }, [])

  const toggleExpand = useCallback((id) => {
    setExpandedMap((m) => ({ ...m, [id]: !m[id] }))
  }, [])

  const handleDragStart = useCallback(() => {}, [])

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event
    if (!over) return
    if (active.id !== over.id) {
      const oldIndex = envVars.findIndex((item) => item.id === active.id)
      const newIndex = envVars.findIndex((item) => item.id === over.id)
      
      const newEnvVars = arrayMove(envVars, oldIndex, newIndex)
      // 调用 onChange 回调更新状态
      onChange(newEnvVars, { type: 'reorder' })
    }
  }, [envVars, onChange])

  const columns = useMemo(() => ([
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 60,
      render: (enabled, record) => {
        const isOtherDevice = record.deviceId && record.deviceId !== deviceId
        return (
          <Switch
            checked={enabled}
            size="small"
            disabled={isOtherDevice}
            onChange={(checked) => handleToggle(record.id, checked)}
          />
        )
      }
    },
    {
      title: '变量名',
      dataIndex: 'name',
      key: 'name',
      width: 180,
      render: (text, record) => {
        const isOtherDevice = record.deviceId && record.deviceId !== deviceId
        if (editingKey === record.id) {
          return (
            <Space direction="vertical" size={0} style={{ width: '100%' }}>
                <Input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  placeholder="例如：NODE_ENV"
                  onPressEnter={() => handleSave(record.id)}
                />
              <Space size={8} align="center">
                <Switch
                  checked={!!record.deviceId}
                  size="small"
                  onChange={(checked) => {
                    onChange(
                      envVars.map((v) =>
                        v.id === record.id
                          ? {
                              ...v,
                              deviceId: checked ? deviceId : null
                            }
                          : v
                      )
                    )
                  }}
                />
                <Text type="secondary" style={{ fontSize: 12, userSelect: 'none' }}>
                  仅本机生效
                </Text>
              </Space>
            </Space>
          )
        }
        return (
          <Space size={8} align="center" wrap={false}>
            <DragHandle />
            <Text
              style={{
                color: record.enabled ? 'inherit' : 'var(--color-text-disabled)',
                fontFamily: 'monospace'
              }}
            >
              {text || <Text type="secondary">未设置</Text>}
            </Text>
            {record.deviceId && (
              <Tooltip title={isOtherDevice ? `该变量仅在 ${record.deviceName || '其他设备'} 生效` : '仅本机生效'}>
                <Tag
                  icon={<LaptopOutlined style={{ fontSize: 10 }} />}
                  color={isOtherDevice ? 'default' : 'blue'}
                  style={{ 
                    fontSize: 11, 
                    margin: 0,
                    padding: '0 6px',
                    lineHeight: '20px',
                    height: '20px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {isOtherDevice ? record.deviceName || '其他设备' : '本机'}
                </Tag>
              </Tooltip>
            )}
          </Space>
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
        const isOtherDevice = record.deviceId && record.deviceId !== deviceId
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
            <Tooltip title={isOtherDevice ? '其他设备的配置谨慎编辑' : '编辑'}>
              <Button
                type="text"
                size="small"
                title="编辑"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
              ></Button>
            </Tooltip>
            <Popconfirm
              title="确定删除？"
              onConfirm={() => handleDelete(record.id)}
              okText="确定"
              cancelText="取消"
              disabled={isOtherDevice}
            >
              <Tooltip title={isOtherDevice ? '其他设备的配置谨慎删除' : '删除'}>
                <Button
                  type="text"
                  size="small"
                  title="删除"
                  danger
                  icon={<DeleteOutlined />}
                ></Button>
              </Tooltip>
            </Popconfirm>
          </Space>
        )
      }
    }
  ]), [deviceId, editingKey, editingName, editingValue, expandedMap, copiedKey, envVars])

  return (
    <Card
      title={
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space direction="vertical" size={0}>
            <Title level={5} style={{ margin: 0 }}>
              <Space size={8}>
                <span>全局环境变量</span>
                <Tooltip title={`当前设备 ID: ${deviceId}`}>
                  <Tag>{deviceId.substring(0, 8)}</Tag>
                </Tooltip>
              </Space>
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
              <li>
                <strong>仅本机生效：</strong> 开启后，该变量仅在当前设备生效，不会同步到其他机器；适用于多机器使用且配置不同的场景
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
          <style>{`
            .env-vars-table-wrap .ant-table-container { /* 保持内部默认 overflow 逻辑，允许自适应宽度 */ }
          `}</style>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={envVars.map((item) => item.id)}
              strategy={verticalListSortingStrategy}
            >
              <Table
                dataSource={envVars}
                columns={columns}
                rowKey="id"
                pagination={false}
                size="small"
                tableLayout="fixed"
                style={{ width: '100%' }}
                components={tableComponents}
              />
            </SortableContext>
          </DndContext>
        </div>
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无环境变量，点击上方按钮添加" />
      )}
    </Card>
  )
}