# 环境变量变更（EnvPatch）

- 类型：`executor`
- 场景：按环境切换 API/Token，运行前注入临时密钥，清理敏感变量。

## 配置
- `entries`（数组）：
  - `name`：变量名（如 `PATH`、`API_TOKEN`）。
  - `value`：变量值（`op=set` 时生效，支持模板）。
  - `op`：`set` 或 `remove`。

## 模板示例
- `{{envs.KEY}}`、`{{vars.NAME}}`、`{{executors[N].result.value.xxx}}`

## 输出（后续引用）
- 写入 `executors[IDX].result.value`：`{ patch, removed }`。
- 同步更新 `context.envs`，后续可直接用 `{{envs.KEY}}` 读取最新值。

## 注意
- `remove` 仅在变量已存在时删除；未找到不会报错。

