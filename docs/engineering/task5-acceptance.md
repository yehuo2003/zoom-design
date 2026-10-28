# Task5 工程验收记录

2026-10-28，Asia/Shanghai。Task4已按用户确认标记完成；Linux未执行的事实保留。Task5开发和Windows本地验收17/17通过，已于2026-10-28按用户确认标记为已完成。范围为五个空公共入口及私有工程探针，不包含产品组件、业务接入或公开发布。

## 最终证据

`npm run ci:verify`退出0，包含根check、coverage、workspace三浏览器、check:pack和packed三浏览器五个阶段。根工程/单测60/60（engineering51、Core3、DOM3、Vue1、React1、Angular1）；coverage也执行60项，五包生产API均N/A，探针统计独立。两个浏览器模式各15项目51/51，无skip、retry或flaky。

本次打包runId：48857888-4b10-41d9-a46a-38cfc3fedcb7。消费者位于C:/Users/linzhuming/AppData/Local/Temp/zoom-design-packed-6osuHL，使用os.tmpdir创建后以原生realpath统一Windows短路径。所有包、编译器和运行时从消费者自己的node_modules解析；安装数据和工具版本有逐项记录。

| 用例 | 实际结果与证据 | 结果 |
| --- | --- | --- |
| T5.1 | 重建五包，Core/DOM/Vue/React在包目录pack，Angular在dist/angular的APF目录pack；保存npm实际文件名 | PASS |
| T5.2 | dry-run先检查文件/出口，真实tgz再次检查manifest、JS、声明、CSS、依赖、SHA256；无test/fixture/node_modules/秘密配置 | PASS |
| T5.3 | 仓库外四个private消费者，vendor复制本次tgz；platform含Core/DOM，框架分别含Core/DOM与自身包 | PASS |
| T5.4 | import.meta.resolve、原生realpath、逐资产摘要、非junction安装、内部路径拒绝；无paths/外部extends/NODE_PATH | PASS |
| T5.5 | 消费者自身Node子进程在没有window/document时导入Core/DOM | PASS |
| T5.6 | Vue本地vue-tsc3.3.13显式使用TS6.0.3；SFC输入/事件正反例及三浏览器交互通过 | PASS |
| T5.7 | React本地TS7.0.2检查TSX/声明和错误props/回调；生产宿主三浏览器通过 | PASS |
| T5.8 | Angular本地TS6.0.3、ngc及官方application builder使用实际APF包，严格模板正反例和zoneless交互通过 | PASS |
| T5.9 | 四消费者检查真实公共声明及TS7发出的泛型/回调/联合声明；TS6正例通过，错误返回值/联合/参数被拒绝，skipLibCheck=false | PASS |
| T5.10 | CSS出口摘要等于tgz资产；构建图/原生styles从安装包取CSS；三浏览器记录生产CSS请求并检查computed marker | PASS |
| T5.11 | Vue/React构建图仅有各自消费者的一份运行时，空库未含运行时代码；Angular由原生APF编译图及peer解析验证 | PASS |
| T5.12 | packed五suite×三浏览器15项目51/51；与workspace的另51项分别归档 | PASS |
| T5.13 | Vue/React生产SSR的import/render/HTTP HTML/同节点水合/交互/清理均通过；Angular SSR未实施 | PASS（按计划范围） |
| T5.14 | 缺tgz、错误exports、缺CSS、漏声明Core依赖、Vue实际安装错误TS7均使检查器退出1；finally还原后全流程通过 | PASS |
| T5.15 | 四消费者均独立install和ci，锁文件SHA256不变，依赖树退出0；规划/README/验收与实际范围同步 | PASS |
| T5.16 | Vue运行依赖及浏览器图没有React/Angular、TS/Sass编译器、测试工具或仓库apps；消费者开发工具与浏览器依赖分开记录 | PASS |
| T5.17 | Vue工程页面的实际引用资产按文件压缩并去重；raw70677、gzip27672、Brotli25026字节，标明engineering范围 | PASS |

## 复现与报告

