# Button 按钮

`ZButton` 用于触发操作，保留原生按钮的键盘激活、焦点和表单语义。外观、尺寸、禁用和加载状态相互独立；组件不执行请求，也不修改应用传入的状态。本文记录真实交付的 API，并作为后续 Wiki 的组件说明来源。

Task8 于 2026-10-29 再次核对 Button.vue、types.ts 与 normalize.ts：以下六项业务 props、原生 attrs 优先级、click 原始事件与 focus/blur expose 保持原实现。Selection 的 value/open/query 契约不适用于 Button；React/Angular 章节仍为规划。Task8 工程回归范围另见 [Task8 验收](../engineering/task8-acceptance.md)。

| 框架 | 当前状态 | 当前可用范围 |
| --- | --- | --- |
| Vue 3 | 已交付 | `ZButton`、根与子路径导出、公开类型、组件样式、SSR 与水合样本 |
| React | Button 未交付 | 仅有共享主题资产，没有公开 Button 组件及其样式入口 |
| Angular | Button 未交付 | 仅有共享主题资产，没有公开 Button 组件及其样式入口 |

## Vue 3 导入与基础用法

`ZButton` 是单根原生 `<button>`，通过 `@zoom-design/vue` 或 `@zoom-design/vue/button` 命名导出。JS 导入不加载样式。

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { ZButton } from '@zoom-design/vue/button';
import type { ButtonExpose } from '@zoom-design/vue/button';
import '@zoom-design/vue/theme.css';
import '@zoom-design/vue/button/style.css';
const button = ref<ButtonExpose | null>(null);
const saving = ref(false);
const save = (event: MouseEvent) => { /* 应用决定请求与 saving 的回写 */ };
</script>
<template>
  <ZButton ref="button" variant="solid" size="md" :loading="saving" @click="save">保存</ZButton>
</template>
```

也可只导入 `@zoom-design/vue/style.css`，其中已包含主题和 Button。只用 `button/style.css` 也具有 regular 默认样式，并可直接覆盖 CSS 变量；`data-zoom-density` 需要 theme.css 的容器规则。普通 CSS 用户无需 Sass。可选 Sass 只公开主题，详见[主题说明](../theming.md)。

## 参数、默认值与运行时回退

以下六项业务参数均可省略。表中默认值是组件归一化后的实际行为值，调用方无需预填配置。

| Prop | 类型 / 默认 | 行为 |
| --- | --- | --- |
| variant | solid / outline / text；solid | 外观 |
| size | sm / md / lg；md | 字号与最小逻辑高度，服从密度与局部覆盖 |
| type | button / submit / reset；button | 原生表单行为 |
| disabled | boolean；false | 禁用原生激活与组件业务事件 |
| loading | boolean；false | 应用受控；原生禁用、aria-busy、加载图形；保留正文 |
| block | boolean；false | 占满容器 inline size |

非法 JS 枚举、null 回退默认值，非法 type 也会输出 button，避免意外提交。Boolean 先按 Vue 裸属性/空串规则转换；null/undefined 为 false，合法 Boolean 保持原值。其他非法值在 disabled/loading 上按 true 处理，block 按 false 处理，仅开发模式告警。`disabled="false"` 是非法字符串，仍禁用；关闭请用 `:disabled="false"`。不修改 props，也不自动切换 loading。[Vue Boolean 转换](https://vuejs.org/guide/components/props.html#boolean-casting)

`disabled || loading` 决定实际禁用状态，结束加载不会清除调用方的 `disabled`。默认不输出 `disabled`、`aria-disabled`、`aria-busy` 和 `data-zoom-block`。Boolean 字符串转换是当前 Vue 实现行为，未来 React / Angular 必须分别说明自己的转换规则。

## 事件

| 事件 | 参数 | 时机 |
| --- | --- | --- |
| `click` | 原始 `MouseEvent` | 一次有效原生激活同步发出一次；禁用或加载时不发出 |

`.once`、`.prevent`、`.stop` 遵循 Vue 规则；`.capture`、`.passive` 是原生选项监听器。组件不拦截祖先 capture 对事件的观察，也不自行在 keydown/keyup 补发点击。disabled/loading 与禁用 fieldset 的合成 dispatch 不能绕过组件业务守卫。

需要取消默认动作时，应在同步处理阶段调用 `event.preventDefault()` 或使用 `.prevent`；异步等待之后再取消无法保证阻止已发生的原生动作。`focus`、`blur`、`keydown`、`keyup` 属于透传到原生按钮的监听器，不是额外声明的组件 emits。按钮没有 `change`、`update:loading`、`update:disabled` 或 `v-model` 契约。

## 原生属性与表单

默认 type 不提交表单。submit 保留原生校验、外部 form、submitter、name/value、formaction/formmethod/formenctype/formtarget/formnovalidate；`@click.prevent` 同步取消默认动作。reset 只执行原生重置，不擅自重写 Vue 的应用状态。加载会使按钮退出原生 Tab 顺序，结束时不抢焦点；应用决定是否恢复焦点。[HTML button](https://html.spec.whatwg.org/multipage/form-elements.html#the-button-element)

属性在每次 render 透传到真实 button 一次，支持 id/class/style/title、上述表单属性、autofocus/tabindex、data-*、ARIA 命名和非业务原生事件；动态更新生效。class/style 合并，未提供 name/value 时不补空串，显式空串和 value=0 保留。type、disabled、aria-disabled、aria-busy 和 data-zoom-* 由组件最终状态控制，不能用 attrs 覆盖。密度请设置在外层容器，避免将 `data-zoom-*` 当业务入参。

当前声明明确支持的原生属性 / 监听器如下；其他属性可能经 attrs 在运行时透传，但类型声明不承诺任意原生属性、原生事件或任意业务 prop 均受支持。

| 类别 | 属性 / 监听器 |
| --- | --- |
| 通用 | `id`、`class`、`style`、`title`、`dir` |
| 焦点 | `autofocus`、`tabindex`、`onFocus`、`onBlur` |
| 表单 | `name`、`value`、`form`、`formaction`、`formmethod`、`formenctype`、`formtarget`、`formnovalidate` |
| 键盘 | `onKeydown`、`onKeyup` |
| 可访问性与自定义标记 | Vue `AriaAttributes`、`data-*` |
| 原生点击选项 | `onClickCapture`、`onClickPassive`；模板可用对应修饰符 |

### 表单提交与外部表单

以下示例假定已加载组件 CSS：

```vue
<script setup lang="ts">
import { shallowRef } from 'vue';
import { ZButton } from '@zoom-design/vue/button';

