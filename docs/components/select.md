# Select 单选选择器

`ZSelect` 从同步选项中请求选择一个已有值，适合无需文本搜索的单选表单和筛选。应用拥有已确认值，组件负责临时高亮、键盘、定位、原生表单桥接和可访问状态。

核对日期：2026-10-29。语义依据为 [Selection 共同契约](../contracts/selection.md)与[框架适配契约](../contracts/framework-adapters.md)。Task11 自动验收16/16通过，待用户验收，见[验收记录](../engineering/task11-acceptance.md)。

## 框架与验证状态

| 框架 | 实现状态 | 类型与浏览器 | 表单 | SSR 与水合 |
| --- | --- | --- | --- | --- |
| Vue 3 | 已实现；Task11待用户验收 | 真实声明通过；workspace/packed Chromium、Firefox、WebKit各47项通过 | 原生提交、required、reset、外部form通过 | 初始关闭/打开、portal、节点复用与请求隔离通过 |
| React | 规划用法，当前不可用 | 产品组件未实施 | 未实施 | 产品 SSR 未实施 |
| Angular | 规划用法，当前不可用 | 产品组件未实施 | CVA / Forms 未实施 | Angular SSR 尚未实施 |

自动化、契约设计评审与人工辅助技术验证分别记录。本文未宣称已完成人工读屏、真实输入法或触摸设备验收；Vue 结果不替代其他框架的证据。

## 导入与样式

根入口与子路径均命名导出 `ZSelect`，没有默认导出。JS 不隐式加载 CSS。

```ts
import { ZSelect } from '@zoom-design/vue/select';
import type { SelectProps, SelectEmits, SelectExpose } from '@zoom-design/vue/select';
import '@zoom-design/vue/theme.css';
import '@zoom-design/vue/select/style.css';
```

也可从 `@zoom-design/vue` 导入组件与类型，样式只用聚合 `@zoom-design/vue/style.css`，其中包含主题及已实现的 Button、Select。`select/style.css` 单独使用具备 regular 默认回退；容器 density 规则来自 `theme.css`。普通 CSS 用户无需 Sass；可选 `theme.scss` 只公开主题，不公开组件内部 SCSS。

公开 Vue 类型为 `SelectProps`、`SelectEmits`、`SelectExpose`、`SelectSize`、`SelectTriggerAttributes`、`SelectOptionContext`、`SelectValueContext`。共同值、选项与事件详情类型从 `@zoom-design/core` 导入，`Placement` 从 `@zoom-design/dom` 导入。内部 composables、popup 和 `.vue` 源路径不属于公开入口。

## Vue 用法

```vue
<script setup lang="ts">
import { shallowRef } from 'vue';
import { ZSelect } from '@zoom-design/vue/select';
import type { SelectExpose } from '@zoom-design/vue/select';
import type { SelectionValue } from '@zoom-design/core';
import '@zoom-design/vue/theme.css';
import '@zoom-design/vue/select/style.css';
const value = shallowRef<SelectionValue>(0);
const select = shallowRef<SelectExpose | null>(null);
const options = [
  { value: 0, label: '零' },
  { value: '', label: '空字符串' },
  { value: 'blue', label: '蓝色' },
  { value: 'unavailable', label: '暂不可选', disabled: true },
] as const;
</script>
<template>
  <form id="preferences" @submit.prevent>
    <ZSelect ref="select" v-model="value" :options="options" name="color"
      required clearable aria-label="颜色" placeholder="请选择颜色" />
    <button type="submit">保存</button><button type="reset">重置</button>
  </form>
  <button type="button" @click="select?.focus({ preventScroll: true })">聚焦颜色</button>
</template>
```

`modelValue` 始终受控，默认 null。未绑定时用户操作仍发请求，显示继续由输入决定；没有 defaultValue。`v-model` 接受并回写，也可用 `:model-value` 与 `@update:model-value` 审核请求。数字 0、字符串 '0' 与空串 '' 是三个独立值；null 才是无值。数字必须有限，NaN/Infinity/对象等非法 JS 值回退 null。

