import { Card, Typography, Space } from 'antd'
import * as Icons from '@ant-design/icons'
import IconDisplay from './IconDisplay'

const { Text } = Typography

export default function FolderCard({ folder, onClick }) {
  const itemCount = folder.items?.length || 0

  // 获取图标
  const getIcon = () => (
    <IconDisplay
      data={folder}
      size={48}
      defaultColor={'var(--color-warning)'}
      defaultBuiltinIcon={<Icons.FolderOutlined />}
    />
  )

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
      <div style={{ position: 'relative', display: 'block', lineHeight: 0 }}>
        <div style={{ width: 48, height: 48, margin: '0 auto', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>{getIcon()}</div>
        {itemCount > 0 && (
          <div
            style={{
              position: 'absolute',
              bottom: -2,
              right: -2,
              backgroundColor: 'var(--color-background)',
              border: `2px solid ${'var(--color-text-secondary)'}`,
              borderRadius: '50%',
              width: 18,
              height: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              fontWeight: 600,
              color: 'var(--color-text-primary)'
            }}
          >
            {itemCount > 99 ? '99+' : itemCount}
          </div>
        )}
      </div>
      <Text ellipsis={{ tooltip: folder.name }} style={{ fontSize: 13, display: 'block', marginTop: 4 }}>
        {folder.name || '未命名文件夹'}
      </Text>
    </Card>
  )
}
