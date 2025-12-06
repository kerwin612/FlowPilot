# 环境变量变更（EnvPatch）

- 类型：`executor`
- 作用：修改当前工作流上下文的环境变量 `envs`。

## 用法
- 在“执行器”中添加“环境变量变更”，配置设置/移除项。

## 可配字段
- `entries`：数组，每项包含：
  - `name`：变量名（如 `PATH`、`API_TOKEN`）
  - `value`：变量值（`op=set` 时生效，支持模板）
  - `op`：`set` 或 `remove`

## 模板示例
- `{{envs.KEY}}`、`{{vars.NAME}}`、`{{executors[N].result.value.xxx}}`

## 返回值
- `{ value: { patch, removed } }`

