# Zoom Design

Zoom Design 是面向 Web（以 PC 为主）的多框架组件库项目。规划先实现 Vue 3 组件，再扩展 React 和 Angular。

## 仓库结构

| 目录 | npm 包 | 职责 |
| --- | --- | --- |
| packages/core | @zoom-design/core | 框架无关的行为、状态与算法 |
| packages/dom | @zoom-design/dom | 浏览器交互能力，按需依赖 Core |
| packages/vue | @zoom-design/vue | Vue 3 原生组件 |
| packages/react | @zoom-design/react | React 原生组件 |
| packages/angular | @zoom-design/angular | Angular 原生组件 |

根 package.json 用 npm workspaces 管理五个独立包。包内代码可用相对路径；跨包引用应使用声明过的包名及公开入口。

## 当前状态

Task1–10已获用户确认完成（Task7/8/9/10于2026-10-29确认）。Vue `ZButton`通过40/40自动验收，Task11 新增 `ZSelect`，根与组件子路径均为命名导出，自动验收16/16通过、待用户验收；React/Angular已有共享主题资产，公开功能入口仍为空。Core 在 Task9 增加六个纯选择函数与十二个类型；DOM 在 Task10 增加十二个浏览器函数与十二个类型。Task7 的完整CI与普通Node/npm干净副本历史结果为95项单测、workspace和packed各132项三浏览器；新候选另按当前 Task 验收记录。根工作区保持private；五个子包已配置公开发布、MIT许可与作者linzhuming，版本仍为0.0.0，尚未发布。产品用法见[Button](docs/components/button.md)、[Select](docs/components/select.md)；Linux实机未执行。

Task6已于2026-10-28获用户确认完成：同源三框架theme.css和可选theme.scss，26/26自动检查通过，见[Task6验收](docs/engineering/task6-acceptance.md)。Vue的聚合style.css现包含主题和Button；/theme保留原生主题样本，/button及产品SSR使用公开ZButton。公共参数见[主题说明](docs/theming.md)。

Task8 已于 2026-10-29 获用户确认验收通过：已整理 [Selection 契约](docs/contracts/selection.md)、[三框架映射](docs/contracts/framework-adapters.md)、[Dialog 契约](docs/contracts/dialog.md) 与 [基础方案 ADR](docs/engineering/adr-0001-selection-foundations.md)，修正公开包/private/LICENSE 门禁。当前工具版本见 [10-29 快照](docs/engineering/versions-2026-10-29.json)，本轮结果见 [Task8 验收](docs/engineering/task8-acceptance.md)。Select/Combobox/Dialog 产品仍分别属于 Task11/12/13，Core/DOM 的新 API 属于 Task9/10。

Task9 已于 2026-10-29 用户验收通过：[Core 用法与 API](packages/core/README.md)、`dev:platform` 的 `/selection` 公开函数示例、[Task9 验收](docs/engineering/task9-acceptance.md)。该阶段提供选择规则，Vue Select/Combobox 产品仍待后续实现。

Task10 已于 2026-10-29 用户验收通过：[DOM 用法与 API](packages/dom/README.md)、`dev:platform` 的 `/layers` 公开基础示例、[Task10 验收](docs/engineering/task10-acceptance.md)。

Task11：[Select 文档](docs/components/select.md)、`dev:vue` 的 `/select` 与 `/ssr?example=select&open=true`、[Task11 验收](docs/engineering/task11-acceptance.md)。Select 采用受控值、可选受控 open、原生表单桥接和按需 CSS；Task11 自动验收16/16通过：完整check204项、文档测试1项，workspace/packed三浏览器各141项；保持进行中，等待用户验收。

## 本地检查

使用 Node 26.12.1 和 npm 12.2.1；Volta 会读取项目固定版本，无 Volta 时安装相同版本即可。普通 npm 命令不依赖 Volta。

```text
npm ci
npm run check:versions
npm run test:contracts
npm exec -- playwright install chromium firefox webkit
npm run ci:verify
npm run dev:vue
```

Core/DOM/React 使用 TS7.0.2，Vue/Angular 因工具兼容约束使用 TS6.0.3。构建版本与消费者支持范围分别记录，尚未验证的消费范围不作支持承诺。

工程约定和局部工具命令见[工程基线](./docs/engineering/baseline.md)；实际结果见[Task1验收](./docs/engineering/acceptance.md)、[Task2验收](./docs/engineering/task2-acceptance.md)及[Task3验收](./docs/engineering/task3-acceptance.md)。`dev:platform/vue/react/angular`分别在127.0.0.1的5170–5173端口提供预览，自动管理首次构建、包/样式重建与关闭。

Task4最终完整check为53/53，三浏览器15项目51/51；无Volta干净CI也通过。命令、按包过滤和Linux配置见[CI说明](./docs/engineering/ci.md)，实际范围与未执行项见[Task4验收](./docs/engineering/task4-acceptance.md)。

`npm run check:pack`与`npm run test:e2e:packed`已包含在完整ci:verify中。[隔离消费说明](./docs/engineering/packed-consumers.md)记录独立安装、类型、运行时解析、CSS及SSR；[体积说明](./docs/engineering/size-baseline.md)区分历史工程快照与本轮最小Button产品场景。

[Linux验证与WSL2安装方案](./docs/engineering/linux-validation-setup.md)已整理，待以后需要时执行；Linux验证尚未运行，Angular SSR尚未实施。


