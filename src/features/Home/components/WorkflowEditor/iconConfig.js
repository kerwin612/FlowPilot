// 图标配置常量
// 提取自 WorkflowEditor，供 IconPicker 使用

import * as Icons from '@ant-design/icons'

// 获取所有 Outlined 图标
export const allIcons = Object.keys(Icons)
  .filter((key) => key.endsWith('Outlined') && key !== 'createFromIconfontCN')
  .sort()

// 常用图标（默认显示）
export const commonIcons = [
  'FileOutlined',
  'FolderOutlined',
  'AppstoreOutlined',
  'StarOutlined',
  'HeartOutlined',
  'HomeOutlined',
  'SettingOutlined',
  'ThunderboltOutlined',
  'RocketOutlined',
  'FireOutlined',
  'CrownOutlined',
  'TrophyOutlined',
  'BulbOutlined',
  'CloudOutlined',
  'CodeOutlined',
  'ApiOutlined',
  'BookOutlined',
  'CalendarOutlined',
  'CameraOutlined',
  'CarOutlined',
  'CoffeeOutlined',
  'CompassOutlined',
  'DashboardOutlined',
  'DatabaseOutlined'
]
