# 页面应用（PageApp）

- 类型：`action`
- 场景：在独立窗口承载自定义页面（仪表盘、小工具、可视化面板）。

## 配置
- 布局与窗口：`title`、`width`/`height`（或 `fullscreen`）、`alwaysOnTop`、`resizable`、`frameless`、`devTools`、`allowPopups`。
- 模式 `mode`：
	- `split`：分别填写 `html`/`css`/`js` 片段（默认）。
	- `full`：提供 `fullHtml` 完整 HTML。
	- `file`：提供本地 `htmlFilePath`。
- 所有文本字段支持模板，宽高/布尔字段可用字符串形式解析。

## 行为
- 解析模板后创建 BrowserWindow（预载 `page-app/index.cjs`），注入 `{ trigger, context.slim }`，再按模式加载内容。
- 可选打开 DevTools；空内容会按默认模板填充。

