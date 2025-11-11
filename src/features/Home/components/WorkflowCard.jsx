import { Card, Avatar, Typography, Spin } from 'antd'
import * as Icons from '@ant-design/icons'

const { Text } = Typography

export default function WorkflowCard({ workflow, loading, onClick }) {
  const getIcon = () => {
    if (loading) {
      return <Avatar size={48} src={<Spin />} />
    }

    if (workflow.iconType === 'image' && workflow.icon) {
      return <Avatar size={48} src={workflow.icon} />
    }

    if (workflow.iconType === 'builtin' && workflow.iconKey) {
      const IconComponent = Icons[workflow.iconKey]
      return (
        <Avatar
          size={48}
          style={{ backgroundColor: workflow.iconColor || 'var(--color-primary)' }}
          icon={IconComponent ? <IconComponent /> : <Icons.ThunderboltOutlined />}
        />
      )
    }

    const bgColor = workflow.iconColor || 'var(--color-primary)'
    return (
      <Avatar size={48} style={{ backgroundColor: bgColor }} icon={<Icons.ThunderboltOutlined />} />
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
      <div style={{ marginBottom: 8 }}>{getIcon()}</div>
      <Text ellipsis={{ tooltip: workflow.name }} style={{ fontSize: 13, display: 'block' }}>
        {workflow.name || '未命名'}
      </Text>
    </Card>
  )
}
