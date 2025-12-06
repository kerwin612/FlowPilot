# 显示弹窗（ShowModal）

- 类型：`action`
- 作用：以文本/HTML/Markdown 渲染弹窗，支持指令链接。

## 可配字段
- `title`：标题
- `content`：内容（支持模板）
- `contentType`：`text`、`html`、`markdown`
- `customStyles`：自定义 CSS（可选）

## 交互
- 支持 `fp:`、`fp://` 链接与 `@api(...)` 文本触发内置能力调用。

