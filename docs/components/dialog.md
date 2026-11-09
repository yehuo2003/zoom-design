# Dialog 对话框

`ZDialog` 用于需要用户处理的浮层内容。应用始终拥有 `open`；组件负责关闭请求、模态焦点、背景隔离、滚动锁与资源清理。普通 Dialog 不是表单控件；需要提交时在内容中放真实 `<form>`。

核对日期：2026-11-09。语义依据为 [Dialog 契约](../contracts/dialog.md)与[框架映射](../contracts/framework-adapters.md)；开发验证见 [Task13 验收记录](../engineering/task13-acceptance.md)。Task13.10 已获用户验收，Task13.11 已获用户验收。

## 框架与验证状态

| 框架 | 组件状态 | 类型与浏览器 | 表单 | SSR/水合 |
| --- | --- | --- | --- | --- |
| Vue 3 | 已实现 | TS6/TS7、vue-tsc、workspace/packed 三浏览器自动回归已验证；Task13.12 于 2026-11-09 用户验收通过 | 可容纳原生 form；Dialog 自身不序列化值 | 初始开/关、请求隔离、portal 迁移与 packed 三浏览器节点复用已验证 |
| React | 规划，当前不可用 | 无 Dialog 产品入口 | 未实施 | 未实施 |
| Angular | 规划，当前不可用 | 无 Dialog 产品 selector | 未实施；不声明 CVA | Angular SSR 未实施 |

## 导入与样式

Vue 可从 `@zoom-design/vue/dialog` 或根入口 `@zoom-design/vue` 命名导入 `ZDialog`；两者是同一组件。公开类型为 `DialogProps`、`DialogPanelAttributes`、`DialogEmits`、`DialogExpose`、`DialogSlots`、`DialogCloseSlotContext`，关闭详情来自 `@zoom-design/core`。仅使用 Dialog 时导入 `@zoom-design/vue/dialog/style.css`；需要主题与 density 再导入 `@zoom-design/vue/theme.css`。也可单独使用聚合 `@zoom-design/vue/style.css`，不要与单组件 CSS 重复导入。JS 不隐式加载 CSS；普通 CSS 使用无需 Sass。内部 `.vue`/SCSS/overlay 路径不是公共入口。

## Vue 示例 1：最小受控开关

```vue
<script setup lang="ts">
import { shallowRef } from 'vue';
import { ZDialog } from '@zoom-design/vue/dialog';
import '@zoom-design/vue/dialog/style.css';

const open = shallowRef(false);
</script>

<template>
  <button type="button" @click="open = true">打开设置</button>
  <ZDialog :open="open" @update:open="open = $event">
    <template #title>设置</template>
    <p>修改完成后可以关闭。</p>
  </ZDialog>
</template>
```

`open` 缺省为 `false`，并且始终受控。此例接受每次关闭请求；没有 `defaultOpen` 或内部自动回写。

## Vue 示例 2：拒绝关闭与事件次序

```vue
<script setup lang="ts">
import { shallowRef } from 'vue';
import { ZDialog } from '@zoom-design/vue/dialog';
import type { DialogCloseDetails } from '@zoom-design/core';
import '@zoom-design/vue/dialog/style.css';

const open = shallowRef(true);
const allowClose = shallowRef(false);
const events = shallowRef<string[]>([]);
function onUpdate(next: false) {
  events.value = [...events.value, 'update:open(false)'];
  if (allowClose.value) open.value = next;
}
function onRequest(details: DialogCloseDetails) {
  events.value = [...events.value, `close-request(${details.reason})`];
}
</script>

<template>
  <label><input v-model="allowClose" type="checkbox">允许关闭</label>
  <output>{{ events.join(' → ') }}</output>
  <ZDialog :open="open" @update:open="onUpdate" @close-request="onRequest">
    <template #title>确认操作</template>
    <p>未勾选时，Escape、外部点击和关闭按钮只发出请求。</p>
    <template #close="{ requestClose }">
      <button type="button" aria-label="请求关闭" @click="requestClose()">关闭</button>
    </template>
  </ZDialog>
</template>
```

一次有效关闭请求同步先发 `update:open(false)`，再发 `close-request(details)`。拒绝时不写回 `open`，组件仍打开，模态资源继续有效；直接修改 prop 不会反向产生请求。close 插槽的 `requestClose()` 使用 `close-button` 原因。

