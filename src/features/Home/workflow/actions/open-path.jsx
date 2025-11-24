import { useState, useEffect } from 'react'
import { Input, Button, Space } from 'antd'
import { FolderOpenOutlined, FileOutlined } from '@ant-design/icons'
import { resolveTemplate } from '../engine/compile'
import { systemService } from '../../../../services'

const OpenPathConfig = ({ value = {}, onChange }) => {
  const [path, setPath] = useState(value.path || '')
  useEffect(() => {
    setPath(value.path || '')
  }, [value.path])

  const commit = (p) => onChange({ ...(value || {}), path: p })

  const handleSelectFile = async () => {
    try {
      const selectedPath = await systemService.selectPath({
        filters: [{ name: 'All Files', extensions: ['*'] }],
        properties: ['openFile']
      })
      if (selectedPath) {
        setPath(selectedPath)
        commit(selectedPath)
      }
    } catch (err) {
      console.error('选择文件失败:', err)
    }
  }

  const handleSelectDirectory = async () => {
    try {
      const selectedPath = await systemService.selectPath({
        properties: ['openDirectory']
      })
      if (selectedPath) {
        setPath(selectedPath)
        commit(selectedPath)
      }
    } catch (err) {
      console.error('选择文件夹失败:', err)
    }
  }

  return (
    <Space.Compact style={{ width: '100%' }}>
      <Input
        placeholder="文件或目录路径，可用 {{executors[0].result.value.file}} 变量"
        value={path}
        onChange={(e) => setPath(e.target.value)}
        onBlur={() => commit(path)}
      />
      <Button icon={<FileOutlined />} onClick={handleSelectFile} title="选择文件">
        选文件
      </Button>
      <Button icon={<FolderOpenOutlined />} onClick={handleSelectDirectory} title="选择文件夹">
        选文件夹
      </Button>
    </Space.Compact>
  )
}

export const OpenPathAction = {
  key: 'open-path',
  label: '打开路径',
  getDefaultConfig() {
    return { path: '' }
  },
  ConfigComponent: OpenPathConfig,
  async execute(trigger, context, config, options = {}) {
    const p = resolveTemplate(config.path, context)
    if (!p) throw new Error('路径为空')
    await systemService.openPath(p)
  }
}
