import { Card, Button, Select, Input, InputNumber, Popconfirm, Dropdown, Space } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'

/**
 * Cmds Editor - uTools 动态指令 cmds 数组编辑器
 * 支持：
 * 1. 功能指令 (string[]) - 统一在一个 Select tags 输入框
 * 2. 匹配文件 (files)
 * 3. 正则匹配 (regex)
 * 4. 匹配任意文本 (over)
 */
export default function CmdsEditor({ value = [], onChange }) {
  // 分离 string 和 object
  const textCmds = value.filter((v) => typeof v === 'string')
  const objectCmds = value.filter((v) => typeof v === 'object')

  const handleTextCmdsChange = (newTextCmds) => {
    onChange([...newTextCmds, ...objectCmds])
  }

  const handleAddObjectCmd = (type) => {
    const newItem = {
      type,
      label: '',
      ...(type === 'files' && {
        fileType: 'file',
        match: '',
        minLength: 1,
        maxLength: 10
      }),
      ...(type === 'regex' && {
        match: '',
        minLength: 1,
        maxLength: 512
      }),
      ...(type === 'over' && {
        exclude: '',
        minLength: 1,
        maxLength: 500
      })
    }

    onChange([...textCmds, ...objectCmds, newItem])
  }

  const handleRemoveObjectCmd = (index) => {
    const updated = objectCmds.filter((_, i) => i !== index)
    onChange([...textCmds, ...updated])
  }

  const handleUpdateObjectCmd = (index, newValue) => {
    const updated = [...objectCmds]
    updated[index] = newValue
    onChange([...textCmds, ...updated])
  }

  const renderObjectCmd = (item, index) => {
    const typeLabel =
      {
        files: '匹配文件',
        regex: '正则匹配',
        over: '匹配任意文本'
      }[item.type] || '未知类型'

    return (
      <Card
        key={index}
        size="small"
        title={typeLabel}
        extra={
          <Popconfirm title="确定删除此匹配规则吗？" onConfirm={() => handleRemoveObjectCmd(index)}>
            <Button type="text" danger size="small" icon={<DeleteOutlined />} />
          </Popconfirm>
        }
        style={{ marginBottom: 8 }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          <div>
            <label style={{ fontSize: 12, color: '#666' }}>显示标签</label>
            <Input
              placeholder="在搜索列表中显示的名称"
              value={item.label || ''}
              onChange={(e) => handleUpdateObjectCmd(index, { ...item, label: e.target.value })}
            />
          </div>

          {item.type === 'files' && (
            <div>
              <label style={{ fontSize: 12, color: '#666' }}>文件类型</label>
              <Select
                value={item.fileType || 'file'}
                onChange={(v) => handleUpdateObjectCmd(index, { ...item, fileType: v })}
                style={{ width: '100%' }}
              >
                <Select.Option value="file">文件</Select.Option>
                <Select.Option value="directory">目录</Select.Option>
              </Select>
            </div>
          )}

          {(item.type === 'files' || item.type === 'regex') && (
            <div>
              <label style={{ fontSize: 12, color: '#666' }}>匹配规则（正则）</label>
              <Input
                placeholder={
                  item.type === 'files'
                    ? '如：/\\.(?:txt|md|json)$/i'
                    : '如：^https?://github\\.com/'
                }
                value={item.match || ''}
                onChange={(e) => handleUpdateObjectCmd(index, { ...item, match: e.target.value })}
              />
            </div>
          )}

          {item.type === 'over' && (
            <div>
              <label style={{ fontSize: 12, color: '#666' }}>排除规则（正则，可选）</label>
              <Input
                placeholder="如：/\\n/ 排除包含换行的文本"
                value={item.exclude || ''}
                onChange={(e) => handleUpdateObjectCmd(index, { ...item, exclude: e.target.value })}
              />
            </div>
          )}

          <Space>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, color: '#666' }}>最少数量</label>
              <InputNumber
                min={1}
                max={999}
                value={item.minLength || 1}
                onChange={(v) => handleUpdateObjectCmd(index, { ...item, minLength: v })}
                style={{ width: 120 }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, color: '#666' }}>最多数量</label>
              <InputNumber
                min={1}
                max={999}
                value={item.maxLength || (item.type === 'files' ? 10 : 512)}
                onChange={(v) => handleUpdateObjectCmd(index, { ...item, maxLength: v })}
                style={{ width: 120 }}
              />
            </div>
          </Space>
        </Space>
      </Card>
    )
  }

  const addMenuItems = [
    { key: 'files', label: '匹配文件' },
    { key: 'regex', label: '正则匹配' },
    { key: 'over', label: '匹配任意文本' }
  ]

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>
          功能指令（输入关键词后按回车）
        </label>
        <Select
          mode="tags"
          placeholder="如：翻译、timestamp、打开浏览器"
          value={textCmds}
          onChange={handleTextCmdsChange}
          style={{ width: '100%' }}
        />
      </div>

      {objectCmds.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 8 }}>
            匹配规则
          </label>
          {objectCmds.map((item, index) => renderObjectCmd(item, index))}
        </div>
      )}

      <Dropdown
        menu={{
          items: addMenuItems,
          onClick: ({ key }) => handleAddObjectCmd(key)
        }}
      >
        <Button type="dashed" icon={<PlusOutlined />} block>
          添加指令
        </Button>
      </Dropdown>
    </div>
  )
}
