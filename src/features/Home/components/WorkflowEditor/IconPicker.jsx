import { useRef } from 'react'
import { Space, Avatar, Popover, Select, ColorPicker, message, Input, Button } from 'antd'
import { PlusOutlined, PictureOutlined, AppstoreOutlined } from '@ant-design/icons'
import * as Icons from '@ant-design/icons'
import IconDisplay from '../IconDisplay'
import { allIcons, commonIcons } from './iconConfig'
import { ICON_TYPE_BUILTIN, ICON_TYPE_IMAGE, ICON_TYPE_EMOJI, ICON_TYPE_TEXT, ICON_TYPE_SVG } from '../../../../shared/constants'
import DOMPurify from 'dompurify'

/**
 * 图标选择器组件
 * 支持内置图标（带颜色）和自定义图片
 */
export default function IconPicker({
  iconType,
  selectedIcon,
  selectedColor,
  previewImage,
  hovering,
  emoji,
  text,
  svg,
  onIconTypeChange,
  onIconChange,
  onColorChange,
  onImageChange,
  onEmojiChange,
  onTextChange,
  onSvgChange,
  onHoverChange,
  formInstance
}) {
  const fileInputRef = useRef(null)

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const base64 = ev.target.result
      onImageChange(base64)
      message.success('图片上传成功')
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const renderIconPreview = () => {
    const name = formInstance?.getFieldValue('name') || '预览'
    let content

    // 统一使用 IconDisplay 进行预览，保证与卡片展示完全一致
    const data = {
      iconType,
      iconColor: selectedColor,
      iconKey: iconType === ICON_TYPE_BUILTIN ? selectedIcon : undefined,
      icon: iconType === ICON_TYPE_IMAGE ? previewImage : undefined,
      iconEmoji: iconType === ICON_TYPE_EMOJI ? emoji : undefined,
      iconText: iconType === ICON_TYPE_TEXT ? text : undefined,
      iconSvg: iconType === ICON_TYPE_SVG ? svg : undefined
    }
    content = <IconDisplay data={data} size={64} />

    const base = (
      <div
        onMouseEnter={() => onHoverChange(true)}
        onMouseLeave={() => onHoverChange(false)}
        style={{
          position: 'relative',
          width: 64,
          height: 64,
          cursor: 'pointer'
        }}
        title={'点击编辑图标'}
      >
        {content}
      </div>
    )

    return (
      <Popover content={renderIconSelector()} trigger="click" placement="right">
        {base}
      </Popover>
    )
  }

  const renderIconSelector = () => {
    const panelStyle = (iconType === ICON_TYPE_BUILTIN)
      ? { width: 360, maxHeight: 480, overflow: 'auto' }
      : { width: 360, overflow: 'hidden' }
    return (
      <div style={panelStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Select
            size="small"
            value={iconType}
            onChange={(val) => onIconTypeChange(val)}
            style={{ width: '100%' }}
            options={[
              { value: ICON_TYPE_BUILTIN, label: '内置图标' },
              { value: ICON_TYPE_EMOJI, label: 'Emoji' },
              { value: ICON_TYPE_TEXT, label: '文本' },
              { value: ICON_TYPE_SVG, label: 'SVG' },
              { value: ICON_TYPE_IMAGE, label: '自定义图片' },
            ]}
          />
          {/* 颜色选择器：所有类型均可选颜色，用作圆形底色 */}
          {(
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)' }}>颜色</span>
              <ColorPicker
                value={selectedColor}
                presets={[{ label: '常用', colors: ['#1890ff','#fa541c','#722ed1','#13c2c2','#eb2f96','#52c41a','#faad14','#2f54eb'] }]}
                onChange={(color) => onColorChange(color.toHexString())}
              />
            </div>
          )}
        </div>

        {iconType === ICON_TYPE_BUILTIN && (
          <>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>常用图标</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, marginBottom: 16 }}>
              {commonIcons.map((iconKey) => {
                const IconComponent = Icons[iconKey]
                const isSelected = selectedIcon === iconKey
                return IconComponent ? (
                  <div
                    key={iconKey}
                    onClick={() => onIconChange(iconKey)}
                    style={{
                      padding: 8,
                      textAlign: 'center',
                      cursor: 'pointer',
                      border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: isSelected ? 'var(--color-primary-bg)' : 'transparent',
                      color: isSelected ? 'var(--color-primary)' : 'inherit',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = 'var(--color-primary-hover)'
                        e.currentTarget.style.color = 'var(--color-primary)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = 'var(--color-border)'
                        e.currentTarget.style.color = 'inherit'
                      }
                    }}
                  >
                    <IconComponent style={{ fontSize: 20 }} />
                  </div>
                ) : null
              })}
            </div>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>所有图标</div>
            <Select showSearch style={{ width: '100%' }} placeholder="搜索图标" value={selectedIcon} onChange={onIconChange} filterOption={(input, option) => option.value.toLowerCase().includes(input.toLowerCase())}>
              {allIcons.map((iconKey) => {
                const IconComponent = Icons[iconKey]
                return IconComponent ? (
                  <Select.Option key={iconKey} value={iconKey}>
                    <Space>
                      <IconComponent />
                      {iconKey.replace('Outlined', '')}
                    </Space>
                  </Select.Option>
                ) : null
              })}
            </Select>
          </>
        )}

        {iconType === ICON_TYPE_IMAGE && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Button type="primary" block onClick={() => fileInputRef.current?.click()}>上传图片</Button>
          </div>
        )}
        {iconType === ICON_TYPE_EMOJI && (
          <Input style={{ width: '100%' }} placeholder="输入Emoji" value={emoji} onChange={(e) => onEmojiChange(e.target.value)} maxLength={4} />
        )}
        {iconType === ICON_TYPE_TEXT && (
          <Input style={{ width: '100%' }} placeholder="输入文字，如AB" value={text} onChange={(e) => onTextChange(e.target.value)} maxLength={2} />
        )}
        {iconType === ICON_TYPE_SVG && (
          <Input.TextArea style={{ width: '100%' }} rows={6} placeholder="粘贴SVG代码" value={svg} onChange={(e) => onSvgChange(e.target.value)} />
        )}
      </div>
    )
  }

  return (
    <>
      {renderIconPreview()}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />
    </>
  )
}
