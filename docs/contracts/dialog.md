# Dialog 关闭、焦点与模态边界

冻结日期：2026-10-29。Task8 契约 v1；2026-11-05 的 Task13.1 补充增量 API 与类型基线并已获用户验收。Task13.2–13.10 已通过用户验收；Dialog 的模态焦点、嵌套选择浮层、portal 迁移、SSR/水合、声明、出口与独立 tarball 消费已有专项验证。使用说明见[Dialog 组件文档](../components/dialog.md)，产品支持范围见[组件矩阵](../components/README.md)。

### 4.9 Dialog 契约（Task8 冻结与 Task13.1 增量）

冻结受控 open（默认 false）、modal=true、closeOnEscape=true、closeOnOutside=true、restoreFocus=true、初始/恢复焦点目标、accessible name/description 和内容插口；具体 DOM 目标只在适配层声明。

关闭请求携带 escape/outside/close-button 原因。Vue `update:open(false)` 与 close-request、React onOpenChange/onCloseRequest、Angular openChange/closeRequest 分别映射；父层不回写时 Dialog 仍打开，焦点限制/背景隔离/滚动锁继续生效。父层直接赋 open=false 只改变输入，不反向触发 close-request。首轮没有 requestClose 实例方法，因此不增加 programmatic 请求原因。已关闭、关闭请求、动画完成不是同一事件。

Task10 已准备焦点限制、恢复、引用计数滚动锁与嵌套隔离；Task13 再实现组件。嵌套只让最上层响应，不能 inert 包含活动弹层的祖先，恢复时保留宿主原有 style/inert/aria 状态；不要把所有 Dialog 都放成全局静态单例。[WAI modal dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)

### 配置、名称与默认

全部非必填；Vue 已提供公开 Dialog、样式、关闭请求路由、模态焦点资源、嵌套选择浮层与显式宿主 portal。React/Angular 仍为规划，当前不可用。

| 语义 | Vue / React / Angular 规划名称 | 类型/默认 | 行为 |
| --- | --- | --- | --- |
| 打开 | open / open / open | boolean / false | 始终受控，非法 JS 值 false，无 defaultOpen |
| 模态 | modal / modal / modal | boolean / true | 只有实际 open && modal 才启用限制、隔离、滚动锁 |
| Escape 关闭 | closeOnEscape（同名） | boolean / true | 顶层一次请求；false 不传递到下层 |
| outside 关闭 | closeOnOutside（同名） | boolean / true | pointerdown 的 composedPath 在逻辑节点外才请求 |
| 恢复焦点 | restoreFocus（同名） | boolean / true | 真正关闭/卸载才恢复，拒绝关闭不恢复 |
| 初始焦点 | initialFocus（同名） | ()=>HTMLElement\|null / undefined | 挂载后解析，目标须在活动 scope 内且可聚焦 |
| 恢复目标 | returnFocus（同名） | ()=>HTMLElement\|null / undefined | 关闭时解析；失败回原触发器，再应用 fallback |
| 外置渲染 | portal（同名） | boolean / false | 默认 inline，保留主题继承 |
| 外置宿主 | getContainer（同名） | ()=>HTMLElement\|null / undefined | 仅客户端 portal=true 时调用；无效则告警并 inline |
| 默认关闭名称 | closeLabel（同名） | string / 关闭 | 空白或非法值回退，供默认原生按钮使用 |
| ID | id（同名） | string / undefined | 显式 ID 或 SSR 稳定实例 ID |
| 名称 | aria-label / aria-label / ariaLabel | string / undefined | 实际 role=dialog 元素；必须提供名称或标题关联 |
| 标题引用 | aria-labelledby / aria-labelledby / ariaLabelledby | string / undefined | 非空引用真实标题；优先于 label |
| 描述引用 | aria-describedby / aria-describedby / ariaDescribedby | string / undefined | 可选，复杂内容可不整段关联 |
| 样式 | class/style / className/style / 宿主 class/style | 框架类型 / undefined | 容器；交互状态 ARIA 不允许透传覆盖 |
| panel 原生属性 | panelAttrs / panelProps / panelAttrs | 受限原生属性 / undefined | 仅白名单；禁止覆盖组件拥有的语义 |

