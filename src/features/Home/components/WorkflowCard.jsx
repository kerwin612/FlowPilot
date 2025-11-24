import { Card, Typography, Dropdown } from 'antd'
import * as Icons from '@ant-design/icons'
import IconDisplay from './IconDisplay'

const { Text } = Typography

export default function WorkflowCard({ workflow, loading, onClick, onTrigger }) {
  function SvgIcon({ html }) {
    const ref = useRef(null)
    useEffect(() => {
      const el = ref.current?.querySelector('svg')
      if (!el) return
      try {
        const hasViewBox = el.hasAttribute('viewBox')
        if (!hasViewBox) {
          const bbox = el.getBBox()
          if (bbox && bbox.width > 0 && bbox.height > 0) {
            el.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`)
          }
        }
        el.setAttribute('preserveAspectRatio', 'xMidYMid meet')
        el.removeAttribute('width')
        el.removeAttribute('height')
        el.style.width = '100%'
        el.style.height = '100%'
        el.style.display = 'block'
        el.style.margin = 'auto'
      } catch {}
    }, [html])
    return <span ref={ref} dangerouslySetInnerHTML={{ __html: html }} />
  }
  const getIcon = () => {
    return (
      <IconDisplay
        data={workflow}
        size={48}
        defaultColor={'var(--color-primary)'}
        defaultBuiltinIcon={<Icons.ThunderboltOutlined />}
        loading={loading}
      />
    )
  }

  return (
    <Card
      hoverable
      onClick={onClick}
      style={{ width: 100, height: 130, cursor: 'pointer', position: 'relative' }}
      styles={{
        body: {
          padding: 16,
          textAlign: 'center',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }
      }}
    >
      <div style={{ width: 48, height: 48, margin: '0 auto', display: 'flex', justifyContent: 'center', alignItems: 'center', lineHeight: 0 }}>{getIcon()}</div>
      <Text ellipsis={{ tooltip: workflow.name }} style={{ fontSize: 13, display: 'block', marginTop: 4 }}>
        {workflow.name || '未命名'}
      </Text>
      {Array.isArray(workflow.entryTriggers) && workflow.entryTriggers.some(et => (et?.enabled !== false) && et?.label && et?.value) && (
        <div style={{ position: 'absolute', right: 6, top: 6 }} onClick={(e) => e.stopPropagation()}>
          <Dropdown
            menu={{
              items: (workflow.entryTriggers || [])
                .filter(et => (et?.enabled !== false) && et?.label && et?.value)
                .map((et, idx) => ({ key: String(idx), label: et.label, onClick: () => onTrigger?.(et.value) }))
            }}
            trigger={['click']}
          >
            <a><Icons.MoreOutlined /></a>
          </Dropdown>
        </div>
      )}
    </Card>
  )
}
