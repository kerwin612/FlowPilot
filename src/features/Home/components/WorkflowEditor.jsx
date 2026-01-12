import { useState, useEffect, useCallback, useMemo } from 'react'
import { Modal, Form, Input, Collapse, Switch, Space, List, Button, Row, Col, Tag, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { arrayMove } from '@dnd-kit/sortable'
import IconPicker from './WorkflowEditor/IconPicker'
import ExecutorsEditor from './WorkflowEditor/ExecutorsEditor'
import ActionsEditor from './WorkflowEditor/ActionsEditor'
import CmdsEditor from './WorkflowEditor/CmdsEditor'
import { ensureModal } from '../../../shared/ui/modalHost'
import { manualService } from '../../../services/manualService'
import { executorRegistry } from '../workflow/executors/registry'
import { actionRegistry } from '../workflow/actions/registry'
import {
  ICON_TYPE_BUILTIN,
  ICON_TYPE_IMAGE,
  DEFAULT_ICON_KEY,
  DEFAULT_ICON_COLOR,
  ITEM_TYPE_FOLDER,
  ICON_TYPE_EMOJI,
  ICON_TYPE_TEXT,
  ICON_TYPE_SVG
} from '../../../shared/constants'

export default function WorkflowEditor({ open, type, initialData, onSave, onCancel }) {
  const [form] = Form.useForm()
  const [executors, setExecutors] = useState(initialData?.executors || [])
  const [actions, setActions] = useState([])
  const [iconType, setIconType] = useState('icon')
  const [selectedIcon, setSelectedIcon] = useState('ThunderboltOutlined')
  const [selectedColor, setSelectedColor] = useState('#1890ff')
  const [manualsByType, setManualsByType] = useState({ executor: [], action: [] })

  useEffect(() => {
    const loadManuals = async () => {
      const types = ['executor', 'action']
      const result = { executor: [], action: [] }
      for (const t of types) {
        try {
          const list = await manualService.listManuals({ type: t })
          const details = await Promise.all(
            (list || []).map((it) => manualService.getManualDetail({ key: it.key }))
          )
          result[t] = details.filter(Boolean)
        } catch (e) {
          console.warn('加载手册失败', t, e)
        }
      }
      setManualsByType(result)
    }
    loadManuals()
  }, [])

  const manualByKey = useMemo(() => {
    const map = {}
    ;['executor', 'action'].forEach((t) => {
      (manualsByType[t] || []).forEach((m) => {
        map[m.key] = m
      })
    })
    return map
  }, [manualsByType])
  const [previewImage, setPreviewImage] = useState(null)
  const [hovering, setHovering] = useState(false)
  const [featureEnabled, setFeatureEnabled] = useState(false)
  const [emoji, setEmoji] = useState('')
  const [text, setText] = useState('')
  const [svg, setSvg] = useState('')
  const [entryTriggers, setEntryTriggers] = useState([])

  const genId = () => `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`

  useEffect(() => {
    if (!open) {
      setIconType(ICON_TYPE_BUILTIN)
      setSelectedIcon(DEFAULT_ICON_KEY)
      setSelectedColor(DEFAULT_ICON_COLOR)
      setPreviewImage(null)
      form.resetFields()
      return
    }

    const currentIconType = initialData?.iconType || ICON_TYPE_BUILTIN
    const currentIconKey = initialData?.iconKey || DEFAULT_ICON_KEY
    const currentIconColor = initialData?.iconColor || DEFAULT_ICON_COLOR
    setIconType(currentIconType)
    setSelectedIcon(currentIconKey)
    setSelectedColor(currentIconColor)
    setPreviewImage(initialData?.icon || null)
    setEmoji(initialData?.iconEmoji || '')
    setText(initialData?.iconText || '')
    setSvg(initialData?.iconSvg || '')
    form.setFieldsValue({
      name: initialData?.name || '',
      iconType: currentIconType,
      iconKey: currentIconKey,
      iconColor: currentIconColor,
      icon: initialData?.icon || null,
      iconEmoji: initialData?.iconEmoji || '',
      iconText: initialData?.iconText || '',
      iconSvg: initialData?.iconSvg || '',
      featureExplain: initialData?.feature?.explain || initialData?.featureExplain || '',
      featureCmds: initialData?.feature?.cmds || initialData?.featureCmds || []
    })
    const initExec = (initialData?.executors || []).map((e) => ({ id: e.id || genId(), ...e }))
    const initActs = (initialData?.actions || []).map((a) => ({ id: a.id || genId(), ...a }))
    setExecutors(initExec)
    setActions(initActs)
    setFeatureEnabled(initialData?.feature?.enabled || false)
    setEntryTriggers(Array.isArray(initialData?.entryTriggers) ? initialData.entryTriggers : [])
  }, [open, type, initialData, form])

  const addExecutor = (key) => {
    const def = executorRegistry.get(key)
    if (!def) return
    setExecutors((prev) => [
      ...prev,
      { id: genId(), key, config: def.getDefaultConfig?.() || {}, enabled: true, _defaultExpanded: true }
    ])
  }

  const updateExecutorConfig = useCallback((id, next) => {
    setExecutors((prev) => prev.map((e) => (e.id === id ? { ...e, config: next } : e)))
  }, [])

  const removeExecutor = (id) => setExecutors((prev) => prev.filter((e) => e.id !== id))
  const toggleExecutor = (id, val) =>
    setExecutors((prev) => prev.map((e) => (e.id === id ? { ...e, enabled: val } : e)))

  const handleExecutorDragEnd = (event) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setExecutors((items) => {
        const oldIndex = items.findIndex((it) => it.id === active.id)
        const newIndex = items.findIndex((it) => it.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const updateExecutorCondition = useCallback((id, next) => {
    setExecutors((prev) => prev.map((e) => (e.id === id ? { ...e, condition: next } : e)))
  }, [])

  const addAction = (key) => {
    const def = actionRegistry.get(key)
    if (!def) return
    setActions((prev) => [
      ...prev,
      { id: genId(), key, config: def.getDefaultConfig?.() || {}, enabled: true, _defaultExpanded: true }
    ])
  }

  const updateActionConfig = useCallback((id, next) => {
    setActions((prev) => prev.map((a) => (a.id === id ? { ...a, config: next } : a)))
  }, [])

  const removeAction = (id) => setActions((prev) => prev.filter((a) => a.id !== id))
  const toggleAction = (id, val) =>
    setActions((prev) => prev.map((a) => (a.id === id ? { ...a, enabled: val } : a)))

  const handleActionDragEnd = (event) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setActions((items) => {
        const oldIndex = items.findIndex((it) => it.id === active.id)
        const newIndex = items.findIndex((it) => it.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const updateActionCondition = useCallback((id, next) => {
    setActions((prev) => prev.map((a) => (a.id === id ? { ...a, condition: next } : a)))
  }, [])

  const handleOk = async () => {
    try {
      const values = await form.validateFields()

      if (type !== ITEM_TYPE_FOLDER) {
        values.executors = executors.map(({ _defaultExpanded, ...rest }) => rest)
        values.actions = actions.map(({ _defaultExpanded, ...rest }) => rest)
        values.entryTriggers = entryTriggers

        // Handle feature configuration
        if (featureEnabled) {
          // Auto-generate unique code if not exists
          const featureCode =
            initialData?.feature?.code ||
            `wf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

          const explainVal =
            (values.featureExplain ?? initialData?.feature?.explain) ?? values.name
          const cmdsVal =
            (values.featureCmds ?? initialData?.feature?.cmds) ?? [explainVal]
          values.feature = {
            enabled: true,
            code: featureCode,
            explain: explainVal,
            cmds: cmdsVal
          }
        } else {
          values.feature = { enabled: false }
        }
      }

      values.iconType = iconType
      values.iconColor = selectedColor
      if (iconType === ICON_TYPE_BUILTIN) {
        values.iconKey = selectedIcon
      } else if (iconType === ICON_TYPE_IMAGE) {
        values.icon = previewImage
      } else if (iconType === ICON_TYPE_EMOJI) {
        values.iconEmoji = emoji
      } else if (iconType === ICON_TYPE_TEXT) {
        values.iconText = text
      } else if (iconType === ICON_TYPE_SVG) {
        values.iconSvg = svg
      }

      delete values.featureExplain
      delete values.featureCmds

      onSave(values)
      form.resetFields()
    } catch (error) {
      console.error('Validation failed:', error)
    }
  }

  const handleCancel = () => {
    form.resetFields()
    setIconType(ICON_TYPE_BUILTIN)
    setSelectedIcon(DEFAULT_ICON_KEY)
    setSelectedColor(DEFAULT_ICON_COLOR)
    setPreviewImage(null)
    setEmoji('')
    setText('')
    setSvg('')
    onCancel()
  }

  // 快捷键支持：Ctrl+S / Cmd+S 保存
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!open) return
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        e.stopPropagation()
        handleOk()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, handleOk])

  return (
    <Modal
      title={
        type === ITEM_TYPE_FOLDER
          ? initialData?.id
            ? '编辑文件夹'
            : '新建文件夹'
          : initialData?.id
            ? '编辑工作流'
            : '新建工作流'
      }
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="确定"
      cancelText="取消"
      width={'85%'}
      centered
      style={{ maxWidth: 800 }}
      styles={{
        body: {
          maxHeight: 'calc(100vh - 200px)',
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingRight: 6
        }
      }}
    >
      <Form form={form} layout="vertical">
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
              <Input placeholder="输入名称" size="large" />
            </Form.Item>
          </div>
          <div style={{ flexShrink: 0 }}>
            <Form.Item label="图标">
              <IconPicker
                size={40}
                iconType={iconType}
                selectedIcon={selectedIcon}
                selectedColor={selectedColor}
                previewImage={previewImage}
                hovering={hovering}
                emoji={emoji}
                text={text}
                svg={svg}
                onIconTypeChange={setIconType}
                onIconChange={(key) => {
                  setSelectedIcon(key)
                  form.setFieldValue('iconKey', key)
                }}
                onColorChange={(hex) => {
                  setSelectedColor(hex)
                  form.setFieldValue('iconColor', hex)
                }}
                onImageChange={(base64) => {
                  form.setFieldValue('icon', base64)
                  setPreviewImage(base64)
                }}
                onEmojiChange={(val) => {
                  setEmoji(val)
                  form.setFieldValue('iconEmoji', val)
                }}
                onTextChange={(val) => {
                  setText(val)
                  form.setFieldValue('iconText', val)
                }}
                onSvgChange={(val) => {
                  setSvg(val)
                  form.setFieldValue('iconSvg', val)
                }}
                onHoverChange={setHovering}
                formInstance={form}
              />
            </Form.Item>
          </div>
        </div>

        {type !== ITEM_TYPE_FOLDER && (
          <>
            <Form.Item label={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span>执行器</span>
              <Button type="link" style={{ padding: 0, height: 'auto', fontSize: 13 }} onClick={async () => {
                const modal = await ensureModal()
                const manuals = manualsByType.executor || []
                if (!manuals.length) return
                const items = manuals.map((m) => ({
                  key: m.key,
                  label: m.title,
                  children: (
                    <div style={{ fontSize: 13 }}>
                      <div style={{ marginBottom: 8 }}><Typography.Text strong>概述：</Typography.Text> {m.content.overview}</div>
                      {m.content.scenarios?.length > 0 && (
                        <div style={{ marginBottom: 8 }}>
                          <Typography.Text strong>典型场景：</Typography.Text>
                          <ul style={{ margin: 0, paddingLeft: 18 }}>
                            {m.content.scenarios.map((s, i) => <li key={i}><b>{s.title}：</b>{s.desc}</li>)}
                          </ul>
                        </div>
                      )}
                      {m.content.fields?.length > 0 && (
                        <div style={{ marginBottom: 8 }}>
                          <Typography.Text strong>字段详解：</Typography.Text>
                          <ul style={{ margin: 0, paddingLeft: 18 }}>
                            {m.content.fields.map((f, i) => <li key={i}><b>{f.label}：</b>{f.desc}{f.required ? '（必填）' : ''}</li>)}
                          </ul>
                        </div>
                      )}
                      {m.content.examples?.length > 0 && (
                        <div style={{ marginBottom: 8 }}>
                          <Typography.Text strong>配置案例：</Typography.Text>
                          <ul style={{ margin: 0, paddingLeft: 18 }}>
                            {m.content.examples.map((ex, i) => <li key={i}><b>{ex.title}：</b><code>{ex.code}</code></li>)}
                          </ul>
                        </div>
                      )}
                      {m.content.tips?.length > 0 && (
                        <div style={{ marginBottom: 8 }}>
                          <Typography.Text strong>使用技巧：</Typography.Text>
                          <ul style={{ margin: 0, paddingLeft: 18 }}>
                            {m.content.tips.map((t, i) => <li key={i}>{t.text}</li>)}
                          </ul>
                        </div>
                      )}
                      {m.content.faqs?.length > 0 && (
                        <div style={{ marginBottom: 8 }}>
                          <Typography.Text strong>常见问题：</Typography.Text>
                          <ul style={{ margin: 0, paddingLeft: 18 }}>
                            {m.content.faqs.map((f, i) => <li key={i}><b>{f.q}</b><br/>{f.a}</li>)}
                          </ul>
                        </div>
                      )}
                      {m.content.warnings?.length > 0 && (
                        <div style={{ marginBottom: 8 }}>
                          <Typography.Text strong>注意事项：</Typography.Text>
                          <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--color-warning)' }}>
                            {m.content.warnings.map((w, i) => <li key={i}>{w.text}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  )
                }))

                const intro = (
                  <div style={{ marginBottom: 12, fontSize: 13 }}>
                    <Typography.Text strong>什么是执行器？</Typography.Text>
                    <div style={{ marginTop: 6 }}>
                      执行器用于产生或加工数据，按列表顺序依次运行，并将结果写入上下文，供后续步骤引用。
                    </div>
                    <div style={{ marginTop: 6 }}>
                      引用示例：{'{{executors[0].result.value.xxx}}'}、{'{{executors[0].result.value.execResult.result}}'}、{'{{envs.KEY}}'}、{'{{vars.NAME}}'}、{'{{trigger.payload}}'}。
                    </div>
                    <div style={{ marginTop: 6 }}>
                      组合示例：步骤1 参数收集 → 步骤2 命令执行（模板注入步骤1值） → 步骤3 脚本执行读取步骤2输出并结构化。
                    </div>
                  </div>
                )

                const ability = (
                  <div style={{ marginTop: 12, fontSize: 13 }}>
                    <Typography.Text strong>能力说明</Typography.Text>
                    <div style={{ marginTop: 6 }}>
                      执行器可设置条件决定是否运行；模板变量在执行时解析最新上下文；执行结果可供动作器或后续执行器继续使用。
                    </div>
                    <div style={{ marginTop: 6 }}>
                      快速示例：参数收集 → 命令执行：命令写法 {'"echo {{executors[0].result.value.text}}"'}；脚本中读取命令输出 {'String(context.executors[1]?.result?.value?.execResult?.result || "")'}。
                    </div>
                  </div>
                )

                modal.info({
                  title: '执行器配置指南',
                  okText: '知道了',
                  content: (
                    <div>
                      {intro}
                      <Collapse items={items} accordion />
                      {ability}
                    </div>
                  ),
                  width: 800
                })
              }}>如何配置执行器？</Button>
            </span>}>
              <ExecutorsEditor
                executors={executors}
                onAdd={addExecutor}
                onRemove={removeExecutor}
                onToggle={toggleExecutor}
                onConfigChange={updateExecutorConfig}
                onConditionChange={updateExecutorCondition}
                onDragEnd={handleExecutorDragEnd}
                manualByKey={manualByKey}
              />
            </Form.Item>

            <Form.Item label={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span>动作器</span>
              <Button type="link" style={{ padding: 0, height: 'auto', fontSize: 13 }} onClick={async () => {
                const modal = await ensureModal()
                const manuals = manualsByType.action || []
                if (!manuals.length) return
                const items = manuals.map((m) => ({
                  key: m.key,
                  label: m.title,
                  children: (
                    <div style={{ fontSize: 13 }}>
                      <div style={{ marginBottom: 8 }}><Typography.Text strong>概述：</Typography.Text> {m.content.overview}</div>
                      {m.content.scenarios?.length > 0 && (
                        <div style={{ marginBottom: 8 }}>
                          <Typography.Text strong>典型场景：</Typography.Text>
                          <ul style={{ margin: 0, paddingLeft: 18 }}>
                            {m.content.scenarios.map((s, i) => <li key={i}><b>{s.title}：</b>{s.desc}</li>)}
                          </ul>
                        </div>
                      )}
                      {m.content.fields?.length > 0 && (
                        <div style={{ marginBottom: 8 }}>
                          <Typography.Text strong>字段详解：</Typography.Text>
                          <ul style={{ margin: 0, paddingLeft: 18 }}>
                            {m.content.fields.map((f, i) => <li key={i}><b>{f.label}：</b>{f.desc}{f.required ? '（必填）' : ''}</li>)}
                          </ul>
                        </div>
                      )}
                      {m.content.examples?.length > 0 && (
                        <div style={{ marginBottom: 8 }}>
                          <Typography.Text strong>配置案例：</Typography.Text>
                          <ul style={{ margin: 0, paddingLeft: 18 }}>
                            {m.content.examples.map((ex, i) => <li key={i}><b>{ex.title}：</b><code>{ex.code}</code></li>)}
                          </ul>
                        </div>
                      )}
                      {m.content.tips?.length > 0 && (
                        <div style={{ marginBottom: 8 }}>
                          <Typography.Text strong>使用技巧：</Typography.Text>
                          <ul style={{ margin: 0, paddingLeft: 18 }}>
                            {m.content.tips.map((t, i) => <li key={i}>{t.text}</li>)}
                          </ul>
                        </div>
                      )}
                      {m.content.faqs?.length > 0 && (
                        <div style={{ marginBottom: 8 }}>
                          <Typography.Text strong>常见问题：</Typography.Text>
                          <ul style={{ margin: 0, paddingLeft: 18 }}>
                            {m.content.faqs.map((f, i) => <li key={i}><b>{f.q}</b><br/>{f.a}</li>)}
                          </ul>
                        </div>
                      )}
                      {m.content.warnings?.length > 0 && (
                        <div style={{ marginBottom: 8 }}>
                          <Typography.Text strong>注意事项：</Typography.Text>
                          <ul style={{ margin: 0, paddingLeft: 18, color: '#d46b08' }}>
                            {m.content.warnings.map((w, i) => <li key={i}>{w.text}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  )
                }))

                const intro = (
                  <div style={{ marginBottom: 12, fontSize: 13 }}>
                    <Typography.Text strong>什么是动作器？</Typography.Text>
                    <div style={{ marginTop: 6 }}>
                      动作器用于触发对外行为或呈现结果（打开链接/路径、显示弹窗、浏览器行为、页面应用、重定向等），通常读取前置执行器输出。
                    </div>
                    <div style={{ marginTop: 6 }}>
                      引用示例：在文本/命令/路径/弹窗内容中写入 {'{{executors[IDX].result.value.xxx}}'}；弹窗支持 Markdown/HTML 与内置能力链接。
                    </div>
                    <div style={{ marginTop: 6 }}>
                      组合示例：脚本执行生成内容 → 写入剪贴板动作器模板填入 {'{{executors[0].result.value.scriptResult}}'} 即可复制结果。
                    </div>
                  </div>
                )

                const ability = (
                  <div style={{ marginTop: 12, fontSize: 13 }}>
                    <Typography.Text strong>能力说明</Typography.Text>
                    <div style={{ marginTop: 6 }}>
                      执行器与动作器按顺序串联，动作器可读取任意前置执行器输出，并可通过条件控制是否触发；模板变量运行时解析最新上下文。
                    </div>
                    <div style={{ marginTop: 6 }}>
                      快速示例：命令执行 → 显示弹窗：弹窗内容写 {'"命令输出：{{executors[0].result.value.execResult.result}}"'}，支持 Markdown 展示与链接交互。
                    </div>
                  </div>
                )

                modal.info({
                  title: '动作器配置指南',
                  okText: '知道了',
                  content: (
                    <div>
                      {intro}
                      <Collapse items={items} accordion />
                      {ability}
                    </div>
                  ),
                  width: 800
                })
              }}>如何配置动作器？</Button>
            </span>}>
              <ActionsEditor
                actions={actions}
                onAdd={addAction}
                onRemove={removeAction}
                onToggle={toggleAction}
                onConfigChange={updateActionConfig}
                onConditionChange={updateActionCondition}
                onDragEnd={handleActionDragEnd}
                manualByKey={manualByKey}
              />
            </Form.Item>

            <div
              style={{
                background: 'var(--color-background-light)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                padding: '16px',
                marginTop: '16px'
              }}
            >
              <Collapse
                bordered={false}
                ghost
                items={[{
                  key: 'entry-triggers',
                  label: (
                    <span style={{ fontWeight: 500 }}>
                      ⭐ 多入口触发（入口菜单）
                    </span>
                  ),
                  children: (
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div style={{ border: '1px solid var(--color-border-light)', borderRadius: 6, padding: '10px 12px', background: 'var(--color-background-light)' }}>
                        <div style={{ fontSize: 12, color: 'var(--color-text-primary)', marginBottom: 6 }}>
                          <Typography.Text strong>概述：</Typography.Text> 为同一工作流配置多个入口（菜单项），可按不同指令/匹配方式触发同一流程。
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-primary)', marginBottom: 6 }}>
                          <Typography.Text strong>字段提示：</Typography.Text>
                          <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                            <li>入口名称：显示在入口菜单中的文案。</li>
                            <li>触发类型值：作为匹配值/指令值（需与触发方式一致）。</li>
                            <li>启用：可按需临时关闭某入口。</li>
                          </ul>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                          <Typography.Text strong>示例：</Typography.Text> 如“打开项目 A”“打开项目 B”，匹配不同目录或参数。
                        </div>
                      </div>

                      <List
                        split={false}
                        dataSource={entryTriggers}
                        locale={{ emptyText: '尚未添加入口' }}
                        renderItem={(et, idx) => (
                          <List.Item style={{ borderBottom: 'none' }}>
                            <Row gutter={8} align="middle" style={{ width: '100%' }}>
                              <Col span={10}>
                                <Input
                                  placeholder="入口名称"
                                  value={et.label}
                                  onChange={(e) => {
                                    const next = [...entryTriggers]
                                    next[idx] = { ...next[idx], label: e.target.value }
                                    setEntryTriggers(next)
                                  }}
                                  style={{ width: '100%' }}
                                />
                              </Col>
                              <Col span={10}>
                                <Input
                                  placeholder="触发类型值"
                                  value={et.value}
                                  onChange={(e) => {
                                    const next = [...entryTriggers]
                                    next[idx] = { ...next[idx], value: e.target.value }
                                    setEntryTriggers(next)
                                  }}
                                  style={{ width: '100%' }}
                                />
                              </Col>
                              <Col span={2}>
                                <Switch
                                  checked={et.enabled !== false}
                                  onChange={(val) => {
                                    const next = [...entryTriggers]
                                    next[idx] = { ...next[idx], enabled: val }
                                    setEntryTriggers(next)
                                  }}
                                />
                              </Col>
                              <Col span={2}>
                                <Button
                                  danger
                                  type="link"
                                  size="small"
                                  onClick={() => {
                                    const next = entryTriggers.filter((_, i) => i !== idx)
                                    setEntryTriggers(next)
                                  }}
                                >删除</Button>
                              </Col>
                            </Row>
                          </List.Item>
                        )}
                      />
                      <Button
                        type="dashed"
                        icon={<PlusOutlined />}
                        block
                        onClick={() => setEntryTriggers([...(entryTriggers || []), { label: '', value: '' }])}
                      >添加入口</Button>
                    </Space>
                  )
                }]}
              />
            </div>

            <div
              style={{
                background: 'var(--color-background-light)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                padding: '16px',
                marginTop: '16px'
              }}
            >
              <Collapse
                bordered={false}
                ghost
                items={[
                  {
                    key: 'feature',
                    label: (
                      <span style={{ fontWeight: 500 }}>
                        🚀 快捷触发配置（动态指令）
                        {featureEnabled && (
                          <Tag color="success" style={{ marginLeft: 8 }}>已启用</Tag>
                        )}
                      </span>
                    ),
                    children: (
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <div style={{ border: '1px solid var(--color-border-light)', borderRadius: 6, padding: '10px 12px', background: 'var(--color-background-light)' }}>
                          <div style={{ fontSize: 12, color: 'var(--color-text-primary)', marginBottom: 6 }}>
                            <Typography.Text strong>概述：</Typography.Text> 将工作流暴露为 uTools 动态指令，可在搜索框/匹配规则中触发。
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--color-text-primary)', marginBottom: 6 }}>
                            <Typography.Text strong>字段提示：</Typography.Text>
                            <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                              <li>启用动态指令：开启后才会注册。</li>
                              <li>指令说明：显示在 uTools 搜索面板的描述文案。</li>
                              <li>触发指令：支持功能指令、文件/正则匹配、超级面板等。</li>
                            </ul>
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                            <Typography.Text strong>示例：</Typography.Text> 如“复制时间戳”“打开项目目录”，分别配置不同触发词或匹配规则。
                          </div>
                        </div>

                        <Form.Item label="启用动态指令">
                          <Switch checked={featureEnabled} onChange={setFeatureEnabled} />
                        </Form.Item>

                        {featureEnabled && (
                          <>
                            <Form.Item
                              name="featureExplain"
                              label="指令说明"
                              tooltip="在 uTools 搜索面板中显示的描述"
                            >
                              <Input placeholder="如: 快速复制当前时间戳" />
                            </Form.Item>

                            <Form.Item
                              name="featureCmds"
                              label="触发指令"
                              tooltip="支持功能指令、文件匹配、正则匹配、超级面板等多种触发方式"
                            >
                              <CmdsEditor />
                            </Form.Item>
                          </>
                        )}
                      </Space>
                    )
                  }
                ]}
              />
            </div>
          </>
        )}
      </Form>
    </Modal>
  )
}
