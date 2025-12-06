# 参数收集（ParamBuilder）

- 类型：`executor`
- 作用：弹窗收集用户输入，用于后续步骤。

## 用法
- 在配置页面“执行器”中添加“参数收集”。
- 为每个参数填写“参数名”“类型”“必填”“占位/说明”。
- 可设置默认值，支持模板变量。

## 可配字段
- `params`：参数数组，元素包含：
  - `name`：参数名（必填）
  - `label`：显示标签
  - `type`：`text`、`textarea`、`number`、`password`、`switch`、`radio`、`checkbox`、`select`、`multi-select`、`file`、`directory`、`key-value`、`json`、`key-file`
  - `required`：是否必填
  - `placeholder`：占位文本
  - `description`：说明文本
  - `default`：默认值（支持模板）
  - 选择型的 `options`：每行一个，格式 `值|显示文本` 或纯文本
- `cancelable`：允许用户取消（默认允许）

## 模板变量示例
- `{{trigger.payload}}`、`{{trigger.type}}`
- `{{executors[0].result.value.xxx}}`
- `{{envs.PATH}}`、`{{vars.API_URL}}`

## 小贴士
- 数字类型可配置最小值、最大值、步长。
- 新增参数默认展开，便于编辑。

