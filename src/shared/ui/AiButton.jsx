import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Modal, Space, Input, Alert, Tooltip, Select, Typography } from 'antd'
import { RobotOutlined, SendOutlined } from '@ant-design/icons'
import { systemService } from '../../services'

export default function AiButton({ placeholder = '', onApply, size = 'small', shape = 'default', systemPrompt = '', assistantPrompts = [], tools = [], composeMessages }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [model, setModel] = useState('')
  const [models, setModels] = useState([])
  const streamRef = useRef(null)

  useEffect(() => {
    let mounted = true
    async function fetchModels() {
      try {
        const ms = await systemService.allAiModels()
        const preferred = (ms || []).find((m) => /json|structured|schema/i.test((m.label || '') + (m.id || ''))) || (ms || []).find((m) => !/reasoning|deepseek\-r1|r1/i.test((m.id || '') + (m.label || ''))) || (ms || [])[0]
        if (mounted) { setModels(ms || []); setModel(preferred ? preferred.id : '') }
      } catch {}
    }
    fetchModels()
    return () => { mounted = false }
  }, [])

  const cleanText = useMemo(() => (txt) => {
    const t = String(txt || '')
    const fence = t.match(/```json\n([\s\S]*?)```/) || t.match(/```[a-zA-Z0-9]*\n([\s\S]*?)```/)
    return fence ? fence[1] : t
  }, [])

  const abortStream = () => {
    try { const s = streamRef.current; if (s && typeof s.abort === 'function') s.abort() } catch {}
  }

  const callAI = async () => {
    setError('')
    setLoading(true)
    setOutput('')
    try {
      const platform = (typeof window !== 'undefined' && typeof window.fpGetPlatformType === 'function') ? window.fpGetPlatformType() : 'linux'
      let messages = []
      if (systemPrompt && systemPrompt.trim()) messages.push({ role: 'system', content: systemPrompt })
      const assists = Array.isArray(assistantPrompts) ? assistantPrompts.filter(Boolean).map((s) => String(s).replaceAll('{{platform}}', platform)) : []
      assists.forEach((s) => messages.push({ role: 'assistant', content: s }))
      if (typeof composeMessages === 'function') {
        try {
          const custom = composeMessages({ user: text, platform }) || []
          if (Array.isArray(custom)) messages = custom
        } catch {}
      }
      messages.push({ role: 'user', content: text })
      const aiOption = { model: model || undefined, messages, tools }
      const res = systemService.ai(aiOption, (delta) => { const chunk = (delta && (delta.content)) || ''; setOutput((prev) => prev + String(chunk || '')) })
      if (!res) { setError('AI 服务不可用') } else {
        try { streamRef.current = res; await res } finally { streamRef.current = null }
      }
    } catch (e) {
      setError(String(e && e.message ? e.message : 'AI 调用失败'))
    } finally {
      setLoading(false)
    }
  }

  const applyResult = () => {
    const txt = cleanText(output || '')
    if (!txt.trim()) { setError('无可用输出'); return }
    try { onApply && onApply(txt) } finally { setOpen(false) }
  }

  return (
    <>
      <Tooltip title={"AI"}>
        <Button shape={shape} size={size} icon={<RobotOutlined />} onClick={() => setOpen(true)} />
      </Tooltip>
      <Modal title={"AI 助手"} open={open} onCancel={() => { if (loading) abortStream(); setOpen(false) }} footer={null} width={520}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {models.length > 0 && (
            <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Typography.Text>选择模型</Typography.Text>
              <div style={{ flex: 1 }}>
                <Select style={{ width: '100%' }} value={model} onChange={(v) => setModel(v)} options={models.map(m => ({ label: `${m.label}（成本:${m.cost}）`, value: m.id }))} />
              </div>
            </div>
          )}
          <Input.TextArea rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} />
          <Space>
            <Button type="primary" disabled={!text.trim()} icon={<SendOutlined />} loading={loading} onClick={callAI}>生成</Button>
            <Button disabled={!loading} onClick={abortStream}>中止</Button>
            <Button type="primary" disabled={!output || loading} onClick={applyResult}>应用到当前字段</Button>
          </Space>
          {error && <Alert type="error" message={error} />}
          {!error && output && loading && <Alert type="success" message="AI 正在输出" />}
          {!error && output && !loading && <Alert type="success" message="AI 输出完毕" />}
          <Input.TextArea rows={10} value={output} onChange={(e) => setOutput(e.target.value)} placeholder="AI 输出" />
        </Space>
      </Modal>
    </>
  )
}
