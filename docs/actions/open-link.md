# 打开链接（OpenLink）

- 类型：`action`
- 场景：在默认浏览器打开动态 URL（如详情页、搜索结果、跳转到外部工具）。

## 配置
- `url`（必填）：链接模板，支持 `{{ }}` 变量。

## 模板示例
- `https://example.com/{{executors[0].result.value.id}}`
- `https://www.google.com/search?q={{vars.keyword}}`

## 行为
- 解析模板后使用系统默认浏览器打开。

