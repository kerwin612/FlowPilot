import { useState, useEffect } from 'react'
import { Modal, Input, Space, Button, Typography } from 'antd'
import { systemService } from '../../../services'

const { Text } = Typography

export default function TransferModal({
  open,
  mode, // 'export' | 'import'
  title,
  initialContent = '',
  defaultFileName = 'export.json',
  onImportConfirm, // async (text) => boolean
  onCancel
}) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setText(initialContent || '')
      setError('')

      // 导入模式下，自动读取剪贴板
      if (mode === 'import') {
        const autoRead = async () => {
          try {
            const content = await systemService.readClipboard()
            if (content && content.trim()) {
              setText(content)
              // 可以在这里提示用户已自动读取，但为了体验流畅，不弹扰人通知
              // systemService.showNotification('已自动读取剪贴板') 
            }
          } catch (e) {
            // 忽略读取错误（可能是权限问题或空）
          }
        }
        autoRead()
      }
    }
  }, [open, initialContent, mode])

  const handleExportClipboard = async () => {
    const ok = await systemService.writeClipboard(text)
    systemService.showNotification(ok ? '已复制到剪贴板' : '复制失败')
    if (ok) {
      onCancel() // 关闭弹窗
    }
  }

  const handleExportFile = async () => {
    const ok = await systemService.saveFile(text, defaultFileName)
    systemService.showNotification(ok ? '已导出到文件' : '导出失败')
    if (ok) {
      onCancel() // 关闭弹窗
    }
  }

  const handleImportClipboard = async () => {
    try {
      const content = await systemService.readClipboard()
      if (!content) {
        systemService.showNotification('剪贴板为空')
        return
      }
      setText(content)
      setError('')
      systemService.showNotification('已读取剪贴板内容')
    } catch (e) {
      systemService.showNotification('读取剪贴板失败')
    }
  }

  const handleImportFile = async () => {
    const content = await systemService.openFile(['json'])
    if (content) {
      setText(content)
      setError('')
      systemService.showNotification('已读取文件内容')
    }
  }

  const handleConfirm = async () => {
    if (!text.trim()) {
      setError('内容不能为空')
      return
    }
    if (onImportConfirm) {
      const ok = await onImportConfirm(text)
      if (!ok) {
        setError('导入失败：格式错误或处理异常')
      } else {
        // Success handled by parent usually, but we can close here if parent returns true
        onCancel()
      }
    }
  }

  return (
    <Modal
      open={open}
      title={title || (mode === 'export' ? '导出' : '导入')}
      onCancel={onCancel}
      footer={null}
      width={800}
      destroyOnClose
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <Input.TextArea
          rows={15}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={mode === 'export' ? '导出内容将显示在这里...' : '请输入JSON内容，或使用下方按钮从剪贴板/文件导入...'}
        />
        {!!error && <Text type="danger">{error}</Text>}
        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
          {mode === 'export' ? (
            <>
              <Button onClick={handleExportFile}>导出到文件</Button>
              <Button type="primary" onClick={handleExportClipboard}>复制到剪贴板</Button>
            </>
          ) : (
            <>
              <Button onClick={handleImportFile}>从文件读取</Button>
              <Button onClick={handleImportClipboard}>从剪贴板读取</Button>
              <Button type="primary" onClick={handleConfirm}>确认导入</Button>
            </>
          )}
        </Space>
      </Space>
    </Modal>
  )
}
