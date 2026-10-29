# 组件名称

> 文档状态：填写“已交付”或“设计稿”；最后核对日期：YYYY-MM-DD。
> 复制本模板后移除所有占位说明。各框架按真实情况记录，不统一宣称支持。

## 介绍

说明组件用途、适用场景、职责和首轮不支持的能力。

## 框架与验证状态

| 框架 | 实现状态 | 类型/浏览器 | 表单 | SSR/水合 |
| --- | --- | --- | --- | --- |
| Vue | 待填写 | 待填写 | 待填写 | 待填写 |
| React | 待填写 | 待填写 | 待填写 | 待填写 |
| Angular | 待填写 | 待填写 | 待填写 | 待填写 |

## 导入与样式

列出真实公开的根/子路径、类型导出、单组件 CSS 和聚合 CSS 的选择。未实现入口写“当前不可用”，不提供虚构 import。

## Vue 用法

若已实现，提供 Composition API 与 `<script setup lang="ts">` 最小例子，以及受控值、状态、主题、自定义内容和表单示例。未实现时标“规划用法，当前不可用”。

## React 用法

若已实现，提供真实 import、state/callback、ref、render 内容和 CSS 用法。未实现时标“规划用法，当前不可用”，给语义映射并注明特殊配置。

## Angular 用法

若已实现，提供 standalone imports、真实 selector、inputs/outputs、模板和表单例子。说明 Reactive Forms/ngModel 或直接绑定如何选用；未实现时标“规划用法，当前不可用”，不虚构已存在的 CVA 支持。

## 参数

| 共同语义 | Vue 名称 | React 名称 | Angular 名称 | 类型 | 必填 | 默认 | 行为/限制 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 待填写 | 待填写 | 待填写 | 待填写 | 待填写 | 待填写 | 待填写 | 待填写 |

写清缺省、null、undefined、非法 JS 输入、受控回写和动态更新行为，区分语义默认值与内部模式初始值。主题参数与行为 props 分开描述。框架特殊参数单独成表并说明原因。

若适用 selection 契约，链接 [共同语义](../contracts/selection.md) 与 [框架映射](../contracts/framework-adapters.md)，逐项核对 value/open/query 首帧模式、父层拒绝回写、事件顺序和 options 删除/禁用；不能把发出请求写成状态已经改变。

## 事件、回调与 output

| 语义/框架名称 | payload | 何时触发 | 顺序/取消/外部赋值 |
| --- | --- | --- | --- |
| 待填写 | 待填写 | 待填写 | 待填写 |

区分修改请求与实际状态变化；说明原始事件是 DOM Event、SyntheticEvent 还是独立语义详情。

## 内容扩展与实例方法

分别列出 Vue slots、React children/render、Angular projection/TemplateRef 的名字、上下文类型、默认内容及限制。列出 ref/ViewChild 可用方法和参数；未实现差异写明待实施。

## 原生属性与表单

说明 class/style/ARIA/data/原生事件落到哪个实际元素，组件控制属性、顶层命名配置与原生属性通道的优先级。表单组件写出 name、form、序列化、disabled/fieldset、required、invalid、reset 和各框架 Forms 的差异；非表单组件写不适用的原因。校验代理等内部结构不作为公共 DOM 契约。

## 键盘与可访问性

列出 accessible name、role/状态、焦点和键盘动作。区分高亮与选择；写清空状态、禁用、只读和加载。记录辅助技术人工验证是否实际执行。

## 主题与样式定制

列出共享 tokens 和组件 CSS 变量：类型、默认回退、作用范围、size/density/RTL、字体/字号，以及 portal host 的主题责任。普通 CSS 用法先于可选 Sass 用法。

## SSR、水合与生命周期

分别说明无浏览器导入、初始 HTML、客户端首帧、初始打开、ID、portal、请求隔离、挂载副作用和卸载清理。各框架只记录实际验证能力。

## 已知限制与验证依据

列出当前范围、尚未实现或未验证的能力，链接真实示例和 `docs/engineering/` 验收摘要。只把真实运行的结果写为通过。
