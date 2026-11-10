# @zoom-design/react

Zoom Design 面向 React 项目的共享主题包。**当前公开版本尚未提供 React 产品组件或 hooks**；JavaScript 根入口和类型入口为空。现阶段可以使用主题 CSS 与 Sass 入口，为应用自己的控件建立统一的颜色、字体和密度。

## 安装

```sh
npm install @zoom-design/react react@~19.3.1 react-dom@~19.3.1
```

`react` 和 `react-dom` 是 peer dependencies，当前声明的支持范围均为 `~19.3.1`。

## 使用主题

在应用入口引入一个 CSS 入口即可：

```tsx
import '@zoom-design/react/style.css';
```

当前 `style.css` 包含已交付的共享主题；若只需要主题变量，也可以改用 `@zoom-design/react/theme.css`。不要同时导入这两个入口。主题定义 `--zoom-color-primary`、`--zoom-color-text`、`--zoom-font-family` 等 CSS 变量，并通过 `data-zoom-density="regular|compact"` 提供密度几何变量。

```css
.brand {
  --zoom-color-primary: #0f766e;
  --zoom-color-on-primary: #ffffff;
}

/* 这里的按钮属于应用自身；本包尚未导出 Button 组件。 */
.brand button {
  background: var(--zoom-color-primary);
  color: var(--zoom-color-on-primary);
}
```

可选的 `@zoom-design/react/theme.scss` 提供 Sass 主题入口，需要应用构建工具配置 package importer；普通 CSS 使用无需 Sass。

## 当前公开范围

| 入口 | 内容 |
| --- | --- |
| `@zoom-design/react` | 空的 ESM/类型入口，尚无可命名导入的组件或 hooks。 |
| `@zoom-design/react/style.css` | 当前交付的主题 CSS。 |
| `@zoom-design/react/theme.css` | 共享主题与密度变量。 |
| `@zoom-design/react/theme.scss` | 可选 Sass 主题模块。 |

`ZButton`、`ZSelect`、`ZCombobox`、`ZDialog` 目前只在 Vue 包中实现，不能从本包导入。主题不会自动给应用现有的 button/input 赋予组件外观；应用样式需要主动使用这些变量。
