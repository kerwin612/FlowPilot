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
          const preferred = (ms || []).find((m) => /json|structured|schema/i.test((m.label || '') + (m.id || ''))) || (ms || []).find((m) => !/reasoning|deepseek\-r1|r1/i.test((m.id || '') + (m.label || ''))) || (ms || [])[0]
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
      `目标: 严格生成 FlowPilot 可导入的 JSON（仅 JSON 文本，无解释，不需要\`\`\`json\`\`\`包裹）`,
      `输出类型: flowpilot/workflow-export 或 flowpilot/folder-export`,
      `规范: 必须可被 JSON.parse 直接解析`,
      `维度: 功能、交互（entryTriggers、param-builder）、集成（executors/actions）按需组合，如果需要使用命令执行器并获取其执行结果时，要给命令执行器配置为禁止后台执行并且不显示执行窗口（如果平台是windows则能使用powershell完成的就不要直接使用cmd去执行），如果命令带有参数请先使用脚本执行器拼凑好最终需要执行的命令再交由命令执行器执行，避免出现命令格式化问题`,
      `建议: 复杂工作流建议拆分的足够明细，每个执行器功能单一且清晰，能交由纯JS脚本处理的逻辑尽量用 js-script 执行器完成，避免复杂命令行，推荐多执行器协作完成复杂任务`,
      `注意：使用模板读取变量时请注意模板解析仅作值读取，不支持复杂运算，如有复杂逻辑请在脚本执行器中处理，所以能有脚本执行器处理的逻辑尽量都由脚本执行器完成`,
    ].join('\n')
    const refs = (examples.examples || []).slice(0, 4).map((e, i) => `示例${i+1}(${e.type}):\n${e.json}`).join('\n\n')
    const currentRefsSrc = (typeof window !== 'undefined' && window.fpGetCurrentConfigExports ? window.fpGetCurrentConfigExports({ limit: 4 }) : { examples: [] })
    const refs2 = (currentRefsSrc.examples || []).map((e, i) => `当前示例${i+1}(${e.type}):\n${e.json}`).join('\n\n')
    const schema = [
      `结构要求:`,
      `A) flowpilot/workflow-export:`,
      `{"type":"flowpilot/workflow-export","version":"1","workflow":{"id":"wf_${Date.now()}","name":"...","mode":"normal","iconType":"text","iconText":"⚙","iconColor":"#3f51b5","executors":[{"key":"command","enabled":true,"config":{}}],"actions":[{"key":"show-modal","enabled":true,"config":{}}],"entryTriggers":[{"key":"manual","config":{}}],"feature":{}}}`,
      `B) flowpilot/folder-export:`,
      `{"type":"flowpilot/folder-export","version":"1","name":"...","items":[{"type":"workflow","id":"wf_${Date.now()}","name":"...","executors":[],"actions":[]}],"envVars":[],"globalVars":[]}`
    ].join('\n')
    const rules = [
      `生成规则:`,
      `- 必须使用json输出`,
      `- 不得包含除json代码外的任何文本`,
      `- 键: id/name/mode/iconType/iconKey/iconColor/executors/actions/entryTriggers/feature，按需给出`,
      `- 目标工作流需要输入时，先给出 param-builder`,
      `- 命令/路径必须按平台 ${platform} 选择`,
      `- json中的js务必采取格式化的字符串形式输出，便于用户二次编辑`,
      `- 禁止使用 require/import 等 Node 模块语法；脚本执行器仅支持纯 JS 运算与 context 访问`,
      `- 涉及系统信息/网络/文件等能力时，优先使用 command 执行平台命令`,
      `- 跨执行器读取使用: context.executors[IDX]?.result?.value`,
      `- 读取命令标准输出使用: context.executors[IDX]?.result?.value?.execResult?.result`,
      `- 进行字符串处理前统一: String(...||'') 再 split(/\\r?\\n/)`,
      `- 禁止使用未约定路径: executors[IDX].result.output/stdout/data 等`
    ].join('\n')
    return {
      platform,
      rules,
      assistantGuide: `${guide}`,
      assistantSchema: schema,
      assistantRefs: refs,
      assistantCurrentRefs: refs2,
      userIntent: input
    }
  }, [input, examples])

  const cleanText = (txt) => {
    const t = String(txt || '')
    const fence = t.match(/```json\n([\s\S]*?)```/) || t.match(/```[a-zA-Z0-9]*\n([\s\S]*?)```/)
    const body = fence ? fence[1] : t
    const i = body.indexOf('{')
    const j = body.lastIndexOf('}')
    if (i >= 0 && j > i) return body.slice(i, j + 1)
    return body
  }

  const tryParseStrict = (txt) => {
    const c = cleanText(txt)
    try { return JSON.parse(c) } catch { return null }
  }

  const inferType = (obj) => obj?.type || (obj?.workflow ? 'flowpilot/workflow-export' : (obj?.items ? 'flowpilot/folder-export' : ''))

  const validateExport = (obj) => {
    const t = inferType(obj)
    if (t === 'flowpilot/workflow-export') {
      if (!obj.workflow || typeof obj.workflow !== 'object') return false
      const wf = obj.workflow
      if (!(wf.name || wf.id)) return false
      if (!Array.isArray(wf.executors) || !Array.isArray(wf.actions)) return false
      const badScript = (wf.executors || []).some((ex) => ex && ex.key === 'js-script' && typeof ex.config?.code === 'string' && /\b(require|import)\b/.test(ex.config.code))
      if (badScript) return false
      return true
    }
    if (t === 'flowpilot/folder-export') {
      if (!Array.isArray(obj.items)) return false
      const hasBadScript = (() => {
        let bad = false
        const walk = (n) => {
          if (bad) return
          if (!n) return
          if (Array.isArray(n)) { n.forEach(walk); return }
          if (n.type === 'workflow') {
            const exs = n.executors || []
            if (exs.some((ex) => ex && ex.key === 'js-script' && typeof ex.config?.code === 'string' && /\b(require|import)\b/.test(ex.config.code))) { bad = true }
          }
          if (n.type === 'folder') (n.items || []).forEach(walk)
        }
        walk(obj.items)
        return bad
      })()
      if (hasBadScript) return false
      return true
    }
    return false
  }

  const normalizeExport = (obj) => {
    const t = inferType(obj)
    if (t === 'flowpilot/workflow-export') {
      const wf = obj.workflow || {}
      obj.type = 'flowpilot/workflow-export'
      obj.version = obj.version || '1'
      wf.id = wf.id || `workflow_${Date.now()}`
      wf.executors = Array.isArray(wf.executors) ? wf.executors : []
      wf.actions = Array.isArray(wf.actions) ? wf.actions : []
      wf.entryTriggers = Array.isArray(wf.entryTriggers) ? wf.entryTriggers : []
      obj.workflow = wf
      return { type: obj.type, obj }
    }
    if (t === 'flowpilot/folder-export') {
      obj.type = 'flowpilot/folder-export'
      obj.version = obj.version || '1'
      obj.items = Array.isArray(obj.items) ? obj.items : []
      return { type: obj.type, obj }
    }
    return { type: '', obj }
  }

  useEffect(() => {
    const parsed = tryParseStrict(output)
    if (!parsed) { setPreview(null); return }
    if (!validateExport(parsed)) { 
      setPreview(null); 
      setError('生成的输出无法解析为有效工作流格式，请检查输入或切换模型重试。')
      return;
    }
    const norm = normalizeExport(parsed)
    const names = []
    if (norm.type === 'flowpilot/workflow-export' && norm.obj.workflow) names.push(norm.obj.workflow.name || norm.obj.workflow.id)
    if (norm.type === 'flowpilot/folder-export' && Array.isArray(norm.obj.items)) {
      const walk = (n) => {
        if (!n) return
        if (Array.isArray(n)) { n.forEach(walk); return }
        if (n.type === 'workflow') names.push(n.name || n.id)
        if (n.type === 'folder') (n.items || []).forEach(walk)
      }
      walk(norm.obj.items)
    }
    setPreview({ type: norm.type, names, raw: norm.obj })
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
        { role: 'system', content: '你是 FlowPilot 工作流生成助手，仅输出严格可解析且可导入的 JSON。' },
        { role: 'assistant', content: `平台信息\n${prompt.platform}` },
        { role: 'assistant', content: `输出规则\n${prompt.rules}` },
        { role: 'assistant', content: `格式与规则\n${prompt.assistantGuide}\n\n${prompt.assistantSchema}\n\n${prompt.assistantCurrentRefs ? '当前配置参考\n' + prompt.assistantCurrentRefs : ''}` },
        { role: 'assistant', content: '如需了解执行器/动作配置、输出字段或引用方式，先调用工具 fpListManuals/fpGetManualDetail 获取手册信息。' },
        { role: 'assistant', content: `示例参考\n${prompt.assistantRefs}` },
        { role: 'user', content: prompt.userIntent }
      ]
      const tools = [
        { type: 'function', function: { name: 'fpGetPlatformType', description: '获取当前平台类型', parameters: { type: 'object', properties: {} } } },
        { type: 'function', function: { name: 'fpGetDefaultWorkflowExamples', description: '获取默认示例工作流导出JSON，供参考', parameters: { type: 'object', properties: { limit: { type: 'number' } } } } },
        { type: 'function', function: { name: 'fpGetCurrentConfigExports', description: '获取当前配置中的工作流/文件夹导出示例', parameters: { type: 'object', properties: { limit: { type: 'number' } } } } },
        {
          type: 'function',
          function: {
            name: 'fpListManuals',
            description: '列出可用手册（执行器/动作），包含 key/title/summary，用于选择手册 key',
            parameters: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['executor', 'action'] },
                keyword: { type: 'string' }
              }
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'fpGetManualDetail',
            description: '按 key 获取手册详情，含字段、输出读取方式、示例等',
            parameters: {
              type: 'object',
              properties: {
                key: { type: 'string' },
                sections: { type: 'array', items: { type: 'string' } }
              },
              required: ['key']
            }
          }
        }
      ]
      const aiOption = { model: model || undefined, messages, tools }
      const res = systemService.ai(aiOption, (delta) => {
        const chunk = (delta && (delta.content)) || ''
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
      if (!preview && output) {
        setError('生成的输出无法解析为有效 JSON，请检查输入或切换模型重试')
      }
    }
  }

  const copyToClipboard = async () => {
    try {
      const parsed = tryParseStrict(output)
      if (!parsed || !validateExport(parsed)) { setError('导入失败：JSON 无效或结构不符合要求'); return }
      const norm = normalizeExport(parsed)
      const finalText = JSON.stringify(norm.obj, null, 2)
      const ok = await systemService.writeClipboard(finalText)
      if (ok) {
        systemService.showNotification('已复制到剪贴板')
      } else {
        setError('复制到剪贴板失败')
      }
    } catch {
      setError('复制到剪贴板失败')
    }
  }

  const importJson = async () => {
    try {
      const parsed = tryParseStrict(output)
      if (!parsed || !validateExport(parsed)) { setError('导入失败：JSON 无效或结构不符合要求'); return }
      const norm = normalizeExport(parsed)
      const finalText = JSON.stringify(norm.obj, null, 2)
      const ok = await configService.importAutoFromText(finalText, Number(targetTab) || 0)
      if (ok) {
        systemService.showNotification('导入成功')
        onClose && onClose()
      } else {
        setError('导入失败：格式不正确或类型不支持')
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
      const scriptForbidden = () => {
        const containsBad = (wf) => (wf.executors || []).some((ex) => ex && ex.key === 'js-script' && typeof ex.config?.code === 'string' && /\b(require|import)\b/.test(ex.config.code))
        if (type === 'flowpilot/workflow-export' && obj.workflow) return containsBad(obj.workflow)
        if (type === 'flowpilot/folder-export' && Array.isArray(obj.items)) {
          let bad = false
          const walk = (n) => {
            if (bad) return
            if (!n) return
            if (Array.isArray(n)) { n.forEach(walk); return }
            if (n.type === 'workflow' && containsBad(n)) { bad = true; return }
            if (n.type === 'folder') (n.items || []).forEach(walk)
          }
          walk(obj.items)
          return bad
        }
        return false
      }
      if (scriptForbidden()) { setError('试运行阻止：生成的脚本包含 require/import，不被支持，请重新生成为 command 方案'); return }
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
        <Alert type="warning" message="AI 生成仅供参考，使用时请自行验证和调整" />
        {models.length > 0 && (
          <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Typography.Text>选择模型</Typography.Text>
            <div style={{ flex: 1 }}>
              <Select style={{ width: '100%' }} value={model} onChange={(v) => setModel(v)} options={models.map(m => ({ label: `${m.label}（成本:${m.cost}）`, value: m.id }))} />
            </div>
          </div>
        )}
        <Typography.Text>
          输入你的意图或需求，AI 将生成可导入的工作流 JSON。
        </Typography.Text>
        <Input.TextArea rows={6} value={input} onChange={(e) => setInput(e.target.value)} placeholder="例如：下载指定 URL 并保存到桌面，然后弹窗展示结果" />
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Typography.Text>示例意图</Typography.Text>
          <div style={{ flex: 1 }}>
            <Select style={{ width: '100%' }} value={preset} onChange={(v) => { setPreset(v); setInput(v) }} options={[
              { label: '一键打开本机硬件信息', value: '生成一个工作流点击即可打开本机硬件信息页面' },
            ]} />
          </div>
        </div>
        <Space>
          <Button type="primary" icon={<SendOutlined />} loading={loading} onClick={callAI}>生成</Button>
          <Button disabled={!loading} onClick={abortStream}>中止</Button>
        </Space>
        {error && <Alert type="error" message={error} />}
        {!error && output && loading &&(
          <Alert type="success" message="AI 正在输出" />
        )}
        {!error && output && !loading &&(
          <Alert type="success" message="AI 输出完毕，可直接导入或复制" />
        )}
        <Typography.Title level={5}>AI 输出</Typography.Title>
        <Input.TextArea rows={12} value={output} onChange={(e) => setOutput(e.target.value)} placeholder="AI 将在此输出 JSON，支持手工修订后导入" />
        <Space wrap>
          <Button disabled={!preview} onClick={tryRun}>试运行</Button>
          <Button disabled={!preview || !output} onClick={copyToClipboard}>复制输出</Button>
          <Space.Compact>
            <Select style={{ minWidth: 50 }} disabled={!preview || !output} value={String(targetTab)} onChange={(v) => setTargetTab(v)} options={(configService.getTabs() || []).map((t, i) => ({ label: `${t.name}`, value: String(i) }))} />
            <Button type="primary" disabled={!preview || !output} onClick={importJson}>导入所选标签页</Button>
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
