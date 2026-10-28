# Task6 主题基础验收

实施日期：2026-10-28，Asia/Shanghai。范围仅为 Task6；**已完成，26/26自动验收通过，2026-10-28用户确认验证通过**。Task7另按用户后续指令开发，其结果单独记录；Q0独立维护、公开发布和业务系统接入不在本记录范围。

交付：`design/styles` 四个共享 Sass 模块，三框架 `theme.css`、`style.css`、可选 `theme.scss` 出口，公共参数表、主题文档、Vue `/theme` 和 `/ssr?example=theme` 私有原生样本。JS 公共 API 保持原阶段边界。

## 已取得的证据

| 检查 | 实际结果 |
| --- | --- |
| Node/npm、锁文件和工具链解析 | Node 26.12.1 / npm 12.2.1；75 个依赖、10 个编译器入口通过 |
| 2026-10-28 官方 registry 核对 | 37 个不同包的稳定版与快照一致；Vue/Angular 的四处 TS6.0.3 兼容例外保留，其他 TypeScript 为 7.0.2 |
| 锁文件同步 | `npm install --package-lock-only --ignore-scripts --no-audit --no-fund` 退出0；未升级依赖 |
| 测试先行 | 首次主题工程测试 11 项预期失败；实现后通过；后续补齐三框架失效控制 |
| 完整工程测试 | 14 个文件，64/64，无 skip/todo |
| Vue workspace 三浏览器 | 39/39，Chromium/Firefox/WebKit 各13；含新增主题9项及原工程4项 |
| 共享样式 watch | 4/4：初始、共享源修改可见、Sass 错误停服并失效资产、恢复及自有进程清理 |
| T6.8 回归负例 | 固定为旧蓝色的 hover/active 明确失败；恢复原源码后确切红色混色在三浏览器 3/3 通过 |
| 独立 Sass 夹具 | 三框架自身安装包与编译器通过；4 类负例逐项拒绝并恢复正例，完整pack已通过 |
| 首轮完整 CI | 类型、73 项单元、覆盖率、78 项 workspace 浏览器通过；随后 pack 体积采集失败，不能算 CI 通过 |
| 最终完整 Windows CI | 退出0；单元73/73，workspace及packed三浏览器各78/78；含四标准消费者、五类既有负例恢复及新增Sass验收 |
| 干净 portable CI | 无Volta PATH、独立npm ci及完整CI均退出0；单元73/73，workspace及packed三浏览器各78/78，185个源码/配置文件与原工作区SHA256一致 |

首轮 pack 失败源于预览新增的纯 CSS 动态入口被 Vite 删除其空 JS chunk，但旧体积图仍引用该 chunk。预览改回既有显式聚合 CSS 导入，主题示例仍受控延迟加载，不改变公开 JS 不隐式加载 CSS 的契约。

独立只读审查未发现运行时代码缺陷；指出 T6.8 的不等式不足以排除旧 hover/active 颜色，已提升为本轮验收缺口，补确切新主色混色断言并执行负例/恢复验证（`.artifacts/task6/color-mutation.json`）。Sass 夹具最初遇到隐藏 package.json 和“文件不存在”诊断匹配问题；已复用既有 packagePath 并匹配明确诊断。失败轮次保留为失败，最终完整CI及干净副本均通过。

## 用例映射

| 编号 | 证据来源 | 状态 |
| --- | --- | --- |
| T6.1 | theme-contract 默认参数与可选变量不输出 | 通过 |
| T6.2 | 浏览器真实 CSS 请求；标准独立 CSS 消费无直接 Sass 声明；Vue未安装Sass | 通过 |
| T6.3 | `@use with` 单个主色覆盖 | 通过 |
| T6.4 | 字体引号、字号单位与其他参数保持 | 通过 |
| T6.5 | 仅导入 Sass 输出为空 | 通过 |
| T6.6 | 同一模块生成两套容器主题与 null override | 通过 |
| T6.7 | 非 map、未知键、非法密度的明确编译诊断 | 通过 |
| T6.8 | 三浏览器原生样本；确切红色 hover/active、焦点与显式 override；旧蓝色负例及恢复 | 通过 |
| T6.9 | 两品牌并存、嵌套覆盖、删除后恢复继承 | 通过 |
| T6.10 | 局部字体/基准字号及显式字号 | 通过 |
| T6.11 | 每种密度完整八项几何参数；字体不随密度改变 | 通过 |
| T6.12 | compact 内层 regular 恢复 | 通过 |
| T6.13 | 200% 根字号与大字号自然增高、无裁切 | 通过 |
| T6.14 | 主题样式启用/禁用时宿主正文、按钮、输入样式对照 | 通过 |
| T6.15 | Core/DOM 无 CSS/Sass 出口或框架样式依赖 | 通过 |
| T6.16 | 三框架同源 CSS 编译一致 | 通过 |
| T6.17 | 精确 CSS/Sass 出口、sideEffects、聚合样式契约 | 通过 |
| T6.18 | 安装包四 Sass 文件、传递依赖与自身编译器 | 通过 |
| T6.19 | 私有 Sass、越界源码引用、wildcard 出口拒绝 | 通过 |
| T6.20 | 缺 partial／错误 Sass export 拒绝，逐项恢复 | 通过 |
| T6.21 | 仓库外自身 Sass、单项 with 和两主题 mixin | 通过 |
| T6.22 | Vue/React/Angular 必需 SCSS 失败失效整个 CSS/Sass 资产组，恢复重建 | 通过 |
| T6.23 | design watch 实际可见及错误停服；干净副本包含 design 并执行完整CI | 通过 |
| T6.24 | 请求级品牌 SSR、原始响应、既有节点水合；Node 无浏览器导入 | 通过 |
| T6.25 | 默认文字配色对比度、键盘焦点、reduced motion | 通过 |
| T6.26 | workspace/packed 三浏览器 CSS 请求与 computed styles | 通过 |

