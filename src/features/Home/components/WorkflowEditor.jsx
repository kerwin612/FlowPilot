import { useState, useEffect, useCallback } from 'react'
import { Modal, Form, Input, Collapse, Switch, Space } from 'antd'
import { arrayMove } from '@dnd-kit/sortable'
import IconPicker from './WorkflowEditor/IconPicker'
import ExecutorsEditor from './WorkflowEditor/ExecutorsEditor'
import ActionsEditor from './WorkflowEditor/ActionsEditor'
import CmdsEditor from './WorkflowEditor/CmdsEditor'
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
  const [previewImage, setPreviewImage] = useState(null)
  const [hovering, setHovering] = useState(false)
  const [featureEnabled, setFeatureEnabled] = useState(false)
  const [emoji, setEmoji] = useState('')
  const [text, setText] = useState('')
  const [svg, setSvg] = useState('')

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
      featureExplain: initialData?.feature?.explain || '',
      featureCmds: initialData?.feature?.cmds || []
    })
    const initExec = (initialData?.executors || []).map((e) => ({ id: e.id || genId(), ...e }))
    const initActs = (initialData?.actions || []).map((a) => ({ id: a.id || genId(), ...a }))
    setExecutors(initExec)
    setActions(initActs)
    setFeatureEnabled(initialData?.feature?.enabled || false)
  }, [open, type, initialData, form])

  const addExecutor = (key) => {
    const def = executorRegistry.get(key)
    if (!def) return
    setExecutors((prev) => [
      ...prev,
      { id: genId(), key, config: def.getDefaultConfig?.() || {}, enabled: true }
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

  const addAction = (key) => {
    const def = actionRegistry.get(key)
    if (!def) return
    setActions((prev) => [
      ...prev,
      { id: genId(), key, config: def.getDefaultConfig?.() || {}, enabled: true }
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

  const handleOk = async () => {
    try {
      const values = await form.validateFields()

      if (type !== ITEM_TYPE_FOLDER) {
        values.executors = executors
        values.actions = actions

        // Handle feature configuration
        if (featureEnabled) {
          // Auto-generate unique code if not exists
          const featureCode =
            initialData?.feature?.code ||
            `wf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

          values.feature = {
            enabled: true,
            code: featureCode,
            explain: values.featureExplain || values.name,
            cmds: values.featureCmds || []
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
      style={{ maxWidth: 800 }}
    >
      <Form form={form} layout="vertical">
        <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
          <Input placeholder="输入名称" />
        </Form.Item>

        <Form.Item label="图标">
          <IconPicker
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

        {type !== ITEM_TYPE_FOLDER && (
          <>
            <Form.Item label="执行器">
              <ExecutorsEditor
                executors={executors}
                onAdd={addExecutor}
                onRemove={removeExecutor}
                onToggle={toggleExecutor}
                onConfigChange={updateExecutorConfig}
                onDragEnd={handleExecutorDragEnd}
              />
            </Form.Item>

            <Form.Item label="动作器">
              <ActionsEditor
                actions={actions}
                onAdd={addAction}
                onRemove={removeAction}
                onToggle={toggleAction}
                onConfigChange={updateActionConfig}
                onDragEnd={handleActionDragEnd}
              />
            </Form.Item>

            <div
              style={{
                background: '#fafafa',
                border: '1px solid #d9d9d9',
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
                        ⚡ 快捷触发配置（动态指令）
                        {featureEnabled && (
                          <span
                            style={{
                              marginLeft: 8,
                              fontSize: '12px',
                              color: '#52c41a',
                              background: '#f6ffed',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              border: '1px solid #b7eb8f'
                            }}
                          >
                            已启用
                          </span>
                        )}
                      </span>
                    ),
                    children: (
                      <Space direction="vertical" style={{ width: '100%' }}>
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
