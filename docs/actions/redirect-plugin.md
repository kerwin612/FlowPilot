# 重定向插件（RedirectPlugin）

- 类型：`action`
- 场景：把当前结果交给另一插件/指令处理，或调起已有能力继续后续步骤。

## 配置
- 跳转目标：
	- `labelType=single`：仅填指令名 `labelName`，自动匹配。
	- `labelType=precise`：同时填插件名 `pluginName` 与指令名 `featureName`，精确跳转。
- 传递数据 `payloadType`：
	- `none`：不传参。
	- `text`：文本，支持模板。
	- `json`：JSON 字符串，支持模板，解析失败会报错。
- `payload`：根据类型填写内容。

## 行为
- 模板解析 -> 构造 label/payload -> 调用 `systemService.redirect` 跳转，失败会报错提示；成功时弹出跳转通知。

