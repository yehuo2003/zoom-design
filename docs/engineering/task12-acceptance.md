# Task12 Vue Combobox 验收

实施日期：2026-10-30（Asia/Shanghai）。Task11 已获用户确认并标记已完成；Task12已于2026-10-30获用户验收通过（自动验收16/16）；Task13未开始。无Git暂存、提交、推送或公开发布。

## 交付与职责

根入口及 `@zoom-design/vue/combobox` 命名导出 ZCombobox 与六个类型：ComboboxProps、ComboboxEmits、ComboboxExpose、ComboboxSize、ComboboxInputAttributes、ComboboxOptionContext。所有props非必填；selected value始终受控，query/open按首帧是否undefined固定模式，没有defaultValue或自由文本提交。直接依赖和external沿用Vue已声明的Core/DOM；TS6.0.3与TS7.0.2隔离未改变。

Combobox.vue组合原生input、独立清空按钮、校验代理/提交字段和私有SelectionPopup。useComboboxState管理值请求、查询、过滤、高亮与受控事务；useComboboxInput管理浏览器composition草稿、编辑代、尾随input去重和拒绝回写后的DOM文本恢复。value/query/highlight/draft分别存储，不以Select组件包裹Combobox。共享DOM/form组合函数改为接收窄结构状态和HTMLElement；共享popup增加私有class前缀，默认Select保持原有行为。

普通编辑只请求query/open；确认依次请求query及详情、value及详情、open及详情，省略不变通道。外部值和标签更新按一次渲染事务同步最终query，同时同步失效旧IME草稿。接受value但拒绝query/open时不会再次发相同external-sync；reset先恢复当前确认标签，再请求null/关闭，父层恢复其他默认值后可按不同目标发一次external-sync。

默认过滤使用Core确定性大小写不敏感包含匹配，支持纯filterOption和非负整数minQueryLength；过滤回调异常告警并返回空列表。Up/Down导航、Enter显式确认、Escape恢复标签，Tab保留原生焦点移动且放弃草稿；左右/Home/End/空格/修饰键/选区编辑保持原生。空结果Enter不创建自由值且阻止本次Enter隐式提交表单。

composition期间只显示浏览器草稿，不请求query或过滤，不用Enter确认或提交。有效compositionend请求一次，尾随同代同值input只忽略一次；后续独立同值输入可再次请求。Escape、Tab、外部同步、clear/reset、blocked与卸载失效编辑代；晚到end/input不能覆盖已接受状态，卸载后的分离节点事件安全返回。

共享原生表单方案仍只有一个具名hidden提交确认值，无name的select哨兵代理required；可见input无name且不提交query。合法空串/0可校验和提交，未知值不提交；disabled选项可显示和提交应用已赋值，组件/fieldset disabled不提交。readonly取消代理required，loading保留required；invalid转焦点、外部owner、动态fieldset首legend、reset最终取消与父层默认值均验证。

私有selection Sass mixin分别产出Combobox/Select同源CSS，Combobox独立CSS无需先导入Select或Sass。十八个token、density/RTL/大字号/换行、focus/reduced motion、portal主题继承与宿主不受reset均纳入浏览器。无图标库或全局主题单例。JS不隐式导入CSS；根/子路径及CSS-only按真实tarball验证。

示例 `/combobox` 与 `/ssr?example=combobox&open=true&query=Ze` 采用公开包名，根只组合行为/表单/外观SFC；SSR的value/query/open/brand按请求隔离。首帧popup为inline，水合复用原input/listbox后迁移portal。文档包含五个可严格编译Vue例子、完整参数/事件/slots/ref/表单/主题及React/Angular明确规划映射，见[Combobox](../components/combobox.md)。Task8–12汇总与Task13输入见[能力清单](selection-capabilities.md)。

## 16 项验收映射

