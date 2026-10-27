# Task 3 Angular 工程验收记录

日期：2026-10-27。范围仅为 Task 3C 及 Angular 对应的样式、原生宿主、类型和测试工程。

## 已实现

- `packages/angular` 独立 CLI workspace，项目 root 为空、sourceRoot 为 `src`；构建使用 `@angular/build:ng-packagr`，生产编译模式为 `partial`。
- 正式公共入口 `src/public-api.ts` 保持 `export {}`。ng-packagr 将其生成空 FESM 和 `export {}` 声明，真实模块导入的 namespace 为空。未为了验证构建而公开产品组件。
- 正式 APF 位于根 `dist/angular`，主入口保留 ng-packagr 生成的 `fesm2022` / `types` / exports 布局。SCSS 先由共享脚本编译到 `.generated/style.css`，再由 APF assets 交付到 `styles/style.css`；附加 `./style.css` 出口与 CSS sideEffects 保留。
- 私有 standalone / OnPush / signal 探针验证 required input 更新、点击、输出事件及销毁。官方 unit-test builder 初始化 TestBed，测试没有自行初始化测试环境。
- `apps/angular-smoke` 使用官方 application / dev-server builder，默认 zoneless，显式声明自己的 Angular runtime、compiler、CLI/build、TS6、RxJS、tslib 依赖。APF 导入成功后才 bootstrap；失败显示标记并向 pageerror 传播。
- 独立编译夹具输出 `.artifacts/fixtures/angular/apf`，其中真实包含 `ɵɵngDeclareComponent` 和 `BuildProbe` 声明；未混入正式包。无效模板正好因 label 和 output 参数类型分别产生 TS2322、TS2345。
- TS6 消费者读取本轮 TS7 生成的 Core/DOM 私有工程声明，以及 Angular APF 夹具声明，`skipLibCheck=false`；保留有效类型断言和 `@ts-expect-error` 反例。

## 原生工具与配置裁定

1. 已安装 `@angular/build` 22.2.4 的 `src/builders/unit-test/builder.js` 在 `execute()` 中明确支持 `@angular/build:ng-packagr`，并通过 `transformNgPackagrOptions()` 转换其配置。因此保留计划中的 library buildTarget，无需额外 application test-host。schema 的 `include` 相对 sourceRoot；必须同时包含 `../test/**/*.spec.ts`。真实 `--list-tests` 输出为 `test\\build-probe.spec.ts`。
2. 工具从 Angular 包作为解析基准。CLI 22.2.4 合法提升在根 node_modules；build 22.2.4、compiler-cli 22.2.3、ng-packagr 22.2.5、TS 6.0.3 在本包 node_modules。compiler-cli 实际解析 TS6；应用自己的 compiler-cli 同样解析其本地 TS6。完整当前路径证据位于 `.artifacts/task3/angular-tool-resolution.json`。没有使用根 TS7 代替 Angular 编译。
3. 宿主按标准 Angular workspace 方式将包名映射到根目录**实际 APF 产物** `dist/angular`，没有源码入口映射。源码 workspace package 不能用 exports 指向包外目录，所以不修改 npm workspace 链接；Task 5 的独立打包消费者将移除该本地映射。
4. 原生 CLI 的 JS side-effect CSS import 在实测中生成 CSS 文件，但未自动将其插入 index.html。宿主采用官方 `build.options.styles` 读取真实 APF 的 `styles/style.css`；APF 的公共 `./style.css` 出口另由契约检查核对。原生构建产物的 index.html 加载 stylesheet，Chromium computed style 验证 `--zoom-engineering-built: 1`。
5. 编译夹具的项目配置使用 `test/ng-package.fixture.json`。若在源码包内新增名为 `ng-package.json` 的嵌套配置，ng-packagr 会将其自动发现为次级入口，并因不支持次级入口 `dest` 报错。夹具入口与其引用的探针同处 `test` 根，满足 ng-packagr 对 rootDir 的要求。应用的独立 ngc typecheck 则显式以仓库作为 rootDir，以容纳该私有跨目录夹具。
6. ng-packagr 自动将 tslib 从 peer 移入其生成的 dependencies，并移除 scripts/devDependencies；这里遵循原生产物管理，没有重写主出口或布局。正式包仍 private 0.0.0。

## 已执行验证

| 命令 / 操作 | 结果 |
| --- | --- |
| `node scripts/build-angular.mjs` | 成功；先生成 CSS，再执行官方生产 partial/APF 构建 |
| `node scripts/check-angular.mjs` | 成功；原生 library/app ngc、专用 partial APF、模板类型反例、TS6/TS7 声明消费及公共入口/CSS 契约 |
| `ng test zoom-angular --list-tests`（包目录） | 成功；确实发现包根 `test/build-probe.spec.ts` |
| `ng test zoom-angular --watch=false`（包目录） | 1 个文件、1 个测试通过；TestBed 输入、signal、output 和销毁均有断言 |
| `node scripts/test-angular.mjs --coverage` | 官方 builder V8 coverage；1/1 通过；私有探针 statements 100%、branches 100%、lines 100%、functions 85.71% |
| scoped `vitest run ... tests/engineering/angular-contract.spec.ts` | 5/5 工程契约检查通过 |
| `ng build angular-smoke --configuration production`（应用目录） | 成功；输出 `.artifacts/task3/angular-smoke/browser`，包括主 bundle、CSS 与真实 APF 的 lazy chunk |
| `ng serve angular-smoke --host 127.0.0.1 --port 5173` | 原生 dev server 启动；Chromium 验证交互、父 input 更新、输出、销毁及 computed CSS；Ctrl+C 后 5173 不再可连接 |
| Angular Chromium（根共享 runner，4173） | 2/2 用例通过：正常路径无 pageerror；阻断真实 APF lazy chunk 后显示导入失败、传播 pageerror、无交互探针 |

可重复命令为包内的 `build`、`typecheck`、`test:list`、`test:unit`、`test:coverage`、`test:e2e`。测试脚本在调用本地官方 CLI 前准备生成 CSS，并向上传播非零退出。应用同样提供独立 build、dev、typecheck。

## 边界

当前 SCSS 仅为可观察的工程构建标记，不能代表产品视觉或 Task 6 主题完成。公共包仍无产品组件 API；专用夹具的 partial 声明不代表尚未实现的产品组件通过验证。

本轮没有添加 Angular SSR / hydration，不记录 Angular 组件 SSR 或水合通过。生产发布、打包消费者隔离、真实组件按需样式及兼容矩阵仍属于后续任务。共享 root/dev/e2e/版本锁由主任务集成；本记录只描述 Angular 范围。

## 共享集成最终复验

Angular独立Chromium2/2及全工作区12/12均通过并正常退出；共享静态服务关闭时主动关闭连接，已消除断言通过后等待连接的挂起。最终原生ngc/APF/TS6消费检查再次通过。工程回归总计34/34；Angular SSR仍未实施，详见[Task3验收](./task3-acceptance.md)。
