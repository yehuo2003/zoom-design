# Task9 Core 纯选择模型验收

实施日期：2026-10-29（Asia/Shanghai）。**Task9 已完成：2026-10-29 用户确认“验证通过”，16/16 自动验收与用户验收通过。** Task10 的 DOM 能力与 Task11/12 的框架组件未提前实现。没有 Git 提交、推送或公开发布。

## 交付

Core 根入口新增 normalizeOptions、getSelectedOption、moveHighlight、reconcileHighlight、filterOptions、findTypeaheadMatch，以及冻结的十二个类型。实现按 options/navigation/filter/types/barrel 分文件，输入输出均为框架无关数据；没有浏览器全局、DOM/框架类型、样式、timer、console 或模块可变状态。

normalizeOptions 返回新数组/公开字段副本及索引诊断；其他规则接收归一 options，不修改调用方状态。只有 null 是无值，0、''、'0' 保留类型；number 有限；选项同类型重复保留首个有效项。导航跳过 disabled，用稳定值协调；已选 disabled 仍可返回，删除/重现不擅改 value；过滤和 typeahead 不依赖 locale，也不持有 500ms 缓冲。

`apps/platform-smoke` 增加 `/selection`，从公开包名的真实 JS 获取函数；应用自行持有两个独立实例的 value/highlight/query，展示动态 options、过滤/前缀、清空和循环。它是公共规则消费示例，未冒充 Select/Combobox 产品。原 `/core` 与 `/dom` 工程探针保留。

真实声明通过 TS6.0.3/TS7.0.2 检查，lib 仅 ES2022、types=[]、strict、skipLibCheck=false。四个 tarball 消费者复制同一有效/非法用法，每个用自身编译器检查九个精确诊断；Node 无浏览器全局时验证六个函数的实际运行。包继续仅公开根入口，不开放 /selection、src、dist 深层入口。

用法与限制见 [Core README](../../packages/core/README.md)，冻结语义见 [selection 4.10](../contracts/selection.md)。

## 16 项验收映射

| 编号 | 验证入口 / 结果依据 |
| --- | --- |
| T9.1 | options.spec：undefined/空集合/null 选择；非数组返回 index=-1 诊断 |
| T9.2 | options.spec + 三浏览器：0/空串/'0'、空 label、-0/0 同值，显示与值类型分离 |
| T9.3 | options.spec：NaN/±Infinity/boolean/object/bigint/symbol/非法 label/非法 disabled/重复值/稀疏项；带原索引诊断 |
| T9.4 | 三个规则测试文件使用冻结数组/记录；normalizeOptions 复制输入，导航/过滤/匹配不写原数据 |
| T9.5 | navigation.spec + 三浏览器：跳过禁用、全禁用/空集合无目标，不死循环 |
| T9.6 | navigation.spec + 三浏览器：首末、缺高亮、默认停止/显式 loop；单项集合边界 |
| T9.7 | navigation.spec + 三浏览器：重排按稳定 value 保存，删除/禁用按 current→selected→first→null 协调 |
| T9.8 | options.spec + 三浏览器：删除当前选中项显示未匹配，但 value 不变，恢复后标签恢复 |
| T9.9 | options.spec：应用已选择的 disabled 记录仍可返回；用户导航不进入它 |
| T9.10 | filter.spec + 三浏览器：大小写/空查询/不 trim/中文/无结果；disabled 保留在过滤结果 |
| T9.11 | filter.spec + 三浏览器：普通多字/重复字符/emoji/Unicode 大小写展开/无结果，计时与缓冲不在 Core |
| T9.12 | filter.spec + 三浏览器两个独立调用方交错：无共享 query 或高亮状态 |
| T9.13 | 平台工程子进程导入/调用 + 全部 Core 产物扫描：无浏览器全局、DOM/Node/框架类型或样式依赖 |
| T9.14 | selection-artifacts 与四 packed 消费者：真实声明正例 + 九项精确负例，TS6/TS7，纯 ES2022 环境 |
| T9.15 | e2e/core/selection.e2e.ts：workspace /selection 与重新打包后的独立消费者使用同一公开函数断言 |
| T9.16 | 生产三文件四项覆盖率、批准六函数/十二类型、Node 安全、deep-import 拒绝、pack 私有文件/缺产物负例 |

## 命令与证据

环境沿用 Task8：Windows、Node 26.12.1、npm 12.2.1；Core/DOM/React TS7.0.2，Vue/Angular TS6.0.3。没有新增或升级依赖，package-lock 沿用已验收候选。

