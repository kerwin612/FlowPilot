# FlowPilot 工作流调试指南

本指南介绍如何调试 FlowPilot 工作流，帮助你快速定位和解决执行过程中的问题。

---

## 📖 概述

FlowPilot 提供了三层调试机制：

| 调试方式 | 适用场景 | 特点 |
|---------|----------|------|
| **系统级调试模式** | 查看完整执行流程 | 自动记录所有步骤、无需修改工作流 |
| **🐛 调试日志 Executor** | 检查特定位置的数据 | 灵活插入、支持断点调试 |
| **开发者工具** | 调试 page-app 页面 | 前端调试、查看传递的数据 |

---

## 方法一：系统级调试模式（推荐）

### 功能特性

- ✅ 自动记录每个 executor 和 action 的执行过程
- ✅ 显示输入配置和输出结果
- ✅ 特别优化 command executor 的输出（显示命令原始返回）
- ✅ 工作流执行完成后主窗口保持打开
- ✅ 带时间戳和执行状态标识

### 启用方法

在浏览器控制台（F12）执行：

```javascript
// 启用调试模式
localStorage.setItem('flowpilot_debug', '1')

// 禁用调试模式
localStorage.setItem('flowpilot_debug', '0')
```

启用后刷新页面，确保调试模式生效。

### 日志格式

```
🚀 [0.00s] [我的工作流] 工作流开始
  工作流ID: workflow_xxx
  工作流名称: 我的工作流

⚙️ [0.05s] [我的工作流] Executor #1 开始: param-builder
  启用状态: true
  配置: { params: [...] }

✅ [0.12s] [我的工作流] Executor #1 完成: param-builder
  结果: { value: { key: "value" } }

⚙️ [0.15s] [我的工作流] Executor #2 开始: command
  配置: { template: "curl ...", ... }

✅ [0.45s] [我的工作流] Executor #2 完成: command
  结果: { ... }
  命令输出: [curl 的实际输出内容]

🎬 [0.50s] [我的工作流] Action #1 开始: page-app
  配置: { title: "...", ... }

✅ [0.55s] [我的工作流] Action #1 完成: page-app

🐛 [调试模式] 工作流执行完成，主窗口保持打开以便查看日志
```

### 关键标识说明

- 🚀 **workflow:start** - 工作流开始
- ⚙️ **executor:start** - 执行器开始
- ✅ **executor:end** - 执行器完成
- ❌ **executor:end (失败)** - 执行器失败
- 🎬 **action:start** - 动作器开始
- ⚠️ **workflow:cancel** - 工作流取消
- 🎉 **workflow:end** - 工作流完成

### 使用示例

1. **追踪数据流转**
   - 查看每个 executor 的输出，追踪数据在各步骤间的变化
   - 使用 `executors[N].result.value` 路径访问特定步骤的结果

2. **定位失败步骤**
   - 查找 ❌ 标记，快速定位哪一步出错
   - 查看错误信息和堆栈跟踪

3. **检查命令执行**
   - command executor 会显示命令的原始输出
   - 对比命令输出和预期结果

---

## 方法二：🐛 调试日志 Executor

### 功能描述

专门的调试执行器，可以插入到工作流的任意位置，用于：
- 输出自定义日志消息
- 查看指定路径的数据
- 输出完整的 context 对象
- 使用弹窗断点调试

### 配置选项

| 参数 | 说明 | 示例 |
|------|------|------|
| **message** | 日志消息（支持模板） | `当前步骤完成，值为：{{executors[0].result.value}}` |
| **logLevel** | 日志级别 | `info` / `warn` / `error` / `debug` |
| **contextPath** | 要输出的数据路径 | `executors[2].result.value` |
| **logContext** | 是否输出完整 context | `true` / `false` |
| **showModal** | 是否弹窗显示（阻塞） | `true` / `false` |

### 使用示例

#### 示例 1：检查特定步骤的输出

```json
{
  "key": "debug-logger",
  "name": "检查API返回",
  "config": {
    "message": "API 请求完成",
    "logLevel": "info",
    "contextPath": "executors[2].result.value.data"
  }
}
```

控制台输出：
```
[Debug Logger] API 请求完成
[Debug Logger] 数据路径: executors[2].result.value.data
  Value: { items: [...], total: 100 }
  Type: object
  JSON: { "items": [...], "total": 100 }
```

#### 示例 2：使用弹窗断点

```json
{
  "key": "debug-logger",
  "name": "断点：检查解析结果",
  "config": {
    "message": "解析后的数据结构",
    "contextPath": "executors[3].result.value",
    "showModal": true
  }
}
```

