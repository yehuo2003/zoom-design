# Task 3 Vue 工程报告

范围仅限 Vue 原生构建、SFC/声明类型验证、私有工程探针与宿主；公共 JS/声明保持空导出，没有提前交付产品组件或 Task 6 主题。

## 实现边界

- `packages/vue`：Vue/compiler-sfc/compiler-dom/server-renderer 3.5.44；vue-tsc 3.3.13 实际调用本包 TypeScript 6.0.3。Vite 8.3.5 + plugin-vue 6.0.10 输出 `dist/index.js`；vue 及子路径 external；vue-tsc 单独生成 `dist/types/index.d.ts`。
- `src/styles/style.scss` 经共享样式构建生成显式 `./style.css` 出口，CSS 被 sideEffects 保留；只有 `--zoom-engineering-built: 1` 工程标记。
- `test/fixtures/BuildProbe.vue` 使用原生 `<script setup lang="ts">`。责任是 label prop 展示、原生点击计数、changed(number)/disposed() 事件。夹具 JS 和声明输出 `.artifacts/fixtures/vue`，不会进入正式 `dist`。
- `apps/vue-smoke/src/ProbeHost.vue` 是很小的探针组合面，管理父级 label、显示/卸载、事件值和清理结果。未引入额外抽象或 composable；逻辑只用于此工程夹具且没有复用/复杂副作用。
- 宿主真实动态导入 `@zoom-design/vue` 成功后才挂载私有探针，显式导入公开 CSS；无源码 aliases。`src/ssr.ts` 暴露 `render()`，客户端识别 `data-ssr="true"` 后使用 createSSRApp 水合，共享服务器负责提供服务端 HTML 和保留节点证据。
- 宿主自己声明 Vue/server-renderer 运行时及 Vite/SFC/TS6 编译依赖。额外显式声明的 `@types/node` 使用根基线已有版本 26.6.5，用于 server-renderer 的 node:stream 类型；不增加新版本。

## 已执行验证

| 命令 | 结果 |
| --- | --- |
| `npm run build --workspace @zoom-design/vue` | 通过；JS、独立声明、SCSS→CSS 均生成 |
| `npm run typecheck --workspace @zoom-design/vue` | 通过；实际 vue-tsc/TS6 路径、SFC 正例、Vite SFC 夹具、独立 TS6 声明消费者均通过 |
| 类型检查中的 Invalid.vue 反例 | Vite 成功生成该错误夹具 JS；vue-tsc 预期退出 2，同时确认数字 label 和字符串 changed payload 恰好两个错误；JS 转换成功不会替代类型检查 |
| `npm run test:unit --workspace @zoom-design/vue` | 1/1 通过；父 prop 更新、点击/emit、卸载清理 |
| `node scripts/run-local-bin.mjs --workspace . --package vitest --bin vitest -- run --config tests/engineering/vitest.config.ts tests/engineering/vue-contract.spec.ts` | 2/2 通过；公开出口、CSS、Node 空导入与深层导入封锁 |
| `npm run build --workspace @zoom-design/vue-smoke` | 通过；消费真实 JS/CSS 产物 |
| `node scripts/run-vue-tsc.mjs --workspace packages/vue -- --project ../../apps/vue-smoke/tsconfig.json --noEmit` | 通过；宿主源码用本包 TS6 检查 |
| `npm run typecheck --workspace @zoom-design/vue-smoke` | 通过；根依赖安装后由宿主实际解析自己的 TS6 |
| `node scripts/check-vue-ssr.mjs` | 通过；实际 Vite SSR 模块和 Vue server-renderer 生成私有 SFC 的 Initial/count0 HTML |

`scripts/check-vue.mjs` 将编译器解析路径、各次状态和反例诊断写入 `.artifacts/task3/vue-checks.json`。TS6 声明消费者从已编译 `.vue.d.ts` 推断 label 和 changed 事件；另消费 Task 2 的 TS7 Core/DOM 夹具声明，保留 `skipLibCheck=false`，并以 `@ts-expect-error` 检查参数约束没有变成 any。

## 待共享集成复验

根依赖安装前，宿主独立 typecheck 正确拒绝意外解析的根 TS7；父任务安装宿主声明的 TS6 后，独立 typecheck 已复验通过。`e2e/vue/native.spec.ts` 提供三个 Chromium 检查：交互/prop/卸载/CSS、真实包导入失败的门禁，以及服务端 markup + 同节点水合后交互。共享服务器与 Playwright 项目集成由父任务运行，当前不据 server-renderer 的 HTML 检查记录浏览器水合或开发 watch 验收通过。

## 共享集成最终复验

上述待集成检查现已执行：Vue独立Chromium3/3，全工作区12/12，真实HTTP服务端HTML、水合同节点保留及交互通过。5171真实预览的样式重建、错误源码停服和受管SIGINT清理通过。最终复核修复了平台声明夹具的命令顺序依赖：Vue检查主动使用根TS7生成声明；移走旧夹具目录后独立运行仍通过。工程回归总计34/34，完整边界及物理按键限制见[Task3验收](./task3-acceptance.md)。
