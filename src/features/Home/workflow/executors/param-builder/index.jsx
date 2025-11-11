import { Input, Switch, Button, Space, Select, InputNumber, Collapse } from 'antd'
import { useState, useEffect, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import ParamFormModal from './ParamFormModal'
import { PlusOutlined, MinusCircleOutlined, SettingOutlined, SaveOutlined } from '@ant-design/icons'
import { WorkflowCancelError } from '../../engine/errors'
import { resolveTemplate } from '../../engine/compile'

const { TextArea } = Input
const { Panel } = Collapse

const ParamBuilderConfig = ({ value = {}, onChange }) => {
  const [localParams, setLocalParams] = useState(value.params || [])
  // 控制每个参数面板的展开状态（与 localParams 同步）
  const [expanded, setExpanded] = useState([])
  useEffect(() => {
    setLocalParams(value.params || [])
  }, [value.params])
  useEffect(() => {
    // 保持展开数组长度与参数数量一致，不重置已有状态
    setExpanded((prev) => {
      const len = localParams.length
      const next = prev.slice(0, len)
      while (next.length < len) next.push(false)
      return next
    })
  }, [localParams])
  // 提交全部参数（向父组件同步）
  const commit = useCallback(
    () => onChange({ ...(value || {}), params: localParams }),
    [onChange, value, localParams]
  )
  // 仅本地更新，不立即提交
  const update = (next) => setLocalParams(next)

  const typeOptions = [
    { label: '文本', value: 'text' },
    { label: '多行文本', value: 'textarea' },
    { label: '数字', value: 'number' },
    { label: '密码', value: 'password' },
    { label: '开关', value: 'switch' },
    { label: '单选', value: 'radio' },
    { label: '多选', value: 'checkbox' },
    { label: '下拉选择', value: 'select' },
    { label: '多选下拉', value: 'multi-select' },
    { label: '文件', value: 'file' },
    { label: '文件夹', value: 'directory' }
  ]

  const needsOptions = (type) => ['radio', 'checkbox', 'select', 'multi-select'].includes(type)
  const needsNumberRange = (type) => type === 'number'

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <div
        style={{
          padding: '12px',
          background: 'var(--color-bg-container)',
          borderRadius: '6px',
          border: '1px solid var(--color-border)'
        }}
      >
        <Space>
          <span style={{ fontWeight: 500 }}>允许用户取消并停止工作流</span>
          <Switch
            checked={value.cancelable !== false}
            onChange={(checked) => onChange({ ...(value || {}), cancelable: checked })}
          />
        </Space>
      </div>
      {localParams.map((p, i) => (
        <Collapse
          key={i}
          size="small"
          style={{ width: '100%' }}
          activeKey={expanded[i] ? ['panel'] : []}
          onChange={(keys) => {
            const isOpen = Array.isArray(keys) ? keys.includes('panel') : !!keys
            setExpanded((prev) => {
              const next = [...prev]
              next[i] = isOpen
              return next
            })
          }}
        >
          <Panel
            key="panel"
            header={
              <Space>
                <span style={{ fontWeight: 500 }}>{p.name || `参数 ${i + 1}`}</span>
                {p.label && (
                  <span style={{ color: 'var(--color-text-secondary)' }}>({p.label})</span>
                )}
                <span style={{ color: 'var(--color-primary)', fontSize: 12 }}>
                  {typeOptions.find((t) => t.value === (p.type || 'text'))?.label || '文本'}
                </span>
                {p.required && (
                  <span style={{ color: 'var(--color-error)', fontSize: 12 }}>必填</span>
                )}
              </Space>
            }
            extra={
              <Space>
                <Button
                  type="text"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation()
                    commit()
                  }}
                  icon={<SaveOutlined />}
                  title="保存此参数"
                  style={{ color: 'var(--color-primary-hover)' }}
                />
                <Button
                  danger
                  type="text"
                  size="small"
                  icon={<MinusCircleOutlined />}
                  onClick={(e) => {
                    e.stopPropagation()
                    const cp = localParams.filter((_, idx) => idx !== i)
                    update(cp)
                    commit(cp)
                    setExpanded((prev) => {
                      const next = [...prev]
                      next.splice(i, 1)
                      return next
                    })
                  }}
                ></Button>
              </Space>
            }
          >
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <Space style={{ width: '100%' }}>
                <Input
                  placeholder="参数名 (必填)"
                  value={p.name}
                  onChange={(e) => {
                    const cp = [...localParams]
                    cp[i] = { ...cp[i], name: e.target.value }
                    update(cp)
                  }}
                  style={{ width: 150 }}
                />
                <Input
                  placeholder="显示标签"
                  value={p.label}
                  onChange={(e) => {
                    const cp = [...localParams]
                    cp[i] = { ...cp[i], label: e.target.value }
                    update(cp)
                  }}
                  style={{ width: 150 }}
                />
                <Select
                  placeholder="类型"
                  value={p.type || 'text'}
                  onChange={(val) => {
                    const cp = [...localParams]
                    cp[i] = { ...cp[i], type: val }
                    update(cp)
                  }}
                  style={{ width: 130 }}
                  options={typeOptions}
                />
                <Switch
                  checked={!!p.required}
                  onChange={(val) => {
                    const cp = [...localParams]
                    cp[i] = { ...cp[i], required: val }
                    update(cp)
                  }}
                  checkedChildren="必填"
                  unCheckedChildren="可选"
                />
              </Space>

              <Input
                placeholder="占位提示文本"
                value={p.placeholder || ''}
                onChange={(e) => {
                  const cp = [...localParams]
                  cp[i] = { ...cp[i], placeholder: e.target.value }
                  update(cp)
                }}
              />

              <Input
                placeholder="说明文本（鼠标悬停显示）"
                value={p.description || ''}
                onChange={(e) => {
                  const cp = [...localParams]
                  cp[i] = { ...cp[i], description: e.target.value }
                  update(cp)
                }}
              />

              {p.type !== 'switch' && p.type !== 'boolean' && (
                <div>
                  <Input
                    placeholder="默认值（支持模板：{{trigger.payload[0].path}}）"
                    value={p.default || ''}
                    onChange={(e) => {
                      const cp = [...localParams]
                      cp[i] = { ...cp[i], default: e.target.value }
                      update(cp)
                    }}
                  />
                  <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
                    💡 支持模板变量：
                    {'{{trigger.payload}}, {{trigger.type}}, {{executor[N].result.value.xxx}}'}
                  </div>
                </div>
              )}

              {needsNumberRange(p.type) && (
                <Space>
                  <span>范围:</span>
                  <InputNumber
                    placeholder="最小值"
                    value={p.min}
                    onChange={(val) => {
                      const cp = [...localParams]
                      cp[i] = { ...cp[i], min: val }
                      update(cp)
                    }}
                    style={{ width: 100 }}
                  />
                  <span>-</span>
                  <InputNumber
                    placeholder="最大值"
                    value={p.max}
                    onChange={(val) => {
                      const cp = [...localParams]
                      cp[i] = { ...cp[i], max: val }
                      update(cp)
                    }}
                    style={{ width: 100 }}
                  />
                  <span>步长:</span>
                  <InputNumber
                    placeholder="步长"
                    value={p.step}
                    onChange={(val) => {
                      const cp = [...localParams]
                      cp[i] = { ...cp[i], step: val }
                      update(cp)
                    }}
                    style={{ width: 80 }}
                  />
                </Space>
              )}

              {needsOptions(p.type) && (
                <div
                  style={{
                    border: '1px dashed var(--color-border)',
                    padding: 8,
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  <div
                    style={{
                      marginBottom: 8,
                      fontWeight: 500,
                      fontSize: 12,
                      color: 'var(--color-text-secondary)'
                    }}
                  >
                    <SettingOutlined /> 选项配置 (每行一个，格式: 值|显示文本)
                  </div>
                  <TextArea
                    placeholder="例如:&#10;option1|选项一&#10;option2|选项二&#10;或简单写: 选项A"
                    value={(p.options || [])
                      .map((opt) =>
                        typeof opt === 'string' ? opt : `${opt.value}|${opt.label || opt.value}`
                      )
                      .join('\n')}
                    onChange={(e) => {
                      const lines = e.target.value.split('\n').filter((l) => l.trim())
                      const opts = lines.map((line) => {
                        const [val, lbl] = line.split('|').map((s) => s.trim())
                        return lbl ? { value: val, label: lbl } : val
                      })
                      const cp = [...localParams]
                      cp[i] = { ...cp[i], options: opts }
                      update(cp)
                    }}
                    rows={4}
                    style={{ fontFamily: 'monospace', fontSize: 12 }}
                  />
                </div>
              )}
            </Space>
          </Panel>
        </Collapse>
      ))}
      <Button
        type="dashed"
        icon={<PlusOutlined />}
        style={{ width: '100%' }}
        onClick={() => {
          const next = [
            ...localParams,
            {
              name: '',
              label: '',
              type: 'text',
              required: false,
              placeholder: '',
              description: ''
            }
          ]
          update(next)
          setExpanded((prev) => {
            const arr = prev.slice(0, next.length - 1)
            arr.push(true) // 新增的参数默认展开
            return arr
          })
        }}
      >
        添加参数
      </Button>
    </Space>
  )
}

