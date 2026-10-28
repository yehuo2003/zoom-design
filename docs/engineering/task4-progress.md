# Task4 执行记录

日期：2026-10-27。用户已确认Task3完成，授权按原实施计划继续Task4。范围为五包质量命令、根编排、三浏览器矩阵、错误门禁、覆盖率分类及通用CI说明；不实现Task5的tgz打包或外部安装消费者。

## 执行步骤

1. 同步Task3完成、Task4进行中；核对现有独立构建和测试能力。
2. 先以失败用例建立拓扑、按包过滤、退出码和空测试门禁，再实现根workspace/check及Vitest项目配置。
3. 收敛Playwright的15项目、宿主去重、运行标识及错误采集，验证负例和三浏览器有效用例。
4. 分离生产覆盖率与工程探针统计；执行无Volta干净安装的通用质量路径，完成CI说明。
5. 全量验证、独立最终复核与必要修复；记录实际证据，用户确认前Task4保持进行中。

## 范围决定

- Ruling: 继续在用户指定的现有工作区修改，保留此前未提交内容，不创建worktree或执行Git提交。用户连续按Task验收该目录，迁移尚未提交的实现会丢失当前开发上下文。
- Ruling: 已批准的工程实施计划作为本轮设计与任务说明，直接执行，不重新开启需求设计审批。
- Ruling: Task4只建立packed参数/宿主根目录契约和失败门禁，真实tgz与隔离消费者由Task5实现，当前不声明packed验收通过。
- 环境：Windows，Node26.12.1/npm12.2.1；未发现Docker，wsl --list报告WSL尚未安装。提供Linux命令并检查可移植入口，Linux实机执行暂缺环境，不将Windows结果冒充Linux结果。

## 已执行

- 构建拓扑、依赖失败停止、目标过滤、缺脚本4项回归先失败后通过；缺脚本阶段也写exitCode=1。根Vitest的五项目与Angular官方builder已接通；根check已运行通过，后来增加的回归纳入最终CI。
- JSON门禁拒绝空、全skip、失败和缺项目报告；手工受控负例实际使root unit/check/CI均非零。生产/探针覆盖率分开归档；空公共API为N/A，未来非空生产源码缺覆盖或四项低于80%时失败。
- 配置纠正：Vitest实际选项为allowOnly=false；Playwright使用forbidOnly=true。版本和原生编译链的真实类型检查发现该区别，不绕过类型检查。
- Windows直接Node入口暴露npm/bin/npm.cmd布局识别缺口。只读核对BUG库不存在，新增真实临时CLI回归后修正解析；标准prefix布局和npm_execpath优先级保留。
- 覆盖率根目录匹配规则核对安装包源码：Vitest5选择首个包含文件的项目root。覆盖范围同时包含包相对src/test/fixtures与选定packages路径，避免漏统计及误扫apps；最终CI将复验实际统计。
- 旧runId负例先错误通过，揭示共享模块beforeEach只注册到首个文件的缺口；改成每测auto fixture后同一负例已非零。错误计数、缺失卸载也实际失败，源码finally还原；恢复后的Angular3项通过。
- verify:quality合计12/12验证（11项预期失败及1项恢复正例），包含真实单测失败对三条入口的传播；按实际results.json逐条记录，不把预期失败当质量失败。
- 三浏览器第一次执行中Chromium17项通过，Firefox/WebKit当时尚未安装，34项启动失败。浏览器安装完成后开始干净无Volta完整CI；不将该首轮写成全部通过。

## 范围决定补充

- Ruling: 根unit保留全局engineering契约，其准备阶段必须构建/检查五包的真实产物；按包过滤约束执行的单测集合与E2E宿主，不跳过全局契约的依赖。成本是按包root unit比包内独立unit更慢。
- Ruling: 类型消费者需要已发出的声明，CI在检查类型/测试之前先完成拓扑构建；保留独立原生类型检查，不用构建成功替代。后续若引入更轻的声明准备可再优化。

## 最终验证与复核

- 无Volta全新源码副本的npm ci与完整CI已退出0：工程43+五包9=52项，三浏览器15项目51/51，无skip/retry/flaky；五包生产覆盖率均N/A，探针指标另行归档。latest.json保存实际目录，依赖路径与锁文件检查通过。
- Firefox首轮干净CI50/51的具体问题已复现并修复：console.text()对Error仅返回Error，采集器现读取参数的Error.message。ReactFirefox4/4及重新创建目录的干净CI51/51通过；旧失败日志留存，不改写首轮结果。
- 原工作区npm run ci:verify也实际退出0，52项单测/工程检查及51项三浏览器通过。
- Final: fixed Core按包类型检查缺共享宿主DOM声明前置 — 真实TS7最小工作区先出现TS2307，再补Core→DOM构建，5项拓扑回归与实际Core按包命令通过；最终完整check为engineering44+五包9=53/53。
- Final: minor (deferred): 失败重跑可能保留上轮counts.json，E2E构建失败时也可能留旧原始报告。CLI/CI明确非零；验收须结合退出码与runId，不能仅凭报告存在判通过。
- Final: Ruling: Linux实机/信号清理未执行 — 当前无Linux环境，文档提供命令但T4.11只记部分通过；成本是Linux节点仍需实际验收。
- Final: Ruling: packed消费者和产品API留给Task5及产品任务 — 本轮仅工程接口与探针；成本是当前不能宣称tgz隔离消费或产品能力通过。
- Final: Ruling: 审阅者不重复执行CI — 主代理保留实际退出码与完整日志，审阅只读；成本是运行证据没有第二位执行者独立复跑。
- Task3已按用户确认完成；Task4为11项通过/1项部分通过（Linux待验证），保持进行中等待用户验收；Task5未开始。

## 2026-10-28 用户确认

用户明确确认Task4已完成并要求继续Task5，Task4状态已同步为已完成。保留上述历史验证数与Linux未执行的部分结果；Task5另行记录实际tarball及仓库外消费验收，不改写Task4交付时的范围。
