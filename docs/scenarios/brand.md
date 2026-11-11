# 品牌服务方案与偏好确认

日期：2026-11-11。Task14.1–Task14.6 已获用户验收。偏好表单、本地确认、摘要、显示设置、双品牌与响应式 host 已实现。Task14.7 正式表单/键盘/F回归已通过自动化、待用户验收；原节点水合及 tarball 消费仍属后续任务。

依据：[Task14 详细计划](../../.trae/task-14-两类消费验收-详细开发-工作量评估.md)。公共 API 见 [Button](../components/button.md)、[Select](../components/select.md)、[Combobox](../components/combobox.md)、[Dialog](../components/dialog.md)，主题依据[主题说明](../theming.md)。

## 页面与输入契约

当前入口为 `/scenarios/brand` 和 `/ssr?example=brand-scenario`，复用同一个请求局部选择过程。首页「品牌服务方案」导航可达。开发命令为 `npm run dev:vue`，使用其打印的地址加上述路径。私有配置与旧 Dialog 外观页分开，不覆盖旧页的布尔 instance 参数。

| 输入 | 合法值与默认 |
| --- | --- |
| brand / density | purple、teal / regular、compact；品牌默认 purple、regular |
| plan | base → 数字0；standard → 空串；extended → extended；默认 base |
| point | default → 数字0；online → 空串；north → north；默认 default |
| open | URL 仅字符串 true 启用；直接输入也接受布尔 true；默认 false |
| save / delay | success、fail-once、failure；默认 success；0–2000 整数毫秒，默认400 |
| empty / long / rtl / large / dual | URL 字符串 true 启用；直接输入也支持布尔 true；默认 false |
| instance / hostPosition | main、left、right / before、after；默认 main、after |

同名参数取首值，未知字段忽略，未知枚举回默认。delay 严格十进制整数，非法值回400；不将业务字符串 `'0'` 转成数字。0与空串都是已选方案/服务点，null 表示未选择。

`normalizeScenarioConfig('brand', input)`、`parseScenarioConfig('brand', params)` 和 `createInitialScenarioState('brand', input)` 使用相同归一规则。基础/标准方案允许默认、线上、北区服务点；扩展方案仅允许 north。retired/停用服务点保留 disabled 展示，禁止新提交。

输入 extended/default 或其他不适用组合时，servicePointId=null、query=''、popup=false，并显示“请重新选择服务点”；不默选 north。empty 模式无可选方案/服务点，两项值均为 null，卡片与服务点各有空态说明、CTA禁用；停用服务点仍以 disabled 选项存在。open=true 打开真实偏好表单，联系人/email/备注为空，无效选择保留null待填写；每次初始化独立创建数据和服务，不跨请求/实例共享可变状态，首次初始化不自动保存。

页面「显示设置」可切换紫/青品牌、regular/compact 密度、系统/衬线字体、大字号与 RTL，不改变选择、草稿或历史摘要。`long=true` 增加偏好 Dialog 长标题和只读服务说明，不放宽字段长度；`large=true` 使用 1.5rem 基础字号。`dual=true` 同页挂载紫色 left 与青色 right 两个独立实例，窄屏上下排列；各实例有自己的主题、选择、草稿、服务、摘要、ID和 open 状态。其余初始化配置分别传入两实例，open=true 可初始打开两者。Host 可不传 props，或传可选 `initial` 原始配置/`scenarioConfig` 规范配置（后者优先），与URL采用同一归一规则。

## 页面与浏览行为

BrandScenario 归一配置并选择单/双实例布局；BrandScenarioInstance 组合页面、模型、实例 host 与生命周期；PlanCards 展示三种方案的介绍/适用范围/当前方案；BrandBrowseForm 以 typed props/emits 组合 ZSelect/ZCombobox/ZButton；useBrandModel 组合 useBrandBrowse，分别管理浏览选择与偏好草稿/确认服务/摘要；PreferenceDialog 负责真实form，PreferenceSummary只读展示上次本地确认。只读卡片不伪装成第二套选择控件，外部方案由标记「服务方案」的 Select 选择。

