# Task13 Dialog 阶段验收记录

日期：2026-11-05；最近更新：2026-11-09。Task13.1–13.12 均已获用户确认；Task13.12 于 2026-11-09 验收通过。Task14 未启动。

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

执行命令：`npx vitest run --config vitest.config.ts packages/vue/test/dialog-focus.spec.ts --reporter=verbose`、`npm run test:coverage --workspace @zoom-design/vue`、`npm run test:unit --workspace @zoom-design/dom`、`npm run build --workspace @zoom-design/vue`、`npm run typecheck --workspace @zoom-design/vue`、`npm run typecheck --workspace @zoom-design/vue-smoke`、`npx playwright test --config tests/engineering/dialog-focus/playwright.config.ts`、`npx playwright test --config tests/engineering/dialog-state/playwright.config.ts`。并行构建与浏览器测试曾碰到构建清理产物时样式入口短暂不可解析，构建完成后串行重跑两组浏览器测试均通过。用户已确认 Task13.6 验收；嵌套选择浮层与 portal 迁移仍属 Task13.7。未执行 Git 提交、推送或发布。

## Task13.7 嵌套选择组件、混合模态与 Portal

共享 overlay session 按最近的有效 modal owner 收集活动后代节点，跨 nonmodal owner 继续追溯，精确放行实际迁出的 panel/popup，不放行整个共享 host。Dialog 校验外置目标的连通性、同 Document 和自包含关系；初始 inline 后迁移，目标切换或移除时保留 panel/title 身份、层序和合法输入焦点，失效目标回退 inline。Select/Combobox 在迁移期间避免把浏览器的暂时失焦当成业务离焦。组合示例包含选择浮层、IME、两种混合模态、内部 form 与页脚显式 form owner、父层拒绝关闭和共享品牌 host。

| 验证 | 结果 |
| --- | --- |
| T13.7.1–T13.7.7 组合单测 | 8/8 通过，T13.7.4 覆盖两种组合 |
| Vue 全量单测与覆盖率 | 129/129 通过；生产文件门禁通过 |
| Vue 覆盖率汇总 | statements 92.24%，branches 88.54%，functions 95.89%，lines 96.42% |
| DOM 全量单测 | 39/39 通过 |
| Vue build/typecheck，Vue smoke typecheck | 通过 |
| Chromium 组合 E2E | 7/7 通过，含真实点击和 elementFromPoint |
| Task13.5/13.6 Chromium 回归 | 3/3、2/2 通过 |
| pack 工程单测 | 10/10 通过，含合法 npm 嵌套依赖正例 |
| Vue 既有 Chromium E2E | 逐项输出 76/76 通过；退出阶段挂起后人工中断，未生成汇总门禁 |
| Firefox 组合 E2E | 七个用例均在创建页面前报 Target crashed，未验证浏览器行为 |

执行命令：`npx vitest run --reporter=verbose packages/vue/test/dialog-composition.spec.ts`、`npm run test:coverage --workspace @zoom-design/vue`、`npm run test:unit --workspace @zoom-design/dom`、`npx vitest run --reporter=verbose tests/engineering/pack.spec.ts`、`npm run build --workspace @zoom-design/vue`、`npm run typecheck --workspace @zoom-design/vue`、`npm run typecheck --workspace @zoom-design/vue-smoke`、`npx playwright test --config tests/engineering/dialog-composition/playwright.config.ts`、`npx playwright test --config tests/engineering/dialog-state/playwright.config.ts`、`npx playwright test --config tests/engineering/dialog-focus/playwright.config.ts`、`node scripts/e2e.mjs --mode workspace --package vue --browser chromium`。Firefox 在双项目组合配置中创建页面前崩溃；2026-11-06 使用独立空白页再次于 `browser.newPage()` 复现 `Target crashed`，未进入应用页面，不能将其视作组件通过或失败。IME 浏览器事件为合成 composition 自动化，真实系统 IME 尚未手工观察。Task13.7 已于 2026-11-06 获用户验收，未执行 Git 提交、推送或发布。