| 编号 | 自动断言与证据 |
| --- | --- |
| T12.1 | normalize单测/最小无绑定用法；非法query/filter/minimum和共同props稳健归一，未接受value请求不改确认值 |
| T12.2 | 真实input/fill、删除和粘贴后input，默认包含过滤；query更新不改变已选模型及具名字段 |
| T12.3 | prefix自定义过滤、minQueryLength、空列表Enter、filter抛错后恢复；无远程请求或自由值 |
| T12.4 | 数字0、字符串0、业务空串、同值确认及pointer/touch一次请求；不变通道省略 |
| T12.5 | value/query/open分别和同时拒绝；原生文本恢复、事件顺序、重复独立编辑不被永久吞掉；模式切换告警 |
| T12.6 | 外部值/label/options更新、同次更新值与选项只同步最终label；稳定typed ID、无重复external-sync |
| T12.7 | Escape含实际关闭状态、Tab及其blur合并、outside/逻辑内部popup、clear/reset恢复/清空表 |
| T12.8 | compositionstart/update/end、草稿不驱动过滤/query，尾随同值input一次去重与独立输入恢复 |
| T12.9 | composing Enter不提交；Escape/Tab/reset/外部值/卸载使草稿失效，晚到end与input不回写 |
| T12.10 | 原生左右/Home/End/空格、Ctrl/Meta、选区/剪贴板输入不被列表导航接管；Up/Down跳禁用与loop |
| T12.11 | readonly/loading/disabled与动态fieldset首legend、清空按钮和focus/blur、指针/模拟触摸确认 |
| T12.12 | 原生FormData/checkValidity/required/invalid焦点、外部form、合法空串0、未知值、disabled选项、取消reset与父层默认值 |
| T12.13 | combobox/listbox/option及aria-autocomplete=list、多实例命名/controls/activedescendant、过滤后ID有效；attrs运行时保护 |
| T12.14 | SSR初始query/value/open/brand、跨请求隔离、inline首帧、水合input/popup节点复用、portal主题及卸载 |
| T12.15 | TS6/TS7真实声明、TS6 vue-tsc、根/子路径与CSS、三浏览器workspace/packed、缺产物和错误出口反例恢复 |
| T12.16 | 文档五例strict编译及十八token、生产/probe分离覆盖，Select/Button/主题旧用例及完整工程回归 |

## 验证记录

| 命令 | 退出码与实际结果 |
| --- | --- |
| node scripts/test-unit.mjs --standalone --package vue --coverage | 0；83/83，无skip，Combobox34+normalize2，Select26及其余21；包含共享Select属性保护、默认宽度、清空焦点和触摸去重新回归 |
| node scripts/check-vue.mjs | 0；实际TS6/TS7正例与各12个Combobox精确负例，vue-tsc正例与17个精确负例；既有Button/Select门禁保留 |
| Combobox/Select/Vue/Button/theme工程产物聚焦测试 | 0；30/30；文档测试另2/2，两个组件各5个真实Vue例子+18token |
| node scripts/check-vue-ssr.mjs | 0；真实Vue/Select/Combobox Node SSR，初始query/open/inline portal与请求隔离 |
| node scripts/check-dev.mjs | 0；7项，清理Core/DOM/Vue产物后启动、预览、两平台watch、SCSS、非法TS预期exit1停服、SIGINT exit0清理 |
| npm run check | 0；五包构建/类型/平台声明，253项：engineering116、core23、dom29、vue83、react1、angular1，含两个文档门禁；其后体积标记回归另1/1通过 |
| node scripts/e2e.mjs --mode workspace --package vue --browser all | 0；219/219，Chromium/Firefox/WebKit各73；Combobox26×3=78、既有Select/Button/主题141；无skip/retry |
| npm run check:pack | 0；runId=f1942a5f-f11b-40f0-a0f0-4a98d092ab8a；五tgz、四独立消费者install/ci/实际TS6/TS7声明/Node/构建/SSR/CSS-only/体积通过；22类负例拒绝且恢复PASS |
| node scripts/e2e-packed.mjs --package vue --browser all | 0；同一批tarball，219/219，三引擎各73，Combobox78+既有141；无skip/retry |

Vue十三个生产可执行文件单独汇总：statements641/674（95.10%）、functions175/182（96.15%）、branches545/584（93.32%）、lines323/327（98.78%）；每个文件实际四项也均≥80%。Vue生产门禁按汇总四指标执行；types/barrel经编译AST分类排除，私有probe单列，未计入生产结果。原始summary及逐文件数值归档，不把其他包旧覆盖结果计为本轮证明。

Combobox最小子路径应用raw=116311、gzip=42517、Brotli=38314字节；根命名raw=116311、gzip=42517、Brotli=38314；未使用导入raw=738、gzip=430、Brotli=356。包括Vue runtime、Core/DOM与Combobox CSS，不含Button/Select产品实现及其CSS、聚合/主题CSS、示例、SSR、source map或其他框架；graph和最终产物双重检查，并保留故意污染后被拒绝及恢复证据。默认Node zlib逐文件压缩求和，属于本机Vite/ES2022应用绝对体积，不作跨库节省结论。