选项按同类型 value 匹配。重复项保留第一项，非法项跳过，非法 option.disabled 按禁用处理；不修改传入数组/对象。删除已选项后保留应用值，显示占位且不提交；相同值重新出现后恢复标签。禁用选项不能被用户新选，应用明确赋予它的已确认值仍可显示和提交。

`open` 首帧为 undefined 时由实例管理，初始关闭；首帧提供布尔值时由父层控制。实例内不切换模式：内部模式后来传值会忽略并开发告警；受控模式后来传 undefined 仍受控，实际回退关闭并开发告警。值与打开状态独立。

```vue
<script setup lang="ts">
import { shallowRef } from 'vue';
import { ZSelect } from '@zoom-design/vue/select';
import type { SelectionValue } from '@zoom-design/core';
const value = shallowRef<SelectionValue>('a');
const open = shallowRef(false);
const options = [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }];
function approve(next: SelectionValue) { if (next !== 'b') value.value = next; }
</script>
<template>
  <ZSelect :model-value="value" v-model:open="open" :options="options"
    aria-label="审核选择" @update:model-value="approve" />
</template>
```

该例拒绝 B 的值请求，仍显示 A，但接受关闭请求。若父层也拒绝关闭，popup、实际 aria-expanded、高亮及必要监听/定位资源继续保持打开。open-change 表达请求，不等于状态已经改变。

## 参数

全部 props 可省略。下表名称为 Vue 实际 API；框架差异见后文。

| Prop | 类型 | 默认 | 行为与限制 |
| --- | --- | --- | --- |
| modelValue | `string \| number \| null` | `null` | 始终受控，仅有限数字，同类型匹配 |
| options | `readonly SelectionOption[]` | `[]` | `{ value, label, disabled? }`；同步标准选项，label 为文本 |
| size | `'sm' \| 'md' \| 'lg'` | `'md'` | 尺寸、密度、局部 token 共同决定几何 |
| disabled | `boolean` | `false` | 不聚焦/打开/修改/提交；与 fieldset 禁用合并 |
| readonly | `boolean` | `false` | 可聚焦和提交；不打开/修改/清空，取消原生 required |
| loading | `boolean` | `false` | busy、阻止修改，保持可聚焦与已确认字段；无匹配仍受 required 约束 |
| clearable | `boolean` | `false` | 非 null 且可修改时显示独立清空按钮 |
| placeholder | `string` | `''` | 无匹配时显示，不承担可访问命名 |
| emptyText | `string` | `'暂无选项'` | 空列表提示 |
| loadingText | `string` | `'加载中'` | 加载提示 |
| clearLabel | `string` | `'清空'` | 清空按钮的可访问名称 |
| open | `boolean \| undefined` | `undefined` | 首帧固定内部/受控模式；内部初始 false |
| loop | `boolean` | `false` | true 才环绕箭头边界，均跳过禁用项 |
| placement | `'bottom-start' \| 'bottom-end' \| 'top-start' \| 'top-end'` | `'bottom-start'` | 首选位置，碰撞时可翻转 |
| offset | `number` | `4` | 非负有限 CSS px |
| matchTriggerWidth | `boolean` | `true` | popup 匹配触发器宽度，并受可用空间约束 |
| portal | `boolean` | `false` | 默认 inline；true 使用显式主题 host |
| getPopupContainer | `(trigger: HTMLElement) => HTMLElement \| null` | 未提供 | 需同 document、连接且有效；失败告警并回退 inline |
| id | `string` | 未提供 | 可见触发器 ID，缺省由 Vue useId 生成 |
| name | `string` | 未提供 | 提交字段名；无有效名称时不提交 |
| form | `string` | 未提供 | 外部表单 ID，同步提交与校验归属 |
| required | `boolean` | `false` | 判断是否有匹配项，0、空串合法 |
| invalid | `boolean` | `false` | 应用错误 UI 与 aria-invalid，不替代原生校验 |
| aria-label | `string` | 未提供 | 可见触发器名称 |
| aria-labelledby | `string` | 未提供 | 触发器名称来源节点 ID |
| aria-describedby | `string` | 未提供 | 触发器说明节点 ID |
| triggerAttrs | `SelectTriggerAttributes` | 未提供 | 实际触发按钮的受限原生属性/事件 |
| class / style | Vue `HTMLAttributes` 对应类型 | 未提供 | 外层容器；CSS 变量可继承到 trigger/inline popup |
| data-* | `string \| number \| boolean \| undefined` | 未提供 | 外层标记；组件保留 data-zoom-* |

