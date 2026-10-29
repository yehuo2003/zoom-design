# @zoom-design/react

计划提供适合 React 项目的原生组件与适配，包括受控状态、事件、children 和生命周期接入。

Task 3 已建立原生构建、类型检查、单测和私有宿主。公共 JS/声明入口保持空导出；工程探针只位于 `test/fixtures`，不作为产品组件发布。

## 工程基线

本包使用 React/react-dom 19.3.1、类型 19.3.0、TypeScript 7.0.2、Vite 8.3.5 和 plugin-react 6.1.2，Node/npm 继承根配置。peer 暂限本轮验证的 19.3 发行线。

`npm run build --workspace @zoom-design/react` 按顺序生成 `dist/index.js`、`dist/types/index.d.ts`、`dist/style.css` 和 `dist/theme.css`。框架与子路径均为 external。CSS 可通过 `@zoom-design/react/style.css` 或 `@zoom-design/react/theme.css` 显式导入，可选 `theme.scss` 提供 Sass 定制；JS 不自动导入样式。当前尚无 React 产品组件。

`npm run typecheck --workspace @zoom-design/react` 检查原生 JSX、声明消费与预期失败反例；`npm run check:fixtures --workspace @zoom-design/react` 另验证原生 Vite 夹具转换与 runtime external；`npm run test:unit --workspace @zoom-design/react` 执行 StrictMode 交互、props 更新及 effect 清理验证。浏览器命令为 `npm run test:e2e --workspace @zoom-design/react`。

私有宿主为 `apps/react-smoke`，通过公开包名导入实际构建和 CSS 后启用探针，并为共享服务器提供 `/ssr` 的 `renderToString`/`hydrateRoot` 路径。证据和验证边界见 [Task 3 React 报告](../../docs/engineering/task3-react-report.md)。
