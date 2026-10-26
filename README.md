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

目前仅完成仓库和包的初始化，尚无组件实现、构建产物或可消费的组件 API。根项目和五个包均设置为 private，版本为 0.0.0。发布前需要确认 npm 命名空间归属、授权许可、包入口、构建和框架兼容性。

## 本地检查

在仓库根目录执行 npm install，随后运行 npm ls --workspaces --depth=0，可查看五个本地工作区包。
