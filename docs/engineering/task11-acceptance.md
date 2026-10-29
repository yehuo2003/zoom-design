# Task11 Vue Select 验收

实施日期：2026-10-29（Asia/Shanghai）。Task10 已获用户验收并标记已完成；Task11 保持进行中，等待用户验收；Task12 未开始。T11.1–T11.16自动验收16/16通过；无Git提交、推送或公开发布。

## 交付与边界

Vue 根入口及 `@zoom-design/vue/select` 命名导出 ZSelect 和七个 Select 类型。Select.vue 组合 trigger、独立清空按钮、SelectionPopup；useSelectionState 管理受控请求、高亮与 typeahead，useSelectionDom 管理定位/层级/焦点/portal，useSelectionForm 管理原生表单桥接。normalize/attrs 为私有纯函数。只复用已验收的 Core/DOM 公开能力，没有将临时状态写入 Core。

value 始终由父层确认，open 的受控模式在首帧固定；拒绝回写保持实际值与资源。选择先发 modelValue 请求和 change，再发 open 请求和 open-change。500ms typeahead、循环开关、IME/修饰键避让、Tab 原生离开、顶层 Escape、outside/focusout 去重均有回归。已确认值的 aria-selected 与临时高亮分离，选项 ID 按值类型及 UTF16 编码，支持空串、0、数字字符串及不成对代理字符。

一个具名 hidden input 提交合法已确认值；无 name 的原生 select 代理约束校验，使用两个 sentinel option 区分合法空串和缺值。未知/禁用选项不提交，required/readonly/loading 与 fieldset 首 legend 按契约分别处理；外部 form、动态 owner、invalid 转焦点及可取消 reset 采用真实浏览器验证。reset 在下一任务请求 null，并在父层恢复自有默认值后同步代理。

非模态弹层不启用焦点陷阱或滚动锁。层级 context 存在 Vue appContext 中，按 Document 引用计数；只在 mounted 后建立浏览器资源。SSR 初始 open 输出 inline popup，水合后才迁移 portal。几何刷新不重新登记层级，关闭/卸载释放 observer、listener、timer 和 host。

视觉复用私有 `design/styles/components/_selection.scss` mixin，公开 Select CSS 与聚合 CSS 同源。十八个组件 token 覆盖字体、尺寸、颜色、焦点、popup、选项及层级；支持 density、RTL、大字号、换行和 reduced motion，无全局 reset 或图标依赖。JS 不隐式引入 CSS，普通 CSS 消费不需要 Sass。私有 mixin 不属于公开 theme.scss 闭包。

Vue 显式依赖 Core/DOM 并 external；构建和 dev watch 按 Core→DOM→Vue 准备。Vue/Angular 继续使用本地 TS6.0.3，Core/DOM/React 使用 TS7.0.2。四个独立消费者均安装 Vue tarball 与显式 Vue peer，以验证 Select 声明；React/Angular 的产品运行依赖没有新增 Vue，其浏览器模块图仍检查框架隔离。

`apps/vue-smoke` 提供 `/select`、`/ssr?example=select` 和初始 open 变体，根示例只组合四个聚焦 SFC；均从公开包名导入。完整 API、五个可编译 Vue 示例、表单/主题/SSR 及 React/Angular 规划映射见 [Select 文档](../components/select.md)。React/Angular Select 与 Vue Combobox 均未实施。

## 16 项验收映射

| 编号 | 验证入口与断言 |
| --- | --- |
| T11.1 | normalize 三项单测、组件默认/非法 props/警告/无绑定请求；非法状态 fail closed，未回写不偷改值 |
| T11.2 | 单测及浏览器严格区分 null、0、空串、字符串0；外部赋值不反向发送用户事件 |
| T11.3 | 动态删除/恢复/重排/禁用及重复值规范化；稳定 ID、高亮协调、禁用项不可确认 |
| T11.4 | value/open 拒绝回写时事件顺序、层级资源保留；受控首字符打开保留本次匹配，后续外部打开不复用过期匹配 |
| T11.5 | Enter/Space/上下/Home/End、跳过禁用、loop、500ms typeahead；composition/Ctrl/Meta 不截获 |
| T11.6 | Tab 不 preventDefault 且与 blur 合并为一次关闭；顶层 Escape/outside 不穿透；清空请求不嵌套按钮 |
| T11.7 | disabled/readonly/loading、原生 disabled fieldset 和首 legend；焦点、busy、required 与提交分别断言 |
| T11.8 | combobox/listbox/option、唯一 controls/activedescendant、命名优先级、selected 与 highlight 分离、多实例请求隔离 |
| T11.9 | class/style/data 在外层，受限原生 attrs 在 trigger，内部关键属性保护；slots、focus/blur expose 与独立清空按钮 |
| T11.10 | 原生 FormData/required/invalid，合法空串/0/未知值/禁用项，唯一具名字段及外部 form |
| T11.11 | 原生 reset、晚取消 reset、父层恢复不同默认值；模型与校验代理最终一致 |
| T11.12 | 品牌、十八 token、字体/大字号、density、RTL、换行、focus/reduced motion、局部主题 portal；宿主原生元素不受 reset |
| T11.13 | Node SSR 初始关闭/打开、跨请求隔离、无 document 副作用；三引擎水合复用 trigger/popup 与 portal 迁移 |
| T11.14 | 实际 TS6/TS7 声明、TS6 vue-tsc、根/子路径/七类型、CSS-only、缺 JS/CSS/声明反例与 tree shaking |
| T11.15 | 相同 workspace/packed 三浏览器用例、重复开关/卸载/portal fallback、监听/节点释放；外部值变化不改变弹层栈优先级 |
| T11.16 | 五个文档 SFC 严格编译、十八 token 对照 CSS，九个 Vue 生产文件单独覆盖；Button/主题旧浏览器与完整工程回归 |

