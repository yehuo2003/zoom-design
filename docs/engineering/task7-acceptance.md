# Task7 Vue Button 验收

实施日期：2026-10-28，Asia/Shanghai；用户验收日期：2026-10-29。Task6已由用户确认完成；本记录仅覆盖Task7。**Task7已完成：40/40自动验收通过，2026-10-29用户确认“验证通过，请将Task7标记为已完成”。** Task8、Q0独立维护、Linux实机、Angular SSR、公开发布与业务接入未纳入实施。

交付为单根原生ZButton、根/子路径公开JS与六项类型、独立Button CSS、聚合CSS、公开用法、/button和真实产品SSR。所有状态由实例props派生，不依赖Core/DOM服务或共享主题对象。

| 检查层 | 当前实际证据 |
| --- | --- |
| Node/npm | 26.12.1 / 12.2.1；Vue TS6.0.3 / vue-tsc3.3.13 / Vue3.5.44，工具链沿用Task6快照 |
| 单测先行 | 最小button占位下13项实际执行，10失败/3通过；修复后Vue16/16，完整五包含工程共95/95 |
| 生产覆盖率 | 修复后Button.vue与normalize.ts，语句31/31、函数10/10、分支27/28、行26/26；纯类型/barrel由TS6编译后AST分类，probe单独统计 |
| 类型 | 真实生成声明的plain TS6和vue-tsc正例；13项精确产品负例；旧SFC fixture原有2项诊断保留 |
| 工程门禁 | 最终16文件71/71；含Sass失效、外部runtime helper/实现区分、子路径定位、AST覆盖率和TS/tree shaking回归 |
| workspace三浏览器 | 修复后五包132/132；Vue93/93，各浏览器31项（原probe4、主题9、Button18），无skip/todo |
| 仓库外消费者 | 最终pack e302e0db-f49d-48cc-86ca-f5c2b4f109a0通过；五包四消费者install/ci、原生类型/构建/SSR、12类命名负例与逐项恢复、4类独立Sass负例、1项真实保留实现负例均通过 |
| 五包完整CI | 最终候选bf6ce646-3195-443e-bac7-83cf9ee1ff0f，退出0；95项单元、workspace及packed各132项、全部产物与负例通过 |
| 普通Node/npm干净副本 | 无Volta PATH，npm ci与完整CI退出0；95项单元、workspace及packed各132项，无skip/retry；200个源码/配置摘要与最终候选一致 |
| 独立审查 | 一次fresh-context只读审查发现2项重要问题，均已RED→GREEN修复；无延后minor。最终全量结果独立验证 |

初次新测试因模块不存在而无法收集，该结果未当作功能RED；用最小原生button占位后实际执行13项得到RED。浏览器首轮15项新增失败，原13项通过。后续无名称负例错误地包含title，浏览器正确识别其名称；去掉该fixture title后84/84通过，再补独立CSS、三外观状态和有效表单prevent用例后90/90通过。

首个packed试验96ce3b54-b1d8-4082-8d24-eb671e27cf76在Vue原生类型检查停止：示例aria-busy字面量推断为string，不符合Booleanish。已保留字面量类型，未放宽产品类型。后续聚焦pack及90项packed浏览器通过。

独立审查确认动态大写TYPE/DISABLED/ARIA可绕过原有精确键比较，破坏原生默认type与禁用语义。新增两个单测实际失败后改为大小写规范比较，单测通过并加入真实浏览器无提交回归。另确认旧unused导入在TS转换阶段已消失，不能证明tree shaking；新增真实Oxc转换与模块证据回归先失败后修复，外部自身Vite也执行了保留实现负例及字节一致恢复。该轮审查前的CI在workspace浏览器阶段主动中止，归档为未通过；最终CI必须使用修复后候选。审查范围与修复日志见.artifacts/task7/review.md。

SFC宏编译因根TS7不再提供ts.sys，显式传入Node文件系统；声明与消费者检查仍从Vue自身解析TS6。未升级依赖，未用skipLibCheck或源码alias掩盖兼容问题。标准Vue CSS消费者继续不声明或安装Sass，可选Sass夹具独立。

以下40项均为PASS，分层证据互不替代；浏览器实际发现数为五包132项，单测实际95项。