const result = shallowRef('');
function submitted(event: Event) {
  const submitEvent = event as SubmitEvent;
  const form = submitEvent.target as HTMLFormElement;
  const submitter = submitEvent.submitter;
  const data = submitter instanceof HTMLButtonElement
    ? new FormData(form, submitter)
    : new FormData(form);
  result.value = JSON.stringify([...data.entries()]);
}
</script>

<template>
  <form id="profile-form" @submit.prevent="submitted">
    <label>名称 <input name="displayName" required></label>
    <ZButton>普通操作，不提交</ZButton>
    <ZButton type="submit" name="action" value="save">提交</ZButton>
    <ZButton type="reset">重置原生表单</ZButton>
  </form>
  <ZButton type="submit" form="profile-form" name="action" :value="0">
    外部提交按钮
  </ZButton>
  <output>{{ result }}</output>
</template>
```

### 应用控制加载与错误

应用负责请求和状态回写。组件不会等待事件处理器返回的 Promise，也不会自动开始或结束加载：

```vue
<script setup lang="ts">
import { shallowRef } from 'vue';
import { ZButton } from '@zoom-design/vue/button';

const props = defineProps<{ save: () => Promise<void> }>();
const saving = shallowRef(false);
const error = shallowRef('');

async function submit() {
  if (saving.value) return;
  saving.value = true;
  error.value = '';
  try {
    await props.save();
  } catch {
    error.value = '保存失败，请重试';
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <ZButton :loading="saving" @click="submit">保存</ZButton>
  <p role="status">{{ error }}</p>
</template>
```

## 插槽与实例方法

| 接口 | 用法 |
| --- | --- |
| default slot | 正文；始终保留，不用 spinner 替换名称 |
| icon slot | 可选装饰图标，aria-hidden，不依赖图标库 |
| loading slot | 自定义装饰加载内容；默认 CSS spinner，reduced-motion 时停止动画 |
| ref.focus(options?) / ref.blur() | 原生方法；无节点及卸载后安全 no-op；禁用时服从浏览器焦点规则 |

三个插槽均没有作用域参数。加载时 `loading` 内容替换 `icon` 内容，正文始终保留。`focus(options?: FocusOptions): void` / `blur(): void` 是仅有的公开实例方法，没有公开 `click()` 或内部 DOM 结构约定。

无正文、空文本或纯图标需要 `aria-label` / `aria-labelledby`。不要把加载图形当名称，也不要在 slot 中嵌套按钮、链接或带 tabindex 的交互内容。组件不猜测业务语言，也不宣称计算完整可访问名称。

```vue
<ZButton aria-label="收藏"><template #icon>★</template></ZButton>
<ZButton loading><template #loading>…</template>正在上传</ZButton>
```

公开类型为 `ButtonVariant`、`ButtonSize`、`ButtonNativeType`、`ButtonProps`、`ButtonEmits`、`ButtonExpose`，根与子路径一致。真实生成的组件声明包含受控原生属性类型，不开放任意业务 prop。内部 `ButtonNativeAttributes`、归一化函数和 `.vue` 源码路径没有公开导出。当前没有 `href`、路由跳转、切换选中状态或渲染为链接的参数。

```vue
<script setup lang="ts">
import { shallowRef } from 'vue';
import { ZButton } from '@zoom-design/vue/button';
import type { ButtonExpose } from '@zoom-design/vue/button';

const action = shallowRef<ButtonExpose | null>(null);
function focusAction() {
  action.value?.focus({ preventScroll: true });
}
</script>

<template>
  <ZButton ref="action">保存</ZButton>
  <button type="button" @click="focusAction">聚焦保存按钮</button>
</template>
```

## 主题、字号与字体

样式变量 `--zoom-button-` 后缀为 font-family、font-size、line-height、radius、min-block-size、padding-inline、padding-block、gap、bg、fg、border-color、bg-hover、bg-active、focus-color；默认不声明这些 override。优先级为组件 override → 共享 token → 同源 Sass 默认值。sm/md/lg 字号为 base × .75/.875/1；几何值用最小高度与逻辑 padding，内容可自然增长、换行与 RTL。solid 默认 hover/active 在当前按钮使用主色与黑色混合8%/16%，focus 使用当前主色；outline/text 使用浅主色背景。共享显式状态 token 和组件状态 override 可定制相应状态。自定义配色由应用验证对比度。

```css
.brand { --zoom-color-primary: #0f766e; }
.round { --zoom-button-radius: 999px; }
.large-copy { --zoom-button-font-size: 1.5rem; --zoom-button-line-height: 1.75; }
```

以上 class 可直接加到按钮或包裹容器。加载 `theme.css` 后，在容器设置 `data-zoom-density="compact"`，嵌套容器设置 `data-zoom-density="regular"` 可恢复常规几何参数；字体和品牌继续继承。

| 可选组件 CSS 变量 | 默认来源 / 作用 |
| --- | --- |
| `--zoom-button-font-family` | `--zoom-font-family`，再回退系统字体族 |
| `--zoom-button-font-size` | 对应 `--zoom-font-size-sm/md/lg`，否则 base × `.75/.875/1` |
| `--zoom-button-line-height` | `--zoom-line-height`，默认 `1.5` |
| `--zoom-button-radius` | `--zoom-radius-md`，默认 `.375rem` |
| `--zoom-button-min-block-size` | 对应尺寸、密度的共享最小高度；最终仍至少 `24px` |
| `--zoom-button-padding-inline` | 对应尺寸、密度的共享横向内边距 |
| `--zoom-button-padding-block` | 共享纵向内边距 |
| `--zoom-button-gap` | 图标、加载内容与正文的共享间距 |
| `--zoom-button-bg` | 当前外观背景；solid 为主色，outline 为表面色，text 为透明 |
| `--zoom-button-fg` | 当前外观前景；solid 为 on-primary，outline/text 为主色 |
| `--zoom-button-border-color` | 当前外观边框；outline 为主色，其余透明 |
| `--zoom-button-bg-hover` | 当前外观 hover 背景 |
| `--zoom-button-bg-active` | 当前外观 active 背景 |
| `--zoom-button-focus-color` | `--zoom-color-focus`，否则当前主色 |

共享 `--zoom-focus-width`、`--zoom-focus-offset`、`--zoom-motion-duration` 同样生效；完整共享参数见[参数表](../../design/tokens/README.md)。组件内部用 SCSS 构建，使用方可直接使用 CSS。字体族配置不包含字体下载，应用负责字体资源及回退。这里的最小高度不保证固定像素高度，长正文和较大字号可自然撑开按钮。

## React 用法状态与适配要求

**React Button 尚未交付。当前没有可用的 Button import 或 JSX 组件示例。** `@zoom-design/react/theme.css` 已可提供共享主题；原生 `<button>` 仍需应用自己的样式，加载共享主题不会自动生成 Button 外观。

未来适配需保留外观、尺寸、默认 `type="button"`、禁用 / 加载、表单和主题语义。以下是待实施的映射建议，不构成公开 API：

| Vue 当前接口 | React 建议与必须说明的差异 |
| --- | --- |
| 六项业务 props | 优先同名语义与默认值；JSX Boolean 应传真正 Boolean，不照搬 Vue 字符串转换 |
| 默认插槽 | 使用 `children`；空内容仍需可访问名称 |
| `icon` / `loading` 插槽 | 评估 `ReactNode` 或 render 属性；`loading` 已是 Boolean，加载内容需另定名称 |
| `@click` 原始 `MouseEvent` | 通常使用 `onClick` 和 React 事件对象；明确事件类型、`nativeEvent` 与同步取消默认动作，不宣称事件对象完全一致 |
| `class` 与表单属性 | JSX 使用 `className`、`tabIndex`、`formAction`、`formMethod` 等 React 写法 |
| `ref.focus()` / `ref.blur()` | 明确暴露原生节点还是有限方法句柄，按目标 React 版本的 ref 能力实现 |
| 生命周期与水合 | 监听与清理需兼容 StrictMode 重复执行；服务端和客户端输出一致 |

React 实施时，需用本框架经过类型检查和运行验收的示例替换本节，补齐真实导入入口、参数、事件、内容插口和实例类型。

## Angular 用法状态与适配要求

**Angular Button 尚未交付。当前没有可用 selector、standalone import、input / output 或组件样式入口。** `@zoom-design/angular/theme.css` 已可使用，但不会自动实现按钮组件。

以下均为未来适配需要确定的设计要求，不属于当前已交付能力：

| Vue 当前接口 | Angular 适配要求与必须说明的差异 |
| --- | --- |
| 六项业务 props | 评估同名 input 与相同默认值；使用 `[disabled]="false"` 等显式绑定，并说明 input transform 的转换规则 |
| 默认插槽 | 使用 content projection，正文与可访问名称职责一致 |
| `icon` / `loading` 插槽 | 选择带标记的投影或 `TemplateRef`；明确指令、输入名称和优先级 |
| 单根原生按钮 | 确定原生 `button` 属性选择器或自定义宿主内嵌按钮；后者须逐项处理原生属性、表单关联与焦点转发 |
| `@click` | 明确原生 `(click)` 与 output 的关系；同名 output 和宿主冒泡不得产生重复业务事件 |
| 原生属性 | `name`、`value`、`form`、ARIA、表单覆盖属性须落到真实按钮，并说明 `[attr.aria-label]` 等绑定方式 |
| `ref.focus()` / `ref.blur()` | 确定 template reference / `viewChild` 的公开类型和方法，避免依赖私有节点 |
| SSR / 水合 | 导入或服务端渲染不访问浏览器对象，明确销毁清理与实际水合支持范围 |

Angular 实施时，需补齐真实 selector、standalone 配置、事件和实例类型，以及可以复制运行的完整用法。以上映射不应被 Wiki 转写为已发布能力。

## SSR、预览与验证边界

`npm run dev:vue` 后访问 `/button`；`/ssr?example=button&brand=purple` 或 teal 返回真实 Button HTML，客户端复用同一按钮水合。状态/主题仅归属实例和请求；导入 JS 不访问 window/document。当前验证 Vue TS6 与三浏览器；其他环境的执行范围见[Task7验收](../engineering/task7-acceptance.md)。

服务端与客户端需提供一致的 props、正文、插槽和主题容器，避免水合不匹配。焦点方法只会在已经挂载的浏览器节点上产生效果。最初补充三框架说明时仅核对源码；Task8 另行重跑工程与产品回归，范围见其验收记录。Vue 的验证结果不代表 React / Angular 已实现 Button，也不保证任意 TypeScript 或框架版本兼容。

维护本文时同步核对 [Button 实现](../../packages/vue/src/button/Button.vue)、[类型定义](../../packages/vue/src/button/types.ts)、[运行时归一化](../../packages/vue/src/button/normalize.ts)、[样式](../../packages/vue/src/button/style.scss)和[公开入口](../../packages/vue/src/button/index.ts)。参数、默认值、事件、插槽、主题或交付状态改变时，应在同一任务内更新本文。
