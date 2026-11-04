# Combobox 可编辑单选框

`ZCombobox` 用编辑文本过滤同步选项，并请求确认一个已有业务值。适合可搜索的单选表单；输入文本、已确认值和临时高亮分别管理，输入任意文本不会创建新值。

核对日期：2026-10-30。Task12已于2026-10-30用户验收通过；自动验收16/16通过，实际范围以 [Task12 验收](../engineering/task12-acceptance.md)为准。语义依据为 [Selection 共同契约](../contracts/selection.md#47-combobox-输入与查询状态)与[框架适配契约](../contracts/framework-adapters.md#441-独立通道与运行时归一)。

## 框架与验证状态

| 框架 | 实现状态 | 类型 / 浏览器 | 表单 | SSR / 水合 |
| --- | --- | --- | --- | --- |
| Vue 3 | 已实现；Task12于2026-10-30用户验收通过 | TS6/TS7及vue-tsc通过；workspace/packed三引擎各73项通过 | 确认值提交、原生required/reset/外部form通过 | 初始query/value/open、portal、水合节点复用与请求隔离通过 |
| React | 规划用法，当前不可用 | 产品组件未实施 | 未实施 | 产品 SSR 未实施 |
| Angular | 规划用法，当前不可用 | 产品组件未实施 | CVA / Forms 未实施 | Angular SSR 尚未实施 |

自动 composition 事件覆盖不代替真实中文输入法操作；人工输入法、读屏、触摸设备和 Linux 实机如未执行，均在验收记录单列，不能由浏览器自动化推断通过。

## 导入与样式

根入口与 `@zoom-design/vue/combobox` 子路径均命名导出 `ZCombobox`，没有默认导出。JS 不隐式加载 CSS。以下完整例子使用单组件样式，无需先导入 Select。

```vue
<script setup lang="ts">
import { shallowRef } from 'vue';
import { ZCombobox } from '@zoom-design/vue/combobox';
import type { ComboboxExpose } from '@zoom-design/vue/combobox';
import type { SelectionValue } from '@zoom-design/core';
import '@zoom-design/vue/theme.css';
import '@zoom-design/vue/combobox/style.css';
const value = shallowRef<SelectionValue>(0);
const control = shallowRef<ComboboxExpose | null>(null);
const options = [{ value: 0, label: '零' }, { value: '', label: '空字符串' }, { value: 'blue', label: '蓝色' }];
</script>
<template>
  <ZCombobox ref="control" v-model="value" :options="options" clearable
    aria-label="颜色" placeholder="搜索颜色" />
  <button type="button" @click="control?.focus({ preventScroll: true })">聚焦颜色</button>
</template>
```

也可从 `@zoom-design/vue` 导入组件与类型，并仅导入聚合 `@zoom-design/vue/style.css`，其中包含主题及 Button、Select、Combobox。单组件 CSS 具备 regular 默认回退；容器 density 需 `theme.css`。普通 CSS 用户无需 Sass，可选 `theme.scss` 仅公开主题。

公开 Vue 类型只有 `ComboboxProps`、`ComboboxEmits`、`ComboboxExpose`、`ComboboxSize`、`ComboboxInputAttributes`、`ComboboxOptionContext`。共同 `SelectionValue`、`SelectionOption`、`SelectionChangeDetails`、`QueryChangeDetails`、`OpenChangeDetails` 从 `@zoom-design/core` 导入；`Placement` 来自 `@zoom-design/dom`。内部 composables、popup 与 `.vue` 深路径不是公共入口。

## 三个通道的所有权

`modelValue` 始终受控，默认 null；没有 defaultValue。未绑定时仍发选择请求，显示和表单仍服从传入值。只有 null 表示无值；数字 0、字符串 '0'、空串 '' 都合法且按类型区分。number 必须有限。非法 JS value 回退 null，开发模式告警。

query 与 open 以首次渲染是否为 undefined 固定内部/受控模式。内部 query 初值为匹配标签，无匹配为空串；内部 open 初始 false。受控 query 首帧直接显示传入文本。后来切换模式会告警：内部模式忽略后来控制值；受控模式收到 undefined 仍受控，分别归一化为空串/false。不要把首次未传 query 误当作受控空串。

```vue
<script setup lang="ts">
import { shallowRef } from 'vue';
import { ZCombobox } from '@zoom-design/vue/combobox';
import type { SelectionValue } from '@zoom-design/core';
const value = shallowRef<SelectionValue>('a');
const query = shallowRef('');
const open = shallowRef(true);
const options = [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }];
function approve(next: SelectionValue) { if (next !== 'b') value.value = next; }
</script>
<template>
  <ZCombobox :model-value="value" v-model:query="query" v-model:open="open"
    :options="options" aria-label="审核选择" @update:model-value="approve" />
</template>
```

该例拒绝 B 的 value 请求，接受 query='B' 与关闭；确认值仍是 A。三通道都可单独拒绝：拒绝 query 后输入继续服从旧 query，拒绝 open 后 popup、ARIA 与定位/监听资源服从实际 open。请求事件不表示操作已经接受。

普通编辑只请求 query，再请求打开，不改 value。确认已有项请求其标签、业务值、关闭。Escape、Tab 或离开整个逻辑控件恢复已确认标签并请求关闭，不提交草稿；Tab 保留原生焦点流。清空请求空 query、null 值、关闭。外部 value 或已选标签实际变化时请求一次 reason=external-sync 的 query 同步，不反向发 value 事件；相同回写不产生第二次同步。

选项删除后保留应用值，query 同步为空串且不提交未知值；同类型值重新出现可恢复标签。重复值只保留第一项，非法项跳过，不修改传入数组。禁用项不能新选，外部明确赋予的已确认禁用项仍能显示和提交。

## 参数

全部 props 可省略；默认值与内部模式初值分别列明。React/Angular 差异见后文。

| Prop | 类型 | 默认 | 语义与边界 |
| --- | --- | --- | --- |
| modelValue | `string \| number \| null` | `null` | 始终受控，有限数字，同类型匹配 |
| options | `readonly SelectionOption[]` | `[]` | 标准 `{ value, label, disabled? }`，label 必须文本 |
| query | `string \| undefined` | `undefined` | 首帧固定模式；内部初值为已选标签或 '' |
| filterOption | `(query: string, option: SelectionOption) => boolean` | label 大小写不敏感包含匹配 | 纯函数；确定性大小写处理，不依赖默认 locale；异常报告并安全产生空列表 |
| minQueryLength | `number` | `0` | 非负整数；未满足显示 emptyText，不发送远程请求 |
| size | `'sm' \| 'md' \| 'lg'` | `'md'` | 与共享控件几何一致 |
| disabled | `boolean` | `false` | 不聚焦、打开、编辑或提交；与实际 fieldset 禁用合并 |
| readonly | `boolean` | `false` | 可聚焦、显示、提交；不打开、编辑、清空，取消 required |
| loading | `boolean` | `false` | busy，阻止修改；可聚焦并保留已确认提交，无匹配仍受 required 约束 |
| clearable | `boolean` | `false` | 非 null 且可修改时显示独立清空按钮 |
| placeholder | `string` | `''` | 原生输入提示；不承担可访问命名 |
| emptyText | `string` | `'暂无选项'` | 空结果或未达到最小查询长度的提示 |
| loadingText | `string` | `'加载中'` | 加载状态提示 |
| clearLabel | `string` | `'清空'` | 清空按钮可访问名称 |
| open | `boolean \| undefined` | `undefined` | 首帧固定模式，内部初始 false |
| loop | `boolean` | `false` | true 才循环 Up/Down，跳过 disabled |
| placement | `'bottom-start' \| 'bottom-end' \| 'top-start' \| 'top-end'` | `'bottom-start'` | 首选位置，碰撞时可翻转 |
| offset | `number` | `4` | 非负有限 CSS px |
| matchTriggerWidth | `boolean` | `true` | popup 匹配 input 宽度，受可用空间约束 |
| portal | `boolean` | `false` | 默认 inline，true 要求显式同主题 host |
| getPopupContainer | `(trigger: HTMLElement) => HTMLElement \| null` | 未提供 | 同 document、已连接 HTMLElement；失效告警并回退 inline |
| id | `string` | 未提供 | 实际 input ID，缺省 Vue useId |
| name | `string` | 未提供 | 唯一业务提交字段名，query 不另加具名 input |
| form | `string` | 未提供 | 原生外部表单 ID |
| required | `boolean` | `false` | 要求存在匹配选项，0 与 '' 均有效 |
| invalid | `boolean` | `false` | 应用错误 UI，与原生校验状态合成 aria-invalid |
| aria-label / aria-labelledby / aria-describedby | `string` | 未提供 | 转发实际输入的名称/说明 |
| inputAttrs | `ComboboxInputAttributes` | 未提供 | 受限原生输入属性与回调，冲突项过滤 |
| class / style | Vue 对应属性类型 | 未提供 | 组件外层容器，CSS 变量可继承 |
| data-* | `string \| number \| boolean \| undefined` | 未提供 | 外层；组件保留 data-zoom-* |

非法枚举回退默认值，offset 非法回退 4，minQueryLength 非法回退 0，filterOption 非函数使用默认过滤。文本非法回退对应默认；id/name/form 非字符串视为未提供。Boolean 先经过 Vue props 转换；非法 disabled/readonly/loading 按 true，clearable/loop/portal/required/invalid 按 false，matchTriggerWidth 按 true。不要使用 `disabled="false"`，应使用 `:disabled="false"`。受控 query 非字符串回退 ''，受控 open 非法值回退 false；开发环境提供诊断。

## 事件、slots 与实例方法

| 事件 | payload | 条件与外部更新 |
| --- | --- | --- |
| update:query | `string` | 请求编辑文本、确认标签、清空、取消、reset 或外部同步 |
| query-change | `{ query, previousQuery, reason }` | 紧随 update:query；reason=input/option/clear/escape/blur/reset/external-sync |
| update:modelValue | `SelectionValue` | 请求确认已有值、清空或 reset；外部赋值不发 |
| change | `{ value, previousValue, option, reason }` | 紧随 value 请求；reason=option/clear/reset；外部赋值不发 |
| update:open | `boolean` | 请求打开/关闭 |
| open-change | `{ open, previousOpen, reason }` | 紧随 open 请求；reason=trigger/keyboard/input/option/escape/outside/blur/clear/reset/disabled |

一次意图顺序为 `update:query → query-change → update:modelValue → change → update:open → open-change`。不变的通道省略，同值确认不发 value 事件。普通输入只有 query/open 请求，高亮移动不发 value 请求。详情都是语义对象，不含 DOM Event。禁用/readonly/loading 到来请求 reason=disabled 关闭，父层拒绝仍保持实际状态，阻止修改。

| Slot | 上下文 | 默认内容 |
| --- | --- | --- |
| option | `{ option, selected, highlighted }`，`ComboboxOptionContext` | option.label |
| empty | 无 | emptyText |
| loading | 无 | loadingText |

没有 value slot：输入文本由 query 通道拥有，不能用渲染节点替代。option 内不要嵌套按钮、链接、输入等可聚焦内容；label 仍负责过滤与命名。

```vue
<script setup lang="ts">
import { shallowRef } from 'vue';
import { ZCombobox } from '@zoom-design/vue/combobox';
import type { SelectionOption, SelectionValue } from '@zoom-design/core';
const value = shallowRef<SelectionValue>(null);
const loading = shallowRef(false);
const options = shallowRef<readonly SelectionOption[]>([{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'Beta' }]);
function prefix(query: string, option: SelectionOption) { return option.label.toLowerCase().startsWith(query.toLowerCase()); }
function replaceOptions() { options.value = [{ value: 'a', label: 'Alpha updated' }, { value: 'c', label: 'Charlie' }]; }
</script>
<template>
  <ZCombobox v-model="value" :options="options" :filter-option="prefix" :min-query-length="1"
    :loading="loading" clearable aria-label="搜索字母">
    <template #option="{ option, selected, highlighted }">
      <span :data-current="highlighted">{{ selected ? '✓ ' : '' }}{{ option.label }}</span>
    </template>
    <template #empty>输入至少一个字符后查看匹配项</template>
    <template #loading>正在读取选项</template>
  </ZCombobox>
  <button type="button" @click="replaceOptions">替换选项</button>
  <button type="button" @click="loading = !loading">切换加载状态</button>
</template>
```

`ComboboxExpose` 只有 `focus(options?: FocusOptions): void` 和 `blur(): void`；禁用状态不会被 focus 绕过，不公开 setValue 或私有 DOM。

## 原生属性落点

外层 class/style/data-* 与实际 input 的 inputAttrs 分开。id 与命名 ARIA 落 input，name/form 只用于提交桥接。inputAttrs 支持受限的 title、autofocus、tabindex、dir、autocomplete、inputmode、spellcheck、class/style、命名 ARIA、data-* 及声明内的原生回调。

优先级是组件计算状态 → 顶层命名 ARIA → inputAttrs。组件掌握 value/name/form/type/disabled/readonly、role、aria-autocomplete/expanded/controls/activedescendant/disabled/readonly/busy/invalid/required/haspopup 与 data-zoom-*；大小写变体也不能覆盖。字符串事件处理器不透传；合法 Vue class/style 与函数回调按框架机制合并。原生 input/change 观察与组件 query/change 请求是不同事件。

## 原生表单与 reset

只提交有匹配项的已确认值，字段值为 `String(value)`。合法空串提交 `name=''`，数字与字符串零在 HTML 中都为 '0'，JS 模型仍保留类型。query 不作为第二个字段提交；null、未知值、无 name、组件或 fieldset 实际 disabled 时不提交。外部赋予禁用选项的已确认值仍提交。

required 按“匹配选项存在”判断，包含 0 与 ''。原生校验失败将焦点移到可见 input，并与 invalid prop 合成 aria-invalid。readonly 保留提交并取消 required；loading 保留已有提交值，无有效选择时仍受 required 约束。桥接节点属于内部实现，不承诺固定 DOM 结构；portal 仅移动 popup，不移动原生表单桥接。动态 name/form、同名字段、外部 form、fieldset 首个 legend 例外遵循浏览器实际所有权与禁用规则。

```vue
<script setup lang="ts">
import { shallowRef } from 'vue';
import { ZCombobox } from '@zoom-design/vue/combobox';
import type { SelectionValue } from '@zoom-design/core';
const value = shallowRef<SelectionValue>(0);
const cancelReset = shallowRef(false);
const submitted = shallowRef('');
const options = [{ value: 0, label: '零' }, { value: '', label: '空字符串' }, { value: 'blue', label: '蓝色' }];
function submit(event: Event) { event.preventDefault(); submitted.value = JSON.stringify([...new FormData(event.target as HTMLFormElement)]); }
</script>
<template>
  <ZCombobox v-model="value" :options="options" form="preferences" name="choice"
    required clearable aria-label="外部表单颜色" />
  <form id="preferences" @submit="submit" @reset="cancelReset && $event.preventDefault()">
    <button type="submit">保存</button><button type="reset">重置</button>
  </form>
  <label><input v-model="cancelReset" type="checkbox">取消重置</label>
  <output>{{ submitted }}</output>
</template>
```

reset 延后到最终未被 preventDefault 的下一任务才处理，并使 IME 编辑代失效。先请求 query 恢复当前已确认标签（reason=reset），再请求 value=null，最后请求 open=false；不变通道省略。父层可接受、拒绝或恢复自己的默认值。父层最终标签与前一 query 目标不同，下一渲染事务再发一次 external-sync；同一目标不重复。取消 reset 时不发任何请求，原生默认动作后桥接重新对齐应用最终值。

## 输入、键盘与 ARIA

实际 input 使用 role=combobox、aria-autocomplete=list；popup 为 listbox，候选为 option。焦点留在输入；aria-selected 表示已确认值，aria-activedescendant 只指向本实例已过滤列表中的有效高亮。空集/全部禁用无虚构高亮，关闭后不保留 controls/activedescendant。命名用 aria-label 或 aria-labelledby，placeholder 不承担名称。

| 操作 | 行为 |
| --- | --- |
| 输入、删除、粘贴 | 请求 query、过滤和打开，不提交 value |
| Up / Down | 打开或在已过滤列表导航；首次定位首/末 enabled；跳过 disabled |
| Enter | 显式确认当前 enabled 高亮；空结果保留文本且阻止此次 Enter 意外提交表单，不创建自由值 |
| Escape | 恢复确认标签，关闭并使当前 composition 代失效 |
| Tab / Shift+Tab、离开整个控件 | 取消草稿、恢复标签、关闭，保留原生焦点流 |
| 左右方向键、Home / End、Ctrl / Meta、选区与剪贴板 | 保留原生文本编辑，不接管为列表导航 |
| Space | 普通输入字符，不采用 Select 的空格确认规则 |

composition 期间浏览器草稿可见，但不驱动 query/过滤。IME Enter 不确认、不提交表单；有效 compositionend 提交一次，紧接的同值 input 在同编辑代去重，后续独立同值编辑仍可处理。Escape、外部重置/同步及卸载使旧代失效，过期 compositionend 不回写。离开以整个逻辑控件节点集合判断，点击自己的 popup 不因 input blur 取消选择。自动回归不等于真实输入法人工验收。

## 主题、density 与 portal

所有变量按“组件 override → 共享 token → 同源 Sass 默认值”在实际属性处回退，不提前在祖先生成组件别名。无需先导入 Select CSS。

| CSS 变量 | 类型 | 默认 / 共享回退 |
| --- | --- | --- |
| --zoom-combobox-font-family | 字体列表 | --zoom-font-family / system-ui 等系统字体栈 |
| --zoom-combobox-font-size | length / percentage | --zoom-font-size-sm/md/lg / 12/14/16px 的 rem |
| --zoom-combobox-line-height | number / length / percentage | --zoom-line-height / 1.5 |
| --zoom-combobox-radius | 非负 length / percentage | --zoom-radius-md / .375rem |
| --zoom-combobox-min-block-size | 非负 length | --zoom-control-min-size-sm/md/lg；regular 28/36/44、compact 24/28/36px 的 rem |
| --zoom-combobox-padding-inline | 非负 length / percentage | --zoom-control-padding-inline-sm/md/lg；regular 10/14/16、compact 8/10/14px 的 rem |
| --zoom-combobox-padding-block | 非负 length / percentage | --zoom-control-padding-block；regular 6、compact 4px 的 rem |
| --zoom-combobox-gap | 非负 length / percentage | --zoom-control-gap；regular 8、compact 6px 的 rem |
| --zoom-combobox-bg | color | --zoom-color-surface / #fff |
| --zoom-combobox-fg | color | --zoom-color-text / #111827 |
| --zoom-combobox-border-color | color | --zoom-color-border / #6b7280 |
| --zoom-combobox-focus-color | color | --zoom-color-focus → --zoom-color-primary / #2563eb |
| --zoom-combobox-popup-bg | color | --zoom-color-surface / #fff |
| --zoom-combobox-popup-max-block-size | 非负 length | 20rem，并受可用空间约束 |
| --zoom-combobox-option-bg-hover | color | 主色 8% 与透明混合 |
| --zoom-combobox-option-bg-selected | color | 主色 16% 与透明混合 |
| --zoom-combobox-option-fg-selected | color | --zoom-color-text / #111827 |
| --zoom-combobox-z-index | integer / auto | 1000，应用负责宿主 stacking context |

边框 1px solid，focus-visible 为共享 2px outline / 2px offset，disabled opacity=.55。sm/md/lg、regular/compact、RTL 与大字号沿用共享控件规则，最小高度允许增长；popup 长标签换行，原生单行 input 按浏览器编辑文本横向滚动。reduced-motion 关闭可选动画。字体资源由应用加载，配色对比度由应用验证，组件不重置宿主 body/input/button。

```vue
<script setup lang="ts">
import { shallowRef } from 'vue';
import { ZCombobox } from '@zoom-design/vue/combobox';
import type { SelectionValue } from '@zoom-design/core';
const value = shallowRef<SelectionValue>('a');
const options = [{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'Beta' }];
const theme = { '--zoom-color-primary': '#0f766e', '--zoom-combobox-font-size': '1.25rem', '--zoom-combobox-font-family': 'Arial, sans-serif' };
function popupHost(trigger: HTMLElement) { return trigger.ownerDocument.getElementById('combobox-brand-host'); }
</script>
<template>
  <div :style="theme" data-zoom-density="compact">
    <ZCombobox v-model="value" :options="options" portal :get-popup-container="popupHost" aria-label="品牌搜索" />
  </div>
  <div id="combobox-brand-host" :style="theme" data-zoom-density="compact" />
</template>
```

portal 默认 false，就近继承局部主题。启用时 host 必须是同 document、已连接的有效 HTMLElement；无效告警并回退 inline。portal 不自动复制祖先 computed style；品牌、字体、density、组件变量与动态主题都应同时应用到输入祖先及 popup host。

## SSR、水合与清理

导入包不访问浏览器全局。服务端和客户端使用相同 options/value/query/open、ID、slot 与主题；ID 用显式 id 或 Vue useId，不用随机数、时间、模块递增计数。初始受控 query 直接进入 HTML，内部 query 从同一确认标签派生。

初始关闭输出 input；初始 open=true inline 输出列表。portal=true 的 SSR 与客户端首帧仍 inline，水合完成后迁移，节点复用。选项、值、query、品牌、ID 和层状态按请求/实例隔离。关闭/卸载清理监听、observer、composition 代和定位资源；旧异步结果不能写到已失效节点。

`npm run dev:vue` 后访问 `/combobox`；`/ssr?example=combobox&brand=purple&value=blue&query=Bl` 覆盖初始值与 query，`/ssr?example=combobox&brand=teal&open=true&query=Ze` 覆盖打开与 portal 迁移。SSR URL 的 value=blue 选择蓝色，否则为数字 0；这是示例夹具参数，并非组件额外 prop。

## React 规划映射，当前不可用

当前 React 包没有 ZCombobox 产品导出或 Combobox CSS，以下为后续设计映射，不提供伪可运行 import。

| Vue 当前语义 | React 规划 |
| --- | --- |
| modelValue / update:modelValue / change | value / onValueChange(next, details)，一次回调含详情 |
| query / update:query / query-change | query / onQueryChange(next, details)，与 value 独立 |
| open / update:open / open-change | open / onOpenChange(next, details)，首帧固定模式 |
| readonly / class / inputAttrs | readOnly / className / inputProps |
| option / empty / loading slots | renderOption(context) / emptyContent / loadingContent |
| focus / blur expose | 受限 ref handle，focus 接受 FocusOptions |

其余共同配置沿用语义，children 仅作明确内容插口，不替代标准 options；Combobox 无 renderValue 来接管 query 文本。DOM 回调使用 React 事件类型，语义详情不携带 SyntheticEvent。受控编辑、IME、portal 的 React 树传播、effect / StrictMode 清理、SSR 和水合需独立验证。

## Angular 规划映射，当前不可用

当前 Angular 包没有 Combobox selector、standalone imports、模板指令或 CVA；具体导出名在实施任务冻结。

| Vue 当前语义 | Angular 规划 |
| --- | --- |
| modelValue / update:modelValue / change | 非 Forms value/valueChange/selectionChange；Forms 由 CVA 单一持有值 |
| query / query-change | query/queryChange 基础双向值，queryRequest 详情；query 不进入 CVA |
| open / open-change | open/openChange 基础双向值，openRequest 详情 |
| inputAttrs、命名 ARIA | inputAttributes、ariaLabel/ariaLabelledby/ariaDescribedby 显式 inputs |
| option/empty/loading slots | 专用 directive + TemplateRef，同上下文，指令名待定 |
| focus / blur | ViewChild / 公开实例方法 |

Forms 模式只使用 FormControl/ngModel 的业务值，不同时用 value/valueChange。writeValue 不反调 onChange；onTouched 仅离开整个逻辑控件时调用。CVA disabled 合并显式及 fieldset disabled，setDisabledState(false) 不覆盖其他禁用来源。原生 reset 与 Forms reset 不重复回调。Angular Validators.required 对空串不同，后续需明确按“匹配项存在”校验的规则；Reactive Forms/ngModel/TemplateRef 与 Angular SSR 全部待原生验证。

## 范围与证据

首轮仅同步、平面、单选、已有选项；不支持自由文本业务值、多选、远程搜索请求、拼音检索、分组/树、虚拟列表、对象值、compareWith、表单库 Provider。应用可自定义纯过滤并更新 options，组件不隐含网络生命周期。

真实示例见 [ComboboxExamples.vue](../../apps/vue-smoke/src/examples/ComboboxExamples.vue)，浏览器断言见 [combobox.e2e.ts](../../e2e/vue/combobox.e2e.ts)，完整 API 见[公开入口](../../packages/vue/src/combobox/index.ts)。workspace、packed、三浏览器、声明、SSR、覆盖率与 Select/Button 回归的最终执行结果分开记录于 [Task12 验收](../engineering/task12-acceptance.md)。