执行到此步骤时会弹窗显示数据，点击"继续执行"后才会继续。

### 常用数据路径

```javascript
// 访问第 N 个 executor 的结果（N 从 0 开始）
executors[N].result.value

// 访问嵌套属性
executors[0].result.value.data.items

// 访问数组元素
executors[0].result.value.items[0]

// 访问环境变量
envs.MY_API_KEY

// 访问触发器数据
trigger.payload
trigger.userParams

// 访问全局变量
vars.MY_VAR
```

---

## 方法三：使用开发者工具（适用于 page-app）

### 调试 page-app 窗口

1. **启用 devTools 选项**
   在 page-app 配置中设置 `"devTools": true`

2. **手动打开控制台**
   page-app 窗口打开后，按 F12 打开开发者工具

3. **查看传递的数据**
   ```javascript
   // 查看完整 payload
   console.log(window.__PAYLOAD__)
   
   // 查看 context
   console.log(window.__PAYLOAD__.context)
   
   // 查看 executors 的结果
   console.log(window.__PAYLOAD__.context.executors)
   ```

### 在 page-app 的 JS 中添加调试代码

```javascript
(() => {
  const payload = window.__PAYLOAD__ || {};
  const ctx = payload.context || {};
  const ex = ctx.executors || [];
  
  // 调试输出
  console.group('调试信息');
  console.log('executors 数量:', ex.length);
  console.log('完整 context:', ctx);
  console.groupEnd();
  
  // 检查特定数据
  const data = ex[2]?.result?.value;
  if (!data) {
    console.error('❌ 第3个 executor 没有返回数据');
    // 显示错误提示
    document.body.innerHTML = '<div style="padding:20px">数据加载失败</div>';
    return;
  }
  
  console.log('✅ 数据正常:', data);
  
  // 继续正常逻辑...
})();
```

---

## 常见问题诊断

### 问题 1：工作流执行但没有预期结果

**可能原因**：
- 某个 executor 的输出格式与预期不符
- 条件判断导致某些步骤被跳过
- 模板变量路径错误

**诊断方法**：
1. 开启系统级调试模式
2. 查看每个 executor 的输出
3. 检查是否有步骤被跳过（enabled: false 或条件不满足）
4. 验证模板变量路径是否正确

### 问题 2：command executor 执行失败

**可能原因**：
- 命令语法错误
- 环境变量未设置
- 权限不足
- 命令不存在

**诊断方法**：
1. 开启调试模式，查看"命令输出"
2. 在终端手动执行命令验证
3. 检查模板变量是否正确解析
4. 确认必要的环境变量已设置

### 问题 3：page-app 显示空白或数据为空

**可能原因**：
- executors 传递的数据为空
- JS 代码中数据路径错误
- 数据格式不符合预期

**诊断方法**：
1. 在 page-app 配置中设置 `"devTools": true`
2. 打开开发者工具查看控制台
3. 检查 `window.__PAYLOAD__.context.executors`
4. 在 JS 代码开头添加调试输出
5. 对比实际数据结构和代码中使用的路径

### 问题 4：解析外部 API 数据失败

**可能原因**：
- API 返回格式已改变
- 响应不是有效的 JSON
- 网络请求失败

**诊断方法**：
1. 使用 command executor 执行 curl 命令
2. 查看原始响应内容
3. 验证 JSON 格式是否正确
4. 对比旧的和新的响应格式
5. 调整解析逻辑以适配新格式

---

## 最佳实践

### 1. 分段调试

遇到复杂问题时，逐步启用步骤：

```json
{
  "executors": [
    { "id": "step1", "enabled": true },
    { "id": "step2", "enabled": true },
    { "id": "step3", "enabled": false },  // 先禁用后续步骤
    { "id": "step4", "enabled": false }
  ]
}
```

确认前面步骤正常后，再逐步启用后续步骤。

### 2. 关键位置插入调试日志

在数据转换、解析等关键位置插入调试日志：

```json
{
  "executors": [
    { "id": "fetch_data", "key": "command", "name": "获取数据" },
    { 
      "id": "debug_raw", 
      "key": "debug-logger", 
      "name": "调试：查看原始数据",
      "config": {
        "message": "原始响应",
        "contextPath": "executors[0].result.value"
      }
    },
    { "id": "parse_data", "key": "js-script", "name": "解析数据" },
    { 
      "id": "debug_parsed", 
      "key": "debug-logger", 
      "name": "调试：查看解析结果",
      "config": {
        "message": "解析完成",
        "contextPath": "executors[2].result.value"
      }
    }
  ]
}
```

