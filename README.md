# FlowPilot（指令流）

本项目是一个基于 React + Vite 的 uTools 动态指令工作流插件，支持多平台（Windows、Linux、macOS）配置，完全对齐 uTools 官方 API。

## 功能特性
- 动态指令（cmds）支持：string、files、regex、over 四种类型
- 工作流编辑器：可视化编辑指令、参数、动作、图标
- 平台适配：自动加载 win32、linux、darwin 默认配置

## 目录结构
```
├── public/
│   ├── plugin.json         # uTools 插件配置
│   └── preload/            # 预加载服务与核心逻辑
├── src/
│   ├── App.jsx             # 应用入口
│   ├── Home/               # 工作流主界面与组件
├── package.json            # 项目依赖
├── vite.config.js          # Vite 配置
```

## 文档
- 详细配置与使用手册：`docs/README.md`
- 执行器、动作器、条件的模块化说明均在 `docs/` 目录下


## 快速开始
1. 安装依赖：
   ```bash
   npm install
   ```
2. 启动开发环境：
   ```bash
   npm run dev
   ```
3. 构建生产包：
   ```bash
   npm run build
   ```

## 主要技术栈
- React 19
- Vite 6
- Ant Design
- uTools API

## 贡献与开发
- 代码风格遵循 ESLint + Prettier
- 欢迎提交 Issue 或 PR

## 微信交流群
![微信交流群](./wechat.png)

## License
Apache-2.0 license