## 记录位置与限制

最终每次验证使用 `.artifacts/task6/<runId>/summary.json` 记录环境、源码/锁文件 SHA256、开始/结束和退出码；失败轮次保留。各底层脚本仍在自己的 Task4/5 目录记录原始单元、coverage、浏览器 JSON/trace、CSS 请求/计算样式、SSR HTML、tarball 哈希、安装解析、模块图和负例恢复，Task6 汇总指向本轮成功 runId。

完整 Windows CI 为 `.artifacts/task6/6f5b2010-36e2-4be5-b933-1ed0bb01ad81/summary.json`（退出0）；本轮通过的 pack runId 为 `911624ce-7f3e-454f-a849-c1305d3564b1`，原始资产/解析/负例/Sass/浏览器记录均在 `.artifacts/task5/runs/911624ce-7f3e-454f-a849-c1305d3564b1/`。

干净验收为 `.artifacts/task6/aec3f60c-f8d6-48bd-a141-b5c33ff0fd68/summary.json`（退出0），副本位于 `.artifacts/task4/portable-ci/workspace-eVtqHq/`，其独立pack runId为 `05e9d2d1-93d2-4cc5-a12c-76a318506345`。最终汇总、185个源码/配置SHA256及用例结果见 `.artifacts/task6/final-results.json`；底层无Volta/安装/CI退出码见 `.artifacts/task4/portable-ci/results.json`。源代码自干净验收开始后未变化，副本文件也逐项匹配；最终用户验收文字在完成自动检查后同步。

watch 最终记录为 `.artifacts/task6/ecdf92ec-0b82-4649-8246-99bb8e9bdf1a/watch.json`（4/4）；脚本即使清理异常也会恢复原主题源，最终重跑通过。registry 记录为 `.artifacts/task6/registry-full-2026-10-28.json`。首轮失败 CI 为 `.artifacts/task6/fbcb64aa-dd0c-4ee5-8daf-b48b0c83225c/summary.json`，Sass夹具集成失败轮为 `.artifacts/task6/11aaaeae-5675-492a-9e20-7018a772406d/summary.json`，均保留实际失败状态。

本轮 Vue 工程预览可达资产合计 raw **78,084** / gzip **30,659** / Brotli **27,734** 字节，详情见上述 pack 目录 `size-baseline.json`。包含私有主题样本，不能作为 Button 产品体积。

coverage门禁执行通过，生产JS入口仍为空导出，生产逻辑为N/A；私有探针独立统计。CSS主题由Sass契约与真实浏览器验证，不将探针覆盖率当成主题或产品组件的JS覆盖率。

复现命令：`npm run ci:verify`、`node tests/engineering/verify-theme-watch.mjs`、`npm run verify:ci:portable`。可单独运行 `npm run test:engineering -- tests/engineering/theme-contract.spec.ts`（13项）及 `npm run test:e2e -- --package vue --browser all`（39项）；真实包路径使用 `npm run check:pack` 后再执行 `npm run test:e2e:packed -- --package vue --browser all`。

本地预览已启动于 `http://127.0.0.1:5171/theme`，最终默认主题截图为 `.artifacts/task6/theme-preview.png`；停止当前开发服务后，可用 `npm run dev:vue` 重新启动。

Windows 沙箱内首轮浏览器负例出现测试后清理未结束，已停止该自有会话；后续在允许管理测试自身子进程的环境执行，未跳过进程清理检查。物理 Ctrl+C、屏幕阅读器人工体验、Linux 实机和 Angular SSR 未执行；自动 IPC SIGINT 只证明已执行的管理逻辑。自定义任意颜色或非法 CSS 值不属于默认配色的保证范围。既有工程体积报告会包含预览场景，不能充当 Button 产品体积或节省结论。

2026-10-28用户确认：“验证通过，可以将Task6标记为已完成，然后继续Task7的开发工作。”据此将Task6状态更新为「已完成」，保留上述自动验收原始证据。