1. 0/基础方案与空串/标准方案都是真实业务值；通过原类型比较渲染当前方案，null才表示未选。默认/线上服务点同样保留0/空串。
2. 临时搜索文本不修改已确认值、不创建新服务点。候选由当前方案适用范围与查询交集决定；打开时仍按当前query过滤，清空查询可查看全部适用候选。Escape/blur 沿用公共 Combobox 的恢复规则。
3. 扩展方案排除默认/线上服务点；若原值不适用，同步清 selection.servicePointId/query/popup，显示「请重新选择服务点」。仍适用的北区选择保留；不默选其他值。停用服务点在候选中disabled，模型也拒绝其写入。
4. CTA「查看服务偏好」复制当前浏览选择，并以空联系人/email/备注打开「服务偏好」；初焦为真实姓名input。Dialog内调整只改草稿。取消/X/Escape/outside直接丢弃草稿，浏览选择和旧摘要保持；无需第二套dirty确认。返回焦点优先实际点击按钮，URL初始打开无invoker时回页面CTA，empty导致CTA禁用时回可聚焦标题。

页面通过四组件公开子路径消费，不导入产品源码。main只加载 theme.css、四组件独立CSS与私有场景SCSS，不加载聚合style.css；每个主题scope内独立渲染host，选择浮层和Dialog均显式指向当前host，位于form/内容滚动之外。服务端不解析DOM。

## 选择、草稿与 DTO

私有实现位于 `apps/vue-smoke/src/scenarios/shared/`。`normalizeBrandSelection` 使用严格 value 规则清除不适用点位。初始 browseSelection 与 preferenceDraft 是独立对象；后续页面/模型也需保持这一边界。

`toPreferenceSubmitPayload` 成功时白名单构造 planId/servicePointId/contactName/email/note：方案和服务点已知且兼容；姓名 trim 后1–40；email trim 后非空且满足 HTML email 的 ASCII 语法；备注原始输入最多500，保存值 trim。0/空串的真实类型保留，query/popup/错误和 UI 对象不进入 DTO。真实表单仍由 type=email/required 等原生校验保护，当前纯模型测试不能替代浏览器校验。

Task14.5 已实现打开时独立草稿，以及其独立query/popup；偏好方案变化也按同一适用性规则清理服务点。取消不改浏览选择或上次摘要，确认成功才替换本地摘要，失败保留草稿和旧摘要。后续浏览/作用域品牌样式变化不重写历史结果。摘要按严格业务ID解析真实标签，用户输入用Vue文本插值显示；不展示测试history或内部operationId。

PreferenceDialog 使用真实form，外置页脚「本地确认」以 `form=id` 关联；原生required/type=email/maxLength及姓名纯空格custom validity保护输入，invalid capture显示说明并聚焦实际无效控件。模型再次白名单校验；在进入saving/禁用fieldset和页脚前同步捕获typed DTO与FormData，不从字符串猜测0/空串类型。query没有name，不进入DTO。

一次提交同步进入saving，拒绝重复入口、草稿修改及常规关闭。`update:open`不驱动状态，所有close-request和取消进入同一关闭gate；成功由模型直接关闭。失败说明「本地模拟确认失败，请重试」，保留全部草稿；原样重试复用operationId，改变payload或重新打开会话生成新ID。成功只替换一次上次本地摘要，焦点回CTA，浏览选择不被反写。页面明确没有真实预约或邮件发送。

## 本地确认 Mock

`createScenarioService({ save, delay })` 产生实例局部服务；`confirmPreference(payload, { operationId, signal })` 捕获已验证快照后才创建延迟。成功返回独立 PreferenceSummary，其 confirmationId 固定为 `local-${operationId}`，不包含当前时间或随机数。此结果仅表示本地偏好确认，不宣称实际预约、邮件发送或后端持久化成功。

success 成功；fail-once 按两种操作分别首次实际完成时失败，允许重试；failure 持续失败；取消不消耗失败次数。同 ID 同 payload 并发共享 Promise，成功只写一次；重放返回独立副本。不同内容或不同操作复用 ID 明确拒绝；失败/取消后 ID 仍绑定原内容，至 dispose 清除。同 ID 的任一关联 AbortSignal 取消都会终止共同 pending，清理 timer/listener，取消不显示业务失败。成功后晚到 abort 不回滚，dispose 幂等且卸载后拒绝新提交。

`createOperationIds(instancePrefix)` 的计数属于实例；同一会话同 payload 重试复用，字段变化生成新 ID，打开新偏好会话调用 beginSession。prefix 由后续 Host 的 instance/useId 提供，不在 SSR 可见正文中展示。history 是独立只读快照，仅供单测/证据读取，不添加产品测试控制按钮。

