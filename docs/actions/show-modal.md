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

## 暗黑模式适配
- **基础适配**：系统会自动注入基础的暗黑模式样式，确保在深色主题下文字清晰可见。
- **自定义适配**：
  - 支持使用 CSS 变量（如 `var(--color-text-primary)`）。
  - 可以通过 CSS 媒体查询覆盖样式：
    ```css
    @media (prefers-color-scheme: dark) {
      /* Dark mode styles */
    }
    ```

