# 命令执行（Command）

- 类型：`executor`
- 场景：批量处理（重命名/压缩）、集成 CLI 工具、打开应用/目录。

## 配置
- `template`（必填）：命令模板，支持 `{{ }}` 变量。
- `runInBackground`：后台运行（适合长任务或打开 GUI 程序）。
- `showWindow`：显示终端窗口，便于查看输出/报错。

## 常用模板变量
- 前置执行器：`{{executors[0].result.value.execResult.result}}`
- 环境/全局：`{{envs.PATH}}`、`{{vars.API_URL}}`
- 触发器：`{{trigger.payload[0].path}}`

## 输出（后续引用）
- 写入 `executors[IDX].result.value`：`{ command, execResult }`。
- `execResult` 常见字段：`success`、`result`（stdout 合并）、`stdout`、`stderr`、`code`。

## 示例
- 打开目录：`explorer {{envs.USERPROFILE}}`
- 调 CLI：`python {{vars.scriptPath}} --in {{executors[0].result.value.file}}`

## 风险提示
- 检测到 `rm -rf /`、`sudo rm -rf` 等高危会提示但不会阻止，请自行确认。

