# 工程基线（Task1–3）

版本元数据和核对时间见 [版本快照](./versions-2026-10-27.json)。Node 的来源为[官方发布索引](https://nodejs.org/dist/index.json)，直接工具依赖取自[官方 npm registry](https://registry.npmjs.org/)。快照记录的是 2026-10-27 的稳定版本，不代表未来实时最新版。

## 安装与工具检查

Node 固定 26.12.1（Current，非 LTS），npm 独立固定 12.2.1。Node 自带 npm 11.20.0 不符合本项目基线。

有 Volta 时根配置自动选版本，五包和四个私有 apps 都继承根配置。不更改机器全局默认版本。无 Volta 时安装相同 Node/npm，再执行同样命令；检查器不查找 Volta，也不会自动安装运行时。

```text
npm ci
npm run check:versions
npm run test:engineering
npm run verify:portable
npm exec -- playwright install chromium
```

公共测试工具、样式编译器和 Node 类型声明在根精确声明。各包精确声明自身的编译器和框架工具；框架运行时同时列为 peer，仅承诺本轮选定发行线。`engine-strict=true`、`save-exact=true`；禁止使用 force、legacy-peer-deps 或 skipLibCheck 隐藏约束问题。optionalDependencies 保持启用，以安装 TS7 的平台编译器。

## 编译器隔离与命令契约

Core、DOM、React：TS7.0.2。Vue、Angular：TS6.0.3，属于明确的兼容例外。vue-tsc 仍使用传统 `typescript/lib/tsc` 接口；Angular compiler-cli/build/ng-packagr 的 peer 为 `>=6.0 <6.1`。

```text
node scripts/run-local-bin.mjs --workspace packages/core --package typescript --bin tsc -- --version
node scripts/run-vue-tsc.mjs --workspace packages/vue -- --version
node scripts/run-local-bin.mjs --workspace packages/angular --package @angular/cli --bin ng -- version
```

局部启动器从 workspace 的 package.json 解析 bin 映射，以该 workspace 为 cwd，使用当前 Node 和参数数组启动，传递真实退出码；不使用全局 CLI 或 shell 拼接。Vue 启动器从 Vue workspace 解析 TS6 路径，显式传给 `vue-tsc.run(tscPath)`，避免 vue-tsc 提升后偶然使用根 TS7。检查器同时验证 Angular 三个工具自身的 TypeScript 解析。

五包目前均提供 `build`、`typecheck`、`test:unit`、`test:coverage`、`test:e2e`，四个apps提供原生消费宿主。Core→DOM的构建顺序和exports由Task2建立；三框架构建及宿主由Task3建立。根五包统一build/check/unit编排及全浏览器矩阵仍待Task4。

## TypeScript 升级影响示例

当前真实运行依赖只有 `@zoom-design/dom → @zoom-design/core`；三个框架目前没有 Core/DOM 运行依赖，不能仅按目录存在推定影响。

如果升级 Core 编译器或公共声明：先构建 Core，再复验 DOM 的公开入口和声明；声明存在后，以 TS6 与 TS7 消费 Core/DOM 声明，并设置 `skipLibCheck=false`；将来添加框架依赖后再沿真实 import/公共类型关系扩大回归。Task5 还需在仓库之外安装 tarball，避免工作区解析掩盖问题。

构建 TS 版本不等于业务消费应用必须采用的版本。快照分别记录 `buildTypeScript`、`testedConsumerTypeScript`、`consumerTypeScriptSupport`；后两者在消费验证前保持空数组，不宣称已支持。TS6 是否可消费 TS7 发出的声明，要由 Task2/3/5 的实际声明夹具和消费者验证。

Vue工具升级先影响Vue类型链；Angular工具升级先影响其APF/宿主；Core/DOM公共类型或JS输出目标变化则按真实依赖扩大。禁止覆盖Angular builder内部固定的Vite。样式工具只放根，Core无样式，DOM不承担视觉主题；三框架SCSS/CSS出口已建立，当前仅含工程标记，产品主题留在Task6。

## 验收边界

Task1 的测试是工具链与错误配置检查；不代表组件、五包构建、声明消费、SSR、浏览器交互或发布验收通过。实际命令、环境和未验证项见 [验收记录](./acceptance.md)。Task1已经用户确认完成，Task2状态另见独立验收记录。

## Task2 接入记录

Task1、Task2已经用户确认完成。Core/DOM提供真实build/typecheck/test:unit/test:coverage/test:e2e命令；platform-smoke提供私有/core和/dom浏览器工程页。

Core/DOM的testedConsumerTypeScript与consumerTypeScriptSupport记录实测精确版本6.0.3和7.0.2，范围仅为空公共声明和私有泛型/回调/联合类型声明夹具；未来产品公共类型与仓库外消费者仍须复验。

根test:engineering包含五包产物契约，应先构建对应包并运行三框架typecheck生成编译夹具。verify:portable保留manifest-only复制方式，只运行toolchain.spec.ts，避免把缺少产品源码/产物的工具链副本当实际消费者。

Task2的实际结果和复核见[Task2验收记录](./task2-acceptance.md)。

## Task3 接入记录

Vue以Vite编译SFC、vue-tsc/TS6发出声明；React以Vite编译TSX、TS7发出声明；Angular使用官方CLI/ng-packagr生成根dist/angular的partial APF，官方unit-test builder初始化TestBed。公共入口仍为空，原生交互探针及其编译产物独立放在test/fixtures和.artifacts/fixtures，不进入正式包。

Vue/React的显式./style.css指向各包dist/style.css；Angular由共享Sass生成.generated/style.css，经ng-packagr assets进入APF的styles/style.css。Angular工作区应用的paths只指向实际APF目录，其原生styles配置加载该CSS；Task5外部消费者须移除此映射并安装真实tgz。

Vue/Angular分别验证TS6消费TS7 Core/DOM声明，独立Vue检查主动生成所需平台夹具，不依赖运行顺序。框架消费者快照分别记录Vue6.0.3、React7.0.2、Angular6.0.3；仅覆盖当前空公开声明与私有工程夹具。

`npm run dev:platform/vue/react/angular`分别使用127.0.0.1:5170–5173；先构建后预览，包/样式变化暂停服务、重建并重启，失败停服。`test:e2e:platform`保留Core/DOM范围，`test:e2e:workspace`运行五包Chromium项目。Vue/React已验证服务端HTML和真实客户端水合；Angular SSR未实施。完整结果及终端按键验收边界见[Task3验收记录](./task3-acceptance.md)。
