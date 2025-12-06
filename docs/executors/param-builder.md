# 参数收集（ParamBuilder）

- 类型：`executor`
- 场景：运行前交互输入、批量参数收集、把上一步结果补齐成结构化对象。

## 配置
- `params`（数组）：
  - `name`（必填）：参数名；结果对象的键。
  - `label`：显示标签。
  - `type`：`text`、`textarea`、`number`、`password`、`switch`、`radio`、`checkbox`、`select`、`multi-select`、`file`、`directory`、`key-value`、`json`、`key-file`。
  - 选择型 `options`：每行 `值|显示文本` 或纯文本。
  - `required`、`placeholder`、`description`、`default`（支持模板）。
- `cancelable`：允许用户取消（默认允许；不可取消时，关闭弹窗会返回默认值）。

## 模板变量示例
- `{{trigger.payload}}`、`{{trigger.type}}`
- `{{executors[0].result.value.xxx}}`
- `{{envs.PATH}}`、`{{vars.API_URL}}`

## 输出（后续引用）
- 写入 `executors[IDX].result.value`，内容即“用户输入 + 默认值 + 上一步结果合并后”的对象。
- 访问示例：`{{executors[IDX].result.value.file}}`、`{{executors[IDX].result.value.config.api}}`。

## 小贴士
- 数字可设最小/最大/步长，JSON 类型可直接粘贴对象字符串。
- `key-value`/`key-file` 会输出对象；文件类型输出路径或 `{ __file__: path }`。