export const ParamBuilderExecutor = {
  key: 'param-builder',
  label: '参数收集',
  getDefaultConfig() {
    return { params: [] }
  },
  ConfigComponent: ParamBuilderConfig,
  async execute(trigger, context, config, options = {}) {
    const { signal } = options

    // 解析默认值，支持模板语法（如 {{trigger.payload[0].path}}）
    const defaults = {}
    for (const p of config.params || []) {
      if (p.default != null && p.default !== '') {
        // 使用模板引擎解析默认值
        const resolved = resolveTemplate(String(p.default), context)
        defaults[p.name] = resolved
      }
    }

    const fromPrev = { ...(context.values || {}) }
    const fromUser = { ...(trigger.userParams || {}) }
    const initial = { ...defaults, ...fromPrev, ...fromUser }

    const shouldPrompt = (config.params || []).length > 0

    if (!shouldPrompt) {
      return { value: initial }
    }

    // 是否允许取消（默认允许）
    const cancelable = config.cancelable !== false

    const values = await new Promise((resolve, reject) => {
      const container = document.createElement('div')
      document.body.appendChild(container)
      const root = createRoot(container)
      const handleSubmit = (vals) => {
        cleanup()
        resolve(vals)
      }
      const handleCancel = () => {
        cleanup()
        if (cancelable) {
          // 用户取消 → 抛出取消错误
          reject(new WorkflowCancelError('用户取消参数输入'))
        } else {
          // 不可取消 → 返回初始值
          resolve(initial)
        }
      }
      const cleanup = () => {
        setTimeout(() => {
          try {
            root.unmount()
          } catch (e) {
            // ignore unmount errors
          }
          container.remove()
        })
      }
      root.render(
        <ParamFormModal
          shortcut={{ name: '参数收集', mode: 'composed', executors: [] }}
          defaultParams={initial}
          params={config.params}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      )
    })

    return { value: values }
  }
}
