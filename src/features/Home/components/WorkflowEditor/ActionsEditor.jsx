import { memo, useState } from 'react'
import { Button, Space, Dropdown, Card, Switch, Modal, Typography, Alert, Collapse } from 'antd'
import { ensureModal } from '../../../../shared/ui/modalHost'
import { conditionRegistry } from '../../workflow/conditions/registry'
import { Select } from 'antd'
import { PlusOutlined, HolderOutlined, QuestionCircleOutlined, RightOutlined, DownOutlined } from '@ant-design/icons'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { actionRegistry } from '../../workflow/actions/registry'

const helpBoxStyle = {
  border: '1px solid var(--color-border)',
  borderRadius: 6,
  padding: '10px 12px',
  background: 'var(--color-background-light)'
}

/**
 * 可排序动作器项
 */
const SortableActionItem = memo(({ act, index, onToggle, onRemove, onConfigChange, onConditionChange, manualByKey }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: act.id
  })
  const def = actionRegistry.get(act.key)
  const C = def?.ConfigComponent
  const condDef = act.condition?.key ? conditionRegistry.get(act.condition.key) : null
  const CondC = condDef?.ConfigComponent
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }
  const [showHelp, setShowHelp] = useState(false)
  const [collapsed, setCollapsed] = useState(!act._defaultExpanded)

  return (
    <div ref={setNodeRef} style={style}>
      <Card
        size="small"
        styles={{ body: { display: collapsed ? 'none' : 'block' } }}
        title={
          <Space size={8} align="center">
            <div
              onClick={() => setCollapsed(!collapsed)}
              style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                color: 'var(--color-text-secondary)',
                fontSize: 12
              }}
            >
              {collapsed ? <RightOutlined /> : <DownOutlined />}
            </div>
            <HolderOutlined
              {...listeners}
              {...attributes}
              style={{
                cursor: 'grab',
                color: 'var(--color-icon-secondary)',
                fontSize: 'var(--font-size-md)'
              }}
            />
            <span onClick={() => setCollapsed(!collapsed)} style={{ cursor: 'pointer' }}>
              #{index + 1} {def?.label || act.key}
            </span>
            {!collapsed && (
              <Button
                type="text"
                size="small"
                icon={<QuestionCircleOutlined />}
                onClick={(e) => {
                  e.stopPropagation()
                  setShowHelp((v) => !v)
                }}
              ></Button>
            )}
          </Space>
        }
        extra={
          <Space>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
              启用
            </span>
            <Switch
              size="small"
              checked={act.enabled !== false}
              onChange={(v) => onToggle(act.id, v)}
            />
            <Button danger type="text" onClick={() => onRemove(act.id)}>
              删除
            </Button>
          </Space>
        }
      >
        <div
          style={{
            marginBottom: 12,
            padding: '10px 12px',
            background: 'var(--color-background-light)',
            border: '1px dashed var(--color-border)',
            borderRadius: 8
          }}
        >
          <Space style={{ width: '100%' }} direction="vertical">
            <Space align="center">
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', width: 36 }}>
                条件
              </span>
              <Select
                size="small"
                style={{ minWidth: 240 }}
                value={act.condition?.key || 'none'}
                onChange={(k) => {
                  if (k === 'none') {
                    onConditionChange(act.id, undefined)
                    return
                  }
                  const defSel = conditionRegistry.get(k)
                  const init = defSel?.getDefaultConfig?.() || {}
                  onConditionChange(act.id, { key: k, enabled: true, config: init })
                }}
                options={[{ value: 'none', label: '无条件（直接执行）' }, ...conditionRegistry.all().map((d) => ({ value: d.key, label: d.label }))]}
              />
            </Space>
            {CondC && act.condition?.key && act.condition?.key !== 'none' ? (
              <div>
                <CondC
                  value={act.condition?.config}
                  onChange={(cfg) => onConditionChange(act.id, { ...act.condition, config: cfg })}
                />
              </div>
            ) : null}
          </Space>
        </div>
        
        {showHelp && (() => {
          const manual = def ? manualByKey?.[def.key] : null
          if (!manual) return null
          const c = manual.content || {}
          const hasContent = [
            c.overview,
            c.fields?.length,
            c.examples?.length,
            c.tips?.length,
            c.faqs?.length,
            c.warnings?.length
          ].some(Boolean)
          if (!hasContent) return null

          return (
            <div style={{ marginBottom: 12, ...helpBoxStyle }}>
              {c.overview && (
                <div style={{ fontSize: 12, color: 'var(--color-text-primary)', marginBottom: 6 }}>
                  <Typography.Text strong>概述：</Typography.Text> {c.overview}
                </div>
              )}

              {c.fields?.length > 0 && (
                <div style={{ fontSize: 12, color: 'var(--color-text-primary)', marginBottom: 6 }}>
                  <Typography.Text strong>字段说明：</Typography.Text>
                  <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                    {c.fields.map((f, idx) => (
                      <li key={idx} style={{ lineHeight: 1.5 }}>
                        <b>{f.label}</b>{f.required ? '（必填）' : ''}：{f.desc}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {c.examples?.length > 0 && (
                <div style={{ fontSize: 12, color: 'var(--color-text-primary)', marginBottom: 6 }}>
                  <Typography.Text strong>配置案例：</Typography.Text>
                  <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                    {c.examples.map((ex, idx) => (
                      <li key={idx} style={{ lineHeight: 1.5 }}>
                        <b>{ex.title}：</b><code>{ex.code}</code>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {c.tips?.length > 0 && (
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                  <Typography.Text strong>使用技巧：</Typography.Text>
                  <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                    {c.tips.map((t, i) => (
                      <li key={i} style={{ lineHeight: 1.5 }}>{t.text || t}</li>
                    ))}
                  </ul>
                </div>
              )}

              {c.faqs?.length > 0 && (
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                  <Typography.Text strong>常见问题：</Typography.Text>
                  <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                    {c.faqs.map((f, i) => (
                      <li key={i} style={{ lineHeight: 1.5 }}>
                        <b>{f.q}</b> {f.a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {c.warnings?.length > 0 && (
                <div style={{ fontSize: 12, color: 'var(--color-warning)' }}>
                  <Typography.Text strong>注意事项：</Typography.Text>
                  <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                    {c.warnings.map((w, i) => (
                      <li key={i} style={{ lineHeight: 1.5 }}>{w.text || w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )
        })()}

        {C ? (
          <C
            value={act.config}
            onChange={(cfg) => {
              if (cfg !== act.config) onConfigChange(act.id, cfg)
            }}
          />
        ) : (
          <div>无配置</div>
        )}
      </Card>
    </div>
  )
})

SortableActionItem.displayName = 'SortableActionItem'

/**
 * 动作器列表编辑器
 */
export default function ActionsEditor({
  actions,
  onAdd,
  onRemove,
  onToggle,
  onConfigChange,
  onConditionChange,
  onDragEnd,
  manualByKey
}) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const defs = actionRegistry.all()
  const menuItems = defs.map((d) => ({
    key: d.key,
    label: d.label,
    onClick: () => onAdd(d.key)
  }))

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      {actions.length === 0 && (
        <div
          style={{
            color: 'var(--color-text-secondary)',
            textAlign: 'center',
            padding: 'var(--spacing-lg) 0'
          }}
        >
          尚未添加动作器
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext
          items={actions.map((act) => act.id)}
          strategy={verticalListSortingStrategy}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            {actions.map((act, i) => (
              <SortableActionItem
                key={act.id}
                act={act}
                index={i}
                onToggle={onToggle}
                onRemove={onRemove}
                onConfigChange={onConfigChange}
                onConditionChange={onConditionChange}
                manualByKey={manualByKey}
              />
            ))}
          </Space>
        </SortableContext>
      </DndContext>

      <Dropdown menu={{ items: menuItems }} placement="bottomLeft" trigger={["click"]}>
        <Button
          type="dashed"
          icon={<PlusOutlined style={{ color: 'var(--color-success)' }} />}
          style={{
            width: '100%',
            borderColor: 'var(--color-border)',
            color: 'var(--color-success)'
          }}
        >
          添加动作器
        </Button>
      </Dropdown>
    </Space>
  )
}
