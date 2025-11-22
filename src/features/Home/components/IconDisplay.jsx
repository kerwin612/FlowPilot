import { Avatar, Spin } from 'antd'
import * as Icons from '@ant-design/icons'
import DOMPurify from 'dompurify'
import { useEffect, useRef, cloneElement } from 'react'

function SvgIcon({ html }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current?.querySelector('svg')
    if (!el) return
    try {
      const bbox = el.getBBox()
      if (bbox && bbox.width > 0 && bbox.height > 0) {
        el.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`)
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
  return <span ref={ref} style={{ display: 'block', width: '100%', height: '100%', lineHeight: 0 }} dangerouslySetInnerHTML={{ __html: html }} />
}

export default function IconDisplay({ data, size = 48, defaultColor = 'var(--color-primary)', defaultBuiltinIcon = <Icons.ThunderboltOutlined />, loading = false }) {
  const defaultIconSized = cloneElement(defaultBuiltinIcon, { style: { fontSize: Math.round(size * 0.58) } })
  if (loading) {
    return <Avatar size={size} src={<Spin />} />
  }

  if (data?.iconType === 'image' && data?.icon) {
    return (
      <Avatar size={size} style={{ backgroundColor: data.iconColor || defaultColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <img src={data.icon} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block', margin: 'auto' }} />
        </div>
      </Avatar>
    )
  }

  if (data?.iconType === 'builtin' && data?.iconKey) {
    const IconComponent = Icons[data.iconKey]
    return (
      <Avatar
        size={size}
        style={{ backgroundColor: data.iconColor || defaultColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        icon={IconComponent ? <IconComponent style={{ fontSize: Math.round(size * 0.58) }} /> : defaultIconSized}
      />
    )
  }

  if (data?.iconType === 'text' && data?.iconText) {
    return (
      <Avatar size={size} style={{ backgroundColor: data.iconColor || defaultColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: Math.round(size * 0.62), fontWeight: 700, lineHeight: 1, display: 'inline-block' }}>{data.iconText}</span>
      </Avatar>
    )
  }

  if (data?.iconType === 'emoji' && data?.iconEmoji) {
    return (
      <Avatar size={size} style={{ backgroundColor: data.iconColor || defaultColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: Math.round(size * 0.92), lineHeight: 1, display: 'inline-block', textAlign: 'center', fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif' }}>{data.iconEmoji}</span>
      </Avatar>
    )
  }

  if (data?.iconType === 'svg' && data?.iconSvg) {
    const sanitize = (raw) => {
      if (!raw) return ''
      let clean = DOMPurify.sanitize(raw, { USE_PROFILES: { svg: true } })
      try {
        const doc = new DOMParser().parseFromString(clean, 'image/svg+xml')
        const svgEl = doc.documentElement
        if (svgEl && svgEl.tagName && svgEl.tagName.toLowerCase() === 'svg') {
          const hasViewBox = svgEl.hasAttribute('viewBox')
          const wAttr = svgEl.getAttribute('width')
          const hAttr = svgEl.getAttribute('height')
          const w = wAttr ? parseFloat(String(wAttr).replace(/[^0-9.]/g, '')) : 0
          const h = hAttr ? parseFloat(String(hAttr).replace(/[^0-9.]/g, '')) : 0
          if (!hasViewBox && w > 0 && h > 0) {
            svgEl.setAttribute('viewBox', `0 0 ${w} ${h}`)
          }
          svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet')
          svgEl.removeAttribute('width')
          svgEl.removeAttribute('height')
          svgEl.setAttribute('style', 'width:100%;height:100%;display:block')
          clean = new XMLSerializer().serializeToString(svgEl)
        }
      } catch {}
      return clean
    }
    const sanitized = sanitize(data.iconSvg)
    return (
      <Avatar size={size} style={{ backgroundColor: data.iconColor || defaultColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '86%', height: '86%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 'auto' }}>
          <SvgIcon html={sanitized} />
        </div>
      </Avatar>
    )
  }

  return (
    <Avatar size={size} style={{ backgroundColor: data?.iconColor || defaultColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }} icon={defaultIconSized} />
  )
}