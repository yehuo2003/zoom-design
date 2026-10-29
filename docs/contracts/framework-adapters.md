# 框架适配契约

冻结日期：2026-10-29。Task8 契约 v1；以下是 Task9–13 的实施输入，尚未实现的公共导出不代表当前可用。产品支持范围见[组件矩阵](../components/README.md)。

每项共同配置的类型、缺省、边界见 [selection 4.2](selection.md#42-首轮配置清单)，新增 query 配置见 4.7。Vue/React/Angular 均沿用这些语义默认值；名称仅按下面两表映射。Vue 也要到 Task11/12 才有产品实现，下面均不是安装即用 API。

### 4.3 框架映射与差异

React/Angular 列均为后续适配设计，示例在相应产品实现前必须标“规划”。

| 语义 | Vue3 本轮 | React 规划 | Angular 规划 |
| --- | --- | --- | --- |
| 组件名 | ZSelect / ZCombobox | ZSelect / ZCombobox | ZSelectComponent / ZComboboxComponent；selector 待适配任务冻结 |
| 选择值 | modelValue / `update:modelValue`；`v-model` | value / `onValueChange(next, details)` | 非 Forms：value / valueChange；Forms：CVA |
| 修改详情 | `change(details)`，模型请求后一次发出 | value callback 的 details 参数，避免再加同义 onChange | `selectionChange(details)`；不重复调用 CVA onChange |
| open | open / `update:open`；`v-model:open` | open / onOpenChange | open / openChange |
| query（Combobox） | query / `update:query`；`v-model:query` | query / onQueryChange | query / queryChange；不进入选中值 CVA |
| 渲染选项 | `#option="{ option, selected, highlighted }"` | renderOption(context) | 明确 directive + TemplateRef 上下文 |
| 选中标签/空状态 | `#value`、`#empty`、`#loading` | renderValue、emptyContent、loadingContent | value/empty/loading 模板 |
| 聚焦能力 | 组件 ref：focus / blur | ref handle；按当前 React 支持范围实现 | ViewChild 得到公开实例方法 |
| 原生属性 | inheritAttrs:false，按落点透传一次 | 受控 Omit 后的 HTML 属性类型，避免 value/onChange 冲突 | 显式 inputs/host 或 attr 绑定；不能假设宿主属性自动传到内部 input |
| 原始事件 | DOM FocusEvent/KeyboardEvent 等 | SyntheticEvent 或 nativeEvent，由文档逐项写明 | 原生 Event；output 不假定 DOM 冒泡 |

上表之外，options、size、disabled、loading、clearable、placeholder、emptyText、loadingText、clearLabel、loop、placement、offset、matchTriggerWidth、portal、getPopupContainer、id、name、form、required、invalid 以及 query/filterOption/minQueryLength 按同名语义设计。下列命名和属性落点另行映射：

| 配置 | Vue | React 规划 | Angular 规划 |
| --- | --- | --- | --- |
| 只读 | readonly，模板 `:readonly` | readOnly | readonly input，模板 `[readonly]` |
| 外层样式 | class/style | className/style | 宿主 class/style 绑定；不假定自动进入内部元素 |
| 无障碍命名 | aria-label / aria-labelledby / aria-describedby | 同名 ARIA props | ariaLabel / ariaLabelledby / ariaDescribedby 显式 inputs，转到实际交互元素 |
| Select 触发器附加属性 | triggerAttrs | triggerProps | triggerAttributes input |
| Combobox 输入附加属性 | inputAttrs | inputProps | inputAttributes input |

附加属性通道采用各框架对应的受限原生属性类型；值、禁用/只读、role、aria-expanded/controls/activedescendant、data-zoom-* 仍由组件掌握，运行时也过滤冲突键。外层 class/style 与实际交互元素属性分开，不能靠任意 Record 开放未定义业务 props。顶层命名 ARIA 配置优先于附加属性通道，组件计算状态优先于二者，优先级写入最终组件 MD。

共同变更详情不含 DOM Event；如需追溯原始事件，由框架适配层以单独字段或回调参数扩展类型，Core 不依赖它。外部赋值、options 更新、水合和重复 render 不发 value 修改事件；需要同步受控 query 时按下文 external-sync 规则处理。同值提交不发 value change；高亮移动永不改选中值。

Vue `update:modelValue(next)` 后发一次 `change(details)`；React 发一次 value callback；Angular Forms 只调一次注册的 onChange，再发一次详情 output。原生 input/change 不能和这些组件语义事件混淆。[Vue v-model](https://vuejs.org/guide/components/v-model)、[React input](https://react.dev/reference/react-dom/components/input)、[Angular CVA](https://angular.dev/api/forms/ControlValueAccessor)

query 与 open 使用独立详情类型，不复用 SelectionReason：QueryChangeReason 为 input/option/clear/escape/blur/reset/external-sync；OpenChangeReason 为 trigger/keyboard/input/option/escape/outside/blur/clear/reset/disabled。详情分别包含 query/previousQuery/reason 或 open/previousOpen/reason。Vue 依次发模型 update 与 query-change/open-change 详情事件；React 对应 callback 的第二参数为详情；Angular 的 queryChange/openChange 维持双向绑定所需的基础值，另有 queryRequest/openRequest 详情 output。所有详情都表示请求，不伪装成已打开或已关闭通知。

同一次“选中选项/清空/reset”按 query 请求 → value 请求及详情 → open 请求排序，不发生变化的通道省略。受控 query 因外部 value 或选中项 label 实际变化需要同步时，固定发一次 reason=external-sync 请求，不发 value change；相同输入重复 render 不重发。适配层以同步事务/已处理输入标识去重，避免选项确认后父层回写 value 又生成第二次相同 query 请求。

### 4.4 Angular Forms 必须提前明确

- 将来支持 Reactive Forms 和 ngModel 时实现 CVA：`writeValue` 只接收值，不能反向调 onChange；`registerOnTouched` 只在离开整个复合控件时触发，进入自己的浮层不算 blur。
- Forms 模式与 `[value]/(valueChange)` 不能同时控制同一个实例。query/open 可独立控制，但 selected value 只有 Forms 一个来源。
- `effectiveDisabled = explicitDisabled || formsDisabled || nativeFieldsetDisabled`；Forms 重新启用不能覆盖显式 disabled。
- Angular 组件不直接把 input Signal 暴露给 Core；不要仅使用 model() 就宣称已经集成 Forms。为遵守受控回写，value 输入/output 可独立声明，不因本地 `.set()` 抢先提交应用值。[Angular inputs](https://angular.dev/guide/components/inputs)
- Angular `Validators.required` 对空串的定义与本项目合法 `''` 选项不同。后续适配必须提供按“是否有匹配选项”验证的专用规则或写明使用方式；不得悄悄重写 Angular 内置验证器。模板原生 required、Forms 验证器和 UI invalid 分别记录。
- 当前 Angular 包尚未声明 `@angular/forms`。真正实施 CVA 的后续任务再添加匹配版本的 peer/dev 依赖及 ng-packagr/类型/浏览器验证，本轮只记录约束。

### 4.4.1 独立通道与运行时归一

```ts
type QueryChangeReason = 'input' | 'option' | 'clear' | 'escape' | 'blur' | 'reset' | 'external-sync';
interface QueryChangeDetails { readonly query: string; readonly previousQuery: string; readonly reason: QueryChangeReason }
type OpenChangeReason = 'trigger' | 'keyboard' | 'input' | 'option' | 'escape' | 'outside' | 'blur' | 'clear' | 'reset' | 'disabled';
interface OpenChangeDetails { readonly open: boolean; readonly previousOpen: boolean; readonly reason: OpenChangeReason }
```

所有 props 都非必填。value 始终受控，默认 null，无 defaultValue。open/query 首帧 undefined 选择内部模式；query 内部初值是当前已选 label，无匹配为 ''。受控 query 首帧直接显示输入文本，不能在 mounted 再用 label 覆盖。open=false 是实际关闭；禁用/readonly/loading 到来时请求 reason=disabled 关闭，但父层拒绝则保留 popup 与必要监听，阻止交互/修改并反映真实 ARIA；不得擅改受控 open。

选中 B 的例子（旧值 A，query='a'，open=true）：Vue 请求 query='B'、query-change → update:modelValue(B)、change → update:open(false)、open-change；应用全部拒绝时仍是 A/'a'/true。接受 value 但拒绝 query/open 时只更新已选 label、aria-selected、表单字段，保留 query 与打开状态；后续相同回写不二次发送 external-sync。清空同序，null 同值省略 value 请求。普通输入只发送 query 请求再 open 请求；高亮不发 value 事件。reset 最终被取消则所有请求省略。

reset 分两阶段：先在最终未取消的下一任务内，以当前已确认 value 的 label 恢复编辑 query（reason=reset），再请求 value=null，最后请求 open=false；不变的通道省略。内部 query 随当前已确认值派生，父层拒绝值回写时仍保留原已选 label。父层接受 null 或回写自己的初值后，若最终 label 与上一次 query 目标不同，下一渲染事务按 external-sync 再同步一次；受控 query 可拒绝该请求。不同目标的 reset 与后续 external-sync 不是同值重复事件；同一目标不得重复发送。清空和正常选项确认的 query 目标已是最终标签，因此父层相同回写不再发第二次请求。reset 同时使 IME 编辑代失效。

其他非法 JS 布尔值：disabled/readonly/loading fail closed（非 null/undefined 非 boolean 则 true），clearable/loop/portal/required/invalid 归 false，matchTriggerWidth 回退 true，并开发告警；各框架合法布尔转换在此之前完成。offset 非负有限，非法回退 4；minQueryLength 非负整数，非法回退 0。文本只接受 string，非法回退各自记录默认；open 受控非法值回退 false，query 非字符串回退 ''。枚举回退默认。getPopupContainer 非函数或返回未连接/跨 document 非 HTMLElement，portal 回退 inline 并告警；filterOption 非函数则使用默认过滤，抛错则报告并产生空列表。id/name/form 非字符串视为未提供并告警。附加原生属性不能注入 value/name/form/type/disabled/readonly、role、组件计算 ARIA、data-zoom-* 或内联事件字符串；键名先按大小写归一检查，class/style 与合法回调按框架机制合并。

### 4.4.2 最小规划示例（当前不可用）

以下仅用于评审静态语法/语义，不包含不存在的 import，也没有在原生框架工程编译或运行。公开组件、Angular selector/模板 directive、CVA 均由对应实施任务交付。

Vue 规划用法，当前不可用（Task11/12）：

```vue
<script setup lang="ts">
import { ref } from 'vue';
const value = ref<string | number | null>(0);
const query = ref('零');
const open = ref(false);
const options = [{ value: 0, label: '零' }, { value: '', label: '空值' }];
// ZCombobox 的 import 随 Task12 真实公开入口补齐。
</script>
<template>
  <ZCombobox v-model="value" v-model:query="query" v-model:open="open"
    :options="options" name="choice" required aria-label="选择" />
</template>
```

React 规划用法，当前不可用：

```tsx
const [value, setValue] = useState<string | number | null>(0);
const [open, setOpen] = useState(false);
// ZSelect 当前未导出；这是未来组件的调用约定。
<ZSelect value={value} options={options}
  onValueChange={(next, details) => { setValue(next); audit(details); }}
  open={open} onOpenChange={(next, details) => setOpen(next)}
  readOnly={false} triggerProps={{ title: 'Choose' }}
  renderOption={({ option, selected, highlighted }) => <span>{option.label}</span> />;
```

query 对应 useState + onQueryChange，ref handle 为 focus(options?: FocusOptions):void / blur():void。renderOption/value 的返回为 ReactNode，仅适配层依赖 React；详情不含 SyntheticEvent。children 只作明确的内容插口，不能代替 options 标准数据。

Angular 规划用法，当前不可用：

```ts
// 非 Forms 模式的组件宿主逻辑；selector/imports 待后续适配任务冻结。
value: string | number | null = 0;
open = false;
query = '零';
options = [{ value: 0, label: '零' }, { value: '', label: '空值' }];
onValueChange(next: string | number | null) { this.value = next; }
// 未来模板绑定： [value]="value" (valueChange)="onValueChange($event)"
// [open]="open" (openChange)="open = $event"；[query]="query" 单独绑定。
```

```html
<!-- 未来 option directive 将消费该 TemplateRef；不是已存在的库 selector。 -->
<ng-template #optionTemplate let-option="option" let-selected="selected" let-highlighted="highlighted">
  <span>{{ option.label }}</span>
</ng-template>
```

Forms 模式只传 FormControl/ngModel 的值源，不再传 value/valueChange。CVA writeValue(null/0/'') 只更新视图；native reset 与 FormControl.reset 不重复回调；touched 在整个复合控件失焦时才调用一次。Angular 专用 selectionRequired 检查有效匹配（包括 ''），明确与 Validators.required 的区别；尚无该验证器导出。setDisabledState(false) 不能清除显式 disabled/fieldset disabled。slot/render/template 共享上下文 {option,selected,highlighted}；value 上下文 {value,option:null|option}；empty/loading 无业务 payload。Vue expose/React ref/Angular 实例仅 focus 与 blur，selection 不暴露任意 setValue。
