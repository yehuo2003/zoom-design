# Vue Button

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

| Prop | 类型 / 默认 | 行为 |
| --- | --- | --- |
| variant | solid / outline / text；solid | 外观 |
| size | sm / md / lg；md | 字号与最小逻辑高度，服从密度与局部覆盖 |
| type | button / submit / reset；button | 原生表单行为 |
| disabled | boolean；false | 禁用原生激活与组件业务事件 |
| loading | boolean；false | 应用受控；原生禁用、aria-busy、加载图形；保留正文 |
| block | boolean；false | 占满容器 inline size |

非法 JS 枚举、null 回退默认值，非法 type 也会输出 button，避免意外提交。Boolean 先按 Vue 裸属性/空串规则转换；null/undefined 为 false，合法 Boolean 保持原值。其他非法值在 disabled/loading 上按 true 处理，block 按 false 处理，仅开发模式告警。`disabled="false"` 是非法字符串，仍禁用；关闭请用 `:disabled="false"`。不修改 props，也不自动切换 loading。[Vue Boolean 转换](https://vuejs.org/guide/components/props.html#boolean-casting)

`click` 同步发出原始 MouseEvent，一次有效原生激活一次。`.once`、`.prevent`、`.stop` 遵循 Vue 规则；`.capture`、`.passive` 是原生选项监听器。组件不拦截祖先 capture 对事件的观察，也不自行在 keydown/keyup 补发点击。disabled/loading 与禁用 fieldset 的合成 dispatch 不能绕过组件业务守卫。

默认 type 不提交表单。submit 保留原生校验、外部 form、submitter、name/value、formaction/formmethod/formenctype/formtarget/formnovalidate；`@click.prevent` 同步取消默认动作。reset 只执行原生重置，不擅自重写 Vue 的应用状态。加载会使按钮退出原生 Tab 顺序，结束时不抢焦点；应用决定是否恢复焦点。[HTML button](https://html.spec.whatwg.org/multipage/form-elements.html#the-button-element)

属性在每次 render 透传到真实 button 一次，支持 id/class/style/title、上述表单属性、autofocus/tabindex、data-*、ARIA 命名和非业务原生事件；动态更新生效。class/style 合并，未提供 name/value 时不补空串，显式空串和 value=0 保留。type、disabled、aria-disabled、aria-busy 和 data-zoom-* 由组件最终状态控制，不能用 attrs 覆盖。

| 接口 | 用法 |
| --- | --- |
| default slot | 正文；始终保留，不用 spinner 替换名称 |
| icon slot | 可选装饰图标，aria-hidden，不依赖图标库 |
| loading slot | 自定义装饰加载内容；默认 CSS spinner，reduced-motion 时停止动画 |
| ref.focus(options?) / ref.blur() | 原生方法；无节点及卸载后安全 no-op；禁用时服从浏览器焦点规则 |

无正文、空文本或纯图标需要 `aria-label` / `aria-labelledby`。不要把加载图形当名称，也不要在 slot 中嵌套按钮、链接或带 tabindex 的交互内容。组件不猜测业务语言，也不宣称计算完整可访问名称。

```vue
<ZButton aria-label="收藏"><template #icon>★</template></ZButton>
<ZButton loading><template #loading>…</template>正在上传</ZButton>
```

公开类型为 `ButtonVariant`、`ButtonSize`、`ButtonNativeType`、`ButtonProps`、`ButtonEmits`、`ButtonExpose`，根与子路径一致。真实生成的组件声明包含受控原生属性类型，不开放任意业务 prop。

样式变量 `--zoom-button-` 后缀为 font-family、font-size、line-height、radius、min-block-size、padding-inline、padding-block、gap、bg、fg、border-color、bg-hover、bg-active、focus-color；默认不声明这些 override。优先级为组件 override → 共享 token → 同源 Sass 默认值。sm/md/lg 字号为 base × .75/.875/1；几何值用最小高度与逻辑 padding，内容可自然增长、换行与 RTL。solid 默认 hover/active 在当前按钮使用主色与黑色混合8%/16%，focus 使用当前主色；outline/text 使用浅主色背景。共享显式状态 token 和组件状态 override 可定制相应状态。自定义配色由应用验证对比度。

```css
.brand { --zoom-color-primary: #0f766e; }
.round { --zoom-button-radius: 999px; }
.large-copy { --zoom-button-font-size: 1.5rem; --zoom-button-line-height: 1.75; }
```

`npm run dev:vue` 后访问 `/button`；`/ssr?example=button&brand=purple` 或 teal 返回真实 Button HTML，客户端复用同一按钮水合。状态/主题仅归属实例和请求；导入 JS 不访问 window/document。当前验证 Vue TS6 与三浏览器；其他环境的执行范围见[Task7验收](../engineering/task7-acceptance.md)。