## Vue 示例 3：初焦、返回焦点与实例 focus

```vue
<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue';
import { ZDialog } from '@zoom-design/vue/dialog';
import type { DialogExpose } from '@zoom-design/vue/dialog';
import '@zoom-design/vue/dialog/style.css';

const open = shallowRef(false);
const trigger = useTemplateRef<HTMLButtonElement>('trigger');
const first = useTemplateRef<HTMLInputElement>('first');
const dialog = shallowRef<DialogExpose | null>(null);
const initialFocus = () => first.value;
const returnFocus = () => trigger.value;
</script>

<template>
  <button ref="trigger" type="button" @click="open = true">编辑名称</button>
  <ZDialog ref="dialog" :open="open" :initial-focus="initialFocus" :return-focus="returnFocus"
    @update:open="open = $event">
    <template #title>编辑名称</template>
    <label>名称 <input ref="first" name="name"></label>
    <template #footer>
      <button type="button" @click="dialog?.focus({ preventScroll: true })">聚焦对话框</button>
    </template>
  </ZDialog>
</template>
```

`initialFocus` 必须返回活动 Dialog 内可聚焦元素；无效时退到首个 tabbable，再退到 panel。真正关闭或卸载时，`returnFocus` 有效目标优先，其次打开时记录的触发器。`focus(options?)` 是唯一公开实例方法，仅在实际打开且 panel 有效时生效。

## Vue 示例 4：嵌套选择、显式 portal 与表单 owner

```vue
<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue';
import { ZDialog } from '@zoom-design/vue/dialog';
import { ZSelect } from '@zoom-design/vue/select';
import { ZCombobox } from '@zoom-design/vue/combobox';
import type { SelectionValue } from '@zoom-design/core';
import '@zoom-design/vue/theme.css';
import '@zoom-design/vue/dialog/style.css';
import '@zoom-design/vue/select/style.css';
import '@zoom-design/vue/combobox/style.css';

const open = shallowRef(false);
const choice = shallowRef<SelectionValue>('alpha');
const search = shallowRef<SelectionValue>(null);
const host = useTemplateRef<HTMLElement>('host');
const options = [{ value: 'alpha', label: 'Alpha' }, { value: 'beta', label: 'Beta' }];
const getHost = () => host.value;
function submit(event: Event) {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  console.info(Object.fromEntries(new FormData(form)));
}
</script>

<template>
  <button type="button" @click="open = true">编辑筛选</button>
  <ZDialog :open="open" portal :get-container="getHost" @update:open="open = $event">
    <template #title>筛选</template>
    <form id="dialog-filter-form" @submit="submit">
      <ZSelect v-model="choice" name="choice" :options="options" aria-label="选项"
        portal :get-popup-container="getHost" />
      <ZCombobox v-model="search" name="search" :options="options" aria-label="搜索"
        portal :get-popup-container="getHost" />
    </form>
    <template #footer>
      <button type="submit" form="dialog-filter-form">提交</button>
    </template>
  </ZDialog>
  <div ref="host" data-zoom-density="regular" class="dialog-host" />
</template>

<style scoped>
.dialog-host { --zoom-font-family: system-ui, sans-serif; --zoom-color-surface: #fff; }
</style>
```

Dialog 的 `getContainer()` 不接收 trigger；Select/Combobox 的 `getPopupContainer(trigger)` 可忽略参数。宿主必须连通、同 Document、位于本 Dialog 外，并由应用同步品牌、字体与 density。表单位于 Dialog 内容中，页脚按钮用原生 `form` 属性指定 owner；Dialog 本身不提交、重置或校验业务值。

## Vue 示例 5：局部品牌、字体、密度与样式覆盖

