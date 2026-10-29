# 共享主题参数

Vue Select 在属性使用处按“`--zoom-select-*` → 本表共享 token → Sass 默认值”回退，不在祖先提前展开组件变量。完整组件变量与参数见 [Select 文档](../../docs/components/select.md)；私有 selection mixin 不增加公共 theme.scss 配置项，也不会自动输出 Combobox 样式。

默认值唯一维护于 [`../styles/_defaults.scss`](../styles/_defaults.scss)。公共 Sass 入口为 `_index.scss`，仅转发下表配置和 `theme()`、`density()`；导入本身不输出 CSS。Vue、React、Angular 使用同源模块生成主题。Task6 不提供产品组件或主题运行时单例。

CSS 变量按容器继承；Sass 配置只在编译时生效。变量名去掉 `--zoom-` 后即为 `theme($overrides)` 的 map 键和 `$` 配置名。除可选项外，默认主题在 `:where(:root)` 输出声明。合法值由消费方校验，`var()` 不能替代任意非法 CSS 值的校验。

| CSS 变量 | 合法 CSS 类型 | 默认值或规则 |
| --- | --- | --- |
| `--zoom-color-primary` | `<color>` | `#2563eb` |
| `--zoom-color-on-primary` | `<color>` | `#ffffff` |
| `--zoom-color-text` | `<color>` | `#111827` |
| `--zoom-color-text-muted` | `<color>` | `#4b5563` |
| `--zoom-color-surface` | `<color>` | `#ffffff` |
| `--zoom-color-border` | `<color>` | `#6b7280` |
| `--zoom-color-danger` | `<color>` | `#b91c1c`，预留语义，不增加组件 API |
| `--zoom-font-family` | 字体族列表 | `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif` |
| `--zoom-font-size-base` | 正数 `<length-percentage>`，百分比遵循 CSS 字号继承规则 | `1rem`，不改变宿主 html |
| `--zoom-line-height` | 正数、无单位 | `1.5` |
| `--zoom-radius-md` | 非负 `<length-percentage>` | `0.375rem` |
| `--zoom-focus-width` | 非负 `<length>` | `2px` |
| `--zoom-focus-offset` | `<length>` | `2px` |
| `--zoom-motion-duration` | 非负 `<time>` | `150ms`；使用者在 reduced-motion 下关闭动画 |
| `--zoom-color-primary-hover` | 可选 `<color>` | 不输出；使用处把当前主色与黑色混合 8% |
| `--zoom-color-primary-active` | 可选 `<color>` | 不输出；使用处把当前主色与黑色混合 16% |
| `--zoom-color-focus` | 可选 `<color>` | 不输出；使用处回退当前主色 |
| `--zoom-font-size-sm` | 可选正数 `<length-percentage>` | 不输出；使用处 `base × 0.75` |
| `--zoom-font-size-md` | 可选正数 `<length-percentage>` | 不输出；使用处 `base × 0.875` |
| `--zoom-font-size-lg` | 可选正数 `<length-percentage>` | 不输出；使用处 `base × 1` |

`base` 使用 `rem`/`px` 等长度时，字号比例通过使用处的 `calc()` 计算；百分比按照最终属性所在元素的 CSS 规则计算，不能视为固定 px。不要在祖先生成引用其他变量的组件别名，这可能使继承结果提前求值。

| 密度几何变量 | 合法类型 | regular | compact |
| --- | --- | --- | --- |
| `--zoom-control-min-size-sm` | 非负 `<length>` | `1.75rem` | `1.5rem` |
| `--zoom-control-min-size-md` | 非负 `<length>` | `2.25rem` | `1.75rem` |
| `--zoom-control-min-size-lg` | 非负 `<length>` | `2.75rem` | `2.25rem` |
| `--zoom-control-padding-inline-sm` | 非负 `<length>` | `0.625rem` | `0.5rem` |
| `--zoom-control-padding-inline-md` | 非负 `<length>` | `0.875rem` | `0.625rem` |
| `--zoom-control-padding-inline-lg` | 非负 `<length>` | `1rem` | `0.875rem` |
| `--zoom-control-padding-block` | 非负 `<length>` | `0.375rem` | `0.25rem` |
| `--zoom-control-gap` | 非负 `<length>` | `0.5rem` | `0.375rem` |

密度只能使用 `regular`、`compact`。`density()` 每次输出完整的八个变量，默认根采用 regular，`data-zoom-density` 容器只覆盖几何变量；内层 regular 可恢复，字体与颜色照常继承。几何表不作为额外的 Sass 配置变量公开。

`theme()` 平面 map 会校验键名；未知键、非 map 和非法密度明确编译失败。值为 null 时省略该声明，祖先声明仍可继承；运行时需要清除继承的可选 override 时使用 `initial`。应用同时修改品牌与其对比前景，不自动推断任意配色的可访问性。字体文件、授权和加载由应用负责，库不下载字体。

后续 Button 的背景/前景/边界/焦点，Select/Combobox 的文本/边界/密度，以及 Dialog 的 surface/text/radius 可使用这些共享语义。部件、选项高亮、遮罩、浮层等具体组件契约留给对应 Task；本轮不生成它们的样式。

三浏览器的实际验收见 [Task6 记录](../../docs/engineering/task6-acceptance.md)。旧浏览器不支持 `color-mix()` 时使用 `@supports` 提供主色不变的可读回退。自定义值若使点击区域或对比度不足，由应用调整；不承诺任意主题自动符合无障碍要求。
