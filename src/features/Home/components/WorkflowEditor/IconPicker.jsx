import { useRef } from 'react'
import { Space, Radio, Avatar, Popover, Select, ColorPicker, message } from 'antd'
import { PlusOutlined, PictureOutlined, AppstoreOutlined } from '@ant-design/icons'
import * as Icons from '@ant-design/icons'
import { allIcons, commonIcons } from './iconConfig'
import { ICON_TYPE_BUILTIN, ICON_TYPE_IMAGE } from '../../../../shared/constants'

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
  onIconTypeChange,
  onIconChange,
  onColorChange,
  onImageChange,
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

    if (iconType === ICON_TYPE_IMAGE && previewImage) {
      content = <Avatar size={64} src={previewImage} />
    } else if (iconType === ICON_TYPE_BUILTIN && selectedIcon) {
      const IconComponent = Icons[selectedIcon]
      content = (
        <Avatar
          size={64}
          style={{ backgroundColor: selectedColor }}
          icon={IconComponent ? <IconComponent /> : <Icons.ThunderboltOutlined />}
        />
      )
    } else {
      content = (
        <Avatar size={64} style={{ backgroundColor: selectedColor }}>
          {name.charAt(0).toUpperCase()}
        </Avatar>
      )
    }

    const showOverlay = iconType === ICON_TYPE_IMAGE && (hovering || !previewImage)

    const base = (
      <div
        onMouseEnter={() => onHoverChange(true)}
        onMouseLeave={() => onHoverChange(false)}
        onClick={() => {
          if (iconType === ICON_TYPE_IMAGE) fileInputRef.current?.click()
        }}
        style={{
          position: 'relative',
          width: 64,
          height: 64,
          cursor: 'pointer'
        }}
        title={iconType === ICON_TYPE_IMAGE ? '点击上传/更换图片' : '点击选择图标与颜色'}
      >
        {content}
        {iconType === ICON_TYPE_IMAGE && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: showOverlay ? 'flex' : 'none',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'var(--color-background-overlay)',
              color: 'var(--color-text-inverse)',
              borderRadius: 'var(--radius-circle)'
            }}
          >
            <PlusOutlined />
          </div>
        )}
      </div>
    )

    if (iconType === ICON_TYPE_BUILTIN) {
      return (
        <Popover content={renderIconSelector()} trigger="click" placement="right">
          {base}
        </Popover>
      )
    }

    return base
  }

  const renderIconSelector = () => {
    return (
      <div style={{ width: 360, maxHeight: 440, overflow: 'auto' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8
          }}
        >
          <div style={{ fontWeight: 500 }}>选择图标</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)' }}>
              颜色
            </span>
            <ColorPicker
              value={selectedColor}
              presets={[
                {
                  label: '常用',
                  colors: [
                    '#1890ff',
                    '#fa541c',
                    '#722ed1',
                    '#13c2c2',
                    '#eb2f96',
                    '#52c41a',
                    '#faad14',
                    '#2f54eb'
                  ]
                }
              ]}
              onChange={(color) => onColorChange(color.toHexString())}
            />
          </div>
        </div>

        <div style={{ marginBottom: 8, fontWeight: 500 }}>常用图标</div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: 8,
            marginBottom: 16
          }}
        >
          {commonIcons.map((iconKey) => {
            const IconComponent = Icons[iconKey]
            return IconComponent ? (
              <div
                key={iconKey}
                onClick={() => onIconChange(iconKey)}
                style={{
                  padding: 8,
                  textAlign: 'center',
                  cursor: 'pointer',
                  border:
                    selectedIcon === iconKey
                      ? '2px solid var(--color-primary)'
                      : '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor:
                    selectedIcon === iconKey ? 'var(--color-primary-light)' : 'transparent'
                }}
              >
                <IconComponent style={{ fontSize: 20 }} />
              </div>
            ) : null
          })}
        </div>

        <div style={{ marginBottom: 8, fontWeight: 500 }}>所有图标</div>
        <Select
          showSearch
          style={{ width: '100%' }}
          placeholder="搜索图标"
          value={selectedIcon}
          onChange={onIconChange}
          filterOption={(input, option) => option.value.toLowerCase().includes(input.toLowerCase())}
        >
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
      </div>
    )
  }

  return (
    <>
      <Space align="start" size="middle">
        {renderIconPreview()}

        <Space direction="vertical" size="small" style={{ flex: 1 }}>
          <Radio.Group
            value={iconType}
            onChange={(e) => onIconTypeChange(e.target.value)}
            size="small"
          >
            <Radio.Button value={ICON_TYPE_BUILTIN}>
              <AppstoreOutlined /> 内置图标
            </Radio.Button>
            <Radio.Button value={ICON_TYPE_IMAGE}>
              <PictureOutlined /> 自定义图片
            </Radio.Button>
          </Radio.Group>

          {iconType === ICON_TYPE_BUILTIN ? (
            <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)' }}>
              点击左侧图标选择或更换内置图标与颜色
            </span>
          ) : (
            <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)' }}>
              点击左侧图标上传或更换图片
            </span>
          )}
        </Space>
      </Space>

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
