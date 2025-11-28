import { useState, useEffect } from 'react'
import { Input, Switch, Space, Alert } from 'antd'
import AiButton from '../../../../../shared/ui/AiButton'
import { resolveTemplate } from '../../engine/compile'
import { systemService } from '../../../../../services'

// 风险命令检测（提示用，不会阻止执行）
const RISKY_PATTERNS = [
  { key: 'rm-root', re: /\brm\s+-rf\s+\/$/i, hint: 'rm -rf /（删除根目录）' },
  { key: 'sudo-rm', re: /\bsudo\s+rm\s+-rf\b/i, hint: 'sudo rm -rf（提权删除）' },
  {
    key: 'windows-del',
    re: /\bdel\s+(?:[A-Za-z]:\\|\/)\S*/i,
    hint: 'del 驱动器/根路径（Windows）'
  },
  { key: 'format-drive', re: /\bformat\s+[A-Za-z]:/i, hint: 'format 磁盘（Windows）' },
  { key: 'dd-disk', re: /\bdd\s+.*of=\/dev\/sd[a-z]\d*/i, hint: 'dd 写入物理磁盘' },
  { key: 'mkfs', re: /\bmkfs(?:\.\w+)?\s+\/dev\/sd[a-z]\d*/i, hint: 'mkfs 格式化分区' },
  { key: 'fork-bomb', re: /:\s*\(\)\s*{\s*:\s*\|\s*:\s*&\s*}\s*;\s*:/, hint: 'fork bomb（自杀式）' }
]

function detectRisks(template) {
  if (!template || typeof template !== 'string') return []
  const text = template.trim()
  return RISKY_PATTERNS.filter((p) => p.re.test(text)).map((p) => p.hint)
}

const CommandConfig = ({ value = {}, onChange }) => {
  const [template, setTemplate] = useState(value.template || '')
  const [runInBackground, setRunInBackground] = useState(value.runInBackground || false)
  const [showWindow, setShowWindow] = useState(value.showWindow !== false)
  useEffect(() => {
    setTemplate(value.template || '')
  }, [value.template])
  useEffect(() => {
    setRunInBackground(value.runInBackground || false)
  }, [value.runInBackground])
  useEffect(() => {
    setShowWindow(value.showWindow !== false)
  }, [value.showWindow])
  const risky = detectRisks(template)
  const placeholder = '示例: notepad {{executors[0].result.value.file}} · 解析上一命令输出请在脚本中读取 executors[IDX].result.value.execResult.result'
  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      {risky.length > 0 && (
        <Alert
          type="warning"
          showIcon
          message="命令存在潜在高风险"
          description={
            <div>
              <div style={{ marginBottom: 4, color: 'var(--color-text-secondary)', fontSize: 12 }}>
                以下模式被检测到：
              </div>
              <ul style={{ paddingLeft: 18, margin: 0 }}>
                {risky.map((r) => (
                  <li key={r} style={{ fontSize: 12 }}>
                    {r}
                  </li>
                ))}
              </ul>
              <div style={{ marginTop: 6, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                仅提示，不会阻止执行；请谨慎确认命令来源与影响。
              </div>
            </div>
          }
        />
      )}
      <div style={{ position: 'relative' }}>
        <Input.TextArea
          rows={4}
          placeholder={placeholder}
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          onBlur={() => onChange({ ...(value || {}), template })}
        />
        <div style={{ position: 'absolute', right: 8, bottom: 8 }}>
          <AiButton
            placeholder={'请输入所需要的命令功能描述，如果依赖其他参数（比如其他执行器结果）请告知如何取值，提供取值模板'}
            systemPrompt={'你是 FlowPilot 的命令生成助手，仅输出一行命令文本，不做解释，平台为 {{platform}}。'}
            assistantPrompts={[
              '使用模板读取变量时请注意模板仅做变量注入，不做复杂逻辑；跨执行器读取使用 context.executors[IDX]?.result?.value',
              'Windows 平台优先给出 powershell 兼容写法；',
              placeholder
            ]}
            onApply={(txt) => { setTemplate(txt); onChange({ ...(value || {}), template: txt }) }}
            shape={'circle'}
            size={'small'}
          />
        </div>
      </div>
      <Space>
        <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>后台运行:</span>
        <Switch
          size="small"
          checked={runInBackground}
          onChange={(checked) => {
            setRunInBackground(checked)
            onChange({ ...(value || {}), runInBackground: checked })
          }}
        />
        <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
          （启用后不等待命令完成，适合打开程序）
        </span>
      </Space>
      <Space>
        <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>显示执行窗口:</span>
        <Switch
          size="small"
          checked={showWindow}
          onChange={(checked) => {
            setShowWindow(checked)
            onChange({ ...(value || {}), showWindow: checked })
          }}
        />
        <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
          （关闭可避免黑框闪烁；开启可查看过程）
        </span>
      </Space>
    </Space>
  )
}

export const CommandExecutor = {
  key: 'command',
  label: '命令执行',
  getDefaultConfig() {
    return { template: '', runInBackground: false, showWindow: true }
  },
  ConfigComponent: CommandConfig,
  async execute(trigger, context, config, options = {}) {
    const fullContext = context
    const cmd = resolveTemplate(config.template, fullContext)
    if (!cmd.trim()) throw new Error('命令为空')
    const shortcutLike = {
      command: cmd,
      runInBackground: config.runInBackground || false,
      showWindow: config.showWindow !== false,
      env: context?.envs || {}
    }
    const execResult = await systemService.executeCommand(shortcutLike, {})

    // 检查执行结果，如果失败则抛出友好错误
    if (execResult && !execResult.success) {
      const errorMsg = execResult.error || '命令执行失败'
      const details =
        execResult.code === 'ENOENT' ? '（找不到命令或可执行文件，请检查 PATH 环境变量配置）' : ''
      throw new Error(`${errorMsg}${details}`)
    }

    return { value: { command: cmd, execResult } }
  }
}
