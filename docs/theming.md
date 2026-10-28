# 使用共享主题

Task6 为 Vue、React、Angular 提供相同的浅色参数与 regular/compact 密度。完整参数、类型及推导规则见 [参数表](../design/tokens/README.md)。Core/DOM 不包含主题 CSS。Task7 的 [Vue Button](components/button.md)已接入这些参数，`/theme`继续保留私有原生样本。

普通 CSS 消费无需安装或配置 Sass：

```ts
import '@zoom-design/vue/theme.css';
// React 使用 @zoom-design/react/theme.css；Angular 使用 @zoom-design/angular/theme.css。
```

Vue的`style.css`聚合主题与Button；按需使用`theme.css`与`button/style.css`，不要再重复导入聚合入口。Button CSS自身具备默认regular回退；data-zoom-density需主题规则。React/Angular聚合入口仍只包含已交付的主题。JS入口不隐式加载样式，三个包保留CSS sideEffects。

```css
.brand-a {
  --zoom-color-primary: #7c3aed;
  --zoom-color-on-primary: #ffffff;
  --zoom-font-family: "Noto Sans SC", system-ui, sans-serif;
  --zoom-font-size-base: 1rem;
}
.large-copy { --zoom-font-size-base: 1.5rem; }
.special-copy { --zoom-font-size-md: 1.125rem; }
```

```html
<section class="brand-a" data-zoom-density="compact">
  <!-- 需要采用共享变量的控件，或开发预览中的原生样本 -->
  <div class="large-copy">局部字号</div>
  <div data-zoom-density="regular">恢复 regular 几何参数，字体与品牌继续继承</div>
</section>
```

普通宿主 button/input/body/html 不会被主题规则重新设置。仅在控件属性使用处读取字号与状态变量，不能在祖先提前生成已经求值的组件别名。例如预览样本使用：

```css
.my-control {
  font-family: var(--zoom-font-family);
  font-size: var(--zoom-font-size-md, calc(var(--zoom-font-size-base) * 0.875));
  line-height: var(--zoom-line-height);
  min-block-size: var(--zoom-control-min-size-md);
  padding-block: var(--zoom-control-padding-block);
  padding-inline: var(--zoom-control-padding-inline-md);
  background: var(--zoom-color-primary);
  color: var(--zoom-color-on-primary);
}
```

hover/active 与黑色混合 8%/16%，focus 使用当前主色；显式的 `--zoom-color-primary-hover/active`、`--zoom-color-focus` 优先。可选变量默认不输出。嵌套品牌会继承祖先的显式 override；独立品牌边界应重新设置它们，或用 `initial` 清除。移除容器自己的覆盖后恢复祖先或默认值。

应用可在自己的容器上运行 `container.style.setProperty('--zoom-color-primary', value)`，移除时使用 `removeProperty()`。主题编辑器负责验证值的 CSS 类型；`var()` 不会把所有非法字符串自动变成有效默认值。SSR 直接输出相同容器的 class/style；库不写入全局 documentElement，也不提供跨请求共享的可变主题对象。

字体族只表达字体选择，不代表已加载字体。应用提供字体资源与授权，并处理字体尚未加载时的回退。默认正文、次级文字、危险色与主色上的白色文字按一般文本 4.5:1 验证；自定义浅色主色需同步选用合适的 `on-primary`。示例提供键盘焦点，并在 `prefers-reduced-motion: reduce` 时关闭过渡；具体控件仍需实现自己的焦点与动画规则。

可选 Sass 定制需要应用自己的 Dart Sass。公开的 theme.scss 仅包含四个主题模块，不含组件内部实现。使用 [NodePackageImporter](https://sass-lang.com/documentation/js-api/classes/nodepackageimporter/) 解析 `pkg:` 出口：

```scss
@use "pkg:@zoom-design/vue/theme.scss" as zoom with (
  $color-primary: #7c3aed,
  $font-family: ("Noto Sans SC", system-ui, sans-serif)
);
.brand-a { @include zoom.theme(); @include zoom.density(regular); }
.brand-b {
  @include zoom.theme(("color-primary": #0f766e, "color-on-primary": #ffffff));
  @include zoom.density(compact);
}
```

```js
import * as sass from 'sass';
sass.compile('app-theme.scss', { importers: [new sass.NodePackageImporter()] });
```

`@use` 本身不输出 CSS；在需要的局部容器或根选择器内调用 mixin。`with` 为一次模块加载配置默认值，多主题用 mixin map，不要以不同配置重复加载同一个模块。自定义输出放在库 CSS 之后或明确的局部作用域。Vite 或其他构建器需由应用启用相应 importer，不能假设所有构建器零配置支持 `pkg:`。

开发预览：`npm run dev:vue` 后访问 `http://127.0.0.1:5171/theme`；SSR 样本为 `/ssr?example=theme&brand=purple` 或 `brand=teal`。默认 `/` 与 `/ssr` 仍提供原工程探针。实际自动验收与未执行项见 [Task6 记录](engineering/task6-acceptance.md)。
