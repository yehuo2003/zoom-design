# @zoom-design/angular

Zoom Design 面向 Angular 项目的共享主题包。当前 npm 产物采用 Angular Package Format 的 partial 编译，但**尚未提供 Angular 产品组件、指令或服务**；公开入口没有可使用的 selector。现阶段可使用共享主题 CSS 与可选 Sass 入口。

## 安装

```sh
npm install @zoom-design/angular
```

当前 peer dependency 范围为 `@angular/core` / `@angular/common` `~22.2.3`、`rxjs` `~7.8.2`、`tslib` `~2.8.1`。请在符合这些范围的 Angular 应用中安装。

## 使用主题

在应用的 `angular.json` 中加入一个样式入口：

```json
{
  "styles": [
    "@zoom-design/angular/style.css",
    "src/styles.css"
  ]
}
```

也可以使用 `@zoom-design/angular/theme.css` 替代 `style.css`；当前两者提供已交付的主题资源，不必同时引入。应用可覆盖 `--zoom-color-primary`、`--zoom-color-on-primary`、`--zoom-font-family` 等 CSS 变量，并用 `data-zoom-density="regular|compact"` 选择密度。主题不会自动改变普通 HTML 控件的外观。

`@zoom-design/angular/theme.scss` 是可选的 Sass 主题入口，使用前需由应用构建工具配置相应 package importer。

## 当前公开范围

| 入口 | 内容 |
| --- | --- |
| `@zoom-design/angular` | APF 根入口；当前无产品组件、指令、NgModule 或服务导出。 |
| `@zoom-design/angular/style.css` | 当前交付的主题 CSS。 |
| `@zoom-design/angular/theme.css` | 共享主题与密度变量。 |
| `@zoom-design/angular/theme.scss` | 可选 Sass 主题模块。 |

Vue 包中的 Button、Select、Combobox 和 Dialog 尚无 Angular 对应实现。不要把仓库中的工程探针当作公开 API。

仓库维护者构建本包时，输出位于根目录 `dist/angular`；发布应使用该 APF 目录，而不是直接发布 `packages/angular` 源目录。