非法枚举回退默认值。Boolean 先经过 Vue props 转换；除 null/undefined 外的非法非布尔输入在 disabled/readonly/loading 上按 true，clearable/loop/portal/required/invalid 按 false，matchTriggerWidth 按 true。不要写 `disabled="false"`，应写 `:disabled="false"`。非法文本回退各自默认值，非法 id/name/form 视为未提供，非法 offset 回退 4。开发模式报告诊断，生产行为仍执行守卫。

## 事件与顺序

| 事件 | payload | 含义 |
| --- | --- | --- |
| update:modelValue | `SelectionValue` | 请求改变业务值 |
| change | `{ value, previousValue, option, reason }` | 值请求详情；reason 为 option / clear / reset；option 为新值匹配项或 null |
| update:open | `boolean` | 请求改变打开状态 |
| open-change | `{ open, previousOpen, reason }` | 打开请求详情；reason 类型为 trigger / keyboard / input / option / escape / outside / blur / clear / reset / disabled |

Select 不产生文本编辑，input 是共同打开原因类型为 Combobox 保留的成员。详情是独立语义对象，不含 DOM Event；原生 FocusEvent/KeyboardEvent/MouseEvent 可用 triggerAttrs 对应回调观察。

一次确认、清空或 reset 依次同步请求 `update:modelValue` → `change` → `update:open` → `open-change`。不变化的通道省略：同值确认只可能请求关闭，已经关闭时不重复请求关闭。外部赋值、options 更新、水合、重复渲染及高亮移动不反向发 value 事件。一次意图请求一次；拒绝之后的下一次独立意图可重新请求。

打开后 disabled/readonly/loading 到来时请求 reason=disabled 关闭。受控父层拒绝则保留实际打开状态与资源，阻止交互修改，反映真实 ARIA；组件不擅自改写 props。

## Slots 与实例方法

| Slot | 上下文 | 默认内容 |
| --- | --- | --- |
| option | `{ option, selected, highlighted }` | option.label；selected 为已确认值，高亮为临时位置 |
| value | `{ option, value }` | 匹配 label，否则 placeholder；未知值时 option=null |
| empty | 无 | emptyText |
| loading | 无 | loadingText |

```vue
<ZSelect v-model="value" :options="options" aria-label="自定义颜色">
  <template #option="{ option, selected, highlighted }">
    <span :data-current="highlighted">{{ selected ? '✓ ' : '' }}{{ option.label }}</span>
  </template>
  <template #value="{ option }">{{ option?.label ?? '请选择' }}</template>
  <template #empty>目前没有可选项</template>
  <template #loading>正在读取选项</template>
</ZSelect>
```

自定义内容需保留有意义的文字与名称，label 仍承担 typeahead 匹配职责。option/value 内不嵌套按钮、链接、输入或其他可聚焦内容。清空按钮是独立 type=button，不嵌套进触发按钮。

`SelectExpose` 仅有 `focus(options?: FocusOptions): void`、`blur(): void`。禁用时 focus 不绕过禁用，不公开任意 setValue 或私有 DOM 节点。

## 原生属性落点

外层 class/style/data-* 与交互元素属性分开。id、命名 ARIA 与 triggerAttrs 落到可见触发器。triggerAttrs 声明支持 title、autofocus、tabindex、dir、class/style、命名 ARIA、data-* 及 onFocus/onBlur/onKeydown/onKeyup/onClick；其他任意业务属性无类型承诺。

