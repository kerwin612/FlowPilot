import { Card, Typography, Space, Dropdown } from 'antd'
import * as Icons from '@ant-design/icons'
import IconDisplay from './IconDisplay'

const { Text } = Typography

export default function FolderCard({ folder, onClick, onEdit, onDelete, onExport, onImport }) {
  const itemCount = folder.items?.length || 0

  // 右键菜单项
  const contextMenuItems = [
    {
      key: 'edit',
      label: '编辑文件夹',
      icon: <Icons.EditOutlined />,
      onClick: ({ domEvent }) => {
        domEvent?.stopPropagation()
        onEdit?.(folder)
      }
    },
    {
      key: 'export',
      label: '导出文件夹',
      icon: <Icons.ExportOutlined />,
      onClick: ({ domEvent }) => {
        domEvent?.stopPropagation()
        onExport?.(folder)
      }
    },
    {
      key: 'import',
      label: '导入到此文件夹',
      icon: <Icons.ImportOutlined />,
      onClick: ({ domEvent }) => {
        domEvent?.stopPropagation()
        onImport?.(folder)
      }
    }
  ]

  if (itemCount === 0) {
    contextMenuItems.push({
      key: 'delete',
      label: '删除文件夹',
      icon: <Icons.DeleteOutlined />,
      danger: true,
      onClick: ({ domEvent }) => {
        domEvent?.stopPropagation()
        onDelete?.(folder)
      }
    })
  }

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
    <div onContextMenu={(e) => e.stopPropagation()} style={{ display: 'inline-block' }}>
      <Dropdown menu={{ items: contextMenuItems }} trigger={['contextMenu']}>
        <Card
          hoverable
          onClick={onClick}
          style={{ width: 110, height: 128, cursor: 'pointer', position: 'relative' }}
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
        <div style={{ display: 'block', lineHeight: 0 }}>
          <div style={{ width: 52, height: 52, margin: '0 auto', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>{getIcon()}</div>
        </div>
        {itemCount > 0 && (
          <div
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              backgroundColor: 'var(--color-background-dark)',
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
        <Text ellipsis={{ tooltip: folder.name }} style={{ fontSize: 13, display: 'block', marginTop: 6 }}>
          {folder.name || '未命名文件夹'}
        </Text>
      </Card>
      </Dropdown>
    </div>
  )
}
