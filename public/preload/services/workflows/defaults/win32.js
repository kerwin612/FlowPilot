module.exports = [
    {
      id: 'tab_demo',
      name: '示例',
      items: [
        {
          type: 'workflow',
          id: 'demo-open-home',
          name: '打开主目录',
          mode: 'composed',
          iconType: 'builtin',
          iconKey: 'HomeOutlined',
          iconColor: '#1890ff',
          executors: [
            {
              key: 'command',
              enabled: true,
              config: { 
                template: 'explorer %USERPROFILE%',
                runInBackground: true
              }
            }
          ],
          actions: []
        },
        {
          type: 'workflow',
          id: 'demo-github-link',
          name: '打开 GitHub',
          mode: 'composed',
          iconType: 'builtin',
          iconKey: 'GithubOutlined',
          iconColor: '#722ed1',
          executors: [],
          actions: [
            {
              key: 'open-link',
              enabled: true,
              config: { url: 'https://github.com' }
            }
          ]
        },
        {
          type: 'workflow',
          id: 'demo-copy-timestamp',
          name: '复制当前时间戳',
          mode: 'composed',
          iconType: 'builtin',
          iconKey: 'ClockCircleOutlined',
          iconColor: '#fa8c16',
          entryTriggers: [
            { label: 'YYYY-DD-MM', value: '1', enabled: true },
            { label: 'YYYY-DD-MM HH:mm:SS', value: '2', enabled: true },
            { label: 'YYYY/DD/MM', value: '3', enabled: true },
            { label: 'YYYY/DD/MM HH:mm:SS', value: '4', enabled: true },
            { label: '十位时间戳', value: '5', enabled: true },
            { label: '十三位时间戳', value: '6', enabled: true }
          ],
          feature: {
            enabled: true,
            code: 'wf-copy-timestamp',
            explain: '快速复制当前时间戳（支持多种格式）',
            cmds: ['时间戳', '复制时间戳', 'timestamp'],
            mainHide: true
          },
          executors: [
            {
              key: 'js-script',
              enabled: true,
              config: {
                code: `(context) => {
  const val = String(context.trigger.entryMenuValue || '');
  const ts13 = Date.now();
  const ts10 = Math.floor(ts13 / 1000);
  const d = new Date(ts13);
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const HH = pad(d.getHours());
  const MM = pad(d.getMinutes());
  const SS = pad(d.getSeconds());

  const fmt1 = yyyy + '-' + dd + '-' + mm;
  const fmt2 = yyyy + '-' + dd + '-' + mm + ' ' + HH + ':' + MM + ':' + SS;
  const fmt3 = yyyy + '/' + dd + '/' + mm;
  const fmt4 = yyyy + '/' + dd + '/' + mm + ' ' + HH + ':' + MM + ':' + SS;

  let output = fmt2;
  if (val === '1') output = fmt1;
  else if (val === '2') output = fmt2;
  else if (val === '3') output = fmt3;
  else if (val === '4') output = fmt4;
  else if (val === '5') output = String(ts10);
  else if (val === '6') output = String(ts13);

  return { value: { scriptResult: output, ts10, ts13, fmt1, fmt2, fmt3, fmt4 } };
}`
              }
            }
          ],
          actions: [
            {
              key: 'write-clipboard',
              enabled: true,
              config: { 
                text: '{{executors[0].result.value.scriptResult}}' 
              }
            }
          ]
        },
        {
          type: 'workflow',
          id: 'demo-redirect-translate',
          name: '跳转至翻译插件',
          mode: 'composed',
          iconType: 'builtin',
          iconKey: 'TranslationOutlined',
          iconColor: '#13c2c2',
          feature: {
            enabled: true,
            code: 'wf-translate-text',
            explain: '使用翻译插件翻译文本',
            cmds: ['翻译', 'translate'],
            mainHide: false
          },
          executors: [
            {
              key: 'param-builder',
              enabled: true,
              config: {
                cancelable: true,
                params: [
                  { 
                    name: 'text', 
                    label: '要翻译的文本', 
                    type: 'textarea',
                    placeholder: '输入要翻译的文本',
                    default: 'Hello World',
                    required: true 
                  }
                ]
              }
            }
          ],
          actions: [
            {
              key: 'redirect-plugin',
              enabled: true,
              config: {
                labelType: 'single',
                labelName: '翻译',
                pluginName: '',
                featureName: '',
                payload: '{{executors[0].result.value.text}}',
                payloadType: 'text'
              }
            }
          ]
        },
        {
          type: 'workflow',
          id: 'demo-param-cmd',
          name: '记事本打开文件',
          mode: 'composed',
          iconType: 'builtin',
          iconKey: 'FileTextOutlined',
          iconColor: '#52c41a',
          feature: {
            enabled: true,
            code: 'wf-notepad-open-file',
            explain: '使用记事本打开文本/Markdown/JSON 文件',
            cmds: [
              '记事本',
              '打开文本',
              'notepad',
              {
                type: 'files',
                label: '记事本打开',
                fileType: 'file',
                match: '/\\.(?:txt|md|json)$/i',
                minLength: 1,
                maxLength: 10
              }
            ]
          },
          executors: [
            {
              key: 'param-builder',
              enabled: true,
              config: {
                cancelable: true,
                params: [
                  { 
                    name: 'filePath', 
                    label: '文件路径', 
                    type: 'file',
                    placeholder: '选择要打开的文本文件',
                    default: '{{trigger.payload[0].path}}',
                    required: true 
                  }
                ]
              }
            },
            {
              key: 'command',
              enabled: true,
              config: { 
                template: 'notepad {{executors[0].result.value.filePath}}',
                runInBackground: true
              }
            }
          ],
          actions: []
        },
        {
          type: 'folder',
          id: 'folder_advanced',
          name: '高级示例',
          iconType: 'builtin',
          iconKey: 'FolderOutlined',
          iconColor: '#faad14',
          items: [
            {
              type: 'workflow',
              id: 'demo-time-greeting',
              name: '智能问候（按时段）',
              mode: 'composed',
              iconType: 'builtin',
              iconKey: 'SmileOutlined',
              iconColor: '#eb2f96',
              executors: [
                {
                  key: 'js-script',
                  enabled: true,
                  config: {
                    code: `(context) => {
  const d = new Date();
  const hour = d.getHours();
  let period = 'evening';
  if (hour >= 5 && hour < 12) period = 'morning';
  else if (hour >= 12 && hour < 18) period = 'afternoon';
  const pad = (n) => String(n).padStart(2, '0');
  const ts = d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()) + ' ' + pad(hour) + ':' + pad(d.getMinutes());
  return { value: { scriptResult: { hour, period, ts } } };
}`
                  }
                }
              ],
              actions: [
                {
                  key: 'show-modal',
                  enabled: true,
                  condition: { key: 'js-expression', enabled: true, config: { code: "context.executors[0].result.value.scriptResult.period === 'morning'" } },
                  config: { title: '早上好', contentType: 'markdown', content: `现在是 {{executors[0].result.value.scriptResult.ts}}\n\n祝你今天精力充沛 ☕` }
                },
                {
                  key: 'show-modal',
                  enabled: true,
                  condition: { key: 'js-expression', enabled: true, config: { code: "context.executors[0].result.value.scriptResult.period === 'afternoon'" } },
                  config: { title: '下午好', contentType: 'markdown', content: `现在是 {{executors[0].result.value.scriptResult.ts}}\n\n继续保持效率 💪` }
                },
                {
                  key: 'show-modal',
                  enabled: true,
                  condition: { key: 'js-expression', enabled: true, config: { code: "context.executors[0].result.value.scriptResult.period === 'evening'" } },
                  config: { title: '晚上好', contentType: 'markdown', content: `现在是 {{executors[0].result.value.scriptResult.ts}}\n\n注意休息 🌙` }
                }
              ]
            },
            {
              type: 'workflow',
              id: 'demo-file-smart-handler',
              name: '智能处理输入（文件）',
              mode: 'composed',
              iconType: 'builtin',
              iconKey: 'BranchesOutlined',
              iconColor: '#2f54eb',
              feature: {
                enabled: true,
                code: 'wf-smart-file',
                explain: '按文件类型分支：zip→解压、文本→记事本、图片→预览',
                cmds: [
                  {
                    type: 'files',
                    label: '智能处理',
                    fileType: 'file',
                    match: '/.*/',
                    minLength: 1,
                    maxLength: 10
                  }
                ]
              },
              executors: [
                {
                  key: 'js-script',
                  enabled: true,
                  config: {
                    code: `(context) => {
  const files = (context.trigger && context.trigger.payload) || [];
  const first = files[0] || {};
  const path = first.path || '';
  const lower = path.toLowerCase();
  const isZip = /\.(zip|tar\.gz|tgz|rar)$/i.test(lower);
  const isText = /\.(txt|md|json|log)$/i.test(lower);
  const isImage = /\.(png|jpg|jpeg|gif|bmp|svg)$/i.test(lower);
  return { value: { file: path, kind: isZip ? 'zip' : (isText ? 'text' : (isImage ? 'image' : 'other')) } };
}`
                  }
                },
                {
                  key: 'command',
                  enabled: true,
                  condition: { key: 'js-expression', enabled: true, config: { code: "context.executors && context.executors[0] && context.executors[0].result && context.executors[0].result.value && context.executors[0].result.value.kind === 'zip'" } },
                  config: { template: 'tar -xzf {{executors[0].result.value.file}} -C %TEMP%', runInBackground: false, showWindow: false }
                },
                {
                  key: 'command',
                  enabled: true,
                  condition: { key: 'js-expression', enabled: true, config: { code: "context.executors && context.executors[0] && context.executors[0].result && context.executors[0].result.value && context.executors[0].result.value.kind === 'text'" } },
                  config: { template: 'notepad {{executors[0].result.value.file}}', runInBackground: true }
                }
              ],
              actions: [
                {
                  key: 'open-path',
                  enabled: true,
                  condition: { key: 'js-expression', enabled: true, config: { code: "context.executors && context.executors[0] && context.executors[0].result && context.executors[0].result.value && context.executors[0].result.value.kind === 'image'" } },
                  config: { path: '{{executors[0].result.value.file}}' }
                },
                {
                  key: 'show-modal',
                  enabled: true,
                  condition: { key: 'js-expression', enabled: true, config: { code: "context.executors && context.executors[0] && context.executors[0].result && context.executors[0].result.value && context.executors[0].result.value.kind === 'other'" } },
                  config: { title: '暂不支持的文件类型', contentType: 'markdown', content: `文件: {{executors[0].result.value.file}}\n类型: 其他` }
                }
              ]
            },
            
            {
              type: 'workflow',
              id: 'demo-create-file',
              name: '创建文件并打开',
              mode: 'composed',
              iconType: 'builtin',
              iconKey: 'FileAddOutlined',
              iconColor: '#fa541c',
              executors: [
                {
                  key: 'param-builder',
                  enabled: true,
                  config: {
                    cancelable: true,
                    params: [
                      { name: 'targetDir', label: '保存目录', type: 'directory', required: true },
                      { name: 'fileName', label: '文件名', type: 'text', default: 'demo.txt', required: true },
                      { name: 'content', label: '文件内容', type: 'textarea', default: 'Hello World', required: false }
                    ]
                  }
                },
                {
                  key: 'command',
                  enabled: true,
                  config: { 
                    // 仅负责创建与写入文件
                    // 注意：content 中若包含 & | > 等特殊符号可能需要进一步转义，这里为演示版本
                    template: 'cmd /c "chcp 65001>nul && cd /d \"{{executors[0].result.value.targetDir}}\" && (echo {{executors[0].result.value.content}} > \"{{executors[0].result.value.fileName}}\")"',
                    runInBackground: false,
                    showWindow: false
                  }
                }
              ],
              actions: [
                {
                  key: 'open-path',
                  enabled: true,
                  config: { path: '{{executors[0].result.value.targetDir}}\\{{executors[0].result.value.fileName}}' }
                }
              ]
            },
            {
              type: 'workflow',
              id: 'demo-env-vars',
              name: '显示环境变量',
              mode: 'composed',
              iconType: 'builtin',
              iconKey: 'CodeOutlined',
              iconColor: '#13c2c2',
              executors: [
                {
                  key: 'command',
                  enabled: true,
                  config: { 
                    template: 'start cmd /k "echo 用户目录: %USERPROFILE% && echo 当前用户: %USERNAME% && pause"',
                    runInBackground: true
                  }
                }
              ],
              actions: []
            },
            {
              type: 'workflow',
              id: 'demo-disabled-step',
              name: '禁用步骤演示',
              mode: 'composed',
              iconType: 'builtin',
              iconKey: 'StopOutlined',
              iconColor: '#999',
              executors: [
                {
                  key: 'command',
                  enabled: true,
                  config: { 
                    template: 'start cmd /k "echo 第一步执行 && pause"',
                    runInBackground: true
                  }
                },
                {
                  key: 'command',
                  enabled: false,
                  config: { 
                    template: 'echo 这一步被禁用了',
                    runInBackground: false
                  }
                },
                {
                  key: 'command',
                  enabled: true,
                  config: { 
                    template: 'start cmd /k "echo 第三步执行 && pause"',
                    runInBackground: true
                  }
                }
              ],
              actions: []
            },
            {
              type: 'workflow',
              id: 'demo-github-api',
              name: 'GitHub 用户查询',
              mode: 'composed',
              iconType: 'builtin',
              iconKey: 'GithubOutlined',
              iconColor: '#1890ff',
              executors: [
                {
                  key: 'param-builder',
                  enabled: true,
                  config: {
                    cancelable: true,
                    params: [
                      { 
                        name: 'username', 
                        label: 'GitHub 用户名', 
                        type: 'text',
                        placeholder: '例如: torvalds',
                        required: true,
                        default: 'octocat'
                      }
                    ]
                  }
                },
                {
                  key: 'command',
                  enabled: true,
                  config: { 
                    template: 'curl -s -i https://api.github.com/users/{{executors[0].result.value.username}}',
                    runInBackground: false,
                    showWindow: false
                  }
                },
                {
                  key: 'js-script',
                  enabled: true,
                  config: {
                    code: `(context) => {
  // 获取命令执行结果
  const execResult = context.executors[1]?.result?.value?.execResult;
  const cmdOutput = execResult?.result || '';
  
  // 分离响应头和响应体（支持多种换行符）
  const parts = cmdOutput.split(/\\r?\\n\\r?\\n/);
  const body = parts.slice(1).join('\\n\\n').trim();
  
  // 如果响应体为空，返回原始输出用于调试
  if (!body) {
    return {
      error: true,
      message: '响应体为空',
      debug: {
        hasExecResult: !!execResult,
        cmdOutput: cmdOutput.substring(0, 500)
      }
    };
  }
  
  // 解析 JSON 响应体
  let user;
  try {
    user = JSON.parse(body);
  } catch (e) {
    return {
      error: true,
      message: '解析 JSON 失败: ' + e.message,
      debug: {
        body: body.substring(0, 500)
      }
    };
  }
  
  // 检查 API 是否返回错误
  if (user.message && !user.login) {
    return {
      error: true,
      message: 'GitHub API 错误: ' + user.message,
      documentation_url: user.documentation_url
    };
  }
  
  // 格式化用户信息
  return {
    username: user.login || '未知',
    name: user.name || '未设置',
    bio: user.bio || '无简介',
    location: user.location || '未知',
    company: user.company || '未设置',
    blog: user.blog || '无',
    email: user.email || '未公开',
    followers: user.followers || 0,
    following: user.following || 0,
    public_repos: user.public_repos || 0,
    created_at: user.created_at || '未知',
    avatar_url: user.avatar_url || '',
    html_url: user.html_url || ''
  };
}`
                  }
                }
              ],
              actions: [
                {
                  key: 'show-modal',
                  enabled: true,
                  config: {
                    title: 'GitHub 用户信息',
                    contentType: 'markdown',
                    customStyles: `
                      h2 { margin: 12px 0 8px 0; font-size: 20px; }
                      h3 { margin: 12px 0 6px 0; font-size: 16px; }
                      p { margin: 4px 0; }
                      ul { margin: 4px 0; padding-left: 20px; }
                      li { margin: 2px 0; }
                      img { margin: 8px 0; border-radius: 8px; max-width: 150px; }
                      a { color: #1890ff; text-decoration: none; }
                      a:hover { text-decoration: underline; }
                    `,
                    content: `## {{executors[2].result.value.scriptResult.name}} (@{{executors[2].result.value.scriptResult.username}})

![Avatar]({{executors[2].result.value.scriptResult.avatar_url}})

### 基本信息
- **用户名**: {{executors[2].result.value.scriptResult.username}}
- **昵称**: {{executors[2].result.value.scriptResult.name}}
- **简介**: {{executors[2].result.value.scriptResult.bio}}

### 详细资料
- **位置**: {{executors[2].result.value.scriptResult.location}}
- **公司**: {{executors[2].result.value.scriptResult.company}}
- **博客**: {{executors[2].result.value.scriptResult.blog}}
- **邮箱**: {{executors[2].result.value.scriptResult.email}}

### 统计数据
- **公开仓库**: {{executors[2].result.value.scriptResult.public_repos}} 个
- **粉丝**: {{executors[2].result.value.scriptResult.followers}} 人
- **关注**: {{executors[2].result.value.scriptResult.following}} 人
- **注册时间**: {{executors[2].result.value.scriptResult.created_at}}

---
[查看 GitHub 主页]({{executors[2].result.value.scriptResult.html_url}})`
                  }
                }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'tab_tools',
      name: '工具',
      items: [
        {
          type: 'workflow',
          id: 'tool-cmd',
          name: '命令提示符',
          mode: 'composed',
          iconType: 'builtin',
          iconKey: 'CodeOutlined',
          iconColor: '#000000',
          executors: [
            {
              key: 'command',
              enabled: true,
              config: { 
                template: 'start cmd',
                runInBackground: true
              }
            }
          ],
          actions: []
        },
        {
          type: 'workflow',
          id: 'tool-powershell',
          name: 'PowerShell',
          mode: 'composed',
          iconType: 'builtin',
          iconKey: 'ConsoleSqlOutlined',
          iconColor: '#0078d4',
          executors: [
            {
              key: 'command',
              enabled: true,
              config: { 
                template: 'start powershell',
                runInBackground: true
              }
            }
          ],
          actions: []
        },
        {
          type: 'workflow',
          id: 'workflow_http_requester',
          name: 'HTTP Requester',
          mode: 'composed',
          iconType: 'text',
          iconKey: 'ImportOutlined',
          iconColor: '#1890ff',
          executors: [
            {
              id: 'ex_param_builder',
              key: 'param-builder',
              enabled: true,
              config: {
                cancelable: true,
                params: [
                  { name: 'url', label: '接口地址', type: 'text', required: true, placeholder: ' `https://api.example.com/path` ' },
                  { name: 'method', label: 'HTTP 方法', type: 'select', required: true, options: ['GET','POST','PUT','DELETE','PATCH','HEAD','OPTIONS'], default: 'GET' },
                  { name: 'headers', label: '请求头', type: 'key-value', required: false, description: '键：Header 名称；值：Header 值（支持多值）' },
                  { name: 'query', label: '查询参数', type: 'key-value', required: false, description: '键：Query 名称；值：Query 值（支持多值）' },
                  { name: 'authType', label: '认证类型', type: 'select', required: true, options: ['none','bearer','basic'], default: 'none' },
                  { name: 'authToken', label: 'Bearer Token', type: 'text', required: false, visibleWhen: "values.authType==='bearer'" },
                  { name: 'authUser', label: 'Basic 用户名', type: 'text', required: false, visibleWhen: "values.authType==='basic'" },
                  { name: 'authPass', label: 'Basic 密码', type: 'password', required: false, visibleWhen: "values.authType==='basic'" },
                  { name: 'bodyType', label: '请求体类型', type: 'select', required: true, options: ['none','json','text','form','multipart'], default: 'none' },
                  { name: 'bodyJson', label: 'JSON 请求体', type: 'json', required: false, visibleWhen: "values.bodyType==='json'" },
                  { name: 'bodyText', label: '文本请求体', type: 'textarea', required: false, visibleWhen: "values.bodyType==='text'" },
                  { name: 'formData', label: '表单请求体 (x-www-form-urlencoded)', type: 'key-value', required: false, visibleWhen: "values.bodyType==='form'" },
                  { name: 'multipartData', label: 'Multipart 请求体 (文件/文本)', type: 'key-file', required: false, visibleWhen: "values.bodyType==='multipart'", description: '每行一个键，值类型可选“文件/文本”；文件会生成 -F key=@path' },
                  { name: 'followRedirects', label: '跟随重定向 (-L)', type: 'switch', required: false, default: true },
                  { name: 'timeout', label: '总超时 (秒)', type: 'number', required: false },
                  { name: 'connectTimeout', label: '连接超时 (秒)', type: 'number', required: false },
                  { name: 'insecureTLS', label: '忽略证书 (-k)', type: 'switch', required: false },
                  { name: 'proxy', label: '代理 (-x)', type: 'text', required: false },
                  { name: 'prettyJson', label: 'JSON 响应美化显示', type: 'switch', required: false, default: true }
                ]
              }
            },
            {
              id: 'ex_build_curl',
              key: 'js-script',
              enabled: true,
              config: {
                code: "(context) => {\n\tvar v = (context.executors[0] && context.executors[0].result && context.executors[0].result.value) || {};\n\n\tfunction clean(u) {\n\t\treturn String(u || '').replace(/[\\u200b-\\u200d\\uFEFF]/g, '').replace(/[\\u00A0]/g, '').replace(/[\\`\\\"\\']/g, '').replace(/^\\s+|\\s+$/g, '')\n\t}\n\n\tfunction kv(o) {\n\t\tvar r = [];\n\t\tfor (var k in (o || {})) {\n\t\t\tvar val = o[k];\n\t\t\tif (Array.isArray(val)) {\n\t\t\t\tfor (var i = 0; i < val.length; i++) r.push([k, String(val[i])])\n\t\t\t} else if (val && typeof val === 'object' && val.__file__) {\n\t\t\t\tr.push([k, {\n\t\t\t\t\t__file__: String(val.__file__)\n\t\t\t\t}])\n\t\t\t} else if (val != null) {\n\t\t\t\tr.push([k, String(val)])\n\t\t\t}\n\t\t}\n\t\treturn r\n\t}\n\n\tfunction dq(s) {\n\t\treturn '\"' + String(s).replace(/\"/g, '\\\\\"') + '\"'\n\t}\n\tvar url = clean(v.url);\n\tvar method = String(v.method || 'GET').toUpperCase();\n\tvar qPairs = kv(v.query || {}).filter(function(p) {\n\t\treturn typeof p[1] === 'string'\n\t});\n\tvar qs = qPairs.length ? qPairs.map(function(p) {\n\t\treturn encodeURIComponent(p[0]) + '=' + encodeURIComponent(p[1])\n\t}).join('&') : '';\n\tvar finalUrl = qs ? (url + (url.indexOf('?') >= 0 ? '&' : '?') + qs) : url;\n\tvar parts = ['curl', '-i', '-sS', '-X', method, dq(finalUrl)];\n\tif (!!v.followRedirects) parts.push('-L');\n\tvar t = Number(v.timeout || 0) || 0;\n\tif (t > 0) parts.push('--max-time', String(t));\n\tvar ct = Number(v.connectTimeout || 0) || 0;\n\tif (ct > 0) parts.push('--connect-timeout', String(ct));\n\tif (!!v.insecureTLS) parts.push('-k');\n\tvar proxy = String(v.proxy || '').trim();\n\tif (proxy) parts.push('-x', dq(proxy));\n\tvar authType = String(v.authType || 'none');\n\tvar authToken = String(v.authToken || '').trim();\n\tvar authUser = String(v.authUser || '').trim();\n\tvar authPass = String(v.authPass || '');\n\tif (authType === 'basic' && authUser) parts.push('-u', dq(authUser + ':' + authPass));\n\tif (authType === 'bearer' && authToken) parts.push('-H', dq('Authorization: Bearer ' + authToken));\n\tvar headers = v.headers || {};\n\tObject.keys(headers).forEach(function(k) {\n\t\tvar hv = headers[k];\n\t\t(Array.isArray(hv) ? hv : [hv]).forEach(function(x) {\n\t\t\tif (x != null) parts.push('-H', dq(k + ': ' + String(x)))\n\t\t})\n\t});\n\tvar bt = String(v.bodyType || 'none');\n\tif (method !== 'GET' && method !== 'HEAD') {\n\t\tif (bt === 'json') {\n\t\t\tparts.push('-H', dq('Content-Type: application/json'));\n\t\t\tparts.push('--data', dq(JSON.stringify(v.bodyJson || {})))\n\t\t} else if (bt === 'text') {\n\t\t\tparts.push('--data', dq(String(v.bodyText || '')))\n\t\t} else if (bt === 'form') {\n\t\t\tkv(v.formData || {}).filter(function(p) {\n\t\t\t\treturn typeof p[1] === 'string'\n\t\t\t}).forEach(function(p) {\n\t\t\t\tparts.push('--data-urlencode', dq(p[0] + '=' + p[1]))\n\t\t\t});\n\t\t\tparts.push('-H', dq('Content-Type: application/x-www-form-urlencoded'))\n\t\t} else if (bt === 'multipart') {\n\t\t\tkv(v.multipartData || {}).forEach(function(p) {\n\t\t\t\tvar k = p[0],\n\t\t\t\t\tval = p[1];\n\t\t\t\tif (typeof val === 'object' && val.__file__) {\n\t\t\t\t\tparts.push('-F', dq(k + '=@' + val.__file__))\n\t\t\t\t} else {\n\t\t\t\t\tparts.push('-F', dq(k + '=' + val))\n\t\t\t\t}\n\t\t\t})\n\t\t}\n\t}\n\tparts.push('--write-out', dq('__FP_META__:' + '%{http_code}|%{content_type}|%{time_total}|%{size_download}'));\n\tvar curl = parts.join(' ');\n\treturn {\n\t\tvalue: {\n\t\t\tcurl: curl,\n\t\t\tfinalUrl: finalUrl,\n\t\t\tmethod: method,\n\t\t\tprettyJson: !!v.prettyJson\n\t\t}\n\t};\n}"
              }
            },
            {
              id: 'ex_run_curl',
              key: 'command',
              enabled: true,
              config: { template: '{{executors[1].result.value.curl}}', runInBackground: false, showWindow: false },
              condition: { key: 'js-expression', enabled: true, config: { code: "!trigger.entryMenuValue || trigger.entryMenuValue === 'run' || trigger.entryMenuValue === 'copy-body'" } }
            },
            {
              id: 'ex_parse',
              key: 'js-script',
              enabled: true,
              config: {
                code: "(context) => {\n\tvar raw = String((context.executors[2] && context.executors[2].result && context.executors[2].result.value && context.executors[2].result.value.execResult && context.executors[2].result.value.execResult.result) || '');\n\tvar marker = '__FP_META__:';\n\tvar mIdx = raw.lastIndexOf(marker);\n\tvar meta = {\n\t\tcode: '',\n\t\tcontentType: '',\n\t\ttimeTotal: '',\n\t\tsizeDownload: ''\n\t};\n\tvar payload = raw;\n\tif (mIdx >= 0) {\n\t\tvar tail = raw.substring(mIdx + marker.length);\n\t\tvar firstLine = tail.split(/\\r?\\n/)[0] || '';\n\t\tvar toks = firstLine.split('|');\n\t\tmeta = {\n\t\t\tcode: toks[0] || '',\n\t\t\tcontentType: toks[1] || '',\n\t\t\ttimeTotal: toks[2] || '',\n\t\t\tsizeDownload: toks[3] || ''\n\t\t};\n\t\tpayload = raw.substring(0, mIdx);\n\t}\n\n\tfunction splitHeaderBody(s) {\n\t\tvar parts = s.split(/\\r?\\n\\r?\\n/);\n\t\tif (parts.length < 2) return {\n\t\t\theadersText: '',\n\t\t\tbodyText: s\n\t\t};\n\t\tvar bodyText = parts[parts.length - 1];\n\t\tvar headersText = parts.slice(0, parts.length - 1).join('\\n\\n').split(/\\r?\\n\\r?\\n/).slice(-1)[0] || '';\n\t\treturn {\n\t\t\theadersText: headersText,\n\t\t\tbodyText: bodyText\n\t\t};\n\t}\n\tvar hb = splitHeaderBody(payload);\n\n\tfunction parseStatus(t) {\n\t\tvar lines = t.split(/\\r?\\n/).filter(Boolean);\n\t\tvar statusLine = null;\n\t\tfor (var i = lines.length - 1; i >= 0; i--) {\n\t\t\tif (/^HTTP\\//i.test(lines[i])) {\n\t\t\t\tstatusLine = lines[i];\n\t\t\t\tbreak\n\t\t\t}\n\t\t}\n\t\tvar m = statusLine ? statusLine.match(/HTTP\\/\\d+\\.\\d+\\s+(\\d+)/) : null;\n\t\treturn m ? m[1] : ''\n\t}\n\n\tfunction parseHeaders(t) {\n\t\tvar lines = t.split(/\\r?\\n/).filter(Boolean);\n\t\tvar obj = {};\n\t\tfor (var i = 0; i < lines.length; i++) {\n\t\t\tvar line = lines[i];\n\t\t\tif (/^HTTP\\//i.test(line)) continue;\n\t\t\tvar j = line.indexOf(':');\n\t\t\tif (j > 0) {\n\t\t\t\tvar k = line.slice(0, j).trim();\n\t\t\t\tvar v = line.slice(j + 1).trim();\n\t\t\t\tif (obj[k]) {\n\t\t\t\t\tif (Array.isArray(obj[k])) obj[k].push(v);\n\t\t\t\t\telse obj[k] = [obj[k], v];\n\t\t\t\t} else obj[k] = v;\n\t\t\t}\n\t\t}\n\t\treturn obj\n\t}\n\tvar headersObj = parseHeaders(hb.headersText);\n\tif (!meta.code) {\n\t\tmeta.code = parseStatus(hb.headersText) || ''\n\t}\n\tif (!meta.contentType) {\n\t\tmeta.contentType = String(headersObj['Content-Type'] || '')\n\t}\n\tif (!meta.sizeDownload) {\n\t\ttry {\n\t\t\tif (typeof TextEncoder !== 'undefined') {\n\t\t\t\tmeta.sizeDownload = String(new TextEncoder().encode(hb.bodyText).length)\n\t\t\t} else {\n\t\t\t\tmeta.sizeDownload = String(unescape(encodeURIComponent(hb.bodyText)).length)\n\t\t\t}\n\t\t} catch (e) {\n\t\t\tmeta.sizeDownload = ''\n\t\t}\n\t}\n\treturn {\n\t\tvalue: {\n\t\t\tmeta: meta,\n\t\t\theaders: headersObj,\n\t\t\tbody: hb.bodyText\n\t\t}\n\t};\n}"
              }
            }
          ],
          actions: [
            {
              id: 'act_show',
              key: 'show-modal',
              enabled: true,
              config: {
                title: 'HTTP 请求结果',
                contentType: 'markdown',
                content: '## cURL 命令\n```bash\n{{executors[1].result.value.curl}}\n```\n\n## 响应状态\n- URL: {{executors[1].result.value.finalUrl}}\n- 方法: {{executors[1].result.value.method}}\n- 状态码: {{executors[3].result.value.meta.code}}\n- Content-Type: {{executors[3].result.value.meta.contentType}}\n- 耗时: {{executors[3].result.value.meta.timeTotal}}s\n- 下载大小: {{executors[3].result.value.meta.sizeDownload}} bytes\n\n## 响应头\n```json\n{{executors[3].result.value.headers}}\n```\n\n## 响应体\n```text\n{{executors[3].result.value.body}}\n```'
              },
              condition: { key: 'js-expression', enabled: true, config: { code: "!trigger.entryMenuValue || trigger.entryMenuValue === 'run'" } }
            },
            {
              id: 'act_copy_cmd',
              key: 'write-clipboard',
              enabled: true,
              config: { text: '{{executors[1].result.value.curl}}' },
              condition: { key: 'js-expression', enabled: true, config: { code: "!!trigger.entryMenuValue && trigger.entryMenuValue === 'copy'" } }
            },
            {
              id: 'act_copy_body',
              key: 'write-clipboard',
              enabled: true,
              config: { text: '{{executors[3].result.value.body}}' },
              condition: { key: 'js-expression', enabled: true, config: { code: "!!trigger.entryMenuValue && trigger.entryMenuValue === 'copy-body'" } }
            }
          ],
          entryTriggers: [
            { label: '生成并执行 cURL', value: 'run' },
            { label: '仅生成命令 cURL', value: 'copy' },
            { label: '执行后复制响应体', value: 'copy-body' }
          ],
          feature: { enabled: true, code: 'wf-1764053826156-2o2mx', explain: 'HTTP Requester', cmds: ['HTTP Requester'] },
          iconText: 'HTTP',
          updatedAt: 1764054316916
        }
      ]
    }
  ]
