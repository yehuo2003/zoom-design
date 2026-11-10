# @zoom-design/vue

Zoom Design 的 Vue 3 组件包。目前公开提供 `ZButton`、`ZSelect`、`ZCombobox` 和 `ZDialog`，支持按组件导入、独立样式、共享主题，以及服务端渲染后的水合。组件的值和开关状态由应用控制；JavaScript 入口不会自动加载 CSS。

## 安装

```sh
npm install @zoom-design/vue vue@~3.5.44
```

`@zoom-design/core` 和 `@zoom-design/dom` 是运行依赖，会随本包安装。Vue 是 peer dependency，当前声明的支持范围为 `~3.5.44`。

## 快速开始

```vue
<script setup lang="ts">
import { shallowRef } from 'vue';
import { ZButton, ZSelect, ZCombobox, ZDialog } from '@zoom-design/vue';
import '@zoom-design/vue/style.css';

const options = [
  { value: 'blue', label: '蓝色' },
  { value: 'green', label: '绿色' },
];
const choice = shallowRef<string | number | null>(null);
const search = shallowRef<string | number | null>(null);
const dialogOpen = shallowRef(false);
</script>

<template>
  <main data-zoom-density="compact">
    <ZSelect v-model="choice" :options="options" aria-label="选择颜色" />
    <ZCombobox v-model="search" :options="options" aria-label="搜索颜色" />
    <ZButton @click="dialogOpen = true">查看说明</ZButton>
    <ZDialog :open="dialogOpen" @update:open="dialogOpen = $event">
      <template #title>颜色说明</template>
      <p>选择或搜索已有颜色选项。</p>
    </ZDialog>
  </main>
</template>
```

上例中的 `style.css` 已包含主题和四个组件的样式。`ZDialog` 的关闭操作只发出请求：如果应用不把 `open` 更新为 `false`，对话框会继续打开。

## 组件

| 组件 | 当前能力 | 关键状态 |
| --- | --- | --- |
| `ZButton` | 原生按钮语义，`solid` / `outline` / `text` 外观、尺寸、禁用与加载状态。 | 默认 `type="button"`；`click` 传出原始 `MouseEvent`。 |
| `ZSelect` | 同步选项选择、键盘操作、清除、定位浮层与原生表单桥接。 | `v-model` 对应 `modelValue`；`open` 可选受控。 |
| `ZCombobox` | 可编辑查询与已有选项选择，支持筛选、IME、键盘和表单。 | 已确认的 `value` 与查询 `query` 分离；不会把任意输入当作自由文本值提交。 |
| `ZDialog` | 受控对话框，默认模态；支持标题、描述、页脚、焦点管理和显式 portal。 | `open` 始终由应用控制；关闭时依次触发 `update:open(false)`、`close-request(details)`。 |

`Select` / `Combobox` 的值可为字符串、有限数字或 `null`；`0` 与空字符串是合法值。应用可以监听 `change`、`open-change`，Combobox 还提供 `query-change`。这些详情事件说明原因，但实际显示值仍以应用传入的受控值为准。

## 按需导入与主题

组件既可从包根入口命名导入，也可从 `/button`、`/select`、`/combobox`、`/dialog` 导入。按需样式示例：

```ts
import { ZSelect } from '@zoom-design/vue/select';
import '@zoom-design/vue/theme.css';
import '@zoom-design/vue/select/style.css';
```

选择聚合 `style.css` 或“`theme.css` + 所需组件的 `style.css`”之一，避免重复导入。`theme.css` 提供共享颜色、字体与 `data-zoom-density="regular|compact"` 密度变量；应用可在容器上覆盖 `--zoom-color-primary` 等 CSS 变量。可选 `theme.scss` 入口供已配置 Sass package importer 的项目定制主题。

默认浮层在组件位置渲染。启用 `portal` 时，应用需提供同一 `Document` 中已连接的宿主；外置宿主的字体、方向、品牌变量和密度应由应用同步。SSR 初始打开的内容先以内联 HTML 输出，水合后再迁移到合法宿主。

包只公开声明的根入口、组件子路径与样式子路径；`/src/*`、`/dist/*` 不是可依赖的导入地址。
