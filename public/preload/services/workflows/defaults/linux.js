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
          executors: [],
          actions: [
            {
              key: 'open-path',
              enabled: true,
              config: { path: '~' }
            }
          ]
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
          id: 'demo-param-cmd',
          name: '编辑文件',
          mode: 'composed',
          iconType: 'builtin',
          iconKey: 'FileTextOutlined',
          iconColor: '#52c41a',
          feature: {
            enabled: true,
            code: 'wf-editor-open-file',
            explain: '使用文本编辑器打开文本/Markdown/JSON 文件',
            cmds: [
              '编辑文件',
              '打开文本',
              'text edit',
              {
                type: 'files',
                label: '编辑器打开',
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
                  { name: 'filePath', label: '文件路径', type: 'file', default: '{{trigger.payload[0].path}}', required: true }
                ]
              }
            },
            {
              key: 'command',
              enabled: true,
              config: { 
                template: 'gedit {{executor[0].result.value.filePath}}' 
              }
            }
          ],
          actions: []
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
                text: '{{executor[0].result.value.scriptResult}}' 
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
                payload: '{{executor[0].result.value.text}}',
                payloadType: 'text'
              }
            }
          ]
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
                  config: { title: '早上好', contentType: 'markdown', content: `现在是 {{executor[0].result.value.scriptResult.ts}}\n\n祝你今天精力充沛 ☕` }
                },
                {
                  key: 'show-modal',
                  enabled: true,
                  condition: { key: 'js-expression', enabled: true, config: { code: "context.executors[0].result.value.scriptResult.period === 'afternoon'" } },
                  config: { title: '下午好', contentType: 'markdown', content: `现在是 {{executor[0].result.value.scriptResult.ts}}\n\n继续保持效率 💪` }
                },
                {
                  key: 'show-modal',
                  enabled: true,
                  condition: { key: 'js-expression', enabled: true, config: { code: "context.executors[0].result.value.scriptResult.period === 'evening'" } },
                  config: { title: '晚上好', contentType: 'markdown', content: `现在是 {{executor[0].result.value.scriptResult.ts}}\n\n注意休息 🌙` }
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
                explain: '按文件类型分支：zip→解压、文本→编辑器、图片→预览',
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
                }
              ],
              executors: [
                {
                  key: 'command',
                  enabled: true,
                  condition: { key: 'js-expression', enabled: true, config: { code: "context.executors && context.executors[0] && context.executors[0].result && context.executors[0].result.value && context.executors[0].result.value.scriptResult && context.executors[0].result.value.scriptResult.kind === 'zip'" } },
                  config: { template: 'tar -xzf {{executor[0].result.value.file}} -C ~/Downloads' }
                },
                {
                  key: 'command',
                  enabled: true,
                  condition: { key: 'js-expression', enabled: true, config: { code: "context.executors && context.executors[0] && context.executors[0].result && context.executors[0].result.value && context.executors[0].result.value.scriptResult && context.executors[0].result.value.scriptResult.kind === 'text'" } },
                  config: { template: 'gedit {{executor[0].result.value.file}}' }
                }
              ],
              actions: [
                {
                  key: 'open-path',
                  enabled: true,
                  condition: { key: 'js-expression', enabled: true, config: { code: "context.executors && context.executors[0] && context.executors[0].result && context.executors[0].result.value && context.executors[0].result.value.scriptResult && context.executors[0].result.value.scriptResult.kind === 'image'" } },
                  config: { path: '{{executor[0].result.value.file}}' }
                },
                {
                  key: 'show-modal',
                  enabled: true,
                  condition: { key: 'js-expression', enabled: true, config: { code: "context.executors[0].result.value.scriptResult.kind === 'other'" } },
                  config: { title: '暂不支持的文件类型', contentType: 'markdown', content: `文件: {{executor[0].result.value.file}}\n类型: 其他` }
                }
              ]
            },
            
            {
              type: 'workflow',
              id: 'demo-extract',
              name: '解压文件',
              mode: 'composed',
              iconType: 'builtin',
              iconKey: 'FileZipOutlined',
              iconColor: '#fa8c16',
              executors: [
                {
                  key: 'param-builder',
                  enabled: true,
                  config: {
                    cancelable: true,
                    params: [
                      { name: 'archive', label: '压缩包', type: 'file', required: true },
                      { name: 'dest', label: '解压到', type: 'directory', required: true }
                    ]
                  }
                },
                {
                  key: 'command',
                  enabled: true,
                  config: { 
                    template: 'tar -xzf {{executor[0].result.value.archive}} -C {{executor[0].result.value.dest}}' 
                  }
                }
              ],
              actions: [
                {
                  key: 'open-path',
                  enabled: true,
                  config: { path: '{{executor[0].result.value.dest}}' }
                }
              ]
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
                    template: 'curl -s -i https://api.github.com/users/{{executor[0].result.value.username}}',
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
                    content: `## {{executor[2].result.value.scriptResult.name}} (@{{executor[2].result.value.scriptResult.username}})

![Avatar]({{executor[2].result.value.scriptResult.avatar_url}})

### 基本信息
- **用户名**: {{executor[2].result.value.scriptResult.username}}
- **昵称**: {{executor[2].result.value.scriptResult.name}}
- **简介**: {{executor[2].result.value.scriptResult.bio}}

### 详细资料
- **位置**: {{executor[2].result.value.scriptResult.location}}
- **公司**: {{executor[2].result.value.scriptResult.company}}
- **博客**: {{executor[2].result.value.scriptResult.blog}}
- **邮箱**: {{executor[2].result.value.scriptResult.email}}

### 统计数据
- **公开仓库**: {{executor[2].result.value.scriptResult.public_repos}} 个
- **粉丝**: {{executor[2].result.value.scriptResult.followers}} 人
- **关注**: {{executor[2].result.value.scriptResult.following}} 人
- **注册时间**: {{executor[2].result.value.scriptResult.created_at}}

---
[查看 GitHub 主页]({{executor[2].result.value.scriptResult.html_url}})`
                  }
                }
              ]
            }
          ]
        }
      ]
    }
  ]