```vue
<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue';
import { ZDialog } from '@zoom-design/vue/dialog';
import '@zoom-design/vue/theme.css';
import '@zoom-design/vue/dialog/style.css';

const open = shallowRef(false);
const host = useTemplateRef<HTMLElement>('host');
const getHost = () => host.value;
const brand = {
  '--zoom-font-family': 'Georgia, serif',
  '--zoom-color-text': '#0f766e',
  '--zoom-color-surface': '#f0fdfa',
  '--zoom-dialog-inline-size': '38rem',
  '--zoom-dialog-title-font-size': '1.5rem',
};
</script>

<template>
  <section :style="brand" data-zoom-density="compact">
    <button type="button" @click="open = true">打开品牌对话框</button>
    <ZDialog :open="open" portal :get-container="getHost" @update:open="open = $event">
      <template #title>品牌设置</template>
      <p>字体、色彩和宽度由当前实例的主题控制。</p>
    </ZDialog>
    <div ref="host" :style="brand" data-zoom-density="compact" />
  </section>
</template>
```

`theme.css` 提供 `data-zoom-density` 的共享规则。外置宿主不自动继承原位置的局部变量；此例明确给宿主同一品牌配置。普通单组件 CSS 有 regular 回退，无需 Sass。

## Vue 示例 6：SSR 同构输入与初始打开

```vue
<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue';
import { ZDialog } from '@zoom-design/vue/dialog';
import '@zoom-design/vue/dialog/style.css';

const props = defineProps<{ initialOpen: boolean; dialogId: string }>();
const open = shallowRef(props.initialOpen);
const host = useTemplateRef<HTMLElement>('host');
const getHost = () => host.value;
</script>

<template>
  <main>
    <button type="button" @click="open = true">重新打开</button>
    <ZDialog :id="dialogId" :open="open" portal :get-container="getHost"
      @update:open="open = $event">
      <template #title>服务端对话框</template>
      <p>初始打开时正文已在服务端 HTML 中。</p>
    </ZDialog>
    <div ref="host" />
  </main>
</template>
```

服务器与客户端首帧必须提供相同的 `initialOpen`、`dialogId`、内容和主题，应用用请求本地状态分别创建 SSR app 与 hydration app。setup 不访问 `document`；初始打开的服务端 panel/title/正文先 inline 输出，水合后才迁入已连通宿主，不能把 `'body'` 当隐式宿主。实际同源路由可用 `npm run dev:vue` 后访问 `/ssr?example=dialog&open=true&id=demo&portal=true`。

## 参数与默认值

全部可选；缺省、`null`/`undefined` 和非法 JS Boolean 输入按语义默认值归一化，非法值开发环境告警。表内 `undefined` 表示未提供配置，非组件管理的内部状态。

| Vue 参数/属性 | 类型 | 默认 | 行为与落点 |
| --- | --- | --- | --- |
| `open` | `boolean` | `false` | 始终受控；真实开关只由输入决定 |
| `modal` | `boolean` | `true` | 实际打开时启用焦点范围、背景隔离和滚动锁 |
| `closeOnEscape` | `boolean` | `true` | 顶层 Escape 请求；禁用时不转交下层 |
| `closeOnOutside` | `boolean` | `true` | 逻辑节点外 pointerdown 请求 |
| `restoreFocus` | `boolean` | `true` | 真正关闭/卸载后尝试恢复 |
| `initialFocus` | `() => HTMLElement \| null` | `undefined` | 打开后解析活动 scope 内目标 |
| `returnFocus` | `() => HTMLElement \| null` | `undefined` | 关闭时解析恢复目标 |
| `portal` | `boolean` | `false` | 默认 inline；启用需显式宿主 |
| `getContainer` | `() => HTMLElement \| null` | `undefined` | 仅客户端需要时取同 Document 外部宿主；无效则 inline |
| `closeLabel` | `string` | `关闭` | 默认原生关闭按钮的可访问名称 |
| `id` | `string` | `undefined` | panel ID；缺省使用稳定生成 ID |
| `aria-label` | `string` | `undefined` | panel 的显式名称 |
| `aria-labelledby` | `string` | `undefined` | panel 的显式标题引用，优先于 label |
| `aria-describedby` | `string` | `undefined` | panel 的显式描述引用；空串禁止自动关联 |
| `panelAttrs` | `DialogPanelAttributes` | `undefined` | 受限 panel 原生属性，见下表 |
| `class` | Vue class | `undefined` | overlay root |
| `style` | Vue style | `undefined` | overlay root |
| `data-*` | `string \| number \| boolean \| undefined` | `undefined` | overlay root |

