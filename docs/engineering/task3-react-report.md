# Task 3 React 工程验证记录

日期：2026-10-27。范围：`packages/react`、`apps/react-smoke`、React 专用类型/单测/浏览器用例。公共产品 API 仍为空，原生探针不会混入正式 JS 或声明。

## 实现

- React/react-dom 19.3.1、类型 19.3.0、TS 7.0.2、Vite 8.3.5/plugin-react 6.1.2；peer 暂限 `~19.3.1`。React 包和消费宿主显式声明各自运行时、编译器和插件依赖；RTL 的 DOM peer 显式声明。
- `vite.config.ts` 只处理 JS；本地 TS7 分开生成 `dist/types`。`react`、`react-dom` 及各自子路径 external，私有夹具实际生成 `react/jsx-runtime`、`react-dom/client` 和 `react-dom/server` 外部导入。
- 公共入口 `src/index.ts` 保持空导出，声明范围只含 `src`。原生探针使用 JSX、props/state/effect，夹具声明与 JS 另存 `.artifacts/fixtures/react`。
- 共享构建脚本按清理、JS、声明、Sass 顺序生成公开资产；CSS 仅通过 `@zoom-design/react/style.css` 显式导入，`sideEffects: ["**/*.css"]` 保留资产。SCSS 只定义工程自定义属性标记，不代表产品视觉或主题验收。
- React 原生 Vite 宿主先导入真实公共包和 CSS，再挂载 StrictMode 探针；失败时显示错误并保留禁用操作。`src/ssr.ts` 导出 async `render()`，客户端识别 `data-ssr` 后执行 `hydrateRoot`，供共享 `/ssr` 服务复验。

## 已执行验证

环境：Node 26.12.1 / npm 12.2.1，与根 Volta 配置一致。

| 命令 | 结果 |
| --- | --- |
| `npm run build --workspace @zoom-design/react` | 通过，真实 `dist/index.js`、`dist/types/index.d.ts`、`dist/style.css` 存在 |
| `npm run check:fixtures --workspace @zoom-design/react` | 通过：原生 JSX 正例、夹具声明、声明消费精确推断、两个错误 props 的 TS2322 预期失败、Vite 原生 JSX 转换和 runtime external |
| `npm run test:unit --workspace @zoom-design/react` | 通过，1 个 StrictMode 用例：初始值、点击回调、父 props 更新保留 state、卸载 effect 清理；不依赖固定 effect 调用次数 |
| `npm run typecheck --workspace @zoom-design/react-smoke` | 通过，原生宿主 TSX 类型检查 |
| `npm run build --workspace @zoom-design/react-smoke` | 通过，消费公开包与显式 CSS 产物 |
| `node scripts/run-local-bin.mjs --workspace . --package vitest --bin vitest -- run --config tests/engineering/vitest.config.ts tests/engineering/react-contract.spec.ts` | 通过，1 个用例：消费宿主原生 ESM 包解析、空公开 API、真实 CSS、peer 和 sideEffects |

单测先以缺失计数行为验证失败，再实现并复跑通过。构建曾发现 Vite 8 的 `lib.fileName: 'index.js'` 实际输出 `index.js.js`；配置改为 `fileName: () => 'index.js'` 后，公开出口检查通过。RTL 单测曾使用 Playwright 风格 `exact` 参数，TS7 正确拒绝；已改成锚定名称正则。工程测试曾误用 CommonJS 条件解析 ESM-only 包，现改为宿主目录下 Node 原生 ESM 解析，保留正式包的 import-only 合同。

类型工具的解析路径、版本、退出码和正/反例输出保存在 `.artifacts/task3/react-checks.json`；独立 typecheck 时写入 `react-types.json`。

## 浏览器验收与边界

已提供 `e2e/react/engineering.spec.ts` 三个用例，覆盖真实导入后的交互/props/清理/计算样式、破坏公共包导入后的失败门禁，以及服务端原始 HTML、客户端水合、首个服务端节点保留与水合后点击。共享服务器、readiness、根 Playwright 项目和执行入口由主任务集成；本报告此时尚未记录浏览器运行结果，不能据宿主构建成功宣称真实水合通过。

本轮未新增产品组件、主题或后续 Task 4/5 能力。父任务负责安装/锁文件、版本快照、共享构建与服务脚本、整体工程测试和浏览器运行；React 部分没有独立执行安装或修改共享根配置。未执行真实浏览器前，SSR 仅计为可执行最小路径已实现。

## 共享集成最终复验

React独立Chromium3/3及全工作区12/12已实际通过并正常退出，包括StrictMode交互/父prop/卸载、导入失败门禁、HTTP服务端HTML、原节点水合保留及水合后点击。原生类型正反例再次通过。工程回归总计34/34；状态与后续范围见[Task3验收](./task3-acceptance.md)。
