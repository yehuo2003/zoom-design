# 服务目录管理后台

日期：2026-11-11。Task14.1–Task14.6 已获用户验收。后台已实现可编辑表单、本地保存/失败重试、未保存关闭确认、显示设置、长内容与 host 布局。Task14.7 正式表单/键盘/F回归已通过自动化、待用户验收；原节点水合与打包消费仍属后续任务。

依据：[Task14 详细计划](../../.trae/task-14-两类消费验收-详细开发-工作量评估.md)。现有产品 API 见 [Button](../components/button.md)、[Select](../components/select.md)、[Combobox](../components/combobox.md)、[Dialog](../components/dialog.md)。

## 页面与输入契约

当前入口为 `/scenarios/admin` 和 `/ssr?example=admin-scenario`。开发宿主启动命令为 `npm run dev:vue`，使用命令打印的地址加上述路径；正式 E2E 使用其受管宿主地址。首页提供“服务目录管理后台”导航。复用 vue-smoke 的请求局部示例选择，不引入路由库；旧 Dialog 的 `instance=true` 保持原布尔语义。

| 输入 | 合法值与默认 |
| --- | --- |
| brand / density | purple、teal / regular、compact；后台默认 teal、compact |
| open | URL 只有字符串 true 打开；直接输入也支持布尔 true；默认 false |
| record | first、zero → 数字 0；blank → 空串；second/third/fourth/fifth → rec-002/003/004/005；默认 first |
| category | all → null；general → 数字 0；blank → 空串；special → special；默认 all |
| selectedRecord | all → null；zero/blank/second/third/fourth/fifth 对应已确认记录；默认 all；不接受 first |
| keyword | 默认空串，最多100个 UTF-16 单元；应用筛选时 trim |
| save / delay | success、fail-once、failure；默认 success；0–2000 整数毫秒，默认400 |
| empty / long / rtl / large / dual | URL 字符串 true 启用；直接输入也支持布尔 true；默认 false |
| instance / hostPosition | main、left、right / before、after；默认 main、after |

同名 URL 参数取首值；未知字段忽略；非法枚举回默认。delay 只接受十进制整数字符串或整数，不接受负数、小数、空格、科学计数或十六进制。业务 ID 只做别名映射，不将字符串 `'0'` 转成数字 0。

`normalizeScenarioConfig('admin', input)` 与 `parseScenarioConfig('admin', URLSearchParams)` 共用归一化。`createInitialScenarioState('admin', input)` 使用同样的可选输入生成独立状态，也接受已归一化的 ScenarioConfig，供 URL 分支直接生成同输入首帧。直接挂载 AdminScenario 时可传可选 `initial`（原始别名配置）或 `scenarioConfig`（已归一化配置，优先采用），均不传则使用后台默认值。函数没有 DOM、时间、随机或全局可变计数依赖。

页面「显示设置」可独立切换紫/青品牌、regular/compact 密度、系统/衬线字体、大字号和 RTL，不重置筛选、编辑草稿或保存结果。`long=true` 在编辑器中展示长标题和只读服务说明，正文内部滚动；不放宽业务字段长度限制。`large=true` 使用 1.5rem 基础字号。`hostPosition=before|after` 选择前/后候选 host，默认 after。`dual` 的同页双品牌布局仅由品牌页实现，后台不据此复制页面。

## 私有数据与字段规则

实现位于 `apps/vue-smoke/src/scenarios/shared/`，仅供应用消费，不加入 Core/DOM/Vue 等发布包导出。

- `createScenarioData()` 每次创建独立的6条记录、分类、服务点、方案和记录候选对象。默认编辑记录 ID 为数字 0，另一真实记录 ID 为空串；中文长标题保持在有效标题长度内。
- 分类为 0/通用服务、空串/内容服务、special/专项服务。服务点为 0/默认服务点、空串/线上服务、north/北区服务点、retired/停用服务点；retired 始终 disabled，禁止新提交。
- `filterRecords` 对分类、已确认记录和 trim 后关键词取交集，按 title/note 子串匹配，保持原顺序。null 表示不限，0和空串均是有效条件。
- 初始分类与已选记录不兼容时，先清空 recordId/query/popup，再分别复制 filterDraft 与 appliedFilters。筛选与草稿对象互不共享。初始编辑草稿和只读 baseline 也分别复制。
- empty 模式清空记录/记录候选、方案和可选服务点，保留停用服务点展示；分类仍可用于显示筛选空结果。后台编辑器强制关闭、草稿为 null。
- `toRecordSavePayload` 白名单返回 id/title/categoryId/servicePointId/note。标题 trim 后1–80，备注原始输入最多500并在 DTO 中 trim；分类/服务点必须为已知且可用值。成功分支通过类型守卫收窄 null，不用类型断言掩盖未选择。
- `isRecordDirty` 仅严格比较 ID、分类、服务点和 trim 后标题/备注。query、popup、加载和错误不参与比较。

