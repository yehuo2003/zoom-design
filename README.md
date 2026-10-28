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

Task1–6已获用户确认完成。Task5的五包tarball与四个仓库外消费者、Task6的共享主题已建立独立证据。Task7正在交付Vue `ZButton`，根与/button均为命名导出；其余四包保留原工程范围。根项目和工作区均为private、版本0.0.0。最新产品范围与验证见 [Button](docs/components/button.md) 和 [Task7验收](docs/engineering/task7-acceptance.md)；Linux实机未执行。

Task6 已于2026-10-28获用户确认完成：接入同源的三框架 `theme.css` 和可选 `theme.scss`，`style.css` 包含主题；自动检查26/26，见 [Task6 验收](docs/engineering/task6-acceptance.md)。Vue `/theme` 与主题 SSR 使用私有原生样本，Task7 Button 正在开发，结果单独记录。公共参数与定制方法见 [主题说明](docs/theming.md)。

## 本地检查

使用 Node 26.12.1 和 npm 12.2.1；Volta 会读取项目固定版本，无 Volta 时安装相同版本即可。普通 npm 命令不依赖 Volta。

```text
npm ci
npm run check:versions
npm exec -- playwright install chromium firefox webkit
npm run ci:verify
npm run dev:vue
```

Core/DOM/React 使用 TS7.0.2，Vue/Angular 因工具兼容约束使用 TS6.0.3。构建版本与消费者支持范围分别记录，尚未验证的消费范围不作支持承诺。

工程约定和局部工具命令见[工程基线](./docs/engineering/baseline.md)；实际结果见[Task1验收](./docs/engineering/acceptance.md)、[Task2验收](./docs/engineering/task2-acceptance.md)及[Task3验收](./docs/engineering/task3-acceptance.md)。`dev:platform/vue/react/angular`分别在127.0.0.1的5170–5173端口提供预览，自动管理首次构建、包/样式重建与关闭。

Task4最终完整check为53/53，三浏览器15项目51/51；无Volta干净CI也通过。命令、按包过滤和Linux配置见[CI说明](./docs/engineering/ci.md)，实际范围与未执行项见[Task4验收](./docs/engineering/task4-acceptance.md)。

`npm run check:pack`与`npm run test:e2e:packed`已包含在完整ci:verify中。[隔离消费说明](./docs/engineering/packed-consumers.md)记录独立安装、类型、运行时解析、CSS及SSR；[体积说明](./docs/engineering/size-baseline.md)区分历史工程快照与本轮最小Button产品场景。

[Linux验证与WSL2安装方案](./docs/engineering/linux-validation-setup.md)已整理，待以后需要时执行；Linux验证尚未运行，Angular SSR尚未实施。
