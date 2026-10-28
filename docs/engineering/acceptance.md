# 五包工程验收索引

2026-10-28：Task1–5均已按用户确认标记完成；Task5开发和Windows本地17/17验收通过。最终Windows完整CI退出0：根工程/单测60/60，workspace三浏览器51/51，packed三浏览器51/51。五包均有真实tgz及仓库外原生消费者；Linux实机未执行的Task4部分结果保留。

| Task | 记录与范围 |
| --- | --- |
| 1 | 本文件下方保留2026-10-27工具链原始验收；不将历史成绩改写为后续能力 |
| 2 | [Core/DOM构建、声明、单测及消费宿主](./task2-acceptance.md) |
| 3 | [三框架原生工程、样式、预览与SSR探针](./task3-acceptance.md) |
| 4 | [根编排、覆盖率、三浏览器、无Volta及Linux边界](./task4-acceptance.md) |
| 5 | [真实tarball、隔离install/ci、原生检查、生产E2E及最终证据](./task5-acceptance.md) |

[CI命令](./ci.md)、[隔离消费复现](./packed-consumers.md)、[Vue工程体积基线](./size-baseline.md)、[Linux验证与WSL2安装方案](./linux-validation-setup.md)。Linux安装和验证暂缓，Angular SSR未实施。五包公共入口仍为空，产品组件、业务接入和公开发布未交付。

## Task1 原始工程验收记录

日期：2026-10-27（Asia/Shanghai），最终验证约11:34。范围：工具链基线；11/11本地验收项通过，自动测试15/15通过。任务状态：已完成（用户于2026-10-27确认验证通过）。

## 实际结果

| 编号 | 验证 | 当前结果 |
| --- | --- | --- |
| T1.1 | 官方 Node 发布索引及 npm registry 重新查询；精确版本、发布时间、engines/peers 与来源已保存 | PASS |
| T1.2 | 实际 Node 26.12.1 / npm 12.2.1；Volta 全局默认 Node 仍为 24.0.0 | PASS |
| T1.3 | Core/DOM/React 实际 tsc7.0.2；Vue/Angular 实际 tsc6.0.3；Angular 三个工具自身解析 TS6；Vue 显式传参 | PASS |
| T1.4 | npm install 无 force/legacy-peer-deps；npm ls --all 退出0；44条直接依赖记录、实际 peers 和锁文件检查通过 | PASS |
| T1.5 | 预发布/非精确版本、未来发布时间、TS错位、peer缺失/不兼容、coverage错版、公开peer过宽、DOM→Core缺失及lock漂移负例 | PASS |
| T1.6 | 独立工作区 npm ci 退出0；lock内容不变；安装后检查器通过 | PASS |
| T1.7 | 五包本地 tsc、vue-tsc、ng、Vitest、Playwright CLI 实际启动 | PASS |
| T1.8 | baseline.md 说明命令、TS6兼容例外、Task2–4命令交付契约和工具验证边界；README已同步 | PASS |
| T1.9 | 根、五包、四apps逐目录启动：Node26.12.1/npm12.2.1，继承路径均为 ../../package.json | PASS |
| T1.10 | PATH无Volta；真实Node/npm分离prefix，npm ci、npm run check:versions、独立node检查器与15项工程测试通过 | PASS |
| T1.11 | 构建TS与消费支持分别记录；消费验证字段留空；Core→DOM升级影响样例基于当前真实依赖 | PASS |

初次工程测试12/12通过；复核新增3项回归后，根工程和无Volta独立安装副本均15/15通过。暂时禁用校验器时7项负例失败，恢复后通过，防止测试恒绿。

`npm exec -- playwright install chromium` 退出0；Chromium、FFmpeg和Headless Shell均安装完成。无头Chromium实际启动/关闭成功，版本156.0.8078.4，连接状态为true。这里只准备后续Task2/3浏览器环境，不执行产品交互或五包E2E验收。

## 可重复命令与证据

```text
npm install --no-audit --no-fund
npm ls --all --json
node scripts/check-toolchain.mjs
npm run check:versions
npm run test:engineering -- --reporter=verbose
npm run verify:portable
npm exec -- playwright install chromium
```

`verify:portable` 在 `.artifacts/task1/portable/` 建立独立安装副本：真实Node放plain-node，真实npm放npm-prefix，PATH只保留二者和系统目录。先确认找不到Volta，再安装并核对锁文件、编译器、依赖真实路径及工程测试。复验脚本拒绝任何逃出安装副本的依赖路径。该目录处于仓库内，但不借用工作区依赖；Task5仍须另行执行仓库外tarball消费。

本地生成物全部在 `.artifacts/task1/`：

- `toolchain-report.json`：44条依赖的版本/真实路径、五包编译器输出、Vue实际传入的TS6路径、Angular工具内部TS解析。
- `npm-ls.json`、`npm-ls-all.json`：实际依赖与peer状态，退出码均0。
- `volta-inheritance.json`：十个目录的Node/npm输出。
- `negative-control.log`、`review-red.log`：负例有效性与复核回归的失败记录。
- `portable/results.json`：无Volta环境的命令、退出码和stdout/stderr；复制工作区内另有对应工具链路径报告。
- `registry-parallel.json`：本次官方registry原始核对字段；共享版已写入版本快照。
- `chromium-launch.json`：实际启动版本和连接状态。

## 复核与边界

一次独立只读复核发现两个重要问题：Windows分离npm前缀的定位，以及工作区公开peer/运行依赖契约遗漏。均加入回归测试并修正。轻微改进项为将可移植夹具放到仓库外；当前采用真实路径检查阻止向上借用依赖，目录位置的调整留待以后。

npm12默认阻止4个传递依赖安装脚本（@parcel/watcher、esbuild、lmdb、msgpackr-extract），安装退出0；未扩大安装脚本授权。Task1的实际CLI和测试已通过，Task3使用其构建能力时仍须按实际构建结果验证，不能以CLI启动代替构建验收。

没有产品组件、构建/声明消费、SSR、浏览器交互或发布结果；没有Git提交/推送。Task1验收时Task2–5未开始；当前Task2进展见[Task2验收记录](./task2-acceptance.md)。Task1已依照task-driven-dev由用户确认完成；Task2状态另见后续记录。