名称优先级为非空 `aria-labelledby` → 非空 `aria-label` → title slot 稳定 ID。无名称会开发告警；显式引用是否存在由应用负责。描述优先级为显式 `aria-describedby` → description slot ID → 省略。空串显式禁用自动描述关联。`closeLabel` 空白或非法值回退“关闭”。函数抛错或无效目标会告警并按焦点/portal 降级规则处理。

## 事件、slots 与实例方法

| Vue 事件 | payload | 顺序与触发 |
| --- | --- | --- |
| `update:open` | `false` | 一次有效 Escape/outside/关闭按钮请求的第一步；请求不等于已关闭 |
| `close-request` | `DialogCloseDetails`：`{ readonly open: false; readonly previousOpen: true; readonly reason: 'escape' \| 'outside' \| 'close-button' }` | 同步紧随 `update:open`；父层拒绝回写仍会收到 |

| Vue slot | 上下文 | 内容 |
| --- | --- | --- |
| `default` | 无 | 对话内容 |
| `title` | 无 | 可访问名称的自动标题引用 |
| `description` | 无 | 自动描述引用 |
| `footer` | 无 | 操作区；跨 form 的按钮需显式 `form` |
| `close` | `{ requestClose(): void }` | 替代默认关闭按钮；应用自己提供 `type="button"` 与可访问名称 |

实例 `DialogExpose` 仅有 `focus(options?: FocusOptions): void`。没有 `open`、`close`、`toggle`、`blur` 或实例 `requestClose`；close slot 的 `requestClose` 只用于该插槽。没有“关闭完成”事件或动画完成承诺。

## 原生属性、表单与可访问性

| 通道 | 允许项 | 实际位置 |
| --- | --- | --- |
| 组件 `class`/`style`/`data-*` | Vue class/style 和受限 data 值 | overlay root |
| `panelAttrs` | `title`、`dir`、`onFocus`、`onBlur`、`onKeydown`、`onKeyup`、`onClick`、`class`、`style`、`data-*` | `role="dialog"` 的 panel |
| 名称/描述 props | `aria-label`、`aria-labelledby`、`aria-describedby` | panel；组件计算后的优先级生效 |

`panelAttrs` 不能覆盖 `id`、`role`、`tabindex`、`aria-modal` 或命名 ARIA；字符串事件处理器被过滤。默认关闭按钮是原生 `type="button"`。`modal=false` 不输出 `aria-modal`，也不隔离背景或锁滚动；Tab 可离开。`modal=true` 只让最上层活动 scope 接收 Escape/outside 和焦点限制，逻辑子浮层可外置。应用必须提供可访问名称与可发现的退出路径。

Dialog 本身没有 `name`、`value`、`required`、`disabled`、`form`、`reset` 或 CVA 接口，不产生 FormData 项。真实 form 的提交、校验、reset 与外部按钮 owner 使用原生 HTML 规则；内部 Select/Combobox 的已确认值各自处理。卸载/关闭不会替应用保存表单草稿。

## 主题与 22 个 CSS 变量

下表的回退链来自 `packages/vue/src/dialog/style.scss`；`theme.css` 可提供共享 token，组件独立 CSS 自带最终回退。变量通常设置于 Dialog 所在主题祖先；外置时应用需同步到实际宿主。`dir` 可通过外层或 `panelAttrs.dir` 指定；窄屏、长文、放大字号时 panel 自适应并让内容区滚动。