## Task13.8 真实预览、SSR 与水合

四类 Dialog 预览共用请求本地的路由/query 解析：基础 SSR、受控行为、外观、组合。基础场景只从公开 `/dialog` 入口导入，浏览器按页加载独立 Dialog CSS；组合页额外加载选择组件的公开入口与 CSS。服务端打开态保留真实 inline panel/title/正文，客户端水合后才迁移到合法 host。workspace 与生产静态服务使用同一段服务端节点捕获脚本；packed 消费者接入相同 Dialog SSR 契约。

| 验证 | 结果 |
| --- | --- |
| T13.8.1–T13.8.3 Node SSR 契约 | 通过；无浏览器全局，closed/open、品牌、显式及生成 ID、inline portal、请求隔离 |
| 独立构建的 Vue SSR 产物 | 构建通过，重新导入 emitted `ssr.js` 执行 Dialog SSR 契约通过 |
| 路由解析工程单测 | 2/2 通过 |
| T13.8.1–T13.8.7 Chromium 专项浏览器 | 6/6 通过，包含既有 Select/Combobox SSR 水合回归；server root/panel/title 原节点复用，无 warning，资源数与初焦正确 |
| T13.8.8 开发预览 watch | 7/7 通过：Core/DOM/独立 Dialog SCSS 更新，旧选择组件与 Dialog 预览，失败构建停止旧服务 |
| 既有 Dialog 浏览器回归 | Task13.7 7/7、Task13.5 3/3、Task13.6 2/2 通过 |
| Vue smoke 类型检查、浏览器构建 | 通过 |
| 独立 tarball 消费和 packed 水合 | Task13.10 范围，本阶段未执行；Firefox 浏览器环境仍待复验 |

执行命令：`node scripts/check-vue-ssr.mjs`、`npx vitest run --reporter=verbose tests/engineering/dialog-preview.spec.ts`、`node scripts/check-dialog-preview.mjs`、`npm run typecheck --workspace @zoom-design/vue-smoke`、`npm run build --workspace @zoom-design/vue-smoke`、`node scripts/run-local-bin.mjs --workspace apps/vue-smoke --package vite --bin vite -- build --config vite.config.ts --ssr src/ssr.ts --outDir ../../.artifacts/task13/vue-smoke-server`、`node scripts/check-dev.mjs`，以及三个既有 Dialog 浏览器配置。受限 Windows 宿主拒绝 `taskkill` 时，进程组改用直接终止受管子进程；watch 回归已复跑通过，临时改动已还原。用户于 2026-11-06 确认 Task13.8 验收通过；未执行 Git 提交、推送或发布。

## Task13.9 声明、精确出口、单测与覆盖门禁

状态：已完成，2026-11-07 用户验收通过；专项自动验证 8/8。

| 场景 | 结果 |
| --- | --- |
| T13.9.1 根与 `/dialog` 运行出口 | 通过；`ZDialog` 同一实例，Vue 仅四个批准运行名称，Core 六个、DOM 十二个运行名称精确匹配 |
| T13.9.2 私有深路径 | 通过；源码、overlay、Dialog 内部模块与 `dist` 深路径均被 `exports` 拒绝 |
| T13.9.3 TS6/TS7 真实声明 | 通过；两版 plain TS 正例直接加载 `dist` 声明，Core 14、DOM 15 个公开类型及增量签名匹配，未解析到产品 `src` |
| T13.9.4 vue-tsc SFC | 通过；本地 TS6 编译 root/subpath 组件的 props、事件、五类 slots、close 插槽上下文及 `focus` expose |
| T13.9.5 精确负例 | 通过；TS6、TS7 与 vue-tsc 对原因、readonly、attrs、受控事件、close 插槽参数及未公开实例方法按文件/行/列/TS 代码精确命中；缺模块诊断会拒绝 |
| T13.9.6 产物与失败清理 | 通过；缺 `dialog/index.js`、两项声明或 `dialog/style.css` 及模拟构建失败均拒绝并清理隔离 `dist`；真实 Vue 构建通过 |
| T13.9.7 生产覆盖 | 通过；Vue 汇总四项 92.20%/95.87%/88.51%/96.39%，Dialog/overlay 可执行文件纳入；DOM 汇总四项 94.77%/98.97%/88.79%/98.85%，每文件四项最低 81.33% |
| T13.9.8 既有回归 | 通过；Vue 129/129、DOM 39/39、Core 25/25、工程 136/136、Vue Chromium 76/76 |

