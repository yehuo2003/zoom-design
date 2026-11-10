# 品牌服务方案与偏好确认

日期：2026-11-09。Task14.1 契约初稿：私有数据、初始选择归一化、校验、DTO 与本地 Mock 已实现。页面、偏好 Dialog、主题、SSR/水合及 tarball 消费尚待后续任务；目标 URL 尚未接线。

依据：[Task14 详细计划](../../.trae/task-14-两类消费验收-详细开发-工作量评估.md)。公共 API 见 [Button](../components/button.md)、[Select](../components/select.md)、[Combobox](../components/combobox.md)、[Dialog](../components/dialog.md)，主题依据[主题说明](../theming.md)。

## 页面与输入契约

目标入口为 `/scenarios/brand` 和 `/ssr?example=brand-scenario`，复用同一个请求局部选择过程。私有配置与旧 Dialog 外观页分开，不覆盖旧页的布尔 instance 参数。

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

输入 extended/default 或其他不适用组合时，servicePointId=null、query=''、popup=false，并显示“请重新选择服务点”；不默选 north。empty 模式无可选方案/服务点，两项值均为 null。open=true 可以打开未填完的偏好草稿，姓名/email/备注仍为空，不跳过 required。每次初始化独立创建数据，不跨请求/实例共享可变状态，首次初始化不自动保存。

## 选择、草稿与 DTO

私有实现位于 `apps/vue-smoke/src/scenarios/shared/`。`normalizeBrandSelection` 使用严格 value 规则清除不适用点位。初始 browseSelection 与 preferenceDraft 是独立对象；后续页面/模型也需保持这一边界。

`toPreferenceSubmitPayload` 成功时白名单构造 planId/servicePointId/contactName/email/note：方案和服务点已知且兼容；姓名 trim 后1–40；email trim 后非空且满足 HTML email 的 ASCII 语法；备注原始输入最多500，保存值 trim。0/空串的真实类型保留，query/popup/错误和 UI 对象不进入 DTO。真实表单仍由 type=email/required 等原生校验保护，当前纯模型测试不能替代浏览器校验。

Task14.4/14.5 将实现：外部选择只属于浏览状态，打开 Dialog 时复制为草稿；取消不改浏览选择或上次摘要；确认成功才替换本地摘要，失败保留草稿和旧摘要；后续浏览/切品牌不重写历史确认结果。临时 Combobox query 与已确认服务点分离，未确认文本不成为业务值，不支持任意新增服务点。

## 本地确认 Mock

`createScenarioService({ save, delay })` 产生实例局部服务；`confirmPreference(payload, { operationId, signal })` 捕获已验证快照后才创建延迟。成功返回独立 PreferenceSummary，其 confirmationId 固定为 `local-${operationId}`，不包含当前时间或随机数。此结果仅表示本地偏好确认，不宣称实际预约、邮件发送或后端持久化成功。

success 成功；fail-once 按两种操作分别首次实际完成时失败，允许重试；failure 持续失败；取消不消耗失败次数。同 ID 同 payload 并发共享 Promise，成功只写一次；重放返回独立副本。不同内容或不同操作复用 ID 明确拒绝；失败/取消后 ID 仍绑定原内容，至 dispose 清除。同 ID 的任一关联 AbortSignal 取消都会终止共同 pending，清理 timer/listener，取消不显示业务失败。成功后晚到 abort 不回滚，dispose 幂等且卸载后拒绝新提交。

`createOperationIds(instancePrefix)` 的计数属于实例；同一会话同 payload 重试复用，字段变化生成新 ID，打开新偏好会话调用 beginSession。prefix 由后续 Host 的 instance/useId 提供，不在 SSR 可见正文中展示。history 是独立只读快照，仅供单测/证据读取，不添加产品测试控制按钮。

后续模型仍需负责 saving 去重、关闭拒绝、卸载取消及 generation/session 检查：旧成功、失败、finally 均不得回写新草稿或已卸载实例。Task14.1 服务测试证明取消和幂等基础，不冒充尚未实现的页面会话验证。

## 主题与后续验收

后续两品牌实例分别持有主题 scope、模型、ID 和 host ref，不改 body/documentElement 全局主题。Dialog 与选择浮层指向实例 host，服务端不解析 HTMLElement；字体/字号/密度和外置浮层共同继承 token。320px/长内容/RTL/大字号、实际点击命中、焦点返回 CTA 与清理留给对应浏览器回归。

Task14.1 仅覆盖纯模型/服务基础，测试见 `tests/engineering/consumption-model.spec.ts` 和 `consumption-service.spec.ts`。后续将补两段使用公开产品入口的完整 SFC 与独立品牌样式，SSR 原节点水合、packed 消费及真实 IME/读屏证据分别记录；当前不宣称 React/Angular 产品或 Angular SSR 已支持。