| CSS 变量 | 回退链/默认 | 作用 |
| --- | --- | --- |
| `--zoom-dialog-z-index` | `--_zoom-overlay-layer-z` → `1000` | overlay 层序 |
| `--zoom-dialog-viewport-gap` | `1rem` | 视口留白 |
| `--zoom-dialog-font-family` | `--zoom-font-family` → Sass 默认字体 | 根字体 |
| `--zoom-dialog-font-size` | `--zoom-font-size-md` → `--zoom-font-size-base` → `1rem` | 根字号 |
| `--zoom-dialog-line-height` | `--zoom-line-height` → `1.5` | 行高 |
| `--zoom-dialog-color` | `--zoom-color-text` → `#111827` | 正文色 |
| `--zoom-dialog-backdrop-color` | `rgb(0 0 0 / 45%)` | 背景遮罩 |
| `--zoom-dialog-gap` | `--zoom-control-gap` → `.5rem`，再乘 2 | 布局间距 |
| `--zoom-dialog-inline-size` | `32rem` | panel 宽度 |
| `--zoom-dialog-max-block-size` | `100dvh - 2 × --zoom-dialog-viewport-gap`（gap 回退 `1rem`）；旧环境先用 `100vh` | panel 最大高度 |
| `--zoom-dialog-padding` | `--zoom-control-gap` → `.5rem`，再乘 3 | panel 内边距 |
| `--zoom-dialog-border-color` | `--zoom-color-border` → `#6b7280` | panel 边框 |
| `--zoom-dialog-radius` | `--zoom-radius-md` → `.375rem` | panel/关闭按钮圆角 |
| `--zoom-dialog-background` | `--zoom-color-surface` → `#fff` | panel 背景 |
| `--zoom-dialog-shadow` | `0 1rem 3rem rgb(0 0 0 / 20%)` | panel 阴影 |
| `--zoom-dialog-title-font-size` | `--zoom-font-size-lg` → `1.125rem` | 标题字号 |
| `--zoom-dialog-title-font-weight` | `600` | 标题字重 |
| `--zoom-dialog-muted-color` | `--zoom-color-text-muted` → `#4b5563` | 描述文字 |
| `--zoom-dialog-close-size` | `--zoom-control-min-size-md` → `2.25rem` | 关闭按钮尺寸 |
| `--zoom-dialog-focus-width` | `--zoom-focus-width` → `2px` | 焦点轮廓宽度 |
| `--zoom-dialog-focus-color` | `--zoom-color-focus` → `--zoom-color-primary` → `#2563eb` | 焦点轮廓颜色 |
| `--zoom-dialog-focus-offset` | `--zoom-focus-offset` → `2px` | 焦点轮廓偏移 |

## SSR、水合与生命周期

Node 导入无浏览器全局副作用。SSR 初始关闭时不渲染 Dialog 内容；初始打开时 inline 输出真实 panel/title/正文与稳定 ID。客户端使用同一请求数据和组件树水合后，才将实际节点迁到合法 portal 宿主；初焦、层级和滚动锁仅在客户端建立。每个请求独立，不复用跨请求的 owner、焦点或品牌状态。关闭/卸载释放监听、观察器、背景原状态和锁；拒绝关闭不释放。组合示例与实际预览分别见 [`DialogExamples.vue`](../../apps/vue-smoke/src/examples/DialogExamples.vue)、[`DialogCompositionExamples.vue`](../../apps/vue-smoke/src/examples/DialogCompositionExamples.vue)。

## React 规划映射，当前不可用

未来 React 适配预计使用受控 `open`、`onOpenChange(false, details)` 后 `onCloseRequest(details)`，`children`/title/description/footer/renderClose、受限 panelProps，以及仅 `focus(options?)` 的 ref handle。`createPortal`、SyntheticEvent 与原生 DOM 事件的边界和 SSR 需单独实现、测试。以下为语义伪代码，**不是可安装的 import 或可运行示例**：

```text
state.open → 未来 Dialog 的 open
onOpenChange(false, details) → 应用决定是否 setOpen(false)
onCloseRequest(details) → 记录 reason；拒绝回写时仍显示打开
```

## Angular 规划映射，当前不可用

未来 Angular 适配预计使用 `open` input、先 `openChange(false)` 后 `closeRequest(details)` output，内容投影和 TemplateRef 承载 title/description/footer/close；具体 selector/directive 尚未冻结。Dialog 不是表单值控件，不预设 CVA。以下为语义伪代码，**不是现有 selector 或可编译模板**：

```text
应用 open 状态 → 未来 Dialog 的 open input
openChange(false) → 应用决定是否回写
closeRequest(details) → 记录 reason；实际关闭仍以 input 为准
```

## 已知限制与验证依据

首轮没有服务式命令 API、动画完成事件或实例 `requestClose`。关闭的 ShadowRoot、手工读屏、真实系统 IME、触摸设备、Linux 实机与 React/Angular 产品能力不由当前 Vue 自动化推断。Task13.11 已验收的六段文档示例以真实公共声明编译；Task13.12 的三浏览器综合自动回归与完整 CI 已通过，并于 2026-11-09 获用户验收。详细命令和范围见 [Task13 验收记录](../engineering/task13-acceptance.md)。
