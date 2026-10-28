# Task3 工程验收记录

日期：2026-10-27（Asia/Shanghai）。Task2已获用户确认完成；Task3已实现并通过17/17本地用例，最终独立复核的问题已修复并回归，状态：已完成（2026-10-27用户确认）。范围为三框架工程基线和私有宿主，公共入口仍为空，未交付产品组件。

## 用例与证据

| 编号 | 实际验证 | 当前结果 |
| --- | --- | --- |
| T3.1 | Vue包和宿主各自解析TS6/vue-tsc；SFC源码和编译声明检查通过 | PASS |
| T3.2 | 错误prop/emit的SFC仍可被Vite转换为JS，但vue-tsc明确拒绝两个类型错误 | PASS |
| T3.3 | 独立TS6配置从已发出的.vue.d.ts推断prop/事件；私有探针未公开 | PASS |
| T3.4 | Vue原生单测及Chromium验证父prop更新、计数事件和卸载 | PASS |
| T3.5 | React使用TS7/React19.3.1；私有编译夹具的react/jsx-runtime等保持external | PASS |
| T3.6 | JSX/props正例、声明消费通过；TS2322负例被实际编译器拒绝 | PASS |
| T3.7 | StrictMode下交互、父prop变化、effect状态与卸载均可观察 | PASS |
| T3.8 | Angular官方CLI/build/compiler/ng-packagr实际使用TS6，原生APF构建与编译夹具通过 | PASS |
| T3.9 | 生产APF及私有组件APF为partial；声明和真实产物可供官方应用构建 | PASS |
| T3.10 | --list-tests列出包根test/build-probe.spec.ts；官方builder/TestBed测试1/1通过 | PASS |
| T3.11 | 默认zoneless原生Angular应用在Chromium完成交互，无zone.js补丁 | PASS |
| T3.12 | 三框架实际CSS资产被消费构建和浏览器加载，computed自定义属性为1，sideEffects保留CSS | PASS |
| T3.13 | Vue/React真实JS/声明出口，Angular生成APF主出口和附加CSS出口均有效；框架peer/external符合各自构建链 | PASS |
| T3.14 | Vue/Angular TS6分别消费TS7发出的Core/DOM声明夹具，skipLibCheck=false | PASS |
| T3.15 | 三包均提供独立build/typecheck/unit/coverage/E2E命令，失败返回非0 | PASS |
| T3.16 | 5171真实预览、SCSS修改后自动重建可观察、错误TS停服、受管SIGINT清理进程树通过；工具终端按键限制见下文 | PASS（自动验证） |
| T3.17 | 三框架SCSS输出约定CSS；真实Sass错误删除旧输出并失败；Angular生成CSS由ng-packagr复制为APF资产 | PASS |

当前已执行：工程测试34/34；Vue/React/Angular各1项原生单测通过，Core/DOM回归各3项通过；三框架独立Chromium为3+3+2项，全工作区Chromium集成回归12/12通过且正常退出。TypeScript/SFC/JSX/Angular模板正反例均实际执行，预期错误不计为失败结果。`npm ls --all --json`退出0。版本检查覆盖75条依赖和10个实际编译器入口。

独立复核发现Vue消费者依赖Task2预先生成的Core/DOM声明夹具。新增回归临时移走该生成目录，先实际复现TS2307，再让Vue独立检查使用根TS7主动发出这些声明；修复后该用例和完整34项工程回归通过。没有遗留Critical/Important复核项。

无Volta回归使用独立Node/npm目录，PATH中不含Volta：npm ci、两种版本检查入口及15项工具链测试全部通过，锁文件未变化。该manifest-only副本只证明安装和工具链可移植性，不替代Task5外部包消费。Vue/React的coverage命令各运行1项测试，私有探针所有统计项100%；Angular官方coverage的statements/branches/lines为100%、functions为85.71%，均非产品覆盖率。

## 命令

```text
npm run check:versions
npm run build --workspace @zoom-design/vue
npm run build --workspace @zoom-design/react
npm run build --workspace @zoom-design/angular
npm run typecheck --workspace @zoom-design/vue
npm run typecheck --workspace @zoom-design/react
npm run typecheck --workspace @zoom-design/angular
npm run test:unit --workspace @zoom-design/vue
npm run test:unit --workspace @zoom-design/react
npm run test:list --workspace @zoom-design/angular
npm run test:unit --workspace @zoom-design/angular
npm run test:engineering
npm run test:e2e --workspace @zoom-design/vue
npm run test:e2e --workspace @zoom-design/react
npm run test:e2e --workspace @zoom-design/angular
npm run test:e2e:workspace
node scripts/check-dev.mjs
npm run verify:portable
```

