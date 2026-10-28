# 工程基线（Task1–4）

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

五包均提供build、typecheck、test:unit、test:coverage、test:e2e，四个apps提供原生消费宿主。根build/check/unit/coverage/CI编排及三浏览器矩阵已由Task4建立，实际环境边界见独立验收。

## TypeScript 升级影响示例

当前真实运行依赖只有 `@zoom-design/dom → @zoom-design/core`；三个框架目前没有 Core/DOM 运行依赖，不能仅按目录存在推定影响。

如果升级 Core 编译器或公共声明：先构建 Core，再复验 DOM 的公开入口和声明；声明存在后，以 TS6 与 TS7 消费 Core/DOM 声明，并设置 `skipLibCheck=false`；将来添加框架依赖后再沿真实 import/公共类型关系扩大回归。Task5 还需在仓库之外安装 tarball，避免工作区解析掩盖问题。

构建 TS 版本不等于业务消费应用必须采用的版本。快照分别记录 `buildTypeScript`、`testedConsumerTypeScript`、`consumerTypeScriptSupport`；后两者在消费验证前保持空数组，不宣称已支持。TS6 是否可消费 TS7 发出的声明，要由 Task2/3/5 的实际声明夹具和消费者验证。

Vue工具升级先影响Vue类型链；Angular工具升级先影响其APF/宿主；Core/DOM公共类型或JS输出目标变化则按真实依赖扩大。禁止覆盖Angular builder内部固定的Vite。样式工具只放根，Core无样式，DOM不承担视觉主题。Task6将三框架样式扩展为同源主题与密度，增加受控的theme.css/theme.scss出口，保留聚合style.css及工程标记；实际验收见[Task6记录](./task6-acceptance.md)。

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

## Task4 接入记录

根Vitest配置组织engineering/core/dom/vue/react五项目，Angular保持官方builder/TestBed。root unit按包过滤仍执行全局engineering契约，准备其五包构建/类型前置；包内独立unit可用于更快的局部检查。Core类型检查的共享platform宿主需Core和DOM声明，已通过真实TS7干净状态回归。

Task4的ci:verify依次执行版本、拓扑构建、原生类型、工程/单测、覆盖率、三浏览器；最终53项检查和15项目51项浏览器用例通过。无Volta全新源码副本也执行过npm ci及完整CI。Linux实机未验证，保留11项通过/1项部分通过的结果；2026-10-28用户确认Task4完成。

覆盖率对生产逻辑采用四项80%及缺文件门禁；Task4时五包为空API，生产N/A。Task7已纳入Button/normalize可执行逻辑，纯类型/barrel由TS6编译后AST分类并记录证据，不能按文件名排除；私有夹具单独归档。失败退出码是质量门判断依据，旧counts报告的限制见[Task4验收](./task4-acceptance.md)。[通用CI说明](./ci.md)提供命令，当前产品结果见[Task7验收](./task7-acceptance.md)。

## Task5 接入记录

check:pack重建并检查五个真实tgz，在os.tmpdir的全新目录内创建platform/vue/react/angular四个独立消费者。每个消费者先install再ci，锁文件不变；实际公共声明和私有TS7声明夹具由各自本地工具检查，Vue/Angular为TS6、React/platform为TS7，skipLibCheck=false。所有安装来自vendor真实tgz，实际解析不回到工作区；框架消费者无源码paths。此前Task2/3中“packed未验证”的历史范围由本次独立证据补充。

完整CI新增check:pack和packed三浏览器，最终根检查60/60、workspace51/51、packed51/51。五类真实输入破坏均非零拒绝，并在还原后重新完成正例。Vue/React生产SSR的HTML、水合、交互及清理通过；Angular SSR未实施。Vue浏览器图没有其他框架或开发编译器，并记录真实工程资产的raw/gzip/Brotli字节。

Task1–5用户确认完成（Task5于2026-10-28确认）；Task5 Windows本地17/17通过。Linux未执行，安装与后续验证见[环境方案](./linux-validation-setup.md)；空公共入口及私有探针不能代替未来产品API验收。详见[Task5验收](./task5-acceptance.md)、[消费复现](./packed-consumers.md)和[体积说明](./size-baseline.md)。
