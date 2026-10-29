# @zoom-design/vue

Vue 3 原生组件包，当前提供 `ZButton` 与 Task11 已实现的 `ZSelect`，均可从根入口或各自子路径命名导入。Task11 自动验收16/16通过、待用户验收，见 [Select 验收记录](../../docs/engineering/task11-acceptance.md)；workspace/packed 三浏览器、真实表单与SSR/水合均已通过自动验证。

```ts
import { ZButton } from '@zoom-design/vue/button';
import { ZSelect } from '@zoom-design/vue/select';
import type { SelectProps, SelectExpose } from '@zoom-design/vue/select';
import '@zoom-design/vue/theme.css';
import '@zoom-design/vue/button/style.css';
import '@zoom-design/vue/select/style.css';
```

也可从 `@zoom-design/vue` 同时命名导入组件与公开类型，样式仅导入聚合 `@zoom-design/vue/style.css`。单组件 CSS 有 regular 默认回退，容器密度需 `theme.css`，JS 不隐式加载样式。普通 CSS 用户无需 Sass，可选 `theme.scss` 仅公开主题。

Button 默认 solid/md/type=button，避免意外提交；disabled/loading 是应用状态，click 同步发出原始 MouseEvent，保留原生表单与键盘语义。Button 不调用 Core/DOM 服务。

Select 接受同步平面 options，modelValue 始终受控，默认 null，合法值包括数字 0 与空串；open 首帧固定内部或受控模式。用户操作发 value/open 请求，父层可拒绝，实际显示与资源服从已确认输入。Select 通过 Core 规则及 DOM 定位、交互、表单桥接实现键盘、required、reset、外部 form 和可选 portal。默认 inline 继承主题；portal host 需应用同步品牌、字体与 density。

完整参数、事件顺序、slots、ref、属性落点、表单、键盘、主题及 SSR 边界见 [Button](../../docs/components/button.md)、[Select](../../docs/components/select.md)和[主题](../../docs/theming.md)。共同数据与框架差异见 [Selection 契约](../../docs/contracts/selection.md)、[框架适配](../../docs/contracts/framework-adapters.md)。React/Angular Select 仍为规划，Combobox 属于 Task12。私有 tests/fixtures 不进入发布包。

## 工程基线

本包固定Vue/compiler-sfc/compiler-dom/server-renderer3.5.44、vue-tsc3.3.13和TS6.0.3；Node/npm继承根配置。SFC宏编译显式提供文件系统以兼容根TS7的工具提升，声明检查仍使用本包TS6。局部命令与兼容例外见[工程基线](../../docs/engineering/baseline.md)。

本包声明直接运行依赖 `@zoom-design/core` 和 `@zoom-design/dom`，构建顺序 Core → DOM → Vue。依赖保持 external，Vue 是 peer dependency；真实 tarball 消费也需匹配的 Core、DOM 与 Vue。内部 SCSS 不作为运行时依赖。

根目录可执行 `npm run build -- --package vue`、`npm run typecheck -- --package vue`、`npm run test:unit -- --package vue`，或对应 workspace 脚本。类型检查需真实构建声明及平台工程夹具，验证实际编译器路径、SFC 正例、prop/emit 反例、TS6 声明消费者与 Select 公开类型。根 unit 编排仍准备工程契约所需的其他产物；仅需聚焦组件测试时使用已准备产物的本包测试脚本。

`npm run dev:vue` 启动公开消费宿主：`/` 保留私有探针，`/theme` 验证主题，`/button`、`/select` 使用公开组件。`/ssr?example=button`、`/ssr?example=select` 提供真实产品 HTML；Select 的 `&open=true` 覆盖初始打开及水合后 portal 迁移，`&brand=teal` 选择请求品牌。浏览器命令为 `npm run test:e2e -- --package vue --browser chromium`，三浏览器及 packed 范围见记录。

Button 既有结果见 [Task7](../../docs/engineering/task7-acceptance.md)；Select 的 Task11 自动验收16/16通过、待用户验收，见[验收记录](../../docs/engineering/task11-acceptance.md)。本包 private:false、版本 0.0.0、MIT、public publishConfig 为发布配置，尚未公开发布；根与示例 apps 保持 private。
