# Task8 契约与前置门禁验收

实施日期：2026-10-29（Asia/Shanghai）。**Task8 已完成：2026-10-29 用户确认“验证通过”，16/16 技术核对与用户验收通过。** 依赖 Task7 已于 2026-10-29 获用户确认。Task9–13 产品实现未提前开发；没有 Git 提交、推送或公开发布。

## 交付与边界

- 冻结 [Selection](../contracts/selection.md)、[三框架适配](../contracts/framework-adapters.md)、[Dialog](../contracts/dialog.md)：值/查询/高亮分离、所有权、请求顺序、非法输入、表单/reset、键盘/ARIA、portal/SSR、12 个最小 DOM 函数与 6 个 Core 函数、主题 token。
- [ADR-0001](adr-0001-selection-foundations.md) 记录定位与表单取舍。DOM 精确采用 Floating UI 1.8.0，Core/Utils 实际传递版本 1.8.0/0.2.12；声明被 TS6/TS7 消费，Node 无浏览器全局导入安全。新产品函数仍无导出。
- 修正 private 门禁为根/apps 私有、五包显式公开/MIT/author/public/合法稳定版本，校验包 LICENSE 与根 MIT 内容；Core/DOM pack 允许且要求 LICENSE，原测试/样式泄漏限制仍保留。
- 官方 registry 核对 76 条直接依赖记录，Sass 1.107.0、@types/node 26.6.6、Angular CLI/build/SSR 22.2.5 精确同步 manifests、lock 与 [新版本快照](versions-2026-10-29.json)。Vue/Angular TS6 保留；旧快照保留历史，不伪装为当天最新。
- tests/engineering/task8 为测试专用最小方案夹具；不进入产品入口、不冒充 Select/Combobox/Dialog。组件矩阵、文档模板、Button 文档、README 和旧计划现状同步。

## 16 项逐项结论

设计评审与自动测试分开计数。下面 PASS 表示该 Task8 条目有可复核技术依据，**不表示对应产品组件已实现，也不代替用户验收**。

| 编号 | 类型 | 证据与结论 |
| --- | --- | --- |
| T8.1 | 契约评审 + 浏览器局部 | null 唯一无值；0/空串/数字字符串/非法数类型敏感；合法空串和 0 实际提交且通过 required，非法数由适配层归 null |
| T8.2 | 契约评审 | selection 4.2/4.7、adapters 两张映射表及归一规则覆盖三框架名称/默认/状态；Dialog 独立默认表 |
| T8.3 | 场景推演 | adapters 4.4.1 给出全部拒绝/部分回写的 A→B 事务；query → value → open、reset 当前标签恢复与父层最终回写的两阶段同步、同目标事件去重与实际副作用明确；不是已实现组件测试 |
| T8.4 | 契约评审 | normalizeOptions 诊断、类型敏感去重、高亮按值协调、已选 disabled 可显示提交、删除重现不改父值；规则签名已固定 |
| T8.5 | 状态表评审 | selection 4.6 逐键与 DOM 断言，aria-selected 表示已确认值，activedescendant 表示暂态高亮；无真实目标不输出引用 |
| T8.6 | 场景推演 | query/value/composition draft 与编辑代分离；取消/失焦恢复 label、空结果 Enter、尾随 input 去重、编辑键保留；真实 IME 产品回归在 Task12 |
| T8.7 | 真实浏览器 | FormData、checkValidity/reportValidity、submit 阻断/成功、空串/0/未知值、readonly/loading/disabled、fieldset 首 legend、动态外部 form/name |
| T8.8 | 真实浏览器 | 程序 reset + 可信按钮点击；晚注册 listener 取消、拒绝/接受/父层初值、null 同值无请求；下一任务再读最终 defaultPrevented |
| T8.9 | 框架评审 | CVA 单一值源、writeValue 无反向事件、复合失焦 touched、三路 disabled OR、selectionRequired 与 Angular required 区别；Forms 组件未实施 |
| T8.10 | 真实浏览器 | inline/显式主题 portal host 保留品牌/字号/字体，移除 host 主题实际丢失继承，动态 host 覆盖可重现；不是产品 CSS 验收 |
| T8.11 | 真实 SSR/浏览器 | 原始 open/closed HTML、两实例 ID、跨品牌请求隔离、水合节点复用、mounted 后迁移、卸载清理；不推断 Angular SSR |
| T8.12 | 契约评审 + 路由夹具 | Dialog 请求/关闭/动画分离，父层拒绝保留资源；ModalContext 协调 trap/隔离/锁；双层/portal composedPath 只路由顶层，cleanup 停止路由；完整模态实现属于 Task10/13 |
| T8.13 | 工程自动化 | 新门禁 19 项正反例，五包实际元数据/LICENSE、Core/DOM dry-run 内容检查、完整 check、真实 tarball 验证 |
| T8.14 | 官方元数据 + 类型/导入 | 新快照 76 条直接记录，稳定版、发布时间、engines、peers、无 deprecated；Floating 元数据独立保存，TS6/TS7 与 Node 导入验证 |
| T8.15 | 源码评审 + 既有回归 | Button 六项 props、click 原始事件、attrs 优先级、slots/expose 与文档一致；矩阵仍明确 React/Angular 产品未交付 |
| T8.16 | 可执行性评审 | 下节逐 Task 的文件/门禁/命令衔接；不在本 Task 改空 API 断言或 Vue DAG，也不为通过而跳过缺产物负例 |

## 下游可执行性复核

