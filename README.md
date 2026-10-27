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

Task1、Task2已获用户确认完成。五包已建立原生产物、独立类型与单测命令，四个私有apps提供工程预览；Task3已通过本地验证，等待用户验收。尚无产品组件API。根项目和工作区均为private，版本0.0.0；发布前仍需完成Task4–5，并确认命名空间、许可及产品兼容性。

## 本地检查

使用 Node 26.12.1 和 npm 12.2.1；Volta 会读取项目固定版本，无 Volta 时安装相同版本即可。普通 npm 命令不依赖 Volta。

```text
npm ci
npm run check:versions
npm run build --workspace @zoom-design/dom
npm run build --workspace @zoom-design/vue
npm run build --workspace @zoom-design/react
npm run build --workspace @zoom-design/angular
npm run typecheck --workspace @zoom-design/vue
npm run typecheck --workspace @zoom-design/react
npm run typecheck --workspace @zoom-design/angular
npm run test:engineering
npm run check:platform
npm run test:e2e:platform
npm run test:e2e:workspace
npm run dev:vue
```

Core/DOM/React 使用 TS7.0.2，Vue/Angular 因工具兼容约束使用 TS6.0.3。构建版本与消费者支持范围分别记录，尚未验证的消费范围不作支持承诺。

工程约定和局部工具命令见[工程基线](./docs/engineering/baseline.md)；实际结果见[Task1验收](./docs/engineering/acceptance.md)、[Task2验收](./docs/engineering/task2-acceptance.md)及[Task3验收](./docs/engineering/task3-acceptance.md)。`dev:platform/vue/react/angular`分别在127.0.0.1的5170–5173端口提供预览，自动管理首次构建、包/样式重建与关闭。