| 编号 | 验证入口 |
| --- | --- |
| T7.1 | button.spec默认单根、button.e2e原生默认 |
| T7.2 | normalize/组件非法枚举；生产浏览器非法type回退 |
| T7.3 | Boolean纯函数与Vue转换；生产警告和禁用负例 |
| T7.4 | browser三外观默认/hover/active/disabled/focus |
| T7.5 | browser三尺寸×两密度/block/RTL |
| T7.6 | 单测原始MouseEvent身份与次数，browser实际点击 |
| T7.7 | browser Tab、Enter、Space |
| T7.8 | browser禁用、Tab跳过与恢复 |
| T7.9 | browser加载正文/busy/spinner/焦点，unit独立状态更新 |
| T7.10 | unit与browser禁用fieldset合成dispatch守卫 |
| T7.11 | unit/browser once/prevent/stop，合法表单中取消默认 |
| T7.12 | unit/browser动态attrs、class/style、ARIA与监听替换 |
| T7.13 | unit/browser状态优先级、0/空name/value |
| T7.14 | browser默认不提交、显式submit |
| T7.15 | browser外部form、submitter/FormData及原生覆盖属性 |
| T7.16 | browser真实reset，应用状态未被组件重写 |
| T7.17 | browser原生校验、formnovalidate与preventDefault |
| T7.18 | browser原始SSR响应中的真实Button/type/busy |
| T7.19 | SSR前保存Button本身引用，水合后同一节点、一次事件 |
| T7.20 | unit挂载/卸载安全ref，browser原生focus/blur |
| T7.21 | browser新主色精确92%/84%混色及显式override |
| T7.22 | browser局部字体、行高、长文及双倍字号无裁切 |
| T7.23 | 独立Button CSS实际请求/回退/局部覆盖与宿主对照 |
| T7.24 | browser正文/图标/纯图标名称，无名称负例被断言拒绝 |
| T7.25 | 自定义loading/default spinner，reduced-motion |
| T7.26 | 多实例、卸载重挂、不同品牌SSR请求隔离 |
| T7.27 | root/button生成声明的TS6与vue-tsc，含原生attrs |
| T7.28 | invalid.ts与Invalid.vue精确enum/Boolean/native诊断 |
| T7.29 | 正确MouseEvent/ref正例，错误handler/payload负例 |
| T7.30 | 公开资产/sideEffects，JS不导CSS；Button样式错误失效整组 |
| T7.31 | 标准CSS消费者无Sass；独立Sass夹具保留 |
| T7.32 | size/unused最终输出不残留Button实现标记 |
| T7.33 | 最小根named和/button真实挂载，仅Button CSS |
| T7.34 | 单Vue运行时图、外部helper正例/内联实现负例、最小图无probe |
| T7.35 | 新tgz/仓库外install+ci+真实本地工具+出口realpath/hash |
| T7.36 | Button JS/types缺失与错指四类非零拒绝及逐项恢复 |
| T7.37 | Button/theme CSS、Sass partial缺失拒绝及恢复 |
| T7.38 | 根/组件实际JS导入失败；原五类负例保留，命名集合校验12类 |
| T7.39 | 真实生产四项≥80；伪装types.ts的未覆盖函数仍失败 |
| T7.40 | 全五包workspace/packed三浏览器、干净普通npm完整CI、产品大小 |

桌面1120px及窄屏390px预览已实际截图检查，pageerror为空、无横向溢出，默认背景rgb(37,99,235)。预览为http://127.0.0.1:5171/button；[桌面](../../.artifacts/task7/button-desktop.png)、[窄屏](../../.artifacts/task7/button-mobile.png)，计算值见.artifacts/task7/preview.json。

最终证据索引：[final-results.json](../../.artifacts/task7/final-results.json)，候选runId为bf6ce646-3195-443e-bac7-83cf9ee1ff0f；200个源码/配置SHA256在原工作区和干净副本均一致。汇总脚本核对了完整CI五阶段退出码、真实计数、12类负例与各自恢复、4类Sass负例、生产覆盖率和真实tree shaking控制，全部断言通过后才写入40项PASS。

| 证据 | 路径 / runId |
| --- | --- |
| 主工作区完整原始日志 | .artifacts/task7-ci-final.log；归档于.artifacts/task7/bf6ce646-3195-443e-bac7-83cf9ee1ff0f/ci-main.log |
| 主工作区pack | e302e0db-f49d-48cc-86ca-f5c2b4f109a0；.artifacts/task5/runs/同runId |
| 干净普通Node/npm目录 | .artifacts/task4/portable-ci/workspace-6bRHW6 |
| 干净副本pack | 12f53482-6d05-4a21-847f-20359af06b07；位于该副本.artifacts/task5/runs |
| 干净副本完整CI日志 | .artifacts/task4/portable-ci/ci-verify.log；启动器日志.artifacts/task7-portable-final.log |
| 浏览器原始JSON / 计数 | 两份工作区各自.artifacts/task4/playwright/{workspace,packed}/all-all/{results,counts}.json，均15项目、132通过、0跳过、0重试 |
| 单测 / 生产覆盖 | 两份工作区各自.artifacts/task4/unit/all、all-coverage及coverage/vue；95通过、0跳过；生产31/31语句、10/10函数、27/28分支、26/26行 |
| Button最小产品大小 | 主pack的button-size.json：根named与/button各raw70955、gzip27002、Brotli24493字节；含Vue运行时、最小应用壳及仅Button CSS |
| unused控制 | raw737、gzip428、Brotli349；导入确实到达bundler，最终无Button实现；保留实现负例被拒绝并恢复摘要一致 |
| 只读审查与RED/GREEN | .artifacts/task7/review.md、review-attrs-{red,green}.log、review-tree-shaking-{red,green}.log |

沿用既有分编译版本，SFC宏显式文件系统与TS void引用都是局部兼容决定；相应编译/消除断言持续约束其正确性。范围按本Task执行，未产生Git提交、推送或发布。未执行的Linux、物理Ctrl+C、屏幕阅读器体验不由DOM断言或自动进程清理代替。Task8后续再定义选择状态、关闭原因、键盘与浮层契约，本轮不引入相关状态机。