| Task | 已冻结输入 | 实施时必须一起修改 |
| --- | --- | --- |
| 9 | selection 4.10 六函数、只读类型与 diagnostics、稳定值导航 | Core src/selection、index/README、platform-contract 空导出断言、TS6/TS7 真实生成声明、平台公开 API 与 packed 场景、生产覆盖率 |
| 10 | selection 4.11 十二函数/显式 context/cleanup/任务队列 reset，Dialog 焦点边界，Floating 精确依赖已装 | DOM src/floating/layer/focus/modal/form、index/README、公开出口与 Node 安全断言、真实几何/焦点/锁/清理/packed/覆盖率；不能保留对所有 document 文本的禁止 |
| 11 | Select 原生属性/表单/键盘/主题/SSR 与文档模板 | Vue 独立小 composables + SFC/CSS；Core/DOM 直接依赖与 external；workspace/dev DAG/watch；exports/声明/pack/消费者与真实 select.md |
| 12 | Combobox query/IME/filter/minQuery、表单 only-value | 独立 SFC/CSS/types/入口/MD、真实输入法与三浏览器、Select/Button 回归、tarball 与最终五包 CI |

Task9/10 的 `--package` 每次只接收一个包名；运行 unit/coverage/check 当前仍会全局准备工程产物。Task11/12 的 workspace CI 不替代 check:pack 与 packed E2E；源码变化后先重打包。产品四项覆盖率均≥80%，新增真实代码不能沿用空入口 N/A。旧空入口断言保留到对应能力实施时再精确更新。

## 命令与执行结果

环境：Windows、Node 26.12.1、npm 12.2.1、TS7 7.0.2、Vue/Angular TS6 6.0.3；锁文件与源配置候选摘要随本次证据归档，不以 Git commit 冒充标识。

| 命令 | 退出码 / 结果 |
| --- | --- |
| npm run check:versions | 0；76 个直接依赖、10 个编译器入口、Vue 显式 TS6 与 Angular 内部 TS6 |
| npx vitest run --config tests/engineering/vitest.config.ts tests/engineering/task8-gates.spec.ts tests/engineering/toolchain.spec.ts --reporter=verbose | 0；35/35，新门禁 19 项 |
| npm run check | 0；五包构建/类型、平台 TS6/TS7 与 pack 内容、113 Vitest + 1 Angular 原生测试，共 114 项；engineering=90/core=3/dom=3/vue=16/react=1/angular=1 |
| Floating UI 声明两套 tsc + Node 无 document 导入 | 0；严格 skipLibCheck=false，TS6/TS7 均通过 |
| npm run check:pack | 0；runId=174f2968-467b-47c5-b43a-678ee78c3632；五包/四个仓库外消费者 install/ci/类型/构建/SSR/依赖解析/负例恢复通过 |
| npm run test:contracts | 0；21/21，7 场景 × 3 浏览器，包含审查新增的真实 reset 点击，无 skip/retry |
| npm run test:e2e -- --browser all | 0；五包 132/132，Vue 93/93，含 Button 产品、主题、原生工程探针，无 skip/retry |
| npm run test:e2e:packed -- --browser all | 0；同一 tarball 消费者五包 132/132，Vue 93/93，无 skip/retry |

浏览器夹具属于 Task8 方案验证；workspace/packed 则验证当前真实产品与工程探针。它们都不说明 Select/Combobox 已交付。

证据归档：`.artifacts/task8/20261029-b2320535-fa55-461a-95e8-f00e796509d9/`；索引 `.artifacts/task8/latest.json`。归档含各命令日志、单元与三类浏览器 JSON、版本门禁、pack 状态、RED 与修正记录。`candidate-sha256.json` 保存当前源码/配置/锁文件及契约/计划的 UTF-8 文本摘要（换行统一 LF）；没有 Git commit 时以该候选清单核对，不宣称已有提交。

## 初次失败、修正与审查

private 基线先实际失败（五包被旧规则拒绝）；新增门禁在最小旧规则下实际执行 19 项，9 失败/10 通过后修正为全绿。初次缺模块的收集错误不当作功能 RED。

夹具初次服务器将 /ssr.ts 误当 /ssr 页面返回 HTML，导致脚本 MIME 错误；已改严格 pathname。受限运行环境使 Firefox 启动、Windows 子进程清理失败；进程清理独立复验与最终命令在允许启动/清理测试自身进程的环境通过，没有修改工程测试绕过约束。

一次独立只读审查发现真实 reset 点击的微任务取消漏洞：新增回归在三个浏览器实际 3/3 失败，改为下一任务观察最终取消并清理 pending timer。其间新按钮 id=reset 遮蔽 form.reset 的夹具命名错误已更名修正。审查还指出 trapFocus 缺少顶层协调通道，已冻结共享 ModalContext 与登记/清理顺序。没有产品 BUG 库写入或自动初始化。

修正后的只读复审确认两项反馈已解决，无新增 Important/Critical；主线程独立复验最终 21/21 浏览器结果。程序 reset 与可信按钮路径均保留，后续不能用其中一路替代另一路。

workspace 与 packed 复验最初并发占用 4170 端口导致 packed 启动失败；之后按串行顺序重跑，不设置 reuseExistingServer 掩盖来源。

## 未执行与限制

本次未重新执行 Linux 实机、无 Volta 干净副本、真实辅助技术/中文输入法人工验收；未实施 Angular SSR、React/Angular 产品适配、Core/DOM 新产品函数或 Vue Select/Combobox/Dialog。Task8 不以设计示例计框架编译通过，不以夹具通过计未来组件支持。

当前未另跑完整 ci:verify 单命令或全量 coverage；本 Task 改动的是工程门禁/依赖/文档/方案夹具，具体已运行命令逐项列明。历史 Task7 的 40/40 与完整 CI 记录保留，不改写为新候选结果。

Task8 技术核对 16/16，以上自动化与方案验证均已完成；2026-10-29 用户确认验证通过，Task8 已完成，Task9 按授权继续。