优先级为组件计算状态 → 顶层命名 ARIA → triggerAttrs。组件控制 value/name/form/type/disabled/readonly、role、aria-expanded/controls/activedescendant/disabled/readonly/busy/invalid/required/haspopup 与 data-zoom-*。通道按大小写过滤冲突键，拒绝字符串事件处理器；合法 Vue class/style 和回调按框架机制合并。顶层 name/form 属于提交桥接，不添加到按钮模拟原生 select。组件 change 与原生 input/change 无关。

## 表单、校验与 reset

有匹配的已确认值以一个字段提交 `String(value)`。数字 0、字符串 '0' 在 FormData 中都为字符串 '0'，JS 模型仍区分类型；合法空串提交空字符串。null、未知值、无 name、组件或 fieldset 实际 disabled 时不提交。禁用选项的外部已确认值仍可提交。

required 参加真实原生校验，按“匹配项存在”判断，0、空串均有效。invalid 表达应用错误 UI，与内部原生 invalid 状态合并且不修改 prop；验证失败焦点移到可见触发器。readonly 保留提交但取消 required；loading 保留已有字段，无有效选择时仍受 required 约束。fieldset 与首个 legend 例外遵循浏览器规则。

组件配合原生 form 提交/校验，具体桥接节点不是公共 DOM 结构。portal 只迁移 popup，桥接始终位于原组件/fieldset；form/name 动态变化与外部 form 关联遵循实际表单所有权，不重复提交业务字段。

reset 最终未取消时，在下一任务请求 null，reason=reset，再请求关闭；不直接改父值。父层可接受、拒绝或回写自己的初始值。最终 preventDefault 时不发请求；同一次 reset 只请求一次，同值 null 不重复发值事件。原生默认动作后将桥接同步到最终应用值，避免模型与代理失配。

```vue
<ZSelect :model-value="value" :options="options" form="external-form"
  name="choice" required aria-label="外部表单选择" @update:model-value="value = $event" />
<form id="external-form" @submit.prevent @reset="cancelReset && $event.preventDefault()">
  <button type="submit">提交</button><button type="reset">重置</button>
</form>
```

## 键盘与可访问性

可见触发器使用 select-only combobox，popup 为 listbox，选项为 option。用 aria-label/aria-labelledby 提供名称，placeholder 不承担命名。焦点留在触发器；aria-selected 表示已确认值，aria-activedescendant 表示临时高亮。

| 输入 | 行为 |
| --- | --- |
| Enter / Space | 关闭时打开；打开时确认 enabled 高亮项并请求关闭 |
| ArrowDown / ArrowUp | 关闭时只打开并定位 enabled 已选项，否则首/末 enabled；打开时移动，跳过禁用项 |
| Home / End | 打开时到首/末 enabled，不改变已确认值 |
| 可打印字符 | 500ms 实例级 typeahead，按 label 前缀导航；重复单字符循环同前缀选项 |
| Escape | 请求关闭并丢弃未提交高亮，不改值 |
| Tab / Shift+Tab | 请求关闭、保留原生焦点移动，不因高亮提交 |
| outside | 请求关闭，不提交 |
| Ctrl / Meta / Alt 组合键、composition | 不作为选项确认或 typeahead |

空格只作打开/确认；typeahead 的重复字符查找不受 loop 箭头边界限制。关闭时没有 controls/activedescendant 或 popup。打开时只引用本实例真实节点；重排按同类型 value 保留高亮与 ID，删除/禁用后依次协调到 enabled 已选项、首个 enabled，没有候选则省略 activedescendant。空集/全禁用不制造虚构高亮。

readonly/loading 可聚焦但不能打开/清空，disabled 退出焦点和提交。busy 不替代标签。Select 为非模态浮层，不圈住 Tab、不锁滚动或隔离背景；Dialog 模态规则不适用于它。

## 主题与样式定制

变量在实际属性使用处按“组件 override → 共享 token → Sass 默认值”回退，不在 :root/祖先提前物化组件变量。

