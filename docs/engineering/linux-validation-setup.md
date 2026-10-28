# Linux 验证环境与 WSL2 安装方案

> 整理日期：2026-10-28（Asia/Shanghai）。
> 状态：方案已整理，安装暂缓；尚未安装 WSL/Ubuntu，也未执行 Linux 验证。
> 本文供以后需要时执行。正式安装前重新检查机器状态、项目版本与官方支持范围。

## 1. 采用此方案的目的

在 Linux 中复用现有的构建、类型检查、单元测试、浏览器 E2E 和隔离 tarball 消费流程，补充操作系统兼容性证据。日常开发和 Angular SSR 实施可以继续在 Windows 上开展。

当前 Task1–5 已按用户确认完成。Task5 的既有 Windows 验收为 17/17；完整 CI 根检查 60/60，workspace 与 packed 三浏览器分别 51/51。Linux 未执行的事实继续保留，不计为已经通过。原始证据见 [Task5 验收记录](./task5-acceptance.md)，命令说明见 [通用 CI](./ci.md)。

## 2. Python、TS 测试与 Linux 验证的关系

| 工具或环境 | 能解决的问题 | 在本项目中的作用 |
| --- | --- | --- |
| TypeScript 类型检查 | 类型、声明与框架模板是否符合契约 | 使用各包自己的 TS7/TS6 和原生工具 |
| Vitest 等单元测试 | 规则、状态、事件与清理等运行行为是否正确 | 继续复用已存在的单元测试 |
| Playwright E2E | 原生宿主、浏览器交互、CSS、SSR/水合等链路是否正确 | 在相应操作系统内启动真实浏览器 |
| Python | 编排命令、处理文件、收集日志和生成报告 | 可辅助自动化，当前 npm/Node 脚本已能承担编排 |
| Linux 环境 | 同一套检查在 Linux 的文件系统、进程和原生依赖下能否运行 | 增加平台验证，无需另写一套业务测试 |

