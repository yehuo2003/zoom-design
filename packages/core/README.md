# @zoom-design/core

框架无关的纯选择规则。Task9 提供六个命名函数与十二个只读类型；没有 DOM、框架运行依赖、样式、定时器、事件订阅或全局状态。应用持有 value/query/highlight，Core 只派生结果，不自动回写应用值。版本为 0.0.0，尚未公开发布。

```ts
import {
  normalizeOptions, getSelectedOption, moveHighlight,
  reconcileHighlight, filterOptions, findTypeaheadMatch,
} from '@zoom-design/core';
import type { SelectionValue } from '@zoom-design/core';

const { options, issues } = normalizeOptions([
  { value: 0, label: '零' },
  { value: '', label: '空值' },
  { value: '0', label: '字符串零' },
]);
const value: SelectionValue = 0;
const selected = getSelectedOption(options, value); // value=0，label='零'
const next = moveHighlight(options, value, 'next'); // ''，不是 null
const stable = reconcileHighlight(options, next, value); // ''
const filtered = filterOptions(options, '零');
const candidate = findTypeaheadMatch(options, null, '字'); // '0'
// issues 由应用/框架适配层转为开发告警；Core 不访问 console。
```

## 函数与类型

| 函数 | 输入与输出 | 规则 |
| --- | --- | --- |
| normalizeOptions | unknown → {options,issues} | 未提供等于空集合；无效数组/项/值/label 返回带索引诊断，同类型重复值保留首个有效项；只复制公开字段 |
| getSelectedOption | readonly options、value → option/null | 类型敏感匹配；允许匹配应用已选择的 disabled 项 |
| moveHighlight | readonly options、current、next/previous/first/last、loop=false → value/null | 跳过 disabled；缺少 current 时 next/first 到首、previous/last 到末；默认不循环 |
| reconcileHighlight | readonly options、current、selected → value/null | enabled current → enabled selected → 首个 enabled → null，按稳定 value 而非索引协调 |
| filterOptions | readonly options、query → readonly options | 确定性小写包含匹配，不 trim、不按环境 locale 排序；保留 disabled 与顺序 |
| findTypeaheadMatch | readonly options、current、text → value/null | 前缀匹配、跳过 disabled；重复字符如 aa 从当前之后循环，普通文本从当前开始；无共享缓冲 |

除 normalizeOptions 外，函数接收已归一的 `readonly SelectionOption<V>[]`；混合数值/字符串数据先归一，或显式标注 `readonly SelectionOption[]`。这些函数不重复承担框架传入非法 JS props 的归一职责。输出匹配项沿用归一数组记录，normalizeOptions 则创建新数组/记录，不修改原输入。

`OptionValue=string|number`，number 必须有限；`SelectionValue=OptionValue|null`。0 与 '' 均合法，0 与 '0' 不相等，-0 与 0 相等。不支持对象值、boolean、bigint 或 symbol。选项删除后只返回无匹配，调用者的 value 不变；重加相同类型值即可恢复。invalid-disabled 归 true 并返回诊断，undefined 表示没有该可选配置。

类型出口：OptionValue、SelectionValue、SelectionOption、SelectionReason、SelectionChangeDetails、QueryChangeReason、QueryChangeDetails、OpenChangeReason、OpenChangeDetails、HighlightAction、OptionIssue、NormalizedOptions。所有详情是数据，不携带原生 Event、Ref、VNode、ReactNode 或 DOM 节点。完整原因、默认和边界见 [共同契约](../../docs/contracts/selection.md)、[框架适配](../../docs/contracts/framework-adapters.md)。

500ms typeahead 时间窗口、query 输入、IME、原生表单、ARIA 与 DOM 资源管理均由适配层/DOM 后续任务负责。filterOption 自定义回调在适配层处理，不增加 Core 第七个函数。

## 产物与验证

仅根 `@zoom-design/core` 为公开 JS/类型入口；`/selection`、`/src/*`、`/dist/*` 均不可作为包子路径导入。ESM 与内部 `.js` 引用配套生成声明；没有 CSS，JS 不自动引入样式。生产编译 TS7.0.2、ES2022、NodeNext，lib 仅 ES2022、types=[]、skipLibCheck=false；TS6.0.3/TS7.0.2 消费真实声明的正反例单独验证。

```text
npm run build -- --package core
npm run typecheck -- --package core
npm run test:unit -- --package core
npm run test:coverage -- --package core
npm run test:e2e -- --package core --browser all
npm run check:pack
npm run test:e2e:packed -- --package core --browser all
npm run dev:platform
```

预览 `/selection` 直接调用真实公开函数；`/core` 保留原工程探针，二者证据分别统计。unit/coverage 当前仍全局准备构建/类型/工程产物，不能称完全隔离。packed 场景必须在源码变化后重新 check:pack，防止使用旧 tarball。

Core 可执行生产文件必须纳入四项覆盖率 ≥80% 的门禁，类型/纯 barrel 通过 AST 分类排除，私有 probe 单独统计；不再沿用空公开入口的 N/A。实际命令、覆盖数值、浏览器及仓库外消费者结果见 [Task9 验收](../../docs/engineering/task9-acceptance.md)。Task9 已于 2026-10-29 用户验收通过。

Node/npm继承根配置，命令使用本包解析的工具。先build再执行typecheck/unit/e2e。细节见[工程基线](../../docs/engineering/baseline.md)及[Task2验收](../../docs/engineering/task2-acceptance.md)。

