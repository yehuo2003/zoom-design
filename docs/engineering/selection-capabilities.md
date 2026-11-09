# Task8–13 能力与后续输入

核对日期：2026-11-09。Task8–12 均已获用户验收（Task12于2026-10-30确认；自动验收16/16通过），Task13.1–13.12 均已获用户验收。Task13.12 的三浏览器综合自动回归已通过。下表区分可复用基础与产品验收；此前结果见 [Task12 验收](task12-acceptance.md)和[Task13 验收](task13-acceptance.md)。

| 层 | 已交付职责 | 使用入口与证据 |
| --- | --- | --- |
| Task8 契约 | 共同值/请求语义、三框架映射、主题/表单/SSR、IME 与 Dialog 边界 | [Selection](../contracts/selection.md)、[适配](../contracts/framework-adapters.md)、[Dialog](../contracts/dialog.md)、[基础 ADR](adr-0001-selection-foundations.md) |
| Task9 Core | 归一化、已选项匹配、导航、高亮协调、确定性过滤、typeahead 六个纯函数 | `@zoom-design/core`；[Task9验收](task9-acceptance.md)；不依赖 DOM/框架 |
| Task10 DOM | 定位/层级/焦点/模态/表单十二个公开函数 | `@zoom-design/dom`；[Task10验收](task10-acceptance.md)；Node导入安全，浏览器操作显式启动 |
| Task11 Vue Select | 始终受控值、可选受控open、select-only键盘/typeahead、原生表单、主题、SSR | `@zoom-design/vue/select`、独立CSS、[文档](../components/select.md)、[Task11验收](task11-acceptance.md) |
| Task12 Vue Combobox | value/query/highlight/IME草稿分离、过滤、原生编辑、独立三请求通道、同源表单与弹层 | `@zoom-design/vue/combobox`、独立CSS、[文档](../components/combobox.md)；自动验收16/16通过；实际范围见Task12验收 |
| Task13.1–13.12 Vue Dialog | 受控渲染、名称/描述、属性落点、独立外观、共享 layer、三类关闭请求、模态焦点/隔离/锁、嵌套选择、显式 portal、SSR/水合及 packed 消费；三浏览器综合回归和验收通过 | `@zoom-design/vue/dialog`、独立 CSS、[组件文档](../components/dialog.md)、[Task13 验收](task13-acceptance.md) |

## Task13 可直接使用的 DOM 能力

| 能力 | 公开函数 | 证据与适配责任 |
| --- | --- | --- |
| 定位与回收 | mountFloating | Task10验证offset/flip/shift/size、滚动/resize、RTL、异步失效与样式恢复；Dialog是否需要定位由其契约决定 |
| 顶层请求和内外判断 | createLayerContext、registerLayer、isWithin | Task10验证Escape/outside顶层路由、Shadow composedPath、逻辑节点、拒绝回写仍保留监听；Vue适配层拥有实际open与请求事件 |
| 聚焦与返回 | focusElement、restoreFocus | Task10验证存活目标、trigger/fallback与异常卸载；Dialog 初焦、返回策略及仅 focus 的组件 ref 已在 Task13 专项验证 |
| 模态背景与焦点 | createModalContext、acquireModal、trapFocus | Task10验证嵌套顺序、引用计数、反序清理、样式/inert/ARIA恢复、活动祖先和开放Shadow/slot；按同一context先acquire再trap |
| 原生表单桥 | getFormOwner、isFieldsetDisabled、observeFormBridge | Task10验证动态owner、首legend、invalid及reset最终取消状态；值/required与具名提交由适配层维护，不能直接作为Dialog表单业务模型 |

Vue selection 复用层提供非模态定位、逻辑内部节点、portal host、表单哨兵和原生值提交。Dialog 独立组合模态职责；当前 Vue 产品范围见[Dialog 文档](../components/dialog.md)。selection popup/私有 composables 与 SCSS mixin 不属于公开组件 API。

## 限制与后续验证

模态 SVG/MathML 背景使用 Task10 记录的可恢复事件/焦点后备隔离，完整原生 inert 语义需要 HTML host；关闭的 ShadowRoot 无法由外部遍历。调用方需提供可访问逻辑节点，不可同时由另一个管理器改写受管属性。详见Task10验收。

Task13.1–13.12 已完成对应专项验证、三浏览器综合自动回归与用户验收；Task13.11 已交付可编译文档示例。

React/Angular 产品适配、Angular SSR、真实输入法和读屏人工验收、触摸真机、Linux实机分别记录；Vue浏览器自动化和已有工程探针不替代这些证据。公开 npm 发布与 Git 提交/推送属于后续独立动作。
