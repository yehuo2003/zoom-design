# @zoom-design/core

框架无关的选择规则。提供选项归一化、选中项查找、键盘高亮、筛选与前缀查找等纯函数，以及 Dialog 关闭请求的共享类型。包本身不读取 DOM，不管理应用状态，也不包含样式。

## 安装

```sh
npm install @zoom-design/core
```

## 快速开始

```ts
import {
  filterOptions,
  findTypeaheadMatch,
  getSelectedOption,
  moveHighlight,
  normalizeOptions,
  reconcileHighlight,
} from '@zoom-design/core';

const { options, issues } = normalizeOptions([
  { value: 0, label: '全部' },
  { value: 'blue', label: '蓝色' },
  { value: 'red', label: '红色', disabled: true },
]);

const selected = getSelectedOption(options, 0); // { value: 0, label: '全部' }
const next = moveHighlight(options, selected?.value ?? null, 'next'); // 'blue'
const stable = reconcileHighlight(options, next, 0); // 'blue'
const visible = filterOptions(options, '蓝'); // 仅包含“蓝色”
const typed = findTypeaheadMatch(options, null, '蓝'); // 'blue'

// issues 是诊断数据；由调用方决定如何向开发者报告。
void [issues, stable, visible, typed];
```

组件或应用应自行持有 `value`、查询词和高亮值，并在输入变化后重新调用这些函数。Core 不会自动修改已选值，也不维护 typeahead 的输入时间窗口。

## 公开 API

| 函数 | 用途 |
| --- | --- |
| `normalizeOptions(input)` | 将未知输入归一为 `{ options, issues }`。无效项和同类型重复值给出带索引的诊断；重复值保留第一个有效项。 |
| `getSelectedOption(options, value)` | 按值和类型查找选中项；已选中的禁用项仍可被找到。 |
| `moveHighlight(options, current, action, loop?)` | 按 `next`、`previous`、`first`、`last` 移动高亮，跳过禁用项；默认不循环。 |
| `reconcileHighlight(options, current, selected)` | 依次选用仍可用的当前高亮、已选值、首个可用项；都没有时返回 `null`。 |
| `filterOptions(options, query)` | 对 label 做不区分大小写的包含匹配，保留原顺序和禁用项；不自动去除查询词空白。 |
| `findTypeaheadMatch(options, current, text)` | 不区分大小写的前缀匹配，跳过禁用项；重复字符可从当前位置之后循环查找。 |

除 `normalizeOptions` 外，函数接收 `readonly SelectionOption[]`，不再次校验任意 JavaScript 输入。`normalizeOptions` 会创建新的公开字段记录，不修改原始选项；其他函数也不修改传入数组。

## 值与类型约定

- `OptionValue` 为 `string | number`，数值必须有限；`SelectionValue` 还允许 `null`。`0`、空字符串和字符串 `'0'` 都是合法且不同的值。
- `SelectionOption` 包含 `value`、`label` 和可选的 `disabled`。无效的 `disabled` 会产生诊断，并按禁用处理。
- 选择、查询和展开状态的事件详情类型包括 `SelectionChangeDetails`、`QueryChangeDetails`、`OpenChangeDetails`；相关原因类型也从包根入口导出。
- `DialogCloseReason` 与 `DialogCloseDetails` 仅描述 `escape`、`outside`、`close-button` 三种关闭请求。请求不代表 Dialog 已经关闭。

本包仅提供 `@zoom-design/core` 根入口的 ESM 与 TypeScript 声明；`/src/*`、`/dist/*` 等内部路径不是公开 API。表单、焦点、浮层、ARIA 和组件渲染由上层包或应用负责。
