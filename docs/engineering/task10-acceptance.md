# Task10 DOM 基础能力验收

实施日期：2026-10-29（Asia/Shanghai）。**Task10 已完成：2026-10-29 用户确认“Task10验收通过”，16/16 自动验收与用户验收通过。** 本记录中的 Task11/12/13 未实施描述对应 Task10 交付时点；Task11 现按授权继续开发，无 Git 提交、推送或公开发布。

## 交付与边界

DOM 根入口实现十二个函数与十二个类型：mountFloating、createLayerContext、registerLayer、isWithin、focusElement、restoreFocus、createModalContext、acquireModal、trapFocus、getFormOwner、isFieldsetDisabled、observeFormBridge。按 floating/layer/focus/modal/form/internal/types/barrel 分文件，不引入框架状态或视觉 CSS；公开 API 与 Task8 selection 4.11 一致。版本与 lock 沿用 Task8：Core/DOM/React TS7.0.2、Vue/Angular TS6.0.3，运行依赖 Floating UI DOM1.8.0，无新增依赖。

定位采用 computePosition/autoUpdate 与 offset/flip/shift/size；异步请求序号、active 和 document/连通检查阻止旧结果写入。技术 inline style 在 cleanup 原样恢复。层级由调用方显式共享 context，仅顶层请求关闭，拒绝回写不会偷偷解绑。Node import 无浏览器副作用，十二个浏览器操作在无浏览器环境中明确失败。

模态按活动 acquire 计数，顶层 scope/allowedNodes 管理焦点与背景隔离，非模态 layer 不启用这些能力。开放 ShadowRoot、插槽、动态插入、断连与跨 Document 收养纳入清理。SVG 自身不执行 HTML inert，因此 SVG/MathML 背景分支使用 aria-hidden、可恢复的 pointer-events:none 和 context 持有的事件/焦点防护；不移动框架拥有的节点。该后备路径不承诺 HTML 原生 inert 的全部浏览器内部语义，完整原生语义需要应用提供 HTML 背景 host。关闭的 ShadowRoot 无法外部遍历，调用方需提供可访问 host/逻辑节点；活动期间受管样式/属性不能同时由另一管理器改写。

表单桥使用原生 .form 与 :disabled，首 legend 例外保留。reset 延至下一个 task 检查最终 defaultPrevented，owner 改变或 cleanup 会取消待任务；invalid 转发同一事件并聚焦可见 trigger。值、required/name/disabled 同步、序列化和受控模型仍由框架适配层负责。

`apps/platform-smoke` 新增 `/layers`，从真实公开包名获取 DOM API，分模块组合定位、层级、模态、Shadow DOM、表单示例；不实现 Select/Combobox/Dialog 产品。原 `/core`、`/dom`、`/selection` 保留。用法见 [DOM README](../../packages/dom/README.md)。

## 16 项验收映射

| 编号 | 验证入口与断言 |
| --- | --- |
| T10.1 | dom-artifacts 独立 Node 子进程与四 packed 消费者：无 window/document 导入十二函数；不启动浏览器资源 |
| T10.2 | 十二个操作在 Node 中明确 unsupported；layer/modal/form/floating 验证先于资源写入；伪造 context、空/断连/跨文档节点拒绝 |
| T10.3 | floating 单测 + 三浏览器：默认/显式参数、width optout、原 max-height、四周边界 flip/shift、滚动/resize/RTL、available height |
| T10.4 | floating 单测：旧请求晚完成、关闭后完成、最新请求优先、清理后 update、错误报告无未处理拒绝 |
| T10.5 | 各模块幂等 cleanup、初始化/回调失败回滚、listener/observer/timer 停止；light/shadow 卸载、Document 收养及 SVG 属性/样式/事件防护还原 |
| T10.6 | layer 单测 + 浏览器：trigger/popup/clear、portal child、Shadow composedPath；每次独立意图仅一次请求，拒绝关闭可再请求 |
| T10.7 | layer 两级顶层 Escape/outside；顶层 optout 不穿透下层；最后清理后不再请求 |
| T10.8 | 原生 trigger→popup focusout 不解释为 outside；isWithin 显式逻辑节点与 composedPath |
| T10.9 | 初始/返回焦点、删除目标 fallback、顶层循环与父层恢复、无候选 scope fallback、重复 allowed 根去重、radio group/closed details |
| T10.10 | 真实原生 Tab 可离开非模态层；body 无 scroll lock、无 inert；未调用模态基础 |
| T10.11 | 嵌套锁反序清理，原 overflow priority/padding/inert/aria-hidden 恢复，自动异常卸载与 SVG 后备防护清理 |
| T10.12 | 主题 host/active 祖先与 slot 不被 inert；allowed portal 可聚焦；Shadow scope 移除释放；背景 SVG 原生聚焦/点击被隔离 |
| T10.13 | 外置 form ID、owner 变化、name 动态提交、fieldset disabled、首 legend 例外，移除控件自动清理 |
| T10.14 | 原生 invalid preventDefault/转焦点；受信任 Reset 点击、晚注册 cancel、最终 defaultPrevented、换 owner/卸载取消待回调 |
| T10.15 | workspace 与新 tarball 平台同一 e2e/dom/layers.e2e.ts，三浏览器调用真实公开 API；无 DOM 生产源码 alias |
| T10.16 | TS6/TS7 十二类型/十二函数正例、七项精确负例、批准出口/深层导入关闭、生产七文件四指标逐文件 ≥80%、probe 单列 |

