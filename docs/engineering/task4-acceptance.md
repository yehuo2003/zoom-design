# Task4 工程验收记录

日期：2026-10-27，Asia/Shanghai；2026-10-28用户确认Task4已完成。Task4实现五包质量入口、根编排、三浏览器矩阵及通用CI，状态已完成。Linux实机尚未验证，不能将全部12项写为通过；Task5继续实施隔离消费。

## 验收结果

| 用例 | 实际证据 | 结果 |
| --- | --- | --- |
| T4.1 | Core→DOM→Vue→React→Angular拓扑；真实子命令失败停止后续、保留退出码；缺脚本也写失败阶段 | PASS |
| T4.2 | 干净CI52项；最终复核后完整check执行engineering44、Core3、DOM3、Vue1、React1、Angular1，共53项；Core没有DOM全局 | PASS |
| T4.3 | 根Vitest五项目隔离插件/环境；Angular仍由官方builder初始化TestBed，并加载最小原生runner配置 | PASS |
| T4.4 | root unit保留engineering及目标包，E2E仅启动必要宿主；Core共享宿主的DOM声明前置另经真实TS7回归 | PASS |
| T4.5 | 五suite×三浏览器15项目，51项全部执行；Core/DOM共用platform，服务按app去重 | PASS |
| T4.6 | 占用4170及旧runId实际使命令失败；readiness已改为每测auto fixture | PASS |
| T4.7 | pageerror、意外console.error、错误计数和缺失卸载均被故意失败验证发现；Firefox从控制台Error参数提取具体消息 | PASS |
| T4.8 | 默认每测新context，无固定sleep；重载/清理分别断言；负例失败保存项目名、trace与截图 | PASS |
| T4.9 | 五包生产覆盖率均N/A，探针统计独立；生产源码缺报告或四项低于80%会失败 | PASS |
| T4.10 | verify:quality验证11项预期失败及1项恢复正例，包含根unit/check/CI真实失败传播、空测试和全skip拒绝 | PASS |
| T4.11 | Windows原工作区和无Volta干净源码副本的通用入口通过；WSL未安装，无Docker/Linux执行环境 | 部分通过：Linux待验证 |
| T4.12 | 命令、报告、首轮失败与修复、环境及工程/产品边界记录于本文件和CI说明 | PASS |

当前为11项通过、1项部分通过。最终复核修复后，完整check53/53通过；共享宿主/浏览器代码未随该修复改变，三浏览器51/51结果保留。2026-10-28按用户确认将Task4标记已完成，Linux实机验证仍未执行。

## 已执行命令与报告

```text
npm run check
npm run typecheck -- --package core
npm run ci:verify
npm run verify:quality
npm run verify:quality -- stale-run-id-rejected
npm run test:e2e -- --package react --browser firefox
npm run verify:ci:portable
```

完整原工作区CI及无Volta干净CI均退出0；三浏览器51项均无skip、retry或flaky。干净副本每次新建，排除已有node_modules、dist和缓存，锁文件经npm ci未变化；依赖解析路径核对在副本以内。它属于源码质量重建，不能代替Task5的tgz消费者。

- `.artifacts/task4/ci-final.log`、`ci/all-all.json`：原工作区完整CI。
- `.artifacts/task4/playwright/workspace/all-all/`：51项原始JSON、HTML及分项目计数。
- `.artifacts/task4/portable-ci-final.log`、`portable-ci/results.json`、`portable-ci/latest.json`：无VoltaCI状态与本次源码目录；副本内保留全部原始报告。
- `.artifacts/task4/negative/results.json`及逐项日志：11项预期失败和1项恢复正例；复验为首次8项、修复就绪fixture后续跑4项。
- `.artifacts/task4/core-typecheck-clean-red.log`、`core-typecheck-clean-green.log`：真实TS7最小工作区在无DOM声明时的TS2307复现及5项拓扑回归。
- `.artifacts/task4/check-after-review.log`、`core-typecheck-final.log`：修复后完整53项回归及实际Core按包入口。
- `.artifacts/task4/linux-availability.json`：Windows环境/WSL未安装的实际记录；未运行Linux命令。

## 覆盖率与能力边界

| 包 | 生产API | 私有探针 statements / branches / functions / lines |
| --- | --- | --- |
| Core | N/A | 100 / 100 / 100 / 100 |
| DOM | N/A | 100 / 100 / 100 / 100 |
| Vue | N/A | 100 / 100 / 100 / 100 |
| React | N/A | 40.91 / 100 / 50 / 47.06 |
| Angular | N/A | 100 / 100 / 85.71 / 100 |

以上来自完整CI的独立summary.json。React范围包括原生编译/SSR夹具入口，其中部分只用于构建和浏览器；不能将此前仅BuildProbe的100%套用于扩大后的统计范围。探针不使用产品80%门槛；未来生产源码单独执行四项80%及缺文件门禁。当前公共入口为空，无产品组件、主题或产品覆盖率声明。

Vue/React已有工程SSR/水合回归，Angular SSR仍未实施。packed仅建立外部consumer根目录参数/模式门禁，真实tgz、安装隔离和体积验证属于Task5。运行和Linux配置见[通用CI说明](./ci.md)。

## 失败历史与最终复核

第一次矩阵运行的Chromium17项通过，Firefox/WebKit尚未安装导致34项启动失败；安装完成后，第一次干净CI为50/51，Firefox将console.error(Error)的text简化为Error。采集器改从参数读取Error.message后，React Firefox4/4及完整矩阵51/51通过。没有增加重试或放宽成通用Error白名单。

独立只读复核发现1项Important：按Core类型检查需要共享platform宿主的DOM声明。真实TS7回归先失败TS2307，再补充Core→DOM构建前置；5项拓扑回归、实际按包入口及完整53项检查通过。没有遗留Critical/Important项，没有重复派发复审。

另有1项Minor暂缓：同一范围成功后失败重跑，旧counts.json可能仍保留；E2E构建失败时也可能保留上一次原始结果。CLI/CI均明确非零，不能仅凭报告存在或旧计数认定本轮通过。最终结果应结合退出码与原始JSON的runId/状态读取。

Linux实机信号/浏览器系统依赖尚未验证；真实packed消费/产品API留在Task5及产品任务；审阅者未复跑CI，运行证据由主代理实际执行。以上范围决定与过程详见[Task4执行记录](./task4-progress.md)。
