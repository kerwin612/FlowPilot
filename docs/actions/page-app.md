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

## 暗黑模式适配
- **窗口背景**：窗口背景色会自动根据当前系统/应用主题设置为深色或浅色，避免加载时的白屏闪烁。
- **样式感知**：在 `page-app:init` 初始化事件的 payload 中包含 `theme` 字段（值为 `"dark"` 或 `"light"`），页面脚本可以读取该字段来动态切换 CSS 类或样式。