`test:e2e:platform`保留Core/DOM范围，`test:e2e:workspace`覆盖当前五包的Chromium工程项目。其他浏览器和统一五包unit/check编排留在Task4。

## 预览与关闭

```text
npm run dev:platform
npm run dev:vue
npm run dev:react
npm run dev:angular
```

端口分别为5170–5173，只监听127.0.0.1。初始构建通过后启动原生宿主；包源码和样式变化会先暂停服务，完整重建JS/声明/CSS，再重启宿主，浏览器通过原生Vite重连刷新。编译失败会输出错误、关闭服务及该次子进程，避免将旧产物当成功预览。应用自身源码由对应原生开发服务器监听。

5171预览由真实浏览器加载并交互，截图`.artifacts/task3/vue-dev-watch.png`已查看。临时SCSS和错误TS源码在验证finally中还原，随后重建Vue恢复产物。自动验证在受管Node父进程中通过私有IPC转发SIGINT，走与终端中断相同的停止处理器，确认exit0且5171关闭；独立进程树测试还确认孙进程被终止。

工具终端向早先会话注入Ctrl+C未触发应用中断，该次已按确认的runId清理，没有保留进程。真实终端的物理按键交互仍由用户验收；这里不将IPC转发写成手动按键已验证。受限命令环境拒绝taskkill时，生命周期测试需在允许管理自己子进程的环境运行，不能静默跳过该测试。

## Angular产物与CSS的工作区约定

Angular正式产物在`dist/angular`，主JS/声明/附加CSS出口由ng-packagr生成。官方应用通过其本地tsconfig的paths映射包名到该真实APF目录，未映射产品src。Task5的外部tgz消费者必须使用真实安装并移除工作区映射。

原生Angular CLI未将JS侧CSS导入自动插入index.html，因此宿主使用原生styles配置加载`dist/angular/styles/style.css`；公共`./style.css`出口及实际文件另行检查。该资源来自`.generated/style.css`，由根Sass编译后经ng-packagr assets复制。专用组件APF验证了ngDeclareComponent和声明，夹具没有进入正式空公共包。

Vue/React同时提供服务端HTML、真实客户端水合及原节点保留的Chromium证据。Angular本轮没有SSR/水合实现，`/ssr`明确返回404，不宣称Angular组件SSR通过。

## 报告与能力边界

- `.artifacts/task3/engineering-final.log`：34项工程测试，含样式失败、干净夹具类型检查和受管进程树清理。
- `.artifacts/task3/vue-clean-state-red.log`、`vue-clean-state-green.log`：独立命令的失败复现和修复回归。
- `.artifacts/task3/vue-checks.json`、`react-checks.json`及`angular-tool-resolution.json`：编译器路径、类型消费和预期反例诊断。
- `.artifacts/task3/playwright/all-results.json`及`workspace-e2e-final.log`：全工作区12/12 Chromium集成回归；同目录保留按包报告。
- `.artifacts/task3/dev-validation.json`、`dev-validation.log`：实际预览、重建、失败停服和SIGINT清理。
- `.artifacts/task3/portable-final.log`及`.artifacts/task1/portable/results.json`：无Volta重新安装和15项工具链回归。
- `.artifacts/task3/vue-coverage-final.log`、`react-coverage-final.log`：两框架独立coverage命令及私有探针统计；Angular结果见专属报告。
- `.artifacts/fixtures/vue|react|angular`：独立编译/声明/APF夹具产物，未进入正式公共入口。
- 各框架范围详情见[Vue报告](./task3-vue-report.md)、[React报告](./task3-react-report.md)、[Angular报告](./task3-angular-report.md)。

样式只使用工程验证标记，不是产品主题；公共入口为空，产品逻辑覆盖率为N/A，原始夹具覆盖率不能代表产品覆盖率。正式发布、全浏览器、仓库外tgz隔离消费、体积基线和产品API兼容性仍未验证，分别属于Task4–5及后续产品任务。
