const manuals = [
  {
    key: 'command',
    type: 'executor',
    title: '命令执行（Command）',
    description: '解析模板生成系统命令并执行，支持变量注入和结果引用。',
    summary: '生成并运行系统命令，输出 execResult，可后台或展示窗口。',
    content: {
      overview: '用于批量处理、集成 CLI 或打开程序；命令模板支持 {{}} 变量。',
      scenarios: [
        { title: '批量处理', desc: '批量对文件执行命令，如重命名、转码。' },
        { title: '集成外部工具', desc: '通过 CLI 调用第三方工具。' },
        { title: '快速启动', desc: '一键打开目录/应用。' }
      ],
      fields: [
        { name: 'template', label: '命令模板', required: true, desc: '支持 {{}} 变量。' },
        { name: 'runInBackground', label: '后台运行', desc: '适合长任务或 GUI。' },
        { name: 'showWindow', label: '显示窗口', desc: '便于查看输出/报错。' }
      ],
      examples: [
        { title: '调用脚本', code: 'python {{vars.scriptPath}}' },
        { title: '引用前置输出', code: '{{executors[0].result.value.execResult.result}}' }
      ],
      tips: [
        { text: '输出：executors[IDX].result.value.execResult，含 success/result/stdout/stderr/code；命令原文在 command。' },
        { text: '可组合 {{envs.*}} / {{vars.*}} / {{trigger.*}}。' },
        { text: '高危命令会提示但不阻止执行。' }
      ]
    }
  },
  {
    key: 'param-builder',
    type: 'executor',
    title: '参数收集（ParamBuilder）',
    description: '弹窗收集用户输入，支持多类型字段与模板默认值。',
    summary: '弹窗收集参数并合并默认值/上一步结果，输出对象。',
    content: {
      overview: '运行前获取用户输入，支持多字段类型与模板默认值。',
      scenarios: [
        { title: '批量处理', desc: '收集多个路径/参数后批量执行。' },
        { title: '动态输入', desc: '每次运行让用户输入不同值。' }
      ],
      fields: [
        { name: 'params', label: '参数字段', required: true, desc: 'name/type/label/default/options/required 等。' },
        { name: 'cancelable', label: '可取消', desc: '允许取消；不可取消时关闭返回默认值。' }
      ],
      examples: [
        { title: '文件路径', code: '[{"name":"file","type":"file"}]' }
      ],
      tips: [
        { text: '输出：executors[IDX].result.value 为合并后的对象，如 {{executors[IDX].result.value.file}}。' },
        { text: '数字可设 min/max/step；key-value 输出对象；file 输出路径或 { __file__ }。' }
      ]
    }
  },
  {
    key: 'env-patch',
    type: 'executor',
    title: '环境变量变更（EnvPatch）',
    description: '动态注入、修改、删除环境变量，供后续步骤使用。',
    summary: '设置/删除 envs，输出 patch/removed，并同步更新 context.envs。',
    content: {
      overview: '切换环境或注入临时变量；支持模板。',
      scenarios: [
        { title: '多环境切换', desc: '根据参数切换 API/Token。' },
        { title: '临时注入', desc: '运行前注入敏感变量。' }
      ],
      fields: [
        { name: 'entries', label: '变量变更', required: true, desc: '数组：name/value/op(set|remove)。' }
      ],
      examples: [{ title: '切换 API', code: '[{"op":"set","key":"API_URL","value":"https://api.example.com"}]' }],
      tips: [
        { text: '输出：executors[IDX].result.value = { patch, removed }；context.envs 已更新，可直接 {{envs.KEY}}。' },
        { text: 'remove 未找到不会报错。' }
      ]
    }
  },
  {
    key: 'js-script',
    type: 'executor',
    title: '脚本执行（JS Script）',
    description: '运行用户自定义的 JavaScript 逻辑，读取上下文并输出结果。',
    summary: '执行 (async) JS，默认输出 scriptResult，可自定义 value。',
    content: {
      overview: '读取 context（workflow/trigger/envs/vars/executors），做计算/分支/组装。',
      scenarios: [
        { title: '格式化输出', desc: '将命令结果转成结构化数据或文本。' },
        { title: '分支决策', desc: '根据条件决定后续动作。' },
        { title: '数据组装', desc: '拼装模板、生成批量命令/URL 等。' }
      ],
      fields: [{ name: 'code', label: '脚本代码', required: true, desc: '整体支持模板替换；(async) (context)=>{}' }],
      examples: [
        { title: '读取命令输出', code: 'const out = context.executors[0]?.result?.value?.execResult?.result || "";\nreturn { scriptResult: out.trim() };' }
      ],
      tips: [
        { text: '输出：默认包装为 { value: { scriptResult: ... } }；若返回 { value: {...} } 则按原样写入。' },
        { text: '支持 async/await；抛错会中止并提示。' }
      ]
    }
  },
  {
    key: 'open-link',
    type: 'action',
    title: '打开链接（OpenLink）',
    description: '解析 URL 模板并在系统默认浏览器打开。',
    summary: '模板生成 URL，默认浏览器打开。',
    content: {
      overview: '在默认浏览器打开动态 URL（详情页、搜索等）。',
      fields: [{ name: 'url', label: '链接模板', required: true, desc: '支持 {{}} 变量。' }],
      examples: [
        { title: '详情页', code: 'https://example.com/{{executors[0].result.value.id}}' },
        { title: '搜索', code: 'https://www.google.com/search?q={{vars.keyword}}' }
      ],
      tips: [{ text: '行为：解析模板后调用系统默认浏览器打开。' }]
    }
  },
  {
    key: 'open-path',
    type: 'action',
    title: '打开路径（OpenPath）',
    description: '打开文件或目录。',
    summary: '模板生成路径，调用系统打开文件/目录。',
    content: {
      overview: '快速打开文件/文件夹、构建产物或日志目录。',
      fields: [{ name: 'path', label: '路径模板', required: true, desc: '支持 {{}} 变量。' }],
      examples: [
        { title: '产物目录', code: '{{executors[0].result.value.outputPath}}' },
        { title: '下载目录', code: '{{envs.HOME}}/Downloads' }
      ],
      tips: [{ text: '行为：解析模板后调用系统打开文件/目录。' }]
    }
  },
  {
    key: 'page-app',
    type: 'action',
    title: '页面应用（PageApp）',
    description: '在独立窗口承载自定义页面。',
    summary: '创建窗口加载自定义页面（split/full/file）。',
    content: {
      overview: '创建 BrowserWindow，加载 split/full/file 模式内容，注入 trigger/context。',
      fields: [
        { name: 'mode', label: '模式', desc: 'split/full/file' },
        { name: 'html/css/js|fullHtml|htmlFilePath', label: '内容', desc: '根据模式提供片段/完整 HTML/文件路径。' },
        { name: 'width/height/fullscreen', label: '窗口尺寸', desc: '支持全屏或指定宽高。' },
        { name: 'allowPopups/resizable/frameless/devTools', label: '窗口行为', desc: '弹窗/缩放/无边框/调试等。' }
      ],
      examples: [{ title: '默认模板', code: '<div id="app"></div>' }],
      tips: [{ text: '行为：无结构化返回，创建窗口并加载内容。' }]
    }
  },
  {
    key: 'redirect-plugin',
    type: 'action',
    title: '跳转插件（RedirectPlugin）',
    description: '将流程跳转到其他插件或指令。',
    summary: '构造 label/payload 调用 redirect，跳转到其他插件指令。',
    content: {
      overview: '把当前结果交给另一插件/指令处理，或调起已有能力。',
      fields: [
        { name: 'labelType', label: '跳转方式', desc: 'single 或 precise' },
        { name: 'labelName/pluginName/featureName', label: '目标', desc: '指令名，或插件名+指令名' },
        { name: 'payloadType', label: '数据类型', desc: 'none/text/json' },
        { name: 'payload', label: '数据内容', desc: '模板文本或 JSON 字符串' }
      ],
      examples: [{ title: '文本跳转', code: 'labelType=single, labelName=翻译, payloadType=text, payload=Hello' }],
      tips: [{ text: '行为：调用 systemService.redirect，成功/失败弹提示。' }]
    }
  },
  {
    key: 'browser',
    type: 'action',
    title: '内置浏览器（Browser / ubrowser）',
    description: '在内置浏览器中打开链接或执行自动化步骤。',
    summary: '解析 JSON 配置，执行 ubrowser 步骤。',
    content: {
      overview: '解析 JSON 配置后执行 ubrowser 步骤序列。',
      fields: [
        { name: 'json', label: 'JSON 配置', required: true, desc: '包含 url/headers/steps/options，支持模板。' }
      ],
      examples: [{ title: '登录自动化', code: '{"url":"https://example.com/login","steps":[{"action":"wait","value":"#user"}]}' }],
      tips: [{ text: '行为：无结构化返回，按步骤运行；配置错误会报错终止。' }]
    }
  },
  {
    key: 'show-modal',
    type: 'action',
    title: '显示弹窗（ShowModal）',
    description: '弹窗展示文本/HTML/Markdown，可含内置动作链接。',
    summary: '渲染文本/HTML/Markdown 弹窗，支持内置链接。',
    content: {
      overview: '展示运行结果或说明，支持 fp:/@api 链接触发能力。',
      fields: [
        { name: 'title', label: '标题', desc: '支持模板。' },
        { name: 'content', label: '内容', required: true, desc: '支持模板。' },
        { name: 'contentType', label: '类型', desc: 'text/html/markdown。' },
        { name: 'customStyles', label: '自定义样式', desc: '可选 CSS 字符串。' }
      ],
      examples: [{ title: 'Markdown', code: '# Hello\n查看 {{executors[0].result.value.url}}' }],
      tips: [{ text: '行为：无结构化返回，弹窗 600px 宽，可遮罩关闭。' }]
    }
  },
  {
    key: 'write-clipboard',
    type: 'action',
    title: '写入剪贴板（WriteClipboard）',
    description: '将模板解析后的文本写入剪贴板。',
    summary: '解析文本后写入剪贴板并提示。',
    content: {
      overview: '把生成的命令/URL/路径/密码等放入剪贴板。',
      fields: [{ name: 'text', label: '写入文本', required: true, desc: '支持 {{}} 变量。' }],
      examples: [{ title: '复制路径', code: '{{executors[0].result.value.outputPath}}' }],
      tips: [{ text: '行为：无返回值；成功写剪贴板并通知，空文本报错。' }]
    }
  }
]

function listManuals(opts = {}) {
  const { type, keyword } = opts
  const kw = keyword ? String(keyword).toLowerCase() : ''
  return manuals.filter((m) => {
    if (type && m.type !== type) return false
    if (!kw) return true
    return (
      (m.title && m.title.toLowerCase().includes(kw)) ||
      (m.description && m.description.toLowerCase().includes(kw)) ||
      (m.summary && m.summary.toLowerCase().includes(kw)) ||
      (m.overview && m.overview.toLowerCase().includes(kw))
    )
  }).map((m) => ({ key: m.key, type: m.type, title: m.title, summary: m.summary }))
}

function getManualDetail(opts = {}) {
  const { key, sections } = opts
  if (!key) return null
  const m = manuals.find((x) => x.key === key)
  if (!m) return null
  if (!sections || !Array.isArray(sections) || sections.length === 0) return m
  const subset = { key: m.key, type: m.type, title: m.title, summary: m.summary }
  sections.forEach((s) => {
    if (m[s] !== undefined) subset[s] = m[s]
  })
  return subset
}

module.exports = { manuals, listManuals, getManualDetail }