执行命令：`npm run build --workspace @zoom-design/vue`、`npm run typecheck --workspace @zoom-design/vue`、`npx vitest run --reporter=verbose tests/engineering/dialog-contract.spec.ts tests/engineering/dialog-build-gate.spec.ts`、`npx vitest run --reporter=verbose tests/engineering/coverage-gate.spec.ts`、`npm run test:coverage --workspace @zoom-design/vue`、`npm run test:coverage --workspace @zoom-design/dom`、`npm run test:unit --workspace @zoom-design/core`、`npm run test:engineering`、`npm run test:e2e --workspace @zoom-design/vue`。首次工程回归有两个旧 Task13.1 夹具行号断言失败；改为复用新的精确公开声明诊断后，单文件 4/4 与全量 136/136 通过。Chromium 的 76 项全部完成后，本次 Vite 服务端口已关闭但进程未退出；只终止该次受管服务进程，随后 Playwright 写出 `results.json` 和 `counts.json`，命令退出码为 0。用户于 2026-11-07 确认 Task13.9 验收通过。独立 tarball、packed 类型/水合及体积属于 Task13.10，本阶段未验证；未执行 Git 提交、推送或发布。

## Task13.10 独立 tarball 消费、最小体积和破坏恢复

状态：已完成，2026-11-09 用户验收通过；开发验证 8/8。打包运行 ID：`de9cbc36-26e6-4e5c-bb0d-8663df783579`。

| 场景 | 开发验证结果 |
| --- | --- |
| T13.10.1 | 五包 tarball 通过 dry-run/pack；四类工作区外消费者 install→ci、公开资源与无链接检查通过 |
| T13.10.2 | packed TS6/TS7 的 Dialog 根/子路径声明和精确负例、Vue SFC 正负例通过；解析仅用安装包声明 |
| T13.10.3 | packed Node/SSR 契约通过；Chromium 打开态 SSR 水合复用 root/panel/title 节点并完成关闭交互 |
| T13.10.4 | Dialog 子路径和根命名最小构建均实际经过 Dialog，排除其余产品、框架和编译器；只显式导入 Dialog CSS |
| T13.10.5 | unused 的 TS transform 保留导入，生产构建移除 Dialog；故意保留实例反例被拒绝并恢复原输出 hash |
| T13.10.6 | Button、Select、Combobox 各自最小构建均通过 Dialog 污染门禁 |
| T13.10.7 | 缺 Dialog JS/types/CSS、错误 JS/types/CSS exports、CSS 体积污染、SSR 破坏均按指定原因拒绝；Chromium 公开 chunk 阻断通过 |
| T13.10.8 | 30 类故障注入均恢复后复验通过；最终四类消费者、图和最小产物全量复验通过，合法嵌套 tslib 工程测试通过 |

Dialog 产品基线使用独立 Vite ES2022 HTML/TS 入口及 Node 26.12.1、npm 12.2.1；按引用资产逐文件压缩、去重统计。子路径和根命名场景各为 raw 101,938 B、gzip 36,413 B、Brotli 32,943 B；unused 为 736/429/351 B。该数值包含 Vue runtime 与 Dialog 的 Core/DOM 依赖，排除 SSR、source map、其他框架和工程预览，不作跨库节省比例结论。