### 3. 使用条件断点

只在特定情况下启用调试输出：

```json
{
  "key": "debug-logger",
  "condition": {
    "key": "js-expression",
    "enabled": true,
    "config": {
      "code": "!context.executors[0].result.value || context.executors[0].result.value.length === 0"
    }
  },
  "config": {
    "message": "数据为空！",
    "logLevel": "error",
    "showModal": true
  }
}
```

### 4. 保留调试步骤但禁用

完成调试后，不要删除调试步骤，而是禁用它们：

```json
{
  "key": "debug-logger",
  "enabled": false,  // 禁用但保留
  "config": { ... }
}
```

这样遇到同类问题时可以快速重新启用。

---

## 调试技巧速查表

| 需求 | 方法 | 操作 |
|------|------|------|
| 查看完整执行流程 | 系统级调试模式 | `localStorage.setItem('flowpilot_debug', '1')` |
| 检查特定数据 | 调试日志 Executor | 插入 debug-logger 并设置 contextPath |
| 暂停查看数据 | 弹窗断点 | debug-logger 设置 `showModal: true` |
| 调试命令执行 | 查看命令输出 | 开启调试模式，查找"命令输出:" |
| 调试 page-app | 开发者工具 | 设置 `devTools: true` 或手动按 F12 |
| 验证条件判断 | 查看执行日志 | 观察哪些步骤被跳过 |
| 追踪数据流转 | 多处插入日志 | 在关键位置插入 debug-logger |

---

## 附录：数据访问路径参考

### Context 对象结构

```javascript
{
  workflow: {
    id: "workflow_xxx",
    name: "工作流名称",
    mode: "composed"
  },
  trigger: {
    code: "feature-code",    // 动态指令触发时
    type: "files",            // 触发类型
    payload: "...",           // 触发数据
    manual: true,             // 手动触发标识
    userParams: {},           // 用户参数
    filePath: "..."           // 文件路径（如果有）
  },
  envs: {
    // 环境变量
    PATH: "...",
    MY_API_KEY: "..."
  },
  vars: {
    // 全局变量
    MY_VAR: "value"
  },
  executors: [
    {
      key: "param-builder",
      result: {
        enabled: true,
        value: { ... }
      }
    },
    {
      key: "command",
      result: {
        enabled: true,
        value: {
          command: "...",
          execResult: {
            result: "命令输出",
            error: "",
            exitCode: 0
          }
        }
      }
    }
  ]
}
```

### 常用访问模式

```javascript
// Executor 结果
{{executors[N].result.value}}

// 嵌套对象
{{executors[0].result.value.data.items}}

// 数组元素
{{executors[0].result.value.items[0].name}}

// 命令执行结果
{{executors[1].result.value.execResult.result}}

// 环境变量
{{envs.API_KEY}}

// 触发器数据
{{trigger.payload}}

// 条件表达式（js-expression）
context.executors[0].result.value.status === 'success'
```

---

## 获取帮助

- 查看 [官方文档](../README.md)
- 查看各模块的专门文档：
  - [Executors 文档](executors/)
  - [Actions 文档](actions/)
- 在 GitHub 提交 Issue


### 1. 在工作流中添加调试步骤

在工作流编辑器中，在你想要查看数据的位置插入"🐛 调试日志" executor：

```json
{
  "id": "debug_check_curl",
  "key": "debug-logger",
  "name": "查看curl返回",
  "enabled": true,
  "config": {
    "message": "Curl执行完成",
    "logLevel": "info",
    "showModal": false,
    "logContext": false,
    "contextPath": "executors[2].result.value.execResult.result"
  }
}
```

### 2. 配置选项说明

- **message**：日志消息（支持模板语法 `{{...}}`）
- **logLevel**：日志级别（info/warn/error/debug）
- **showModal**：是否弹窗显示（会阻塞执行，方便逐步调试）
- **logContext**：是否输出完整的 context 对象
- **contextPath**：指定要输出的数据路径（如 `executors[2].result.value`）

### 3. 常用路径示例

```javascript
// 查看第1个executor的结果
executors[0].result.value

// 查看第2个executor的命令执行结果
executors[1].result.value.execResult.result

// 查看第3个executor返回的完整结果
executors[2].result

// 查看环境变量
envs.MIFY_HOST

// 查看触发数据
trigger.payload
```

---

## 附：开发者工具快捷键

- **Chrome/Edge**：F12 或 Ctrl+Shift+I
- **macOS**：Cmd+Option+I
- **控制台过滤**：输入 `[DEBUG]` 或 `工作流` 过滤相关日志
