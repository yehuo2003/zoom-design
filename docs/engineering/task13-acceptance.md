# Task13 Dialog 阶段验收记录

日期：2026-11-05。Task13.1–13.5 已获用户确认；Task13.6 自动验证通过，待用户验收。Task13.7–13.12 未开始。

## Task13.3 DOM 兼容增强

在现有十二个 DOM 运行导出上增加 `RegisteredLayerHandle`、`ModalHandle`、`ManagedModalContext` 三个擦除类型。Layer 节点与 Modal 允许节点可先校验、去重、原位替换；保留旧的 `LayerHandle`、`ModalContext` 与可调用 `Cleanup` 赋值。Modal 同步 `batch` 暂停既有 trap，按最终栈提交隔离和滚动锁，再执行成功 action 的回调并通知最新顶层；异常、嵌套和重入均有回归。旧 trap 恢复时保留仍合法的当前焦点，允许节点更新仅纠正失效焦点。

| 验证 | 结果 |
| --- | --- |
| T13.3.1–T13.3.8 与焦点事件重入 | 9/9 专项测试通过 |
| DOM 全量单测 | 38/38 通过 |
| Vue 相关单测（Select、Combobox、Dialog 等） | 97/97 通过 |
| DOM build、typecheck | 通过 |
| DOM 真实声明 TS6/TS7 正反例及 Node 运行出口 | 工程测试 4/4 通过；十项精确负例 |
| DOM 覆盖率 | statements 94.81%，branches 89.13%，functions 98.96%，lines 99.10%；生产文件逐项门槛通过 |

执行命令：`npm run build --workspace @zoom-design/dom`、`npm run typecheck --workspace @zoom-design/dom`、`npm run test:coverage --workspace @zoom-design/dom`、`npm run test:unit --workspace @zoom-design/vue`、`npm run test:engineering -- tests/engineering/dom-artifacts.spec.ts`。

本阶段未执行 packed 消费、三浏览器 Dialog 组合场景或整项 CI；这些属于后续子任务和综合验收。未执行 Git 提交、推送或发布。

## Task13.4 Vue 私有共享 overlay 会话

为同一 Document 建立按活动需求持有的私有 session，共享 LayerContext 与 ManagedModalContext；通过 Vue setup 的 provide/inject 记录父子 owner，在同一批次按父先子后激活、子先父后释放。Select/Combobox 的弹层登记迁移至共享 owner，内部 z-index 随逻辑层序递增，公开 CSS 变量继续优先覆盖。

| 验证 | 结果 |
| --- | --- |
| T13.4.1–T13.4.8 专项测试 | 8/8 通过 |
| Vue 全量单测与覆盖率 | 105/105 通过；生产文件门禁通过 |
| Vue 覆盖率汇总 | statements 92.09%，branches 90.20%，functions 94.58%，lines 95.91% |
| Vue build、typecheck | 通过 |
| Chromium 独立计算样式检查 | 默认层序与公开 z-index 覆盖通过 |
| Chromium Vue E2E | 逐项输出 76/76 通过；退出阶段未结束，人工中断，汇总 gate 未生成 |

执行命令：`npx vitest run --config vitest.config.ts packages/vue/test/overlay.spec.ts --reporter=verbose`、`npm run test:coverage --workspace @zoom-design/vue`、`npm run build --workspace @zoom-design/vue`、`npm run typecheck --workspace @zoom-design/vue`、`node .artifacts/task13/verify-overlay-z-index.cjs`、`node scripts/e2e.mjs --mode workspace --package vue --browser chromium`。Chromium 逐项结果不能替代未完成的 E2E 门禁。用户已确认验收；Dialog 交互接入仍属后续子任务。未执行 Git 提交、推送或发布。

## Task13.5 受控状态与关闭请求

Dialog 只由 `open` prop 决定实际开关。默认关闭按钮、close 插槽回调、顶层 Escape/outside 共用请求管道，同步发出 `update:open(false)` 后发 `close-request({open:false, previousOpen:true, reason})`；原始 Event 在 Document 会话内去重。layer 只登记 panel，关闭开关由最新归一化 props 判断，禁用顶层请求不会转交下层。DOM layer 在 capture 阶段跟踪 composition 目标，并在 compositionend、目标断连和最后 layer 释放时清理状态。

| 验证 | 结果 |
| --- | --- |
| T13.5.1–T13.5.8 专项测试 | 8/8 通过 |
| DOM / Vue 全量单测 | 39/39、113/113 通过 |
| DOM 覆盖率 | statements 94.79%，branches 88.78%，functions 98.98%，lines 98.86%；生产文件门禁通过 |
| Vue 覆盖率 | statements 92.15%，branches 90.13%，functions 94.75%，lines 96.11%；生产文件门禁通过 |
| DOM / Vue build、typecheck，Vue smoke 类型检查 | 通过 |
| Chromium 行为页面 | 接受、拒绝与异步保存 3/3 通过 |

执行命令：`npm run build --workspace @zoom-design/dom`、`npm run build --workspace @zoom-design/vue`、`npm run typecheck --workspace @zoom-design/dom`、`npm run typecheck --workspace @zoom-design/vue`、`npm run typecheck --workspace @zoom-design/vue-smoke`、`npm run test:coverage --workspace @zoom-design/dom`、`npm run test:coverage --workspace @zoom-design/vue`、`npx playwright test --config tests/engineering/dialog-state/playwright.config.ts`。用户已确认 Task13.5 验收；模态焦点、隔离、滚动锁及 portal 迁移仍属于后续子任务。未执行 Git 提交、推送或发布。

## Task13.6 模态焦点、隔离与生命周期

Dialog 在实际打开周期记录深层 invoker、解析一次 initialFocus，并通过共享 overlay 会话申请 modal/trap；nonmodal 使用相同的初焦优先级。关闭或卸载后按最终活动层协调一次 returnFocus → invoker → 存活父层，generation 使旧返回任务无法作用于新打开周期。modal 原位切换保持 panel/layer 和 invoker；较低层晚启用 modal 时会在同一 DOM batch 内按逻辑层序重排模态资源。背景 inert/aria-hidden 与 body/html 锁沿用 DOM 的精确恢复及嵌套引用。

| 验证 | 结果 |
| --- | --- |
| T13.6.1–T13.6.8 专项测试 | 8/8 通过 |
| Vue 全量单测与覆盖率 | 121/121 通过；生产文件门禁通过 |
| Vue 覆盖率汇总 | statements 91.67%，branches 88.34%，functions 95.26%，lines 96.14% |
| DOM 全量单测 | 39/39 通过 |
| Vue build、typecheck，Vue smoke typecheck | 通过 |
| Chromium 焦点与锁 | 2/2 通过 |
| Chromium Task13.5 受控请求回归 | 3/3 通过 |

执行命令：`npx vitest run --config vitest.config.ts packages/vue/test/dialog-focus.spec.ts --reporter=verbose`、`npm run test:coverage --workspace @zoom-design/vue`、`npm run test:unit --workspace @zoom-design/dom`、`npm run build --workspace @zoom-design/vue`、`npm run typecheck --workspace @zoom-design/vue`、`npm run typecheck --workspace @zoom-design/vue-smoke`、`npx playwright test --config tests/engineering/dialog-focus/playwright.config.ts`、`npx playwright test --config tests/engineering/dialog-state/playwright.config.ts`。并行构建与浏览器测试曾碰到构建清理产物时样式入口短暂不可解析，构建完成后串行重跑两组浏览器测试均通过。Task13.6 待用户验收；嵌套选择浮层与 portal 迁移仍属 Task13.7。未执行 Git 提交、推送或发布。