useBrandModel负责saving去重/关闭拒绝、AbortController、generation与幂等dispose；组件beforeUnmount和Vue scope停止都会清理服务。旧成功、失败、finally均检查token，不回写已卸载实例或新会话；取消不显示业务失败。纯模型测试独立证明timer取消、scope.stop及非协作服务晚到结果；真实组件pending卸载另验模态/弹层清理，不用整页导航代替SPA卸载证据。

## 主题与后续验收

每实例分别持有主题 scope、浏览/偏好模型、服务、摘要、ID和 host ref，不改 body/documentElement 全局主题。前/后两个稳定候选 host 均在主题 scope 内、form/内容滚动区外，Dialog与选择浮层共用其中一个目标。`hostPosition=before|after` 选择目标，默认 after；直接挂载时响应式改变 `scenarioConfig.hostPosition` 可迁移已打开的浮层，由公开组件保持节点/焦点。目标断开按组件契约内联回退，重新连接后恢复；页面不手动搬移 Vue 节点或设置 inert。Task14.6 验证包含真实尺寸/指针、双品牌、320px 长内容、RTL/大字号与两页运行中迁移，证据另列。

Task14.1 覆盖纯模型/服务基础；Task14.4浏览/路由见 `tests/engineering/consumption-brand-browse.spec.ts`、`consumption-routes.spec.ts`；Task14.5的11项独立模型回归见 `consumption-brand.spec.ts`。正式浏览器用例为 `e2e/vue/brand-scenario.e2e.ts` 和 `brand-preference.e2e.ts`。后续将补两段使用公开产品入口的完整SFC；SSR原节点水合、packed消费及真实IME/读屏证据分别记录，当前不宣称React/Angular产品或Angular SSR已支持。

Task14.4交付时验证：专项38/38、全量单元406/406（并发限制VITEST_MAX_WORKERS=4，含五包构建/包及宿主类型）、完整Vue Chromium109/109、品牌三浏览器24/24（各8，无skip/retry）。生产构建、旧SSR契约、品牌默认/初始预览/不兼容/empty及A→B→A基础SSR通过，同document双挂载无运行时warning/error。历史证据与首轮旧DOM超时/查询假设记录见[Task14.4实施记录](../../.trae/task-14-两类消费验收-详细开发-工作量评估.md#task144品牌页面展示方案与已有服务点)及 `.artifacts/task14/14.4/`，该任务已获用户验收。本轮14.5结果另列，不改写历史报告。

Task14.5交付时验证：合并专项49/49（偏好11＋原38）、全量单元417/417（并发4，五包构建/包及宿主类型通过）、完整Vue Chromium117/117、品牌三浏览器48/48（各浏览8＋偏好8，无skip/retry）。生产构建、基础SSR/确定性与外置form归属通过；真实同document双实例证明服务/状态/摘要独立，pending组件卸载无残余弹层/锁和warning/error。取消、旧摘要失败保持、scope.stop取消timer与非协作旧回调分别有模型/浏览器证据；未把整页导航当组件卸载，也未把CSS属性变化当完整主题切换UI。只读审查未发现实际缺陷。历史证据、命令及边界见[Task14.5实施记录](../../.trae/task-14-两类消费验收-详细开发-工作量评估.md#task145偏好-dialog确认与结果摘要)和 `.artifacts/task14/14.5/`。

Task14.6 已验收：共享专项51/51、全量单元419/419、完整Vue Chromium125/125、外观三浏览器24/24；双品牌独立服务首次失败/重试/摘要与无重复ID通过，横向溢出修复有失败/通过记录。两页动态 host 迁移同节点/合法焦点/实际点击通过，warning/error=0。证据与边界见[Task14.6实施记录](../../.trae/task-14-两类消费验收-详细开发-工作量评估.md#task146主题-host响应式与双实例)和 `.artifacts/task14/14.6/`。

Task14.7 当前验证：共享专项53/53、全量单元421/421、完整Vue Chromium146/146、正式F16三浏览器48/48及两页表单/清理15/15。`scenario-forms.e2e.ts` 验证外置footer真实form owner、native Enter/submit和FormData的0/空串字符串，摘要仍显示对应真实标签；typed DTO由纯模型另验。合成composition配合真实Enter不提交，未确认query不写入值，连续Escape先关popup再关偏好Dialog并回CTA。正式F16由诊断路径 `/regressions/dialog-focus` 与根fixture承载，无普通业务导航，旧固定端口入口只作诊断冒烟。证据与IME/packed边界见[Task14.7实施记录](../../.trae/task-14-两类消费验收-详细开发-工作量评估.md#task147表单键盘与-f1f5-正式消费回归)和 `.artifacts/task14/14.7/`。