Vue 的 overlay root 接收 class/style/data-*；panelAttrs 仅接受 title、dir、onFocus/onBlur/onKeydown/onKeyup/onClick、class/style/data-*。不开放任意字符串键；运行时过滤 id、role、tabindex、aria-modal 和命名 ARIA 等越权字段以及字符串事件处理器。getContainer 不接收 trigger 参数；portal=true 需显式提供同 Document、已连通、非本 Dialog 后代的同主题宿主。宿主缺失、回调抛错或目标无效时开发告警并保持 inline，不隐式使用 body，也不复制祖先的全部 CSS 变量。

Boolean 缺省按表中值；非法 JS 值回退各自默认并开发告警。initialFocus/returnFocus 非函数视为未提供；函数抛错或目标失效告警后按焦点降级策略处理。

Vue 插口 default/title/description/footer/close；close 插槽的作用域只有 `requestClose(): void`，原因固定为 close-button，应用直接渲染自己的按钮并负责名称与 type=button。React children/title/description/footer/renderClose；Angular 内容投影与 title/description/footer/close TemplateRef（具体 directive 待后续任务）；默认关闭按钮有可访问名称 `closeLabel`（缺省“关闭”），type=button。空 close 插槽可隐藏默认按钮，但应用仍须提供可发现的退出路径。没有 title 内容且无 aria-label/labelledby 时开发告警，产品文档要求应用补名称。模板插口不允许覆盖 role/aria-modal 或嵌套按钮。

Vue 实例仅暴露 `focus(options?: FocusOptions): void`；只有实际打开且 panel 有效时才聚焦。关闭或 SSR 时无副作用。不提供 open/close/toggle/requestClose/blur 实例方法。

名称优先级：显式非空 aria-labelledby → 显式非空 aria-label → title 插槽的稳定 ID；无名称则开发告警，不补虚构名称。描述优先级：显式 aria-describedby（`''` 表示不关联）→ description 插槽的稳定 ID → 省略。显式 labelledby 生效时不再输出自动 aria-label；应用负责保证显式引用指向真实节点。

### 请求、状态与生命周期

```ts
type DialogCloseReason = 'escape' | 'outside' | 'close-button';
interface DialogCloseDetails { readonly open: false; readonly previousOpen: true; readonly reason: DialogCloseReason }
```

Vue 同步 update:open(false) → close-request(details)；React onOpenChange(false,details) → onCloseRequest(details)；Angular openChange(false) → closeRequest(details)。顺序固定，各一次；当前已经关闭时不再发请求。事件没有 preventDefault 式异步批准，应用以不回写实现拒绝；props 变化只驱动实际资源，无反向请求。原始 DOM 事件在适配层单独暴露，不进入共享详情。无关闭完成事件/动画生命周期承诺，首轮不提供服务 API 或 requestClose expose。

初始焦点选择显式有效目标 → scope 内首个 tabbable → tabindex=-1 的 dialog scope；若内容有明显静态标题且应用希望先阅读，使用 initialFocus 显式选择该标题。关闭恢复选择显式 returnFocus → 打开时记录的触发器 → 宿主提供的 fallback；均失效不强制 body 聚焦。仅最上层 trap 激活；关闭 child 后回到仍活跃 parent 的合理目标，关闭 parent 不将焦点恢复到已销毁 child。

modal=false 不加 aria-modal、不隔离背景、不锁滚动，Tab 正常离开。modal=true 对活动 dialog 输出 aria-modal=true，其祖先与注册浮层不可 inert；背景节点逐项记录原状态并按 context 引用计数恢复，乱序卸载也不提前解锁另一个活动模态层。trapFocus 与 acquireModal 使用同一显式 ModalContext，由 context 调度最上 scope 的 trap，具体顺序见 selection 4.11；context 与请求/实例隔离，不保存在跨 SSR 请求模块单例。

同层/嵌套 outside 路由由 [selection 的 DOM 接口](selection.md#411-dom-最小公开集合task10-实现)定义。pointerdown 打开层时不消费同一原始事件为 outside；逻辑子浮层可以 portal。SSR 首帧 inline，初始 open 输出 dialog 内容与稳定 ID；hydrate 完成后迁移；资源只在客户端实际打开时建立。真实关闭或卸载已打开实例时，先停止其焦点限制与事件路由，再按嵌套顺序释放隔离/滚动锁，最后至多恢复一次合法焦点；拒绝关闭时不释放。父层卸载会清理仍存活的子层，不把焦点交给已销毁子树；关闭/卸载幂等。Task8 夹具仅验证通用路由与 Vue 迁移策略，焦点陷阱、inert 和锁的真实实现/浏览器验收属于 Task10/13。
