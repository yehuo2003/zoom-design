# @zoom-design/vue

计划提供适合 Vue 3 项目的原生组件与适配，包括组合式 API、v-model、插槽和生命周期接入。

Task 3 已建立 Vite 库构建、vue-tsc SFC 类型与声明编译、SCSS 显式资产出口，以及原生工程宿主。公共 JS/声明入口保持空导出，`test/fixtures/BuildProbe.vue` 是私有工程探针，不是产品组件 API。

## 工程基线

本包固定 Vue/compiler-sfc/compiler-dom/server-renderer 3.5.44、vue-tsc 3.3.13 和 TypeScript 6.0.3；Node/npm 继承根配置。局部工具命令与兼容例外见[工程基线](../../docs/engineering/baseline.md)，本轮范围见[Vue 工程报告](../../docs/engineering/task3-vue-report.md)。

在根目录执行 `npm run build --workspace @zoom-design/vue`、`npm run typecheck --workspace @zoom-design/vue`、`npm run test:unit --workspace @zoom-design/vue` 和 `npm run test:e2e --workspace @zoom-design/vue`。类型检查需要先构建本包及 Task 2 平台声明夹具；它会验证实际编译器路径、SFC 正例、prop/emit 反例和 TS6 声明消费者。

消费方显式导入 `@zoom-design/vue/style.css`，无需 Sass。当前 CSS 只包含工程标记，不能据此认定 Task 6 主题或产品视觉已验收。`apps/vue-smoke` 通过真实公开包名导入产物，另挂载私有探针；`/ssr` 路径用于工程 SSR/水合复验。
