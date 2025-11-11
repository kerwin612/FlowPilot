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
  // 获取当前时间戳（毫秒）
  const timestamp = Date.now();
  // 格式化为可读的日期时间
  const date = new Date(timestamp);
  const formatted = date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  return {
    timestamp: timestamp,
    formatted: formatted,
    iso: date.toISOString()
  };
}`
              }
            }
          ],
          actions: [
            {
              key: 'write-clipboard',
              enabled: true,
              config: { 
                text: '时间戳: {{executor[0].result.value.scriptResult.timestamp}}\n格式化: {{executor[0].result.value.scriptResult.formatted}}\nISO: {{executor[0].result.value.scriptResult.iso}}' 
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
                template: 'notepad {{executor[0].result.value.filePath}}',
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
                    template: 'cmd /c "chcp 65001>nul && cd /d \"{{executor[0].result.value.targetDir}}\" && (echo {{executor[0].result.value.content}} > \"{{executor[0].result.value.fileName}}\")"',
                    runInBackground: false,
                    showWindow: false
                  }
                }
              ],
              actions: [
                {
                  key: 'open-path',
                  enabled: true,
                  config: { path: '{{executor[0].result.value.targetDir}}\\{{executor[0].result.value.fileName}}' }
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
        }
      ]
    }
  ]