验证命令：`node scripts/run-local-bin.mjs --workspace . --package vitest --bin vitest -- run --config tests/engineering/vitest.config.ts tests/engineering/dialog-size.spec.ts tests/engineering/pack.spec.ts`（14/14）、`npm run test:engineering`（140/140）、`node scripts/pack-smoke.mjs`（135 条命令、30 类破坏/恢复、最终 passed）、`node scripts/e2e-packed.mjs --package vue --browser chromium`（78/78、退出码 0）。Angular/esbuild 在当前命令沙箱读取隔离临时消费者的祖先目录时报 Access is denied；相同消费者与 Node 26 命令在授权环境通过，完整 packed 流程亦在该环境通过。Chromium 用例全部结束后本次 WebServer 进程未自行退出，仅终止本次受管服务进程，Playwright 随后输出汇总并以 0 退出。未执行 Firefox/WebKit 或 Git 提交、推送、发布。

## Task13.11 组件文档与可编译示例

状态：已完成；2026-11-09 开发验证 8/8，用户已确认验收。[Dialog 组件文档](../components/dialog.md)提供六段完整 Vue SFC，分别覆盖最小受控开关、受控拒绝、初焦与返回、嵌套 Select/Combobox portal 与表单、品牌字体密度、SSR 同构输入。React/Angular 仅给规划映射和伪代码，明确不可运行。

`check-dialog-docs.mjs` 提取六段 SFC，在 `.artifacts/task13/docs` 用本包 TS6/vue-tsc 严格编译，核对实际 `dist` 公共声明、18 类参数/属性入口及默认值、2 个事件、5 个 slots、唯一 `focus` expose 和源码/构建 CSS 的 22 个变量及回退。修改示例为不存在的方法或把变量名改错时门禁明确拒绝；恢复原文后重新通过。组件索引、Dialog/框架/Selection 契约、能力说明、主题说明及根/Vue README 已同步。

验证命令：`node scripts/check-dialog-docs.mjs`（六段 SFC 与 22 个变量通过）；`npx vitest run --config tests/engineering/vitest.config.ts --reporter=verbose tests/engineering/component-docs.spec.ts`（10/10，含 T13.11.1–T13.11.8 与既有 Select/Combobox 文档用例）；`npm run test:engineering`（148/148）。本阶段为文档与编译门禁，三浏览器综合回归和完整 CI 属 Task13.12；未执行 Git 提交、推送或发布。

## Task13.12 三浏览器综合回归

状态：已完成，2026-11-09 用户验收通过。专项公共入口 E2E 覆盖真实键盘、鼠标、可访问名称与表单交互；执行前从实际页面读取 `/dialog/behavior`、`/dialog/composition`、`/dialog/appearance`、`/ssr?example=dialog` 的可访问树。自动合成 `compositionstart/input/keydown/compositionend` 仅证明事件路由，不代表真实系统输入法；用户已确认本 Task 验收通过，但未提供具体系统、输入法及浏览器版本，故不补写设备级观察记录。

| 最低场景组 | 数量 | 当前依据与边界 |
| --- | ---: | --- |
| T13.1.1–T13.1.8 增量 API 与基线 | 8 | 2026-11-05 专项 8/8、用户确认；逐项依据见开发计划 Task13.1 |
| T13.2.1–T13.2.8 外壳与样式 | 8 | 2026-11-05 专项 8/8、用户确认；历史 T3.16 环境失败单列于计划 |
| T13.3.1–T13.3.8 DOM 协调 | 8 | 2026-11-05 专项 8/8、用户确认；见本记录 Task13.3 |
| T13.4.1–T13.4.8 私有会话 | 8 | 2026-11-05 专项 8/8、用户确认；历史 Chromium E2E 退出问题单列于 Task13.4 |
| T13.5.1–T13.5.8 受控请求 | 8 | 2026-11-05 专项 8/8、用户确认；见 Task13.5 |
| T13.6.1–T13.6.8 焦点与清理 | 8 | 2026-11-05 专项 8/8、用户确认；见 Task13.6 |
| T13.7.1–T13.7.8 嵌套、portal、表单 | 8 | 2026-11-06 专项 8/8、用户确认；见 Task13.7 |
| T13.8.1–T13.8.8 预览与水合 | 8 | 2026-11-06 专项 8/8、用户确认；见 Task13.8 |
| T13.9.1–T13.9.8 声明与门禁 | 8 | 2026-11-07 专项 8/8、用户确认；见 Task13.9 |
| T13.10.1–T13.10.8 packed 消费 | 8 | 2026-11-09 专项 8/8、用户确认；见 Task13.10 |
| T13.11.1–T13.11.8 文档与示例 | 8 | 2026-11-09 专项 8/8、用户确认；见 Task13.11 |
| T13.12.1–T13.12.8 综合验收 | 8 | 100%（8/8）；.1–.5、.7 自动验证通过，.6 合成事件通过；workspace/packed 专项各 24/24，完整 CI 通过；用户于 2026-11-09 确认验收通过 |

