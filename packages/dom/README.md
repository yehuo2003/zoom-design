# @zoom-design/dom

框架无关的浏览器交互基础。Task10 提供十二个函数和十二个类型：定位、文档层级、焦点、模态隔离/滚动锁和原生表单生命周期。导入本包不访问浏览器资源；在 Node 中调用浏览器操作会明确抛出 `Unsupported browser environment`。它不保存组件模型、不渲染 Select/Combobox/Dialog。

只支持根入口的 ESM 与声明，src/dist 深层导入关闭。生产构建 TS7.0.2、ES2022 + DOM/DOM.Iterable、strict、skipLibCheck=false；真实声明以 TS6.0.3/TS7.0.2 复验。运行依赖为 Core0.0.0 与 Floating UI DOM1.8.0，无框架或视觉样式依赖。

## 定位与非模态层

```ts
import { mountFloating, createLayerContext, registerLayer, isWithin } from '@zoom-design/dom';
// 只在浏览器挂载阶段执行。节点须连通、位于同一个 live Document。
const layers = createLayerContext(trigger.ownerDocument); // 同 document 的组件共享此 context
const floating = mountFloating(trigger, popup, {
  placement: 'bottom-start', offset: 4, matchTriggerWidth: true,
  onError(error) { console.error(error); },
});
const layer = registerLayer(layers, {
  nodes: [trigger, popup, clearButton],
  onDismiss(reason, event) { requestClose(reason, event); },
});
const inside = isWithin([trigger, popup], event.relatedTarget, event);
await floating.update();
// 关闭、重建 portal 或卸载时调用；可以重复调用。
layer.cleanup(); floating.cleanup();
```

Floating 默认为 bottom-start、4px、匹配 trigger rect 宽度，absolute 策略；flip/shift/size 约束位置与最大高度。保留已有像素 max-height 上限；cleanup 恢复拥有的 inline style 值及 priority，旧 Promise 不再写节点。update 清理后可安全调用。autoUpdate 只在挂载期间运行；错误交给 onError，未提供时 console.error。portal 的主题、字体和 dir 由应用同步到 host/popup，start/end 由定位库按 popup 方向解析。

Layer 的 parent 表达逻辑祖先，nodes 显式包含 trigger、popup、clear；Shadow DOM 用 composedPath 与插槽关系识别。仅最后注册的顶层收到 outside/Escape 请求；顶层关闭选项为 false 时不下传。回调只是请求，调用方决定是否关闭并 cleanup；拒绝后下一个独立意图仍可请求。清理最后一个注册会移除 document 监听。非模态选择层不调用 acquireModal/trapFocus，不锁滚动，Tab 保持原生离开行为。

## 模态与焦点

```ts
import { createModalContext, acquireModal, trapFocus, restoreFocus, focusElement } from '@zoom-design/dom';
const modals = createModalContext(scope.ownerDocument); // 同 document 的嵌套模态共享
const release = acquireModal(modals, { scope, allowedNodes: [portaledContent] });
const stopTrap = trapFocus(modals, scope, { initialFocus: firstInput });
// 关闭时先结束当前陷阱，再释放模态资源，最后恢复调用方选定的目标。
stopTrap(); release(); restoreFocus(trigger, fallback);
focusElement(fallback, { preventScroll: true });
```

每个 Document 同时只允许一个活动 ModalContext，误用另一个 context 会在写资源前拒绝。嵌套时仅顶层启用 Tab/焦点限制和背景隔离；allowedNodes 既参与隔离豁免，也参与焦点循环。Tab 候选支持正 tabindex、radio group、隐藏/disabled、closed details、开放 ShadowRoot 与 slot；无候选时暂给 scope tabindex=-1，清理恢复。安全聚焦和恢复返回 boolean；已删除、hidden、inert、disabled 目标可降级到 fallback。调用方明确恢复触发器，不依赖鼠标点击是否原生聚焦。

隔离只对活动 scope/allowedNodes 之外的兄弟分支设置 inert/aria-hidden，不隔离主题 host 或活动祖先。HTML 使用原生 inert；SVG/MathML 背景另用 pointer-events:none 与 context 持有的指针/激活/键盘/焦点事件防护，聚焦时退回当前 trap 或 scope，最终恢复原样式并移除防护。它是事件/焦点后备隔离，不承诺 HTML 原生 inert 的全部浏览器内部语义；需要完整原生语义时由应用为 SVG 提供 HTML 背景 host。不会移动框架管理的节点。滚动锁按活跃 acquire 引用计数，反序清理仍保留剩余锁，最后恢复 body/html 的 overflow、补偿 padding 和原属性。观察 light DOM 及可访问开放 ShadowRoot 的子树；移除或跨 Document 收养 scope 会自动释放对应资源。调用方仍应在组件卸载、关闭和 portal 变更时显式 cleanup；关闭的 ShadowRoot 无法由外部遍历，应把可访问 host/实际逻辑节点交给 API。活动期间不要同时由其他系统改写这些受管属性/样式。

## 原生表单桥接

```ts
import { observeFormBridge, getFormOwner, isFieldsetDisabled } from '@zoom-design/dom';
const bridge = observeFormBridge({
  proxy: validationSelect, submission: hiddenInput, trigger,
  onReset(event) { requestDefaultValue(event); },
  onInvalid(event) { showInvalidState(event); },
  onOwnerChange(form) { synchronizeAdapterFormState(form); },
});
const form = getFormOwner(validationSelect);
const disabled = isFieldsetDisabled(validationSelect);
bridge.refresh(); // 适配层修改 form/name/disabled 后可同步刷新
bridge.cleanup();
```

form owner 使用原生 `.form`，支持外置 form ID；fieldset 禁用以原生 control 的 :disabled 为准，保留首 legend 例外。bridge 监听 owner reset、proxy invalid 和 form/id/name/disabled/子树变化。reset 在下一个 task 中检查最终 defaultPrevented，晚注册的取消监听同样生效；换 owner/卸载会取消待回调。invalid preventDefault 后尝试聚焦可见 trigger，并转交原 Event。节点被移除、跨 document 或初始化异常会回收监听/observer/timer。值、name/disabled 同步、序列化、required、aria-invalid、受控模型回写由框架适配层负责；本层不会修改业务值。

## 验证与预览

```text
npm run build --workspace @zoom-design/dom
npm run typecheck --workspace @zoom-design/dom
npm run test:unit --workspace @zoom-design/dom
npm run test:coverage --workspace @zoom-design/dom
npm run test:e2e -- --package dom --browser all
npm run dev:platform
```

预览打开 `/layers`；`/dom` 保留旧私有监听探针。生产覆盖率与探针分开统计，DOM 每个可执行生产文件的 statements/functions/branches/lines 均要求 ≥80%。workspace 与独立 tarball 平台使用相同公开 API 场景；四个独立消费者检查真实声明、七个精确类型负例、Node 安全导入及十二个操作的 unsupported 失败路径。结果和限制见 [Task10 验收](../../docs/engineering/task10-acceptance.md)，冻结 API 见 [selection 4.11](../../docs/contracts/selection.md)。
