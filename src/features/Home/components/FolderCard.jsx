import { Card, Avatar, Typography, Space } from 'antd'
import * as Icons from '@ant-design/icons'

const { Text } = Typography

export default function FolderCard({ folder, onClick }) {
  const itemCount = folder.items?.length || 0

  // 获取图标
  const getIcon = () => {
    // 自定义上传的图片
    if (folder.iconType === 'image' && folder.icon) {
      return <Avatar size={48} src={folder.icon} />
    }

    // 内置图标
    if (folder.iconType === 'builtin' && folder.iconKey) {
      const IconComponent = Icons[folder.iconKey]
      return (
        <Avatar
          size={48}
          style={{ backgroundColor: folder.iconColor || 'var(--color-warning)' }}
          icon={IconComponent ? <IconComponent /> : <Icons.FolderOutlined />}
        />
      )
    }

    // 兼容旧数据
    const colorMap = {
      blue: 'var(--color-primary)',
      purple: 'var(--color-purple)',
      orange: 'var(--color-orange)',
      green: 'var(--color-success)',
      red: 'var(--color-error)',
      teal: 'var(--color-cyan)'
    }

    const bgColor = folder.iconColor || colorMap[folder.style] || 'var(--color-warning)'

    return <Avatar size={48} style={{ backgroundColor: bgColor }} icon={<Icons.FolderOutlined />} />
  }

  return (
    <Card
      hoverable
      onClick={onClick}
      style={{ width: 100, height: 130, cursor: 'pointer' }}
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
      <Space direction="vertical" size={4} style={{ width: '100%' }}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          {getIcon()}
          {itemCount > 0 && (
            <div
              style={{
                position: 'absolute',
                bottom: -4,
                right: -4,
                backgroundColor: 'var(--color-background)',
                border: `2px solid ${folder.iconColor || 'var(--color-warning)'}`,
                borderRadius: '50%',
                width: 20,
                height: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 600,
                color: folder.iconColor || 'var(--color-warning)'
              }}
            >
              {itemCount > 99 ? '99+' : itemCount}
            </div>
          )}
        </div>
        <Text ellipsis={{ tooltip: folder.name }} style={{ fontSize: 13, display: 'block' }}>
          {folder.name || '未命名文件夹'}
        </Text>
      </Space>
    </Card>
  )
}
