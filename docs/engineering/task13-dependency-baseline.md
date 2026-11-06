# Task13.1 Dialog 依赖与实施基线

核对日期：2026-11-05（Asia/Shanghai）。以下“最新稳定”取自 npm 官方 Registry 的 `/latest` dist-tag；不包含 beta、rc、canary。它是本日快照，不把更新版本直接视作本任务的升级要求。Task13.1 只新增 Core 类型与 Vue 源级类型/纯函数，不引入新运行依赖。

| 范围 | 当前固定值 | 2026-11-05 Registry latest | 结论 |
| --- | --- | --- | --- |
| [TypeScript](https://registry.npmjs.org/typescript/latest) | 根/Core/DOM/React 7.0.2；Vue/Angular 6.0.3 | 7.0.2 | 保留分工；Angular 22 明确要求 6.0.x |
| [Vue](https://registry.npmjs.org/vue/latest)、[compiler-sfc](https://registry.npmjs.org/%40vue%2Fcompiler-sfc/latest)、[server-renderer](https://registry.npmjs.org/%40vue%2Fserver-renderer/latest) | 三者 3.5.44 | 三者 3.5.44 | 保持三者同版；Vue peer 为 TypeScript `*` |
| [vue-tsc](https://registry.npmjs.org/vue-tsc/latest) | 3.3.13 | 3.3.14 | 保留已验收编译链；latest peer TypeScript `>=5.0.0`，补丁升级另做完整 SFC/声明回归 |
| [@vitejs/plugin-vue](https://registry.npmjs.org/%40vitejs%2Fplugin-vue/latest) | 6.0.10 | 6.0.10 | peer Vue `^3.2.25 || ^3.6.0-rc.10`、Vite 5–8；Node `^20.19.0 || >=22.12.0`，当前满足 |
| [Vite](https://registry.npmjs.org/vite/latest) | 8.3.5 | 8.3.6 | 保留已验收构建链；latest Node `^20.19.0 || >=22.12.0`，Sass 可选 peer `^1.70.0` |
| [Vitest](https://registry.npmjs.org/vitest/latest)、[coverage-v8](https://registry.npmjs.org/%40vitest%2Fcoverage-v8/latest) | 均 5.0.5 | 均 5.1.0 | 两者需要同版；保留当前已验证组合，升级需同时进行 |
| [Vue Test Utils](https://registry.npmjs.org/%40vue%2Ftest-utils/latest)、[jsdom](https://registry.npmjs.org/jsdom/latest) | 2.5.1、30.1.3 | 同当前 | Test Utils peer Vue/编译器/SSR 3.x；jsdom Node `^22.22.2 || ^24.15.0 || >=26.0.0` |
| [Sass](https://registry.npmjs.org/sass/latest)、[Playwright](https://registry.npmjs.org/%40playwright%2Ftest/latest) | 1.107.0、1.64.1 | 1.107.1、1.64.1 | Sass 补丁本阶段不动；Playwright Node `>=20` |
| [Floating UI DOM](https://registry.npmjs.org/%40floating-ui%2Fdom/latest) | 1.8.0 | 1.8.0 | 已有 DOM 依赖；Dialog 本身不要求新定位器 |
| [React](https://registry.npmjs.org/react/latest)、[react-dom](https://registry.npmjs.org/react-dom/latest) | 均 19.3.1 | 均 19.3.1 | 当前只保留未来适配语义，不新增 React Dialog |
| [Angular core](https://registry.npmjs.org/%40angular%2Fcore/latest)、[compiler-cli](https://registry.npmjs.org/%40angular%2Fcompiler-cli/latest) | 均 22.2.3 | 均 22.2.4 | 当前 Angular Dialog 未实现；latest compiler-cli peer TypeScript `>=6.0 <6.1`，Angular compiler 须同版 |
| [Angular CLI](https://registry.npmjs.org/%40angular%2Fcli/latest)、[build](https://registry.npmjs.org/%40angular%2Fbuild/latest)、[SSR](https://registry.npmjs.org/%40angular%2Fssr/latest)、[ng-packagr](https://registry.npmjs.org/ng-packagr/latest) | 均 22.2.5 | 均 22.2.6 | 保留当前成套版本；latest build/ng-packagr peer TypeScript `>=6.0 <6.1` |

[Angular 官方版本表](https://angular.dev/reference/versions)要求 v22 使用 Node `^22.22.3 || ^24.15.0 || ^26.0.0`、TypeScript `>=6.0.0 <6.1.0`、RxJS `^6.5.3 || ^7.4.0`。当前 Node 26.12.1、TS6.0.3、RxJS7.8.2 落在这些范围内。根 Node/npm 固定为 26.12.1/12.2.1，项目 engines 分别是 `>=26.12.1 <27` 和 `>=12.2.1 <13`。

本阶段保留 manifest/lock：新增内容只涉及源码类型与纯函数，当前固定版本满足上述 peer/engine 范围；补丁升级会触及五包锁定组合和 packed 消费门禁，需另作同候选验证后再采用。升级条件是实际需要修复兼容或安全问题，并同时更新 manifest、lock、版本快照和硬编码门槛，运行五包消费者。React/Angular 产品实现仍按后续独立任务安排。

普通 npm 路径：在满足 engines 的电脑执行 `npm ci`，然后用 `npm run build -- --package core`、`npm run typecheck -- --package core` 和对应聚焦测试命令；不要求命令写成 `volta run`。Volta 仅管理本机 Node/npm。项目已安装依赖应从各 workspace 解析：根/Core/DOM/React 用 TS7.0.2，Vue/Angular 用各自的 TS6.0.3；Vue 本地 vue-tsc 负责 SFC 声明生成，普通 TS6/TS7 消费者另行检查真实声明。Task13.1 只检查源级类型，根/子路径 emitted d.ts 与 SFC 消费留到 Task13.9。
