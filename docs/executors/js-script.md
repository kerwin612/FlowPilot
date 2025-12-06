# 脚本执行（JS Script）

- 类型：`executor`
- 场景：格式化前置输出、分支决策、组装批量命令/URL。

## 配置
- `code`（必填）：`(context)=>{}` 或 `async (context)=>{}`，整体支持一次性模板替换。

## 可用上下文
- `context = { workflow, trigger, envs, vars, executors }`。
- 示例：`const out = context.executors[0]?.result?.value?.execResult?.result || ''`。

## 输出（后续引用）
- 返回值写入 `executors[IDX].result.value`。
- 默认包装为 `{ value: { scriptResult: <你的返回> } }`；若直接返回 `{ value: {...} }` 则按原样写入。

## 小贴士
- 支持 async/await，直接抛错即可让流程失败并提示。
- 可结合 `context.envs`、`context.vars` 与模板生成下一步命令或链接。