| CSS 变量 | 类型 | 默认 / 共享回退 |
| --- | --- | --- |
| --zoom-select-font-family | 字体列表 | --zoom-font-family / system-ui 等系统字体栈 |
| --zoom-select-font-size | length / percentage | --zoom-font-size-sm/md/lg / 12/14/16px 对应 rem |
| --zoom-select-line-height | number / length / percentage | --zoom-line-height / 1.5 |
| --zoom-select-radius | 非负 length / percentage | --zoom-radius-md / .375rem |
| --zoom-select-min-block-size | 非负 length | --zoom-control-min-size-sm/md/lg；regular 28/36/44、compact 24/28/36px 对应 rem |
| --zoom-select-padding-inline | 非负 length / percentage | --zoom-control-padding-inline-sm/md/lg；regular 10/14/16、compact 8/10/14px 对应 rem |
| --zoom-select-padding-block | 非负 length / percentage | --zoom-control-padding-block；regular 6、compact 4px 对应 rem |
| --zoom-select-gap | 非负 length / percentage | --zoom-control-gap；regular 8、compact 6px 对应 rem |
| --zoom-select-bg | color | --zoom-color-surface / #fff |
| --zoom-select-fg | color | --zoom-color-text / #111827 |
| --zoom-select-border-color | color | --zoom-color-border / #6b7280 |
| --zoom-select-focus-color | color | --zoom-color-focus → --zoom-color-primary / #2563eb |
| --zoom-select-popup-bg | color | --zoom-color-surface / #fff |
| --zoom-select-popup-max-block-size | 非负 length | 20rem，同时受当前可用空间约束 |
| --zoom-select-option-bg-hover | color | 当前主色 8% 与透明混合 |
| --zoom-select-option-bg-selected | color | 当前主色 16% 与透明混合 |
| --zoom-select-option-fg-selected | color | --zoom-color-text / #111827 |
| --zoom-select-z-index | integer / auto | 1000；应用负责 host stacking context |

边框 1px solid，focus-visible 采用共享 2px outline / 2px offset；disabled opacity=.55。readonly/loading 保留可读性，empty/loading 用共享 muted 色。选项 padding/gap 复用控件 token。无固定高度，长 label 换行，逻辑属性支持 RTL，rem/字号覆盖可增长；reduced-motion 关闭可选动画，应用负责字体资源。

```css
.brand { --zoom-color-primary: #0f766e; --zoom-font-family: Arial, sans-serif; }
.readable { --zoom-select-font-size: 1.5rem; --zoom-select-line-height: 1.75; }
.rounded { --zoom-select-radius: 1rem; }
```

容器 data-zoom-density=compact 压缩几何，嵌套 regular 可恢复。共享参数见[主题](../theming.md)与 [tokens](../../design/tokens/README.md)。

portal 默认关闭以继承局部主题。开启需 getPopupContainer 返回同 document、已连接的有效 host；缺失/失效/跨 document 告警并回退 inline。迁移后不自动复制祖先 computed style，应用需在触发器与 host 同步品牌、字体、组件变量和 density，动态主题也同步。

```vue
<script setup lang="ts">
import { ZSelect } from '@zoom-design/vue/select';
const options = [{ value: 'a', label: 'A' }];
const theme = { '--zoom-color-primary': '#0f766e' };
function popupHost(trigger: HTMLElement) { return trigger.ownerDocument.getElementById('brand-popup-host'); }
</script>
<template>
  <div :style="theme" data-zoom-density="compact">
    <ZSelect :options="options" model-value="a" portal :get-popup-container="popupHost" aria-label="品牌选择" />
  </div>
  <div id="brand-popup-host" :style="theme" data-zoom-density="compact" />
</template>
```

## SSR、水合与生命周期

包导入不访问浏览器全局，DOM 能力在浏览器挂载/打开后启动。两端提供相同 options/value/open、命名、插槽与主题，ID 用显式 id 或 Vue useId，不依赖随机数、时间或模块计数。

