# 脚本执行（JS Script）

- 类型：`executor`
- 作用：以 JS 函数运行脚本逻辑，产出对象。

## 用法
- 在“执行器”中添加“脚本执行”，输入 `(context)=>{}` 或 `async (context)=>{}`。
- 支持一次性模板替换整体代码文本。

## 可配字段
- `code`：脚本代码文本（必填）

## 上下文读取示例
- 读取前置命令输出：
  `String(context.executors[IDX]?.result?.value?.execResult?.result || '')`
- 读写文件：`context.fs.readText(path)`、`context.fs.writeTextAt(path, text)` 等

## 返回值规范
- 返回对象或基本值会被包装：`{ value: { scriptResult: ... } }`
- 若直接返回 `{ value: {...} }` 则保持不变。

