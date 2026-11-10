# @zoom-design/dom

框架无关的浏览器交互工具，供组件适配层处理浮层定位、外部点击与 Escape、模态隔离、焦点和原生表单生命周期。它不渲染组件，也不保存应用的选中值或展开状态。

## 安装

```sh
npm install @zoom-design/dom
```

`@zoom-design/core` 和 `@floating-ui/dom` 是本包的运行依赖，会随安装解析。包根入口可在 Node 环境导入；实际浏览器操作须在 DOM 节点挂载后调用。

## 浮层用法

下面的 `trigger` 与 `popup` 应是同一 `Document` 中已连接的元素。`onDismiss` 只通知关闭意图，应用负责更新状态并在关闭或卸载时清理资源。

```ts
import {
  createLayerContext,
  mountFloating,
  registerLayer,
} from '@zoom-design/dom';

const layers = createLayerContext(trigger.ownerDocument);
const floating = mountFloating(trigger, popup, {
  placement: 'bottom-start',
  offset: 4,
  matchTriggerWidth: true,
});
const layer = registerLayer(layers, {
  nodes: [trigger, popup],
  onDismiss(reason, event) {
    requestClose(reason, event); // 由应用决定是否真正关闭
  },
});

await floating.update();

// 关闭、节点迁移或组件卸载时：
layer.cleanup();
floating.cleanup();
```

嵌套浮层应共享同一个 `LayerContext`，并通过 `parent` 表达逻辑父层。节点迁移后可调用 `layer.updateNodes(nextNodes)`；新节点必须仍在同一 `Document` 且已连接。`mountFloating` 在挂载期间自动跟踪布局变化，清理时恢复它管理的行内样式。

## 能力概览

| 能力 | 公开函数 | 责任边界 |
| --- | --- | --- |
| 定位 | `mountFloating` | 使用 Floating UI 计算位置、翻转和视口约束；返回 `update()` 与 `cleanup()`。 |
| 浮层层级 | `createLayerContext`、`registerLayer`、`isWithin` | 识别逻辑父子层、Shadow DOM 内部交互、顶层 outside/Escape 请求；不替应用更改 open。 |
| 模态 | `createModalContext`、`acquireModal` | 管理活动模态的背景隔离、滚动锁及嵌套层级；返回可释放的句柄。 |
| 焦点 | `trapFocus`、`focusElement`、`restoreFocus` | 为已登记的模态约束焦点，并在关闭后尝试恢复到触发器或后备元素。 |
| 表单 | `observeFormBridge`、`getFormOwner`、`isFieldsetDisabled` | 观察原生 form owner、reset、invalid 与 fieldset 禁用状态；值和表单序列化由适配层负责。 |

模态使用时，对同一 `Document` 的嵌套模态共享 `ModalContext`。先用 `acquireModal(context, { scope })` 登记已连接的面板，再调用 `trapFocus(context, scope)`；关闭时释放两个句柄，并由应用安排 `restoreFocus`。外置的交互节点可用 `allowedNodes` 登记，迁移后用 `updateAllowedNodes` 更新。同步关闭多个嵌套模态时可用 `context.batch(action, afterCommit)` 协调一次焦点恢复。

`observeFormBridge` 需要原生 `HTMLSelectElement` 验证代理、`HTMLInputElement` 提交代理和可聚焦 trigger。它监听表单切换、reset 与 invalid，但不会写入 `value`、`name` 或 `disabled`；这些仍由框架组件控制。

## 使用约束

- 所有操作节点需属于同一活动 `Document`；浏览器 API 在不支持的环境调用时会明确失败。
- 每次登记、定位、焦点约束和表单观察都应在关闭或卸载时调用对应 `cleanup()`。清理可重复调用。
- 本包没有 CSS，也不负责 portal 宿主的字体、方向、主题或密度继承。
- 仅 `@zoom-design/dom` 根入口公开 ESM 和类型；不要依赖 `/src/*` 或 `/dist/*` 深层路径。