## 验证记录

| 命令 | 退出码与实际结果 |
| --- | --- |
| DOM 生产与测试 tsc --noEmit | 0；strict、skipLibCheck=false，真实生产与测试代码 |
| node scripts/test-unit.mjs --standalone --package dom --coverage | 0；29/29（26 个生产场景、3 个既有工程探针），无 skip |
| npm run check | 0；五包构建/类型、平台声明与工程门禁、168 项测试：engineering98、core23、dom29、vue16、react1、angular1 |
| node scripts/e2e.mjs --mode workspace --package dom --browser all | 0；30/30，Chromium/Firefox/WebKit 各10，公共基础7场景×3=21，旧探针9项；无 skip/retry |
| npm run check:pack | 0；runId=76ea9fbe-0732-43bd-90dc-91994e574d9e；五包真实 tgz、四独立消费者 install/ci/严格声明/构建/Node/既有 SSR，七项精确 DOM 类型负例及缺产物/未声明依赖/错误 TS 负例恢复均通过 |
| node scripts/e2e-packed.mjs --package dom --browser all | 0；同一新 tarball 候选30/30，三浏览器各10；真实公开 API21项+旧探针9项，无 skip/retry |

DOM 生产七个可执行文件单独统计，四项覆盖率：statements 483/510（94.71%）、functions 85/86（98.84%）、branches 312/348（89.66%）、lines 252/256（98.44%）。每个文件的四项指标也均 ≥80%；新增 per-file 门禁负例证明弱文件不能被汇总平均值掩盖。types/barrel 通过编译后 AST 分类排除，私有 probe 单列，不把 probe 结果计入生产覆盖率。原始值见 `.artifacts/task4/coverage/dom/summary.json`。

Node 与实际声明检查随完整 check 通过：无浏览器全局的导入/十二操作失败路径、TS6/TS7 有效用法/七项精确诊断、十二公开类型、禁止深层导入。根 unit/check 仍为工程契约准备全局五包前置，不描述为完全隔离。三引擎无辅助技术人工验收的替代含义。

T10.1–T10.16 自动验收全部通过（16/16）。归档索引 `.artifacts/task10/latest.json` 指向本候选目录，包含原始日志、早期失败 trace、独立只读审查摘要、生产/probe 分离覆盖、完整 unit、workspace/packed 浏览器 JSON、tarball 与 pack 状态。`candidate-sha256.json` 使用 PowerShell 读取实际 UTF-8 文本并统一 LF 后计算摘要，记录源码/配置/锁/契约/计划，作为没有 Git commit 时的候选标识；没有伪造提交或发布证据。

## 过程与审查

最初用可执行最小占位运行 17 个 DOM 场景，16 失败/1 通过后实现，不把缺模块的收集失败当 RED。独立只读审查发现 ShadowRoot 内卸载未释放资源、slotted scope 被错误隔离、重复 allowed root 破坏 Shift+Tab、跨 Document 收养边界，以及未隔离 SVG 背景；分别补回归并修正。后续复审记录归档。

首次完整工程检查中，Windows 沙箱阻止测试回收自己启动的子进程树；允许该测试进程回收后该项通过。首次类型负例预期中一项实际诊断是 TS2322，已按真实 TS6/TS7 输出修正精确列表；Node 检查也补齐参数为空时的环境先行校验。旧“DOM 空出口”断言升级为批准十二函数集合，没有删除或跳过旧契约。

首轮 workspace 浏览器 26/27：WebKit 嵌套示例未显式恢复 trigger 焦点；示例改用 restoreFocus。新增边界与 Shadow 场景后一次 26/30：定位断言硬编码按钮高度，以及测试把鼠标点击等同于原生 button 聚焦；改为实际 rect 间距和显式焦点操作，随后 30/30。SVG inert 三引擎最小探针证实仅给 SVG 设置属性仍可聚焦/跳转，新增实际 focus/click 断言。最初的 SVG 包装方案经只读 React19 复现会破坏框架删除节点，已撤销，最终后备隔离不改 DOM 拓扑；复审确认 React 删除不再报错，原属性/样式与监听可恢复。focusin 防护通过内部 trap.redirect 恢复候选焦点，支持无法直接聚焦的 scope。失败日志和 trace 保留，不将早期失败记作最终通过。

## 状态与未执行项

Linux 实机、无 Volta 干净副本、整套 ci:verify 单命令、屏幕阅读器人工检查、本轮其他包覆盖率未执行；历史证据不替代本候选。Angular SSR 未实施。平台 DOM 基础的通过不代表 Vue Select/Combobox/Dialog 产品、产品 ARIA/IME、React/Angular 适配已交付。

2026-10-29 用户确认 Task10 验收通过，状态已改为已完成，按 task-driven-dev 流程继续 Task11；Task12/13 仍待后续实施。
