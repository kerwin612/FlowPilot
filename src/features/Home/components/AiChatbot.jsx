import { useEffect, useMemo, useRef, useState } from 'react'
import { Drawer, Button, Space, Input, Typography, Segmented, Alert, Select, Divider } from 'antd'
import { SendOutlined } from '@ant-design/icons'
import { configService, systemService, workflowService } from '../../../services'

export default function AiChatbot({ open, onClose }) {
  const [model, setModel] = useState('')
  const [models, setModels] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [output, setOutput] = useState('')
  const [targetTab, setTargetTab] = useState(0)
  const [preview, setPreview] = useState(null)
  const [preset, setPreset] = useState('')

  const examples = useMemo(() => {
    if (typeof window !== 'undefined' && window.fpGetDefaultWorkflowExamples) {
      try { return window.fpGetDefaultWorkflowExamples({ limit: 6 }) || { platform: 'linux', examples: [] } } catch { return { platform: 'linux', examples: [] } }
    }
    return { platform: 'linux', examples: [] }
  }, [])

  useEffect(() => {
    let mounted = true
    async function fetchModels() {
      try {
        const ms = await systemService.allAiModels()
          const preferred = (ms || []).find((m) => /deepseek|reasoning/i.test(m.id)) || (ms || [])[0]
          if (mounted) {
            setModels(ms || [])
            setModel(preferred ? preferred.id : '')
          }
      } catch {}
    }
    fetchModels()
    return () => { mounted = false }
  }, [])

  const prompt = useMemo(() => {
    const platform = (examples && examples.platform) || (typeof window !== 'undefined' && window.fpGetPlatformType ? window.fpGetPlatformType() : 'linux')
    const guide = [
      `平台: ${platform}`,
      `目标: 将用户意图转为 FlowPilot 可导入 JSON (type: flowpilot/workflow-export 或 flowpilot/folder-export, version: 1)`,
      `维度示例:`,
      `1) 功能维度: 例如 "下载一个 URL 并将内容保存到 ~/Downloads"`,
      `2) 交互维度: 提供 entryTriggers 和 param-builder 收集输入`,
      `3) 集成维度: 使用现有 executors/actions (command/js-script/show-modal/open-link/open-path 等)`
    ].join('\n')
    const refs = (examples.examples || []).map((e, i) => `示例${i+1}(${e.type}):\n${e.json}`).join('\n\n')
    const currentRefs = (typeof window !== 'undefined' && window.fpGetCurrentConfigExports ? window.fpGetCurrentConfigExports({ limit: 6 }) : { examples: [] })
    const refs2 = (currentRefs.examples || []).map((e, i) => `当前示例${i+1}(${e.type}):\n${e.json}`).join('\n\n')
    return `${guide}\n\n【示例参考】\n${refs}\n\n【当前配置参考】\n${refs2}\n\n【用户意图】\n${input}\n\n【要求】\n- 只输出可导入 JSON 文本\n- 遵循字段: id/name/mode/iconType/iconKey/iconColor/executors/actions/entryTriggers/feature 可选\n- 根据平台选择命令/路径\n- 如果需要参数，先用 param-builder\n- 不要包含注释或非 JSON 内容`
  }, [input, examples])

  useEffect(() => {
    const clean = (txt) => {
      const t = String(txt || '')
      const fence = t.match(/```[a-zA-Z0-9]*\n([\s\S]*?)```/)
      const body = fence ? fence[1] : t
      const i = body.indexOf('{')
      const j = body.lastIndexOf('}')
      if (i >= 0 && j > i) return body.slice(i, j + 1)
      return body
    }
    try {
      const text = clean(output)
      const obj = JSON.parse(text)
      const type = obj.type || (obj.workflow ? 'flowpilot/workflow-export' : (obj.items ? 'flowpilot/folder-export' : ''))
      const names = []
      if (type === 'flowpilot/workflow-export' && obj.workflow) names.push(obj.workflow.name || obj.workflow.id)
      if (type === 'flowpilot/folder-export' && Array.isArray(obj.items)) {
        const walk = (n) => {
          if (!n) return
          if (Array.isArray(n)) { n.forEach(walk); return }
          if (n.type === 'workflow') names.push(n.name || n.id)
          if (n.type === 'folder') (n.items || []).forEach(walk)
        }
        walk(obj.items)
      }
      setPreview({ type, names, raw: obj })
    } catch {
      setPreview(null)
    }
  }, [output])

  const streamRef = useRef(null)

  const abortStream = () => {
    try {
      const s = streamRef.current
      if (s && typeof s.abort === 'function') s.abort()
    } catch {}
  }

  const callAI = async () => {
    setError('')
    setLoading(true)
    setOutput('')
    try {
      const messages = [
        { role: 'system', content: '你是 FlowPilot 工作流生成助手。根据用户意图输出可被导入的 JSON。' },
        { role: 'user', content: prompt }
      ]
      const tools = [
        { type: 'function', function: { name: 'fpGetPlatformType', description: '获取当前平台类型', parameters: { type: 'object', properties: {} } } },
        { type: 'function', function: { name: 'fpGetDefaultWorkflowExamples', description: '获取默认示例工作流导出JSON，供参考', parameters: { type: 'object', properties: { limit: { type: 'number' } } } } },
        { type: 'function', function: { name: 'fpGetCurrentConfigExports', description: '获取当前配置中的工作流/文件夹导出示例', parameters: { type: 'object', properties: { limit: { type: 'number' } } } } }
      ]
      const aiOption = { model: model || undefined, messages, tools }
      const res = systemService.ai(aiOption, (delta) => {
        const chunk = (delta && (delta.content || delta.reasoning_content)) || ''
        setOutput((prev) => prev + String(chunk || ''))
      })
      if (!res) {
        setError('AI 服务不可用')
      } else {
        try {
          streamRef.current = res
          await res
        } finally {
          streamRef.current = null
        }
      }
    } catch (e) {
      setError(String(e && e.message ? e.message : 'AI 调用失败'))
    } finally {
      setLoading(false)
    }
  }

  const importJson = async () => {
    try {
      const clean = (txt) => {
        const t = String(txt || '')
        const fence = t.match(/```[a-zA-Z0-9]*\n([\s\S]*?)```/)
        const body = fence ? fence[1] : t
        try { JSON.parse(body); return body } catch {}
        const i = body.indexOf('{')
        const j = body.lastIndexOf('}')
        if (i >= 0 && j > i) {
          const mid = body.slice(i, j + 1)
          try { JSON.parse(mid); return mid } catch {}
        }
        return body
      }
      const cleaned = clean(output)
      try {
        const obj = JSON.parse(cleaned)
        if (!obj.type) {
          obj.type = obj.workflow ? 'flowpilot/workflow-export' : (obj.items ? 'flowpilot/folder-export' : undefined)
        }
        if (!obj.version) obj.version = '1'
        const finalText = JSON.stringify(obj, null, 2)
        const ok = await configService.importAutoFromText(finalText, Number(targetTab) || 0)
        if (ok) {
          systemService.showNotification('导入成功')
          onClose && onClose()
        } else {
          setError('导入失败：格式不正确或类型不支持')
        }
      } catch {
        const ok = await configService.importAutoFromText(cleaned, Number(targetTab) || 0)
        if (ok) {
          systemService.showNotification('导入成功')
          onClose && onClose()
        } else {
          setError('导入失败：无法解析 JSON')
        }
      }
    } catch {
      setError('导入时发生错误')
    }
  }

  const tryRun = async () => {
    try {
      if (!preview || !preview.raw) {
        setError('无法试运行：未识别到有效 JSON')
        return
      }
      const obj = preview.raw
      const type = preview.type
      if (type === 'flowpilot/workflow-export' && obj.workflow) {
        await workflowService.execute(obj.workflow, {})
        systemService.showNotification('试运行完成')
      } else if (type === 'flowpilot/folder-export' && Array.isArray(obj.items)) {
        const collect = []
        const walk = (n) => {
          if (!n) return
          if (Array.isArray(n)) { n.forEach(walk); return }
          if (n.type === 'workflow') collect.push(n)
          if (n.type === 'folder') (n.items || []).forEach(walk)
        }
        walk(obj.items)
        const wf = collect[0]
        if (wf) {
          await workflowService.execute(wf, {})
          systemService.showNotification('试运行完成')
        } else {
          setError('文件夹中未找到可运行的工作流')
        }
      } else {
        setError('无法试运行：类型不支持')
      }
    } catch (e) {
      systemService.showNotification(e.message || '试运行失败')
    }
  }

  return (
    <Drawer title="AI 工作流助手" placement="right" width={480} onClose={onClose} open={open}>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {models.length > 0 && (
          <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Typography.Text>选择模型</Typography.Text>
            <div style={{ flex: 1 }}>
              <Select style={{ width: '100%' }} value={model} onChange={(v) => setModel(v)} options={models.map(m => ({ label: `${m.label}（成本:${m.cost}）`, value: m.id }))} />
            </div>
          </div>
        )}
        {error && <Alert type="error" message={error} />}
        {!error && output && (
          <Alert type="success" message="已收到 AI 输出，可直接导入或复制" />
        )}
        <Typography.Text>
          输入你的意图或需求，AI 将生成可导入的工作流 JSON。
        </Typography.Text>
        <Input.TextArea rows={6} value={input} onChange={(e) => setInput(e.target.value)} placeholder="例如：下载指定 URL 并保存到桌面，然后弹窗展示结果" />
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Typography.Text>示例意图</Typography.Text>
          <div style={{ flex: 1 }}>
            <Select style={{ width: '100%' }} value={preset} onChange={(v) => { setPreset(v); setInput(v) }} options={[
              { label: '下载 URL 并保存到桌面', value: '下载指定 URL 并保存到桌面，然后弹窗展示文件路径，提供运行/仅复制命令两种入口' },
              { label: '复制本机 IPv4', value: '获取本机所有 IPv4 并以可点击复制的列表弹窗展示，忽略 169.254 开头，置顶常规地址' },
              { label: '编辑文本文件', value: '选择一个文本文件后用系统编辑器打开，支持从匹配指令 files 触发，编辑器命令按平台选择' }
            ]} />
          </div>
        </div>
        <Space>
          <Button type="primary" icon={<SendOutlined />} loading={loading} onClick={callAI}>生成</Button>
          <Button disabled={!loading} onClick={abortStream}>中止</Button>
        </Space>
        <Typography.Title level={5}>AI 输出</Typography.Title>
        <Input.TextArea rows={12} value={output} onChange={(e) => setOutput(e.target.value)} placeholder="AI 将在此输出 JSON，支持手工修订后导入" />
        <Space wrap>
          <Button disabled={!preview} onClick={tryRun}>试运行</Button>
          <Button disabled={!output} onClick={() => systemService.writeClipboard(output)}>复制输出</Button>
          <Space.Compact>
            <Select style={{ minWidth: 50 }} disabled={!output} value={String(targetTab)} onChange={(v) => setTargetTab(v)} options={(configService.getTabs() || []).map((t, i) => ({ label: `${t.name}`, value: String(i) }))} />
            <Button type="primary" disabled={!output} onClick={importJson}>导入所选标签页</Button>
          </Space.Compact>
        </Space>
        
        {preview && (
          <>
            <Divider />
            <Typography.Title level={5}>预览摘要</Typography.Title>
            <Typography.Paragraph>
              识别类型：{preview.type || '未知'}
            </Typography.Paragraph>
            <Typography.Paragraph>
              工作流：{preview.names && preview.names.length ? preview.names.join('，') : '无'}
            </Typography.Paragraph>
          </>
        )}
      </Space>
    </Drawer>
  )
}