## 验证记录

| 命令 | 退出码与实际结果 |
| --- | --- |
| node scripts/test-unit.mjs --standalone --package vue --coverage | 0；44/44，其中 Select 新增28，既有16；无 skip |
| npm run check | 0；五包构建/类型与完整工程门禁，204项：engineering106、core23、dom29、vue44、react1、angular1 |
| 文档 engineering/component-docs.spec.ts 独立测试 | 0；1/1，完整 check 收集后新增，单列而未计入204；5个真实 Vue 例子以 TS6/vue-tsc strictTemplates、skipLibCheck=false 编译，18 token 与构建 CSS 一致 |
| node scripts/check-dev.mjs | 0；7项：清理产物后前置构建、预览交互、Core/DOM 更改重建、SCSS 热更、非法 TS 停服、SIGINT 清理；非法 TS 子进程预期 exit1 |
| node scripts/e2e.mjs --mode workspace --package vue --browser all | 0；141/141，Chromium/Firefox/WebKit 各47；新增 Select17×3=51，既有90；无 skip/retry |
| npm run check:pack | 0；runId=284179b2-d4b9-4ac8-bfab-ea4e5390d101；五个真实tgz、四独立消费者的install/ci/严格类型/Node/构建/SSR、CSS-only及体积检查通过；17类负例均被拒绝且恢复PASS |
| node scripts/e2e-packed.mjs --package vue --browser all | 0；同一批tarball，141/141，三引擎各47；Select新增51、既有90，无skip/retry |

Vue 九个生产可执行文件四项汇总：statements 365/385（94.81%）、functions 98/103（95.15%）、branches 306/329（93.01%）、lines 200/203（98.52%）。每个文件实际四指标均≥80%；Vue 门禁按生产汇总四项执行，不把 DOM 的逐文件门禁描述成 Vue 已有门禁。types/barrel 经编译 AST 排除，私有 BuildProbe 单列，不计入生产覆盖。原始 summary.json 和 HTML 报告归档。

Select 实际声明检查包括 plain TS 十项精确负例、Vue TS/模板合计十四项，保留不存在导出、受控值/选项/事件/slot/ref/属性错误反例。旧根入口仅含 Button 的断言升级为批准 ZButton/ZSelect 集合，仍拒绝 BuildProbe 与不存在 Select 类型，不删除出口约束。

独立消费者的最小 Select 子路径与根命名应用产物相同：raw113212、gzip41715、Brotli37626 字节；包含 Vue runtime、Core/DOM 与 Select CSS，不含 Button 实现/CSS、聚合/主题 CSS、示例、SSR、source map 或其他框架。未使用导入产物 raw736、gzip426、Brotli350 字节。按文件默认 Node zlib 压缩后求和，属于本机 Vite/ES2022 的绝对应用体积，不作跨库节省结论。

## 过程与独立审查

最初最小可执行组件六项断言全部失败后实现，未把缺模块收集失败当 RED。独立只读审查确认四项 Important：受控拒绝 Tab 后 blur 重复请求、首字符受控打开丢失匹配、外部值/几何更新重新登记层级、任意 UTF16 字符导致 SSR URIError；均先补失败断言后修复并回归。WebKit 原生鼠标点击不保证 button 聚焦，产品选择/打开路径补显式 focus，并有 RED→GREEN 回归。

首轮 Chromium42/47：示例事件日志改变布局使 pointerdown 与 click 间按钮移位，SSR 操作按钮被 popup 覆盖，以及组件字体回退缺项；固定日志高度、调整操作区及补齐冻结 token 后修正。第二轮三浏览器140/141 仅 WebKit 点击焦点失败，修复后本候选 workspace141/141。失败日志/trace、事件诊断探针和审查回归记录保留，不记为最终通过。

构建初次遇到两个 style.scss 的 Sass 命名空间冲突，以显式 select-style 别名修复；完整检查首次遇到既有类型 consumer 仍断言根入口仅有 Button，按真实批准出口更新后204项通过。文档模板 strictTemplates 默认 dataAttributes 空列表，按本机 vue-tsc schema 显式允许合法 data-*，未放宽组件关键 props。

归档索引为 `.artifacts/task11/latest.json`，记录对应 tarball runId=284179b2-d4b9-4ac8-bfab-ea4e5390d101、日志、单测/生产覆盖、dev记录和两套浏览器证据。独立消费者位于 C:\Users\linzhuming\AppData\Local\Temp\zoom-design-packed-BC3oyz，可持久复核的tgz与报告已复制到归档。源码候选摘要通过 PowerShell 读取实际 UTF-8 文本、统一 LF 后计算，处理本机文档保护驱动对 Node 返回加密头的问题；无 Git 提交或公开发布。

## 人工验收与未执行项

运行 `npm run dev:vue`，打开输出地址的 `/select`，检查键盘选择/清空、父层拒绝回写、required/reset、外部 form、主题/RTL/portal，再检查 `/ssr?example=select&open=true`。自动化 ARIA 和键盘断言不替代屏幕阅读器人工验收。

Linux 实机、无 Volta 干净副本、整套 ci:verify 单命令、本轮其他包覆盖率、真实 OS 输入法/触摸设备与人工读屏未执行。Angular SSR 未实施。保留 Task11 进行中（待用户验收）；Task12 未开始。