此表映射 12 × 8 = 96 类最低验收场景；Task13.1–13.12 均已获用户确认。浏览器参数化的实际测试实例数应按报告计算，不把 96 误写成自动化 test 函数数。

### 同候选自动验证证据（2026-11-09）

证据索引：[Task13.12 临时证据索引](../../.artifacts/task13/acceptance/evidence-index.json)。索引核对 Core/DOM/Vue、Vue smoke、Vue E2E、工程测试与脚本的 207 个 TS/Vue/MJS/SCSS 文件，SHA-256 为 `4f9655cde00efb63f257ab11f95b86c0fa25aec23d95e5ceac3a63a085b59010`；`check-dev` 的源码改动已还原，复算 hash 相同。此 hash 是明示范围内文件的聚合指纹，不代表整个工作树。完整 CI 命令为 `ZOOM_SMOKE_PORT_OFFSET=100 node scripts/ci.mjs`，五阶段 `check → coverage → e2e → pack → packed e2e` 均退出 0；原 4173 端口被其他项目预览占用，偏移后四个预览端口为 4270–4273，未终止该服务。Windows 受限命令环境的 Firefox 在创建空白页时曾崩溃，本次三浏览器回归在授权环境执行并通过。

| 验证 | 结果与证据 |
| --- | --- |
| 完整 CI | [阶段汇总](../../.artifacts/task4/ci/all-all.json)：五阶段退出码均为 0，完成于 2026-11-09 09:55:57 UTC |
| 全包单测与覆盖 | [分包计数](../../.artifacts/task4/unit/all-coverage/counts.json)：工程 148、Core 25、DOM 39、Vue 129、React 1、Angular 1；生产覆盖门禁 PASS。汇总语句 92.74%、分支 89.04%、函数 95.93%、行 96.57%；React/Angular 目前仅探针，生产覆盖不适用 |
| workspace 三浏览器 | [Playwright 结果](../../.artifacts/task4/playwright/workspace/all-all/results.json)、[HTML 报告](../../.artifacts/task4/playwright/workspace/all-all/html/index.html)：324/324，跳过 0、意外失败 0、flaky 0；runId `53a2297e-091b-474f-b1df-572ec565bc4b` |
| packed 三浏览器 | [Playwright 结果](../../.artifacts/task4/playwright/packed/all-all/results.json)、[HTML 报告](../../.artifacts/task4/playwright/packed/all-all/html/index.html)：324/324，跳过 0、意外失败 0、flaky 0；runId `7b2af9c5-a677-4a28-80ad-0b7620c99b5a` |
| 分包浏览器计数 | 每种消费形态、每个浏览器均为 Core 6、DOM 10、Vue 85、React 4、Angular 3；Dialog 专项每种消费形态的三浏览器合计 24/24 |
| 独立 tarball | [packed 状态](../../.artifacts/task5/runs/969ee02e-0724-44f9-8bd7-6a7d3c422d37/state.json)：runId `969ee02e-0724-44f9-8bd7-6a7d3c422d37`、135 条命令、30 类预期破坏及恢复、最终 passed；Vue tarball SHA-256 `96e650f4a3672681e068091c32744f243fe1d527d86a122c65378445aa3745e5`，其余四包 hash 见证据索引 |
| Dialog 最小产物 | 子路径与根命名构建各 raw 101,938 B、gzip 36,413 B、Brotli 32,943 B；unused 为 736/429/351 B。包含 Vue runtime 和 Core/DOM 依赖，排除 SSR 与其他产品，不推断跨库节省比例 |
| 独立 SSR 与 dev/watch | `node scripts/check-vue-ssr.mjs` 退出 0；`node scripts/check-dev.mjs` 的[验证记录](../../.artifacts/task3/dev-validation.json)为 7/7，涵盖独立 Dialog SCSS watch、无效 TS 停服与受管清理 |
| 截图与 trace | 混合嵌套的 workspace/packed × Chromium/Firefox/WebKit 六张 PNG 见证据索引 `attachments`；最终运行无失败，`retain-on-failure` 策略未生成 trace zip |