## 本地 Mock 协议

`createScenarioService({ save, delay, records? })` 每实例创建服务。可选 records 只提供本实例的初始 ID/version，默认使用独立 fixture；保存成功将其版本加1。构造服务不启动计时器、不发请求。

`saveRecord(payload, { operationId, signal })` 同步验证并捕获 DTO 快照，延迟结束后返回独立 ServiceRecord。success 成功；fail-once 按记录保存/偏好确认两种操作分别在首次实际完成时失败；failure 持续失败。取消不消耗首次失败机会，失败后可用同 ID、同 payload 重试。

同 ID、同 typed payload 并发复用 Promise，成功只写一次 history；成功重放返回独立副本。字段顺序不影响相等，数字0与空串有区别。同 ID 不同 payload 或不同操作返回 ScenarioOperationError。失败和取消清除 pending，但 ID 与 payload 的绑定保留到 dispose，防止复用为另一操作。history 每次读取为深度独立快照，仅作证据读取。

并发调用关联的任一 AbortSignal 取消，会终止该共同操作、清理 timer/listener 并以 AbortError 拒绝；成功后晚到 abort 不回滚。`dispose()` 幂等取消全部 pending，卸载后提交返回 AbortError。服务为拒绝 Promise 设置内部观察，调用方仍需 catch 并区分取消与业务失败。

`createOperationIds(prefix)` 使用本地递增计数；prefix 由后续宿主的 instance/useId 边界提供。同编辑周期内相同 payload 重试复用 ID，修改字段生成新 ID，重新打开调用 beginSession。ID 不用于 SSR 可见内容，不依赖 Date/随机数。

## 当前筛选与记录入口

页面由 AdminScenario（组合组件、host 与动态返回焦点）、useAdminModel（筛选/编辑/保存与生命周期）、FilterForm（真实查询 form）、RecordsList（table/caption/列头与行按钮）和 EditDialog（编辑 form/页脚与放弃确认）组成。每次挂载独立创建 records/filterDraft/appliedFilters/draft/query/open/服务与 host；构造或 SSR 首帧不自动保存。

1. 服务分类用 ZSelect，已有记录用 ZCombobox，关键词为原生 input。三个条件取交集；只有点击“查询”或关键词中 Enter 才应用，临时 Combobox 文本不改变结果或创建记录。
2. 分类变化保留仍适用的记录；不适用的记录原子清空 recordId/query/popup，已应用列表在下次查询前保持。分类可通过“清除分类”返回不限，已有记录可通过“清除记录”返回不限。
3. “重置筛选”和原生 form.reset() 都同时恢复两份默认过滤、query 和选择浮层，列表立即回默认。empty 保持真正的空目录；无匹配提示与空目录提示分开，查询/重置仍可操作。
4. 表格 caption 为“服务目录”，四列使用 scope=col，服务名称单元使用 scope=row。名称与备注一起构成行头可访问名称；查询结果具有独立 role=status。宽表格保留横向滚动。
5. 行“编辑”打开“编辑服务记录”，按原 ID 精确复制草稿与只读 baseline；数字0与空串不同。初焦为真实标题 input。关闭时动态解析原行真实按钮；保存后行被筛走或没有行 invoker（例如 SSR 初始打开），使用查询按钮/列表标题作 fallback。

页面从四个组件公开子路径导入。main 的场景分支只加载 theme.css、Button/Select/Combobox/Dialog 独立 CSS 和私有场景 SCSS；不加载聚合 style.css。前/后两个稳定候选 host 均位于当前主题 scope 内、列表滚动区外，任一时刻只有一个是 Dialog/选择组件公开 container 回调的目标。直接挂载时响应式改变 `scenarioConfig.hostPosition` 可迁移已打开的浮层；由公开组件维持节点和焦点，不手动搬移 Vue 节点或设置 inert。目标断开时按组件契约内联回退，恢复连接后重新使用目标。

## 编辑、保存与关闭

标题、分类、已有服务点和备注属于本次草稿。字段修改不写 records，服务点临时 query 不改变已确认值。保存先作纯模型校验，再同步捕获 typed DTO 与 FormData 快照，之后进入 saving 并禁用 fieldset/页脚；连续保存只接受一次。0与空串仍是有效 typed 值，FormData 对应字符串，不用序列化字符串重建业务类型。

编辑使用真实 form，页脚保存/恢复分别通过 `form=id` 的 submit/reset 关联。保留 required/maxLength，无 novalidate；纯空格标题通过 setCustomValidity 与模型共同拒绝。invalid capture 显示说明，由原生控件及公开选择组件的校验代理聚焦可见控件。query 没有 name，不提交；blur/Escape 沿用组件契约取消未确认文本。

