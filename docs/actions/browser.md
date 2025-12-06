# 浏览器（Browser / ubrowser）

- 类型：`action`
- 场景：在内置浏览器里打开页面并自动化点击/输入/等待等操作。

## 配置
- `json`（必填）：JSON 字符串，支持模板。常用字段：
	- `url`：入口地址（必填）。
	- `headers`/`timeout`/`viewport`/`useragent`/`device`：浏览器初始化参数。
	- `steps`：自动化步骤数组，action 参考 uTools ubrowser（如 `wait`、`click`、`value`、`press`、`scroll`、`file`、`evaluate`、`end` 等）。
	- `options`：`width`、`height` 等窗口参数。

## 示例
```json
{
	"url": "https://example.com/login",
	"steps": [
		{ "action": "wait", "value": "#user" },
		{ "action": "value", "value": "#user", "input": "{{vars.username}}" },
		{ "action": "value", "value": "#pass", "input": "{{vars.password}}" },
		{ "action": "click", "value": "button[type=submit]" },
		{ "action": "wait", "value": 800 },
		{ "action": "end" }
	],
	"options": { "width": 1200, "height": 800 }
}
```

## 行为
- 解析模板 -> 解析 JSON -> 调用内置 ubrowser 执行步骤并返回 ubrowser 结果。
- 配置错误或 JSON 解析失败会直接报错终止。