Python 在 Windows 中启动普通测试命令时，仍使用 Windows 的运行环境，不能由此获得 Linux 兼容性结论。即使通过 Python 调用 WSL 或远程 Linux，测试也需要实际运行在那套 Linux 环境中。[Python subprocess 说明](https://docs.python.org/3/library/subprocess.html#popen-constructor)

Linux 复验重点包括：文件路径大小写、TS7 对应平台的原生编译器、命令参数与进程退出、浏览器系统库，以及干净安装后的打包和消费。干净安装本身在 Windows 也能验证；新增 Linux 环境才能补充 Linux 平台结果。

## 3. 环境选择与本机检查记录

本机采用 WSL2＋Ubuntu，与现有 Windows 共存。优先选择 Playwright 支持的 Ubuntu 版本，例如 24.04；安装时重新核对支持范围和在线发行版名称。也可以改用远程 Linux CI 或 Linux 虚拟机，无须一定在本机安装。[WSL 安装方式](https://learn.microsoft.com/en-us/windows/wsl/install)、[Playwright 系统要求](https://playwright.dev/docs/intro#system-requirements)

2026-10-28 的只读检查记录：

| 项目 | 检查结果 |
| --- | --- |
| Windows 版本 | 24H2，构建 26100；满足 WSL 安装命令的基本系统版本要求 |
| WSL | `wsl --status` 提示尚未安装；存在 wsl.exe 不代表 WSL 已安装 |
| 当前命令会话 | 未以 Windows 管理员权限运行；不据此判断账户是否具备管理员资格 |
| 硬件虚拟化 | 尚未确认；相关只读查询被拒绝，不能据此判断支持或不支持 |
| Python | 已发现本机 Python 可执行文件；无需为本方案另写 Python 测试框架 |

这些记录只代表检查时的状态。将来开始安装前，需要重新确认 Windows 权限、CPU/固件虚拟化、可用磁盘与内存，以及下载 WSL、Ubuntu、npm 包和浏览器的网络条件。若虚拟化未开启，按微软排障说明处理。[WSL 安装排障](https://learn.microsoft.com/en-us/windows/wsl/troubleshooting#installation-issues)

## 4. 安装分工

| 步骤 | Agent 可处理的工作 | 用户需要配合的工作 |
| --- | --- | --- |
| 安装准备 | 检查系统、已有发行版、版本和安装命令 | 决定开始安装的时间 |
| 启用 WSL、安装 Ubuntu | 准备并在获得安装授权后发起命令 | 确认 Windows 管理员/UAC 提示，必要时在管理员终端执行 |
| 系统重启 | 记录进度和重启后应检查的项目 | 保存工作并自行选择重启时间 |
| 首次 Ubuntu 初始化 | 指导创建用户、核对环境 | 在本机设置用户名和密码；不通过聊天发送密码 |
| 虚拟化设置（如需要） | 依据实际错误给出操作指引 | 进入 BIOS/UEFI 完成设置 |
| 项目工具链与验证 | 安装配置 Linux 工具、准备源码副本、运行检查并整理证据 | 按需在本机处理 sudo 提示 |

本文件仅保存方案。系统安装、管理员确认与重启在以后用户明确要求实施时处理。

## 5. 以后安装时的操作顺序

### 5.1 Windows：重新检查并安装

在 PowerShell 中检查：

```powershell
wsl --status
wsl --list --verbose
wsl --list --online
```

尚未安装时，部分检查命令可能返回未安装提示。不要把该提示记为 Linux 测试失败。已有可用 WSL2 和受支持发行版时，优先复用，避免重复安装。

管理员 PowerShell 的基础安装命令为：

```powershell
wsl --install
```

该命令默认安装 Ubuntu。若在线列表包含 `Ubuntu-24.04`，希望固定该发行版时，用下面的命令替代上面的基础命令：

```powershell
wsl --install -d Ubuntu-24.04
```

两条安装命令选择其一。按安装提示处理重启；首次打开 Ubuntu 后，由用户创建 Linux 账户和密码。管理员终端、重启及首次账户设置的要求见 [微软安装说明](https://learn.microsoft.com/en-us/windows/wsl/install)。

重启及初始化完成后，在 PowerShell 中确认目标发行版的 VERSION 为 2：

```powershell
wsl --list --verbose
```

如果实际 Ubuntu 版本、WSL 模式或错误信息与方案不同，先按实际状态调整。重新检查 Playwright 的系统支持范围，再准备浏览器依赖。

### 5.2 Ubuntu：准备 Linux 工具链

进入 Ubuntu，确认系统：

```bash
uname -s
cat /etc/os-release
```

按照项目届时的 `package.json`、锁文件和版本快照安装 Linux 版 Node/npm。本文整理时的固定版本为 Node 26.12.1、npm 12.2.1；这是既有工程基线，不代表将来的最新版本。可以采用 Linux 内独立安装的 Volta 或其他 Node 安装方式，普通 npm 命令不依赖 Volta。

安装指定版本的 Linux Node 后，将 npm 对齐到项目要求；当前快照对应的命令为：

```bash
npm install --global npm@12.2.1
```

安装完成后核对：

```bash
command -v node
command -v npm
node -p "process.platform"
node --version
npm --version
```

`process.platform` 必须为 `linux`，实际 Node/npm 版本必须与将要验证的项目快照相符。使用 Linux 内的工具，避免 PATH 意外选择 Windows 的 node.exe、npm.cmd 或 Windows Volta。保留 Vue/Angular 的 TS6 与 Core/DOM/React 的 TS7 隔离，由 `npm ci` 安装各自依赖。

### 5.3 Ubuntu：准备独立源码目录

将实际待验收源码放入 Linux 文件系统，例如 `/home/<Linux用户名>/projects/zoom-design-linux`。Linux 工具直接操作 Linux 文件系统可获得更好的性能，也便于按其路径大小写行为验证；不要只在 `/mnt/e/project/zoom-design` 中借用 Windows 安装结果。[微软文件系统建议](https://learn.microsoft.com/en-us/windows/wsl/filesystems)

源码来源应包含实际待验证的工作内容：

- 已经提交且可获取的版本，可以重新 clone/checkout。
- 存在未提交或未跟踪文件时，按实际工作树生成完整源码副本并核对文件清单；不能假定 clone 已包含这些文件。
- 保留根与子项目的 manifest、`package-lock.json`、构建/测试配置、scripts、apps、packages、tests、e2e 及所需私有工程夹具。
- 不复制 Windows 的 `node_modules`、`dist`、缓存、旧 `.artifacts` 或浏览器安装目录；不在本轮操作原 Windows 工作目录。

在 Linux 副本内重新安装依赖。保留 optionalDependencies，以安装 TS7 对应平台的原生编译器；不使用 force、legacy-peer-deps 或跳过类型检查来绕过约束。

### 5.4 Ubuntu：安装依赖并运行现有 CI

在 Linux 源码副本根目录按顺序执行；前一步失败时先处理原因，再执行下一步：

```bash
npm ci
npm run check:versions
npm exec -- playwright install --with-deps chromium firefox webkit
npm run ci:verify
```

`--with-deps` 会安装浏览器所需 Linux 系统包，可能要求 sudo；密码由用户在本机输入。该步骤与浏览器安装方式依据 [Playwright CI 说明](https://playwright.dev/docs/ci)。不需要为无头验证额外安装完整 Linux 桌面。

当前完整 `ci:verify` 依次运行：check、coverage、workspace 三浏览器、check:pack、packed 三浏览器。无过滤运行才能覆盖最终五包打包与消费流程。运行前确认本轮 Linux 环境内的 4170–4173 端口可用，临时目录可写，并避免同时运行其他完整质量命令。

## 6. Linux 验证通过的记录要求

未来实际执行时，单独新增 Linux 验证记录，至少包括：

1. 执行日期、源码版本或实际工作树标识、Ubuntu/WSL/CPU 架构、Node/npm 和工具链版本。
2. 干净安装与各阶段命令的退出码、实际测试数量、跳过/失败情况；以后用例增加时按实际数量报告。
3. 本轮 `.artifacts/task4/ci`、unit、coverage、workspace 浏览器报告，以及 `.artifacts/task5/latest.json` 和对应 runId 目录。
4. 四个隔离消费者确实位于 Linux 临时目录，使用 Linux 内独立安装的工具，解析没有回流到 Windows 工作区。
5. 失败原因、修复和重跑分别留痕；读取本轮退出码、runId 与原始报告，不凭旧报告文件存在判断通过。

当前 60/60、51/51 等数字仅为已有 Windows 结果，不预填为 Linux 成绩。将来实际通过后再补充 Task4 的 Linux 验证证据；当前保留 T4.11 部分通过的历史范围。[Task4 验收记录](./task4-acceptance.md)

## 7. 与 Angular SSR 的关系及后续状态

Linux 验证与 Angular SSR 是两个独立事项。安装 WSL 不会自动交付 Angular SSR；Angular SSR 可以在 Windows 上实施。

当前 Angular 仅完成原生 APF 与浏览器/zoneless 工程探针。后续若开展 Angular SSR，需要单独实现服务端入口和 HTTP HTML、客户端 hydration、交互与卸载清理，并在 workspace 与 packed 消费者中加入对应断言。Vue/React 已有的工程 SSR 探针不能替代 Angular 结果，也不能替代未来产品组件的 SSR 验收。

| 事项 | 本次文档整理后的状态 |
| --- | --- |
| Task1–5 工程开发 | 已按用户确认完成；以已有验收记录为依据 |
| WSL2/Ubuntu 安装 | 暂缓，待以后需要时实施 |
| Linux 完整验证 | 未执行，待环境准备后补充 |
| Angular SSR | 未实施，作为独立后续工作 |
| Task6–14 产品任务 | 未开始；本次不启动下一 Task |

日常可继续运行 Windows 的类型检查、相关单元测试与 E2E。以后需要补充跨平台证据时，再执行本方案；使用远程 Linux CI 时沿用相同的工具链、干净安装和证据要求。
