import { useState, useEffect } from 'react'
import { Input, Button, Space, Typography, List, Row, Col, Select } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { resolveTemplate } from '../../engine/compile'
import { manualRegistry } from '../../manual/registry'

const EnvRow = ({ idx, item, onChange, onRemove }) => {
  const [name, setName] = useState(item?.name || '')
  const [value, setValue] = useState(item?.value || '')
  const [op, setOp] = useState(item?.op || 'set')
  useEffect(() => { setName(item?.name || '') }, [item?.name])
  useEffect(() => { setValue(item?.value || '') }, [item?.value])
  useEffect(() => { setOp(item?.op || 'set') }, [item?.op])
  return (
    <Row gutter={8} align="middle" style={{ width: '100%' }}>
      <Col span={3}>
        <Select
          value={op}
          onChange={(val) => {
            setOp(val)
            onChange(idx, { name, value, op: val })
          }}
          style={{ width: '100%' }}
          options={[
            { value: 'set', label: '设置' },
            { value: 'remove', label: '移除' }
          ]}
        />
      </Col>
      <Col span={8}>
        <Input
          placeholder="变量名，如 PATH 或 API_TOKEN"
          value={name}
          onChange={(e) => {
            const next = e.target.value
            setName(next)
            onChange(idx, { name: next, value, op })
          }}
        />
      </Col>
      <Col span={11}>
        <Input
          placeholder="变量值（支持模板）"
          disabled={op === 'remove'}
          value={value}
          onChange={(e) => {
            const next = e.target.value
            setValue(next)
            onChange(idx, { name, value: next, op })
          }}
        />
      </Col>
      <Col span={2}>
        <Button danger type="link" size="small" onClick={() => onRemove(idx)}>删除</Button>
      </Col>
    </Row>
  )
}

const EnvPatchConfig = ({ value = {}, onChange }) => {
  const [entries, setEntries] = useState(Array.isArray(value?.entries) ? value.entries : [])
  useEffect(() => { setEntries(Array.isArray(value?.entries) ? value.entries : []) }, [value?.entries])

  const updateEntry = (idx, next) => {
    const list = [...entries]
    list[idx] = { ...(list[idx] || {}), ...(next || {}) }
    setEntries(list)
    onChange({ ...(value || {}), entries: list })
  }
  const removeEntry = (idx) => {
    const list = entries.filter((_, i) => i !== idx)
    setEntries(list)
    onChange({ ...(value || {}), entries: list })
  }
  const addEntry = () => {
    const list = [...entries, { name: '', value: '', op: 'set' }]
    setEntries(list)
    onChange({ ...(value || {}), entries: list })
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Typography.Text type="secondary">
        说明：本执行器会修改当前工作流上下文中的环境变量（envs），影响后续步骤。
      </Typography.Text>
      <List
        split={false}
        dataSource={entries}
        locale={{ emptyText: '尚未添加变量' }}
        renderItem={(it, idx) => (
          <List.Item style={{ borderBottom: 'none' }}>
            <EnvRow idx={idx} item={it} onChange={updateEntry} onRemove={removeEntry} />
          </List.Item>
        )}
      />
      <Button type="dashed" icon={<PlusOutlined />} block onClick={addEntry}>设置/移除变量</Button>
      <Typography.Text type="secondary">
        {'可用模板：{{envs.KEY}}, {{vars.API_URL}}, {{executors[0].result.value.xxx}}'}
      </Typography.Text>
    </Space>
  )
}

export const EnvPatchExecutor = {
  key: 'env-patch',
  label: '环境变量变更',
  getDefaultConfig() { return { entries: [] } },
  ConfigComponent: EnvPatchConfig,
  async execute(trigger, context, config, options = {}) {
    const list = Array.isArray(config?.entries) ? config.entries : []
    const patch = {}
    const removed = []
    for (const it of list) {
      const name = (it?.name || '').trim()
      if (!name) continue
      const op = it?.op || 'set'
      if (op === 'remove') {
        if (context?.envs && Object.prototype.hasOwnProperty.call(context.envs, name)) {
          delete context.envs[name]
        }
        removed.push(name)
        continue
      }
      const raw = it?.value == null ? '' : String(it.value)
      const resolved = resolveTemplate(raw, context)
      patch[name] = String(resolved)
    }
    context.envs = { ...(context.envs || {}), ...patch }
    return { value: { patch, removed } }
  }
}

try {
  manualRegistry.register({
    type: 'executor',
    key: 'env-patch',
    title: '环境变量变更（EnvPatch）',
    summary: '修改上下文环境变量，影响后续步骤。',
    usage: '添加“环境变量变更”，配置设置或移除项。',
    configFields: [{ name: 'entries', label: '变量项', desc: 'name/value/op(set/remove)，value 支持模板' }],
    tips: ['模板示例：{{envs.KEY}}、{{vars.NAME}}、{{executors[N].result.value.xxx}}']
  })
} catch {}