归档索引为 .artifacts/task12/latest.json，包含源码SHA256、原始日志、失败trace、独立审查、Vue生产/probe覆盖、unit、dev记录、两套浏览器JSON和tarball报告。pack runId=f1942a5f-f11b-40f0-a0f0-4a98d092ab8a；独立消费者=C:\Users\linzhuming\AppData\Local\Temp\zoom-design-packed-rPc2Yt，真实tgz与报告另复制到归档。本候选未执行ci:verify整套单命令，完整check与明确列出的独立门禁不冒充该命令。

## RED、修复与审查

最初八项组件断言在可执行最小占位上全部失败后实现并通过，没有把缺模块收集失败当RED。扩展边界测试中，受控query拒绝回写及invalid后的Vue渲染时序两处断言按实际契约校正。

独立只读审查用四项真实失败复现确认：关闭状态Escape未恢复query、composing Tab被提前return且focusout被抑制、根attrs保留字符串onclick、同次value/options更新产生中间空串external-sync。主任务补永久失败回归，分别修正键盘取消顺序、统一root事件过滤、按最终渲染事务同步query，同时保持IME同步失效。另一次卸载迟到compositionend暴露空模板ref访问，加入活动标志与节点守卫。当时全部RED→GREEN后78项与生产覆盖通过；共享Select也增加根事件保护回归。`.bug-repo`未初始化，仅只读核对，没有新建库或记录。

首轮Chromium输出71项通过、2项失败：过滤p的测试漏算Empty string、public-import负例缺vueCombobox fixture映射；按真实列表及公开路径补齐。该轮在输出全部73项后退出清理挂起，主动取消，exit1且未产出最终JSON，保留trace和日志，不记为整体通过。最终运行结果以本记录和归档JSON为准。

随后直接核对编译JS发现Vue Boolean自动转换使未提供matchTriggerWidth时变成false；Select和Combobox各一项新断言均先失败，再显式设置契约默认true，同时保留false opt-out。追加真实popup/输入等宽浏览器断言，80项单测及覆盖通过后重新运行完整check和workspace/packed候选；先前正在运行的workspace轮次主动中断，单独保留日志，不作最终通过证明。开发链路7项在该默认值修正前通过，修正后由完整构建与产品门禁再次核对。

第二轮workspace三浏览器215/219：Firefox/WebKit portal示例的按钮被弹层遮挡，改为位于输入上方；WebKit清空在click前先blur取消，补pointerdown阻止原生转焦点；WebKit触摸探针确认pointerdown.prevent后不生成兼容click，改为触摸pointerup确认并去重其后可能的兼容click，支持拒绝回写时一次意图仅一次请求。鼠标仍用click。两类产品修复先RED再GREEN；触摸测试显式使用primary pointer和真实MouseEvent构造器，避免测试工具给只读detail赋值。83项单测与生产覆盖通过后聚焦浏览器，再完整复验。失败trace和事件序列保留。

首次pack的Combobox体积门禁把共享Symbol名zoom-selection-layers误认成Select组件标记；最终JS片段确认没有Select产品实现。新增精确边界回归先RED再GREEN，真实zoom-select/zoom-select__trigger/ZSelect/zoom-button/ZButton仍逐一拒绝，修正只涉及工程判定与报告，未改变产品或删除负例。该1项工程补测在完整check253之后单列，不计入253。重新构建tarball并继续其全部门禁。

本机Git已初始化但main无commit，所有源码仍未跟踪；保留现场，未暂存/提交/推送。候选通过实际UTF-8文本统一LF后的SHA256摘要和真实tgz标识，不伪造Git提交证据。文档保护驱动对Node返回加密头时，以PowerShell文本读取进行门禁与摘要。

## 人工验收与未执行项

运行 `npm run dev:vue` 后打开 `/combobox`，验证中文输入/取消、已有选项确认、拒绝各通道回写、表单校验/reset、主题/RTL/portal，再看 `/ssr?example=combobox&open=true&query=Ze`。可同时回归 `/select`。

自动composition事件不替代真实OS中文输入法，模拟touch不替代触摸真机；真实输入法、人工读屏、触摸设备、Linux实机、无Volta干净副本、本轮其他包覆盖率与整套ci:verify单命令未执行。React/Angular产品Combobox与Angular SSR未实施。Task12已完成（2026-10-30用户验收通过），Task13未开始。
