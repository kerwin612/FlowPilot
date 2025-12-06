# 打开链接（OpenLink）

- 类型：`action`
- 作用：解析 URL 模板并在系统默认浏览器打开。

## 可配字段
- `url`：链接模板（支持 `{{ }}` 变量）

## 示例
- `https://example.com/{{executors[0].result.value.id}}`