成功按严格 ID 替换记录/version，重新派生列表，关闭并显示“本地模拟保存成功”；失败保持完整草稿和旧记录，可原样重试或修改后重试。原样重试复用 operationId，改 payload 或新编辑周期换 ID。外部关闭更新仅记录，X/Escape/outside 的 close-request 和页脚取消进入唯一 attemptClose：clean 直接关，dirty 打开一个放弃确认，saving 拒绝。成功由模型直接关闭，不伪造 close-request。

“继续编辑”及确认层 X/Escape 只关确认层，保留草稿，返回编辑取消按钮；“放弃修改”同时关闭两层而不保存，并返回合法页面目标。“恢复打开时内容”阻止原生默认 reset，原子还原 baseline、query、popup、业务错误和 custom validity，不修改已保存记录。确认层在编辑器逻辑层级内、物理 form 外，不嵌套 form。

卸载时组件的 beforeUnmount 和模型所在 Vue scope 都触发幂等 dispose；AbortController 取消 timer/pending，generation 拦截非协作服务的旧成功/旧失败/旧 finally。取消不显示业务失败，已卸载实例不会被旧结果回写。常规 saving 关闭会被拒绝，卸载才取消。

本轮消费回归发现模态 outside pointerdown 在打开放弃确认后会因浏览器默认焦点行为丢到 body；公共 Dialog 已在捕获阶段阻止模态外部指针默认焦点迁移，关闭禁用时也保留焦点，非模态保留原生点击。组件单测分别覆盖三种路由，页面用真实 pointer 与完整关闭 focusin 序列验证。

## 验证边界

组件必须从公开子路径导入；页面自己的状态、Mock 和样式不进入产品最小依赖图。筛选/编辑浏览器回归分别在 `e2e/vue/admin-scenario.e2e.ts`、`admin-edit.e2e.ts`；纯编辑状态与旧回调验证在 `tests/engineering/consumption-admin.spec.ts`，共享/路由见 consumption-model/service/routes。真实 Vue scope.dispose 的取消与非协作服务晚到回调由模型测试验证；浏览器离开再进入验证无旧页面数据/模态锁，不将完整导航冒充 SPA 组件卸载。主题/host/布局见 Task14.6 实施记录；正式 SSR 原节点水合、tarball 和4段可编译场景 SFC 仍归后续任务。未接真实后端、未执行真实业务持久化。

Task14.2 交付时已通过共享/路由18项、完整Vue Chromium93项及后台三浏览器24项；当时全量单元383项、生产构建和严格类型也通过，现已获用户验收。三浏览器专项在沙箱外运行；受限环境中的Firefox在空白页创建阶段崩溃，原失败记录与正常重跑分列。历史命令、版本、结果和边界见[Task14.2实施记录](../../.trae/task-14-两类消费验收-详细开发-工作量评估.md#task142后台页面外壳筛选与结果展示)。Task14.3 的当前验证另列于对应实施记录。

Task14.3 交付验证为全量单元399/399（包括构建与严格类型）、编辑/共享/路由专项31/31、完整Vue Chromium101/101、后台三浏览器48/48（每浏览器筛选8＋编辑8，无skip/retry）。Vue产品源码覆盖率 gate 通过：语句92.40%、函数96.03%、分支88.92%、行96.38%；私有探针和页面模型分开记录。生产构建、既有SSR与默认/数字0/空串编辑器的确定性SSR通过。全量首轮旧DOM导入超时原报告保留，原样单独复核及全量重跑通过。三浏览器沿用沙箱外执行方式。历史证据与限制见[Task14.3实施记录](../../.trae/task-14-两类消费验收-详细开发-工作量评估.md#task143后台编辑保存与关闭确认)及 `.artifacts/task14/14.3/`。

Task14.6 已验收：共享专项51/51、全量单元419/419、完整Vue Chromium125/125、外观三浏览器24/24；两页动态 host 迁移同节点/合法焦点/实际点击通过，warning/error=0，320px/大字号/RTL及双品牌截图已复核。证据与边界见[Task14.6实施记录](../../.trae/task-14-两类消费验收-详细开发-工作量评估.md#task146主题-host响应式与双实例)和 `.artifacts/task14/14.6/`。

Task14.7 当前验证：共享专项53/53、全量单元421/421、完整Vue Chromium146/146、正式F16三浏览器48/48及两页表单/清理15/15。`scenario-forms.e2e.ts` 验证外置footer真实form owner、native Enter/submit/reset、FormData的0/空串字符串；业务类型仍由纯模型DTO检查证明。合成composition配合真实Enter无submit，Escape先关闭popup，再关闭无修改编辑器，URL初始open回查询fallback。`/regressions/dialog-focus` 仅为诊断入口；旧独立夹具不再承担正式F16验收，实际子app卸载/重挂验证9类交互监听归零。证据及IME/packed边界见[Task14.7实施记录](../../.trae/task-14-两类消费验收-详细开发-工作量评估.md#task147表单键盘与-f1f5-正式消费回归)和 `.artifacts/task14/14.7/`，未将合成composition当系统输入法实测。
