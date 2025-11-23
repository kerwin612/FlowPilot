import { memo } from 'react'
import { Button, Space, Dropdown, Card, Switch } from 'antd'
import { conditionRegistry } from '../../workflow/conditions/registry'
import { Select } from 'antd'
import { PlusOutlined, HolderOutlined } from '@ant-design/icons'
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

/**
 * 可排序动作器项
 */
const SortableActionItem = memo(({ act, index, onToggle, onRemove, onConfigChange, onConditionChange }) => {
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

  return (
    <div ref={setNodeRef} style={style}>
      <Card
        size="small"
        title={
          <Space size={8}>
            <HolderOutlined
              {...listeners}
              {...attributes}
              style={{
                cursor: 'grab',
                color: 'var(--color-icon-secondary)',
                fontSize: 'var(--font-size-md)'
              }}
            />
            <span>
              #{index + 1} {def?.label || act.key}
            </span>
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
            background: '#fafafa',
            border: '1px dashed #d9d9d9',
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
  onDragEnd
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
              />
            ))}
          </Space>
        </SortableContext>
      </DndContext>

      <Dropdown menu={{ items: menuItems }} placement="bottomLeft" trigger={['click']}>
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
