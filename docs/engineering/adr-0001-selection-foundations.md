# ADR-0001：选择组件定位、原生表单与 SSR 基础

日期：2026-10-29；状态：Task8 已于 2026-10-29 用户验收通过，技术决定生效；适用 Task9–13。

## 决定与取舍

采用框架无关的 `@floating-ui/dom@1.8.0`，精确声明在 DOM 包的 runtime dependencies，并由 npm lock 锁住传递版本。Task8 只选型、安装与核验声明；mountFloating 的产品实现属于 Task10。Core 不引用 Floating UI，也不引入 React/Vue 专用定位包。

| 选择 | 能力/代价 | 结论 |
| --- | --- | --- |
| Floating UI DOM | computePosition、offset/flip/shift/size、autoUpdate；需管理 Promise 过期、观察器与 cleanup | 采用；几何与浏览器差异交由已维护的定位库，本项目专注交互与框架桥接 |
| 自研定位 | 可少一项依赖；需自行处理裁剪祖先、滚动/resize、RTL、碰撞、变换坐标和观察器 | 本轮不采用；维护和回归面超过轻量依赖收益 |
| 框架专用 Floating 包 | 自带组件 hooks，但会把共享 DOM 层绑定具体框架 | 不采用；破坏五包边界 |

实际 registry 核对与安装记录见 [元数据](floating-ui-2026-10-29.json)、[直接依赖快照](versions-2026-10-29.json) 和 package-lock.json。DOM 1.8.0、Core 1.8.0、Utils 0.2.12 均为稳定版、MIT、无 deprecated、无 peerDependencies/engines 声明；没有 engines 约束不等于承诺所有 Node。传递图为 DOM → Core/Utils、Core → Utils，不含框架 runtime。三者官方 tarball unpackedSize 合计 458863 bytes，**不是**组件 tree shaking 后 JS、gzip 或浏览器下载量。最终组件 JS/CSS raw/gzip/Brotli 在 Task11/12 的真实消费者测量。

官方依据：[computePosition](https://floating-ui.com/docs/computeposition)、[autoUpdate](https://floating-ui.com/docs/autoupdate)。autoUpdate 只在实际打开时启用并清理；异步结果用实例会话号防止关闭/替换后的写入。对外公开本项目最小配置，不把第三方完整类型作为组件 API。

## 版本选择

2026-10-29 重新读取官方 registry 的 76 条直接依赖元数据：Sass 1.106.1 → 1.107.0、@types/node 26.6.5 → 26.6.6、Angular CLI/build/SSR 22.2.4 → 22.2.5，精确同步所有实际声明工作区及锁文件。Angular core/common/compiler 22.2.3 与 ng-packagr 22.2.5 不变；它们各自当前稳定版本不同，不能按数字相同原则盲目升级。工具链门禁验证实际 peers/engines、解析路径与 lock。

TS7 7.0.2 与 Vue/Angular TS6 6.0.3 保留；TS6 是已核对编译器约束例外，不宣称它是 registry latest。Node/npm 沿用 26.12.1/12.2.1 的已验证运行时与既有官方发布记录；本轮 Node 未另作全局版本升级。旧 10-27 快照留作历史，门禁切换至 10-29 快照。新增 Floating UI 声明单独通过严格 TS6/TS7 检查，Node 无 document 导入成功；尚未验证实际 mountFloating 的产品运行。

## 原生表单方案

采用一个具名 hidden 提交业务值，另一个**无 name**、size=1 的原生 select 校验有效选择。首项空值表示无选择，第二项固定非空哨兵表示匹配；合法业务 `''` 也映射为哨兵。代理 visually hidden 且 tabindex=-1，不能 display:none、hidden 或以 disabled 绕过 required；invalid 在代理监听，preventDefault 后转焦点到可见控件并派生 aria-invalid。

readonly 移除代理 required/自定义错误，但保留具名值提交；loading 保留当前值和 required；组件/fieldset disabled 通过真实 form owner 和 :disabled 判定。代理、具名字段不随 popup portal。外部 form 同时关联两者，代理没有 name 因而不会重复字段。reset 延后检查最终 defaultPrevented，再请求应用值并在回写后重同步代理；父层拒绝或恢复自有初值也必须一致。

最小夹具覆盖 checkValidity/reportValidity、真实 submit 阻断与成功、FormData、空串/0/未知值、disabled/readonly/loading、fieldset 首 legend、动态 name/form、取消 reset、拒绝/接受/自有默认 reset。它证明浏览器方案可行，不代替 Task10/11 实现与产品回归。代理使用 aria-hidden 的辅助技术效果尚未人工验证，不能把三浏览器自动化等同于读屏通过。依据：[WHATWG select](https://html.spec.whatwg.org/multipage/form-elements.html#the-select-element)。

只读审查后补充真实 type=reset 点击：原先 queueMicrotask 方案在三浏览器都先处理再看到后续 listener 的 preventDefault，新回归 3/3 失败；form.reset() 的程序调用不能代表这一路径。现改为下一任务观察最终取消/默认动作，并在清理时取消计时器；契约同步禁止只依赖微任务。此修正属于测试方案验证，没有提前交付表单产品桥接。

## 主题、SSR 与 layer 方案

默认 inline；portal 明确要求同 document 的存活主题 host，品牌/字体/字号/density 由应用同步，目标失效安全回 inline。夹具既断言主题 host 保留样式，也断言未配置 host 时确实丢失继承，不能承诺自动跨树继承。

Vue 用 useId，初始 open=true 的 SSR 输出实际 inline 列表；首帧 Teleport disabled，mounted 后 nextTick 才迁移。验证原始 HTML、两实例 ID 唯一、相同节点水合复用、迁移后关联与卸载、跨请求品牌隔离。React/Angular 的 SSR 产品证据留给各自适配任务。依据：[Vue SSR](https://vuejs.org/guide/scaling-up/ssr.html)。

layer context 显式实例化，以 ownerDocument + composedPath + 逻辑子层注册决定内部/外部；一次事件只交给顶层。关闭是请求，父层拒绝时不提前注销。Task8 的双层/portal 测试不实现完整模态系统；焦点陷阱、inert、滚动锁的引用计数与乱序清理仍须 Task10/13 真实验收。

## 文件与验证边界

tests/engineering/task8 下所有代码均为测试夹具，不进入包 exports 或 apps 的公开示例。正式 Core/DOM 入口在 Task8 仍为空；不提前放占位产品实现。现有 Node 导入/deep-import/Core 环境限制保持；空入口精确断言随 Task9/10 的真实导出一起更新，Vue DAG/watch 随 Task11 引入 Core/DOM 依赖一起更新。

命令和最终结果以 [Task8 验收记录](task8-acceptance.md) 为准。没有 Git 提交或公开发布；技术选型、方案夹具通过和产品组件交付是独立状态。