六张截图中的 [packed Chromium 示例](../../.artifacts/task13/acceptance/screenshots/packed-vue-chromium.png)显示外置弹层可见且点击命中；示例 Select 的 48px 窄触发器令选项文字换行，视觉检查时应一并观察。自动化没有真实系统 IME、读屏器或跨设备实测结论；这些与用户确认分开记录。

### 人工检查清单（Task13.12 已验收）

以下为人工验收参考项。用户已确认 Task13.12 验收通过；未提供系统、输入法及浏览器版本和逐项观察记录，因此不补写这些设备级细节。

1. 在实际中文系统输入法中，打开 Dialog 内 Combobox，输入候选词并按 Escape：只取消候选或弹层，Dialog 不误关、表单不误提交。请分别记录系统、输入法及浏览器版本。
2. 用键盘打开受控 Dialog，尝试关闭按钮、Escape、点击外部；确认拒绝时保持打开，允许后关闭且焦点回到原触发按钮。
3. 打开嵌套 Dialog 和外置 Select 弹层，点击选项与关闭顶层，确认背景不可操作、弹层未被正文裁切且父层仍可操作。
4. 检查紫/青两品牌、常规/紧凑密度、320px 窄屏、长内容与 RTL 的标题、关闭动作和页脚可见性；如需读屏结论，另做真实读屏操作记录。
5. 对 workspace 与打包消费者分别检查初始打开的 SSR 页面、水合后交互和卸载再打开；人工结论与本记录的自动证据分列。

Task13 总状态：已完成，Task13.12 于 2026-11-09 获用户验收通过。Task14 未启动。

## 2026-11-09 走查反馈修复

对照 [2026-11-07 走查报告](../../.trae/task-13-code-review-2026-11-07.md)复核后，F1–F5 在当前代码中仍存在，已修复：跨 portal Tab 统一导航；关闭期间暂停 trap、渲染完成后作一次返回决定再恢复 trap；焦点恢复采用包含动态 allowedNodes 的活动边界；inline/invalid 宿主向 portal 迁移时保存原焦点；选择浮层初始打开时正确选择承担初焦的 Dialog。关闭父子层及同时替换弹层的完整 focusin 序列也已覆盖。G1–G3 的类型、体积、文档与正式综合 E2E 已在后续任务交付，当前源码接线已核实。

本轮新增 DOM 3 个、Vue 19 个单测，两个包全部单测 190/190；生产覆盖门禁均 PASS。公开产物专项 Chromium/Firefox/WebKit 48/48；既有 Vue workspace 三浏览器 255/255，均无失败、跳过或 flaky。Vue DAG 构建、TS6/TS7/vue-tsc 正负例、Vue smoke 类型、相关工程测试 28/28、独立 SSR 均通过。首次工程文档检查与另一构建重叠导致短暂 CSS ENOENT，重建结束后顺序复跑通过；Firefox 受限环境创建页面崩溃在授权环境中复验通过。

本轮证据与源码指纹见 [修复索引](../../.artifacts/task13/review-fix/evidence.json)。前文 Task13.12 的完整 CI、tarball hash、体积和 packed 结果保留为已验收候选的历史证据；本轮未重跑完整五包 CI、packed 消费、dev/watch 或真实系统 IME。Task13 用户验收记录保持有效，Task14 未启动；未执行 Git 提交、推送或发布。