```text
npm run check:pack
npm run test:e2e:packed
npm run check
npm run ci:verify
```

本次完整CI同时执行上述门禁对应的Node入口；独立命令及按包浏览器命令见[隔离消费说明](./packed-consumers.md)。

- .artifacts/task5/ci-final.log：完整原工作区CI，最终退出0。
- .artifacts/task4/ci/all-all.json：五阶段exitCode均为0；unit/all/counts.json为60项计数。
- .artifacts/task4/playwright/workspace/all-all：本次workspace三浏览器的原始JSON、HTML及计数。
- .artifacts/task5/latest.json及runs/48857888-4b10-41d9-a46a-38cfc3fedcb7/state.json：本次passed状态、时间、外部目录和全部子命令。
- 同一run目录的tarballs、packages.json：五个真实tgz、版本、文件清单、SHA256及npm完整性摘要。
- platform/vue/react/angular子目录：install.json包含实际manifest/lockfile及摘要；resolution.json记录独立路径/工具；reports包含原生类型正反例和构建输出；module-graph.json记录运行时来源。Angular另存native-stats.json。
- negative.json和logs：五类实际拒绝与恢复命令；错误TS7已由Vue自身npm ci恢复为TS6。
- e2e-all-all/summary.json及playwright：本次packed三浏览器51项、生产CSS请求附件、SSR与错误控制。
- size-baseline.json：逐资产摘要和压缩字节；共享版见[体积说明](./size-baseline.md)。

当前精确Node26.12.1/npm12.2.1，TS7.0.2/TS6.0.3、Vue3.5.44、React19.3.1、Angular22.2.3。沿用2026-10-27已确认快照，不宣称重新查询了10月28日最新版本；各消费者工具和实际解析路径以本次报告为准。

## SSR与能力范围

| 消费范围 | import | server render | HTTP HTML | client hydration | interaction | cleanup |
| --- | --- | --- | --- | --- | --- | --- |
| Core/DOM | PASS：独立Node，无浏览器全局 | N/A | N/A | N/A | PASS：工程探针 | PASS：DOM监听 |
| Vue工程探针 | PASS | PASS | PASS | PASS：保留首个服务器节点 | PASS | PASS：disposed |
| React工程探针 | PASS | PASS | PASS | PASS：保留首个服务器节点 | PASS | PASS：effect inactive |
| Angular工程探针 | PASS：浏览器/APF | 未实施 | 未执行 | 未执行 | PASS：zoneless | PASS：destroy |

这些是编译与消费工程证据。当前五包公共入口仍为空，正式组件、主题、真实组件SSR、业务接入与公开发布未交付；后续产品任务应扩充公共出口和相应消费断言。Vue体积包含消费者自己的Vue运行时与私有探针，不能解释为组件库大小或相对其他Vue库的节省。

Task4的无Volta干净源码CI有既有证据；本次完整Task5 CI在当前Windows执行，未重跑该无Volta副本，也未执行Linux。完整CI后独立复核的结果在Task5执行记录中保留。2026-10-28用户要求完成Task5状态更新并暂缓Linux安装，后续按[Linux验证与WSL2安装方案](./linux-validation-setup.md)补充；本次状态同步未重新运行测试，也未将Linux或Angular SSR标记为通过。

独立只读复核无Critical/Important；两项Minor均为规划中的旧状态/旧命令，已按本次文档同步要求修正。没有遗留本轮Minor，没有改变实现或重复派发复核。

## 失败历史

原生Angular首次受限运行无法读取临时目录祖先；允许本地构建后，发现8.3路径差异及模板noEmit配置问题，分别以原生realpath和独立配置修正。初次packed Chromium16/17，Vue负例拦截错chunk；改为按真实JS出口定位后Vue4/4，再由最终矩阵51/51确认。第一次完整CI中新增测试读取全局声明夹具，与已有清空夹具回归并发竞争；改为独立配置测试后，最终60/60通过。未增加skip/retry，也未放宽类型或运行错误断言。详见[执行记录](./task5-progress.md)。