初始关闭输出触发器，无 popup；初始 open=true 在原位置输出 listbox/options。portal=true 的服务端与客户端首帧仍 inline，水合完成后才迁移到有效 host，保留节点身份。值、品牌、ID 与层状态归属请求/实例，无跨请求可变单例。

打开时维护定位、outside/Escape 与高亮滚动；关闭/卸载清理相关监听、observer、timer 与定位资源，使旧异步定位失效。拒绝关闭时按实际 open 保留资源；portal 不迁移表单桥接或自动获得主题。

`npm run dev:vue` 后访问 `/select`；`/ssr?example=select&brand=purple` 为初始关闭，`/ssr?example=select&brand=teal&open=true` 为初始打开与 portal 水合场景。能力验证以 Task11 验收执行范围为准。

## React 规划映射，当前不可用

当前 React 包没有 ZSelect/Select CSS 产品入口，不提供伪可运行 import。以下为设计映射，尚未实施。

| Vue 当前 API | React 规划 API / 差异 |
| --- | --- |
| modelValue / update:modelValue / change | value / onValueChange(next, details)，一次回调携带详情 |
| open / update:open / open-change | open / onOpenChange(next, details)，首帧固定控制模式 |
| readonly / class | readOnly / className |
| triggerAttrs | triggerProps，受限原生属性与冲突过滤 |
| option slot | renderOption({ option, selected, highlighted }) |
| value / empty / loading slots | renderValue、emptyContent、loadingContent |
| ref.focus / blur | 有限 ref handle，支持 FocusOptions |

options、size、disabled、loading、clearable、placeholder、emptyText、loadingText、clearLabel、loop、placement、offset、matchTriggerWidth、portal、getPopupContainer、id、name、form、required、invalid 与命名 ARIA 沿用共同语义。DOM 回调用 React 对应事件对象，语义详情不带 SyntheticEvent；SSR、portal 传播和 effect/StrictMode 清理需独立证明。

## Angular 规划映射，当前不可用

当前 Angular 包没有 Select selector、standalone import、模板指令或 CVA，不提供伪可运行模板。

| Vue 当前 API | Angular 规划 API / 差异 |
| --- | --- |
| modelValue / update:modelValue / change | 非 Forms value / valueChange / selectionChange；Forms 用 CVA 单一值来源 |
| open / update:open / open-change | open / openChange 双向通道，openRequest 携带详情 |
| triggerAttrs | triggerAttributes；宿主 attr 不假定进入内部按钮 |
| aria-label / labelledby / describedby | ariaLabel / ariaLabelledby / ariaDescribedby inputs |
| option / value / empty / loading slots | 明确 directive + TemplateRef，同上下文，指令名待实施冻结 |
| ref.focus / blur | ViewChild / 公开实例方法 |

其余同行为配置同名；class/style 用宿主绑定并明确内部落点。Forms 不能同时用 value/valueChange 控制实例；writeValue 不反调 onChange，onTouched 在离开整个逻辑控件时触发。CVA disabled 与显式/fieldset disabled 合并。Angular 内置 required 对空串语义不同，后续需提供按“匹配项存在”判断的专用规则或明确用法。ngModel、Reactive Forms、reset、SSR/水合均待原生验证。

## 已知限制与验证依据

首轮仅同步、平面、单选、已有选项，不支持多选、自由文本、远程搜索、分组/树、虚拟列表、对象值、自定义比较器、整套表单库或 Provider。需要搜索的 Combobox 属于独立 Task12，不假定其入口已存在。

真实消费示例见 [SelectExamples.vue](../../apps/vue-smoke/src/examples/SelectExamples.vue)，浏览器用例见 [select.e2e.ts](../../e2e/vue/select.e2e.ts)，API 以[公开 Select 入口](../../packages/vue/src/select/index.ts)为准。Task11 自动验证中，见[验收记录](../engineering/task11-acceptance.md)；workspace、真实 tarball、三浏览器、SSR 和覆盖率分别报告，人工读屏、真实输入法及 Linux 实机不由自动化代替。
