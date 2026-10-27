# @zoom-design/angular

计划提供适合 Angular 项目的原生组件与适配，包括模板、输入输出、依赖注入和表单接入。

已提供 Angular CLI / ng-packagr 的原生 APF partial 构建、模板类型检查和 TestBed 信号探针。公共入口保持空导出；探针仅供工程验证。

## 工程基线

本包构建编译器固定为 TypeScript 6.0.3，Node/npm 继承根配置。局部工具命令与兼容例外见[工程基线](../../docs/engineering/baseline.md)，验证范围见[验收记录](../../docs/engineering/acceptance.md)。APF 输出到仓库根 `dist/angular`，主 JS、声明布局及 exports 由 ng-packagr 管理。

```sh
npm run build --workspace @zoom-design/angular
npm run typecheck --workspace @zoom-design/angular
npm run test:list --workspace @zoom-design/angular
npm run test:unit --workspace @zoom-design/angular
npm run test:coverage --workspace @zoom-design/angular
npm run test:e2e --workspace @zoom-design/angular
```

`src/styles/style.scss` 在 APF 构建前编译到 `.generated/style.css`，再由 assets 复制到 `styles/style.css`，通过 `./style.css` 出口供消费者使用。当前规则仅为工程构建标记。

原生应用 `apps/angular-smoke` 以包名解析根目录实际 APF，使用 Angular 默认 zoneless 启动私有探针。Task 5 的打包消费验证将移除本地 APF 映射；当前未实现或验证 Angular SSR / hydration。详细证据见 [Task 3 Angular 报告](../../docs/engineering/task3-angular-report.md)。
