# 显示弹窗（ShowModal）

- 类型：`action`
- 场景：展示运行结果、渲染 Markdown/HTML 说明、放置快捷操作链接。

## 配置
- `title`：弹窗标题，支持模板。
- `content`（必填）：正文内容，支持模板。
- `contentType`：`text`（默认，自动转义换行） / `html`（会净化） / `markdown`（marked+DOMPurify）。
- `customStyles`：可选 CSS 字符串，内联到弹窗内容区域。

## 交互与能力
- 弹窗内点击 `fp:` / `fp://` 链接或 `@api(...)` 文本会通过内置 `callApi` 调用能力。
- 普通链接会在系统浏览器中打开。

## 行为
- 模板解析 -> 内容按类型渲染 -> 弹出 600px 宽的可点遮罩弹窗。
- 空内容会报错中止。

