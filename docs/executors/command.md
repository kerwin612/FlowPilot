# 命令执行（Command）

- 类型：`executor`
- 作用：解析模板生成系统命令并执行。

## 用法
- 在“执行器”中添加“命令执行”，填写命令模板。
- 从前置执行器结果或环境变量中取值。

## 可配字段
- `template`：命令模板（必填，支持 `{{ }}` 变量）
- `runInBackground`：后台运行（适合打开程序）
- `showWindow`：显示执行窗口

## 模板变量示例
- `{{executors[0].result.value.execResult.result}}`
- `{{envs.PATH}}`、`{{vars.API_URL}}`

## 风险提示
- 检测到如 `rm -rf /`、`sudo rm -rf` 等高危会提示，不阻止执行。

## 返回值
- `{ value: { command, execResult } }`

