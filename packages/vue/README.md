# @zoom-design/vue

Vue 3 原生组件包，公开运行入口精确提供 `ZButton`、`ZCombobox`、`ZDialog`、`ZSelect`；根入口与各组件子路径可命名导入。Task13.1–13.8 已通过用户验收，Task13.9 的声明、出口与覆盖门禁正在验证。Task11 于2026-10-30用户验收通过，见 [Select 验收记录](../../docs/engineering/task11-acceptance.md)；Combobox 的独立验证状态见 [Task12](../../docs/engineering/task12-acceptance.md)。

```ts
import { ZButton } from '@zoom-design/vue/button';
import { ZSelect } from '@zoom-design/vue/select';
import { ZCombobox } from '@zoom-design/vue/combobox';
import { ZDialog } from '@zoom-design/vue/dialog';
import type { SelectProps, SelectExpose } from '@zoom-design/vue/select';
import type { ComboboxProps, ComboboxExpose } from '@zoom-design/vue/combobox';
import type { DialogProps, DialogExpose, DialogSlots } from '@zoom-design/vue/dialog';
import '@zoom-design/vue/theme.css';
import '@zoom-design/vue/button/style.css';
import '@zoom-design/vue/select/style.css';
import '@zoom-design/vue/combobox/style.css';
import '@zoom-design/vue/dialog/style.css';
```

Dialog 的独立入口为 `@zoom-design/vue/dialog`，样式为 `@zoom-design/vue/dialog/style.css`。`open` 始终由应用控制；默认关闭按钮、close 插槽、Escape 与 outside 按 `update:open(false)` → `close-request(details)` 请求关闭。应用不回写时继续打开。模态焦点、背景隔离、滚动锁、嵌套选择浮层与显式宿主 portal 已接入；SSR 初始打开首帧 inline，水合后迁移并保留原节点。交互与预览证据见 [Task13 验收](../../docs/engineering/task13-acceptance.md)。

也可从 `@zoom-design/vue` 同时命名导入组件与公开类型，样式仅导入聚合 `@zoom-design/vue/style.css`。单组件 CSS 有 regular 默认回退，容器密度需 `theme.css`，JS 不隐式加载样式。普通 CSS 用户无需 Sass，可选 `theme.scss` 仅公开主题。

Button 默认 solid/md/type=button，避免意外提交；disabled/loading 是应用状态，click 同步发出原始 MouseEvent，保留原生表单与键盘语义。Button 不调用 Core/DOM 服务。

Select 接受同步平面 options，modelValue 始终受控，默认 null，合法值包括数字 0 与空串；open 首帧固定内部或受控模式。用户操作发 value/open 请求，父层可拒绝，实际显示与资源服从已确认输入。Select 通过 Core 规则及 DOM 定位、交互、表单桥接实现键盘、required、reset、外部 form 和可选 portal。默认 inline 继承主题；portal host 需应用同步品牌、字体与 density。

Combobox 分离已确认 value、可编辑 query 与临时高亮；query/open 首帧固定内部或受控模式。编辑只请求 query，确认已有选项才请求 value；没有自由文本值提交。IME 草稿、取消/重置和尾随 input 去重独立处理。原生表单只提交确认值，Combobox CSS 不依赖先导入 Select。

Button、Select、Combobox 的参数见 [Button](../../docs/components/button.md)、[Select](../../docs/components/select.md)、[Combobox](../../docs/components/combobox.md)；Dialog 的完整参数、事件、slots、ref、属性落点和 SSR 边界见 [Dialog 契约](../../docs/contracts/dialog.md)。主题见[主题](../../docs/theming.md)。共同数据与框架差异见 [Selection 契约](../../docs/contracts/selection.md)、[框架适配](../../docs/contracts/framework-adapters.md)。React/Angular Select、Combobox 与 Dialog 仍为规划。私有 tests/fixtures 不进入发布包。

## 工程基线

本包固定Vue/compiler-sfc/compiler-dom/server-renderer3.5.44、vue-tsc3.3.13和TS6.0.3；Node/npm继承根配置。SFC宏编译显式提供文件系统以兼容根TS7的工具提升，声明检查仍使用本包TS6。局部命令与兼容例外见[工程基线](../../docs/engineering/baseline.md)。

本包声明直接运行依赖 `@zoom-design/core` 和 `@zoom-design/dom`，构建顺序 Core → DOM → Vue。依赖保持 external，Vue 是 peer dependency；真实 tarball 消费也需匹配的 Core、DOM 与 Vue。内部 SCSS 不作为运行时依赖。

根目录可执行 `npm run build -- --package vue`、`npm run typecheck -- --package vue`、`npm run test:unit -- --package vue`，或对应 workspace 脚本。类型检查消费真实构建声明，以 TS6/TS7 plain TS 和本地 TS6 vue-tsc 验证 Dialog props、事件、slots、expose 的正反例，均保留 `skipLibCheck=false`。Vue 可执行生产代码的 statements/functions/branches/lines 按汇总各要求 ≥80%；DOM 对每个可执行生产文件的四项各要求 ≥80%。根 unit 编排仍准备工程契约所需的其他产物；仅需聚焦组件测试时使用已准备产物的本包测试脚本。

`npm run dev:vue` 启动公开消费宿主：`/` 保留私有探针，`/theme` 验证主题，`/button`、`/select`、`/combobox`、`/dialog` 使用公开组件；Dialog 另有 `/dialog/behavior`、`/dialog/appearance`、`/dialog/composition`。`/ssr?example=button|select|combobox|dialog` 提供真实产品 HTML；`&open=true` 覆盖初始打开及水合后 portal 迁移，`&brand=teal` 选择请求品牌。Combobox 另有 `&query=Ze` 和 `&value=blue`，Dialog 另有 `&portal=true`、`&id=`、`&idPrefix=`；两端使用同源参数。浏览器命令为 `npm run test:e2e -- --package vue --browser chromium`，三浏览器及 packed 范围见记录。

Button 既有结果见 [Task7](../../docs/engineering/task7-acceptance.md)；Select 的 Task11 已用户验收通过，见[验收记录](../../docs/engineering/task11-acceptance.md)。Task12 验证结果单列，不由 Select 结果推断。本包 private:false、版本 0.0.0、MIT、public publishConfig 为发布配置，尚未公开发布；根与示例 apps 保持 private。
