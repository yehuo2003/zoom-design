# 通用CI与质量命令

本文件不绑定GitHub、Jenkins或其他服务。适用Node26.12.1和npm12.2.1，版本来自已确认的工程快照；Volta为可选的开发便利工具，CI只需普通Node/npm。当前仅完成工程夹具，生产API覆盖率为N/A。

## 干净环境顺序

先安装上述精确Node/npm版本，确认node --version和npm --version。仓库内运行：

```text
npm ci
npm run check:versions
npm exec -- playwright install chromium firefox webkit
npm run ci:verify
```

Linux无界面工作节点应使用下列浏览器安装命令，安装浏览器所需系统依赖；Windows使用上方命令，不执行Linux系统包操作：

```text
npm exec -- playwright install --with-deps chromium firefox webkit
```

本机Linux环境的准备、安装分工与后续验证要求见[Linux验证与WSL2安装方案](./linux-validation-setup.md)；当前暂缓安装，Linux验证仍未执行。

不要省略npm optionalDependencies，TS7需要对应平台的原生编译器包。不要使用force、legacy-peer-deps或skipLibCheck绕过约束。npm12可能提示阻止传递依赖安装脚本，当前构建并未因此失败；不要为消除提示批量放开脚本。

ci:verify依次执行check、独立覆盖率、工作区三浏览器E2E、check:pack、packed三浏览器E2E，任一阶段非零即停止并原样返回失败。check内部依次检查版本、按Core→DOM→Vue→React→Angular构建、运行五包和四应用类型检查、平台声明检查，再运行engineering/Core/DOM/Vue/React的Vitest项目与Angular官方测试。部分声明消费者读取构建产物，因此先生成构建/声明前置；不以JS构建替代类型检查。

Task5的check:pack在os.tmpdir创建四个全新独立消费者，执行真实tgz检查、install/ci、原生类型/构建、实际解析、五类负例与恢复。packed E2E直接运行消费者生产构建并复用五suite。按包ci:verify仍只运行局部质量和工作区E2E，统一五包安装门禁使用独立check:pack或无过滤完整CI。详见[隔离消费说明](./packed-consumers.md)；任何本地工程验收均不代表公开发布。

## 根命令与按包过滤

```text
npm run build
npm run typecheck
npm run test:unit
npm run test:coverage
npm run check
npm run test:unit -- --package vue
npm run test:e2e -- --package vue
npm run test:e2e -- --package angular --browser firefox
npm run test:e2e:all
npm run ci:verify -- --package core --browser chromium
npm run check:pack
npm run test:e2e:packed
npm run test:e2e:packed -- --package vue --browser chromium
```

根unit/coverage始终保留engineering全局契约。全局契约读取五包真实产物和编译夹具，因此它们的构建/类型前置仍覆盖五包；单元测试本身只执行engineering及指定包，E2E仅构建目标与必要前置并只启动对应宿主。缺脚本、未发现用例、全skip、only、失败或意外页面错误都会返回非零。Angular通过官方builder运行，未塞入Vue或React的Vitest插件环境。

包内test:unit/test:coverage可独立运行，使用 --workspace @zoom-design/<name>。Core使用node；DOM/Vue/React使用各自jsdom与插件；Angular使用官方jsdom/TestBed。空公共入口的覆盖率summary标为N/A，私有test/fixtures的统计独立保存；以后生产逻辑出现时，四项80%门槛和缺失覆盖文件门禁自动生效。

## 浏览器与宿主

本地默认Chromium；最终验收执行Chromium/Firefox/WebKit，共15项目。每个测试由Playwright创建新context；retries=0，失败保留trace和截图。core/dom共用127.0.0.1:4170，Vue/React/Angular依次4171–4173。服务严格绑定端口且不复用旧进程；/__ready核对本次runId、app与mode。

常规测试禁止pageerror和console.error；导入失败负例仅按具体错误文本声明允许项，不能全局忽略。失败后通过对应HTML报告或 npm exec -- playwright show-trace <trace.zip> 定位，再单独明确重跑；不得将重跑通过改写成首轮通过。

正式packed入口读取.artifacts/task5/latest.json，只接受本次check:pack的passed状态，先复核安装文件/工具版本，再启动生产宿主。低层接口为scripts/e2e.mjs --mode packed --consumer-root <绝对目录>；不回退到workspace。消费者位于仓库外，含platform/vue/react/angular四项目及browser/index.html，Vue/React还提供各自server/ssr.js。/__imports来自真实编译图，用于精确拦截公共JS负例；readiness继续核对本次浏览器runId。CSS正例采集真实生产请求并断言computed marker。

## 报告与复现

- .artifacts/task4/workspace：每阶段包名、脚本、exitCode和失败原因。
- .artifacts/task4/unit：原始Vitest/Angular JSON与有效测试计数，按执行范围区分目录。
- .artifacts/task4/coverage/<package>：production.json、probes.json和summary.json，空API不伪报产品100%。
- .artifacts/task4/playwright/<mode>/<package>-<browser>：原始JSON、HTML、失败trace/截图和项目计数。
- .artifacts/task4/ci：CI阶段状态；进程退出码是CI判断依据，不能只检测报告文件存在。
- .artifacts/task5/latest.json和runs/<runId>：本次打包、外部安装目录、四消费者锁文件/解析/类型/构建图、五类负例、Vue体积和独立packed浏览器报告。pack状态与浏览器summary分别判断。

已知轻微限制：同范围失败重跑可能保留旧counts.json；E2E若在构建阶段失败也可能保留旧原始报告。必须同时读取本轮退出码、原始JSON状态与runId。该限制已记录，CI入口本身仍按真实失败退出。

npm run verify:quality在finally还原临时失败用例和工程探针改动，验证真实单测/E2E错误能使根和CI失败，同时检查空测试、全skip、旧runId、占用端口、错误计数和缺失卸载。运行期间不要同时启动其他质量命令或占用4170–4173。

npm run verify:ci:portable每次创建全新源码目录，排除node_modules、dist和缓存；使用独立Node/npm前缀且移除Volta PATH，执行npm ci和完整ci:verify。latest.json记录本次目录，旧运行产物不会作为前置复用。它证明普通工具链及质量入口，不是Task5包消费者。Windows实际结果、Linux尚未执行的环境限制见Task4验收记录。