| 命令 | 退出码 / 实际结果 |
| --- | --- |
| npm run build -- --package core | 0；真实 ESM + .d.ts，内部 .js 模块引用 |
| npm run typecheck -- --package core | 0；Core 生产/测试、平台消费宿主 |
| vitest Core test/selection | 0；最终 20/20（首批 19，另补 Unicode 回归） |
| vitest selection-artifacts + platform-contract | 0；10/10，含 TS6/TS7 正反例、环境/出口与失败传播 |
| npm run test:coverage -- --package core | 0；engineering 93 + core 23 = 116 项；Core 生产三文件 100%：statements 72/72、functions 16/16、branches 64/64、lines 44/44；probe 单独统计 |
| npm run test:e2e -- --package core --browser all | 0；18/18，公共规则新增 3 场景 × 3 浏览器 = 9 项，其余为原工程回归；无 skip/retry |
| npm run check | 0；五包构建/类型、平台声明与打包门禁、137 项测试（engineering 93、core 23、dom 3、vue 16、react 1、angular 1），含 Vue Button 与 Angular 原生测试 |
| npm run check:pack | 0；runId=eef45709-8c2d-44a8-9852-f9554a2aa6d8；五包真实 tarball、四个独立消费者 install/ci/类型/构建/SSR/六函数 Node 调用、九项类型负例与既有缺产物/依赖/TS 负例恢复通过 |
| npm run test:e2e:packed -- --package core --browser all | 0；同一新 tarball 候选 18/18，公共规则 9 项 + 原工程回归 9 项；无 skip/retry |

根 unit/coverage/check 仍全局准备五包构建/类型/工程产物，不能描述为完全隔离。Core 生产指标来自 `.artifacts/task4/coverage/core/summary.json`，不是包含 probe 的 text-summary；只有纯类型/barrel 经 TS6 编译 AST 分类排除，没有按文件名排除生产逻辑。

## RED、修正与审查

首批生产函数使用最小空结果占位，三文件实际执行 19/19 失败后实现并全部通过；没有把缺模块导致的收集失败当成功的 RED。

第一次覆盖前置类型检查暴露测试夹具的混合字面量推断过窄，已给标准 options 显式 `readonly SelectionOption[]` 类型，公共签名与严格类型检查保持不变。第二次运行发现原 Core 工程测试仍断言空出口，按本 Task 批准集合更新；未跳过旧测试。

一次独立只读审查发现 Unicode typeahead：先整体小写再分字符会把 `İİ` 展开为多个码点，错误返回 null。新增 İ/İİ 与 Aa 回归，旧版实际 1 失败/4 通过；改为先按原始码点拆分、逐字符小写后识别重复，最终 20/20 通过。只读复审确认修正有效，无剩余 Important/Critical。BUG 模式库未初始化，按只读检索处理，未新增库文件。

workspace 首次 15 通过/3 失败来自测试定位：原生 output 同样具有 status 角色，未命名 getByRole('status') 匹配九个节点。按实际可访问树改用 Package readiness 名称后 18/18，不修改产品行为或弱化断言。

## 状态与限制

Core 纯规则的通过不代表 DOM 几何/原生表单/焦点/ARIA、Vue Select/Combobox、中文 IME 或 React/Angular 产品适配已经交付；这些属于后续 Task。Linux 实机、无 Volta 干净副本、整套 ci:verify 单命令与非 Core 覆盖率本轮未执行，历史证据保留各自记录。

Task8、Task9 已完成；2026-10-29 用户验收 Task9 通过，Task10 按授权继续，Task11–12 未开始。原始日志、覆盖率与源码候选摘要归档于本次 Task9 证据目录，最终位置见本记录的归档索引。

Task9 的 T9.1–T9.16 自动验收项全部通过（16/16）；实际测试数量按上表分别统计。Core 不再沿用空入口的生产覆盖 N/A。

归档索引：`.artifacts/task9/latest.json`，本次目录 `.artifacts/task9/20261029-558dbdc8-6aef-4bb6-84ad-63e5925e0ac9/`。包含原始 RED/修正/最终日志、独立审查摘要、Core 生产与 probe 分离覆盖、完整单元与两类浏览器 JSON、pack 状态。`candidate-sha256.json` 记录源码/配置/锁文件/契约/计划的 UTF-8 文本摘要（换行统一 LF），作为没有 Git commit 时的候选标识；不伪造提交证据。

