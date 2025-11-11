import { memo } from 'react'
import { Button, Space, Dropdown, Card, Switch } from 'antd'
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
import { executorRegistry } from '../../workflow/executors/registry'

/**
 * 可排序执行器项
 */
const SortableExecutorItem = memo(({ ex, index, onToggle, onRemove, onConfigChange }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: ex.id
  })
  const def = executorRegistry.get(ex.key)
  const C = def?.ConfigComponent
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
              #{index + 1} {def?.label || ex.key}
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
              checked={ex.enabled !== false}
              onChange={(v) => onToggle(ex.id, v)}
            />
            <Button danger type="text" onClick={() => onRemove(ex.id)}>
              删除
            </Button>
          </Space>
        }
      >
        {C ? (
          <C
            value={ex.config}
            onChange={(cfg) => {
              if (cfg !== ex.config) onConfigChange(ex.id, cfg)
            }}
          />
        ) : (
          <div>无配置</div>
        )}
      </Card>
    </div>
  )
})

SortableExecutorItem.displayName = 'SortableExecutorItem'

/**
 * 执行器列表编辑器
 */
export default function ExecutorsEditor({
  executors,
  onAdd,
  onRemove,
  onToggle,
  onConfigChange,
  onDragEnd
}) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const defs = executorRegistry.all()
  const menuItems = defs.map((d) => ({
    key: d.key,
    label: d.label,
    onClick: () => onAdd(d.key)
  }))

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      {executors.length === 0 && (
        <div
          style={{
            color: 'var(--color-text-secondary)',
            textAlign: 'center',
            padding: 'var(--spacing-lg) 0'
          }}
        >
          尚未添加执行器
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext
          items={executors.map((ex) => ex.id)}
          strategy={verticalListSortingStrategy}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            {executors.map((ex, i) => (
              <SortableExecutorItem
                key={ex.id}
                ex={ex}
                index={i}
                onToggle={onToggle}
                onRemove={onRemove}
                onConfigChange={onConfigChange}
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
          添加执行器
        </Button>
      </Dropdown>
    </Space>
  )
}
