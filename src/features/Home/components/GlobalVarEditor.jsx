import { useState } from 'react'
import {
  Card,
  Table,
  Button,
  Space,
  Input,
  Popconfirm,
  Empty,
  Typography,
  Tooltip,
  Alert,
  Tag,
  Select,
  Modal,
  Form
} from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  CopyOutlined,
  DownOutlined,
  UpOutlined,
  InfoCircleOutlined
} from '@ant-design/icons'

const { Title, Text } = Typography

export default function GlobalVarEditor({ globalVars = [], allTags = [], onChange }) {
  const [editingItem, setEditingItem] = useState(null)
  const [expandedMap, setExpandedMap] = useState({})
  const [copiedKey, setCopiedKey] = useState('')
  const [filterTags, setFilterTags] = useState([])
  const [form] = Form.useForm()

  const handleAdd = () => {
    setEditingItem({
      isNew: true,
      data: {
        id: `globalvar_${Date.now()}`,
        name: '',
        key: '',
        value: '',
        tags: [],
        description: ''
      }
    })
    form.resetFields()
  }

  const handleEdit = (record) => {
    setEditingItem({
      isNew: false,
      data: { ...record }
    })
    form.setFieldsValue(record)
  }

  const handleDelete = (id) => {
    onChange(globalVars.filter((v) => v.id !== id))
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      const trimmedKey = values.key.trim()
      const trimmedName = values.name.trim()

      const newItem = {
        ...editingItem.data,
        name: trimmedName,
        key: trimmedKey,
        value: values.value || '',
        tags: values.tags || [],
        description: values.description || ''
      }

      if (editingItem.isNew) {
        onChange([...globalVars, newItem])
      } else {
        onChange(globalVars.map((v) => (v.id === newItem.id ? newItem : v)))
      }

      setEditingItem(null)
    } catch (e) {
      console.error('Form validation failed:', e)
    }
  }

  const handleCancel = () => {
    setEditingItem(null)
  }

  const copyValue = async (id, value) => {
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
      window.setTimeout(() => setCopiedKey(''), 900)
    } catch (e) {
      console.error('Copy failed:', e)
    }
  }

  const toggleExpand = (id) => {
    setExpandedMap((m) => ({ ...m, [id]: !m[id] }))
  }

  // 根据标签筛选
  const filteredData =
    filterTags.length > 0
      ? globalVars.filter((v) => {
          if (!v.tags || !Array.isArray(v.tags)) return false
          return filterTags.some((tag) => v.tags.includes(tag))
        })
      : globalVars

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      render: (text, record) => (
        <div>
          <Text style={{ fontWeight: 500 }}>{text || <Text type="secondary">未设置</Text>}</Text>
          {record.description && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {record.description}
              </Text>
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Key',
      dataIndex: 'key',
      key: 'key',
      width: 150,
      render: (text) => (
        <Text code style={{ fontFamily: 'monospace' }}>
          {text || <Text type="secondary">未设置</Text>}
        </Text>
      )
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      width: 150,
      render: (tags) => (
        <Space size={4} wrap>
          {tags && tags.length > 0 ? (
            tags.map((tag) => (
              <Tag key={tag} color="blue">
                {tag}
              </Tag>
            ))
          ) : (
            <Text type="secondary" style={{ fontSize: 12 }}>
              无标签
            </Text>
          )}
        </Space>
      )
    },
    {
      title: '值',
      dataIndex: 'value',
      key: 'value',
      render: (text, record) => {
        const expanded = !!expandedMap[record.id]
        const display = text || ''
        return (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, maxWidth: '100%' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {!expanded ? (
                <Tooltip title={display} placement="topLeft">
                  <Text
                    style={{
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
      width: 80,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            title="编辑"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="确定删除？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="text" size="small" title="删除" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <>
      <Card
        title={
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Space direction="vertical" size={0}>
              <Title level={5} style={{ margin: 0 }}>
                全局变量
              </Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                可在所有工作流的配置中通过 {`{{vars.KEY}}`} 引用
              </Text>
            </Space>
            <Button title="添加变量" icon={<PlusOutlined />} onClick={handleAdd}></Button>
          </Space>
        }
        bordered={false}
      >
        <Alert
          message="全局变量使用说明"
          description={
            <div style={{ fontSize: 12 }}>
              <div>全局变量可在所有 executor 和 action 的配置中使用：</div>
              <ul style={{ marginTop: 4, marginBottom: 0, paddingLeft: 20 }}>
                <li>
                  <strong>通过 Key：</strong> <code>{`{{vars.YOUR_KEY}}`}</code> - 直接引用（如有重复 key，取第一个）
                </li>
                <li>
                  <strong>通过标签筛选（AND 逻辑）：</strong>
                  <ul style={{ paddingLeft: 16, marginTop: 2 }}>
                    <li>
                      <code>{`{{vars['tag1'][0]}}`}</code> - 包含 tag1 的第一个变量
                    </li>
                    <li>
                      <code>{`{{vars['tag1','tag2'][0]}}`}</code> - 同时包含 tag1 和 tag2 的第一个变量
                    </li>
                    <li>
                      <code>{`{{vars['url','prod'].API_URL}}`}</code> - 筛选后通过 Key 访问（如有重复取第一个）
                    </li>
                  </ul>
                </li>
                <li>
                  <strong>支持重复 Key：</strong> 可以有多个相同 Key 的变量，通过不同的标签区分，非索引访问时默认取第一个匹配的值
                </li>
                <li>
                  <strong>示例：</strong> <code>{`curl {{vars['url','test'][0]}}/users`}</code>
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

        {allTags.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <Space size={4} wrap>
              <Text type="secondary" style={{ fontSize: 12 }}>
                筛选标签：
              </Text>
              {allTags.map((tag) => (
                <Tag.CheckableTag
                  key={tag}
                  checked={filterTags.includes(tag)}
                  onChange={(checked) => {
                    setFilterTags(
                      checked ? [...filterTags, tag] : filterTags.filter((t) => t !== tag)
                    )
                  }}
                >
                  {tag}
                </Tag.CheckableTag>
              ))}
              {filterTags.length > 0 && (
                <Button size="small" type="link" onClick={() => setFilterTags([])}>
                  清空筛选
                </Button>
              )}
            </Space>
          </div>
        )}

        {filteredData.length > 0 ? (
          <Table
            dataSource={filteredData}
            columns={columns}
            rowKey="id"
            pagination={false}
            size="small"
            tableLayout="fixed"
          />
        ) : filterTags.length > 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="没有符合筛选条件的变量"
          />
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无全局变量，点击上方按钮添加"
          />
        )}
      </Card>

      <Modal
        title={editingItem?.isNew ? '添加全局变量' : '编辑全局变量'}
        open={!!editingItem}
        onOk={handleSave}
        onCancel={handleCancel}
        okText="保存"
        cancelText="取消"
        width={600}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input placeholder="如: APP1 测试环境 API" />
          </Form.Item>

          <Form.Item
            name="key"
            label="Key"
            rules={[
              { required: true, message: '请输入 Key' },
              {
                pattern: /^[A-Za-z_][A-Za-z0-9_]*$/,
                message: 'Key 仅允许字母、数字和下划线，且不能以数字开头（POSIX 风格）'
              }
            ]}
          >
            <Input placeholder="如: app1_test_api 或 APP1_TEST_API（字母/数字/下划线，首字符非数字）" />
          </Form.Item>

          <Form.Item
            name="value"
            label="值"
            rules={[
              { required: true, message: '请输入值' },
              { max: 100000, message: '值长度不能超过 100000 字符' }
            ]}
          >
            <Input.TextArea
              placeholder="变量的值"
              style={{ fontFamily: 'monospace', resize: 'vertical', minHeight: 64, maxHeight: 600 }}
              showCount
              maxLength={100000}
            />
          </Form.Item>

          <Form.Item name="tags" label="标签">
            <Select
              mode="tags"
              placeholder="输入标签，如: url, test, app1"
              options={allTags.map((tag) => ({ value: tag, label: tag }))}
            />
          </Form.Item>

          <Form.Item name="description" label="说明">
            <Input.TextArea placeholder="可选说明" autoSize={{ minRows: 2, maxRows: 4 }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
