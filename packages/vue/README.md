# @zoom-design/vue

Vue 3 原生 `ZButton`，从 `@zoom-design/vue` 或 `@zoom-design/vue/button` 命名导入；公开 props/emits/ref 类型从同一入口导出。

```ts
import { ZButton } from '@zoom-design/vue/button';
import '@zoom-design/vue/theme.css';
import '@zoom-design/vue/button/style.css';
```

也可只导入聚合 `@zoom-design/vue/style.css`。单组件 CSS 有regular默认回退；容器密度需theme.css，JS不隐式导入样式。普通CSS用户无需Sass，可选theme.scss仅公开主题。默认solid/md/type=button，不意外提交表单；disabled/loading为应用受控状态，click同步发出原始MouseEvent，保留原生表单与键盘语义。Button不依赖Core/DOM服务。

完整参数、非法JS输入规则、slots、可访问名称、ref与样式用法见[Button](../../docs/components/button.md)、[主题](../../docs/theming.md)，自动结果及验收状态见[Task7记录](../../docs/engineering/task7-acceptance.md)。私有test/fixtures不进入发布包。

## 工程基线

本包固定Vue/compiler-sfc/compiler-dom/server-renderer3.5.44、vue-tsc3.3.13和TS6.0.3；Node/npm继承根配置。SFC宏编译显式提供文件系统以兼容根TS7的工具提升，声明检查仍使用本包TS6。局部命令与兼容例外见[工程基线](../../docs/engineering/baseline.md)。

在根目录执行 `npm run build --workspace @zoom-design/vue`、`npm run typecheck --workspace @zoom-design/vue`、`npm run test:unit --workspace @zoom-design/vue` 和 `npm run test:e2e --workspace @zoom-design/vue`。类型检查需要先构建本包及 Task 2 平台声明夹具；它会验证实际编译器路径、SFC 正例、prop/emit 反例和 TS6 声明消费者。

`apps/vue-smoke`默认`/`保留私有工程探针，`/theme`验证主题，`/button`使用公开组件；`/ssr?example=button`验证真实产品HTML和节点复用。当前private 0.0.0，尚未公开发布。
