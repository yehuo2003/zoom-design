# Task2 工程验收记录

日期：2026-10-27（Asia/Shanghai），最终验证约14:06。Task1已获用户确认完成；Task2已实现并通过11/11本地验收检查，独立复核无待修问题，状态：已完成（2026-10-27用户确认）。仅验证工程基础，不声明产品组件能力。

## 当前证据

| 用例 | 验证方式 | 当前结果 |
| --- | --- | --- |
| T2.1 | 构建器仅清理两包固定dist目录，按Core→DOM构建；index.js/index.d.ts与exports一致 | PASS |
| T2.2 | Core无浏览器/Node公共类型；真实编译的@ts-expect-error反例；独立Node进程导入Core | PASS |
| T2.3 | 独立无window/document的Node进程导入DOM成功；监听夹具须显式调用 | PASS |
| T2.4 | 两包src和dist深层入口均被exports阻止；无跨包源码alias | PASS |
| T2.5 | TS7发出私有泛型/回调/联合类型声明；TS6与TS7同时消费真实公共声明和夹具声明，skipLibCheck=false | PASS |
| T2.6 | Core单测及Chromium双实例独立，初始0不会被fallback9覆盖 | PASS |
| T2.7 | jsdom及Chromium点击计数1，dispose后再次点击仍1，重复dispose安全 | PASS |
| T2.8 | 根工程测试分别创建失败断言，真实包Vitest命令均返回非0，临时用例finally清除 | PASS |
| T2.9 | platform宿主/core、/dom实际导入两包；正常交互和注入真实包导入异常的Chromium场景4/4通过 | PASS |
| T2.10 | 公共根入口export{}；npm12 pack dry-run各4个文件，未含源码/测试/夹具；文档明确工程能力 | PASS |
| T2.11 | Core无样式依赖/导入；DOM夹具不写style、保留原inline style，无品牌主题 | PASS |

根工程测试22/22（Task1原有15+Task2新增7），Core与DOM各3项单测，Chromium4项消费E2E。两包及platform宿主类型检查通过；platform原生Vite构建通过；每包独立E2E均2/2通过。清理重建移除了两包预置的生成物残留标记。两包test:coverage命令均通过，原始报告中的100%仅指私有夹具，空生产入口被跳过；发布生产逻辑覆盖率为N/A。

一次独立只读复核未发现Important/Critical或轻微缺陷。Task1无Volta安装回归也通过：npm ci、两种版本检查入口、15项原工具链测试全部退出0，锁文件内容不变；Task2新配置未破坏原基线。原有四个传递依赖安装脚本继续遵循npm12默认阻止策略，没有扩大授权。

## 命令

```text
npm run build --workspace @zoom-design/core
npm run build --workspace @zoom-design/dom
npm run typecheck --workspace @zoom-design/core
npm run typecheck --workspace @zoom-design/dom
npm run test:unit --workspace @zoom-design/core
npm run test:unit --workspace @zoom-design/dom
npm run check:platform
npm run test:engineering
npm run test:e2e:platform
npm run test:e2e --workspace @zoom-design/core
npm run test:e2e --workspace @zoom-design/dom
```

`build-platform.mjs dom`会先清理并构建Core前置包。`typecheck-platform.mjs`分别使用生产和测试配置，防止测试的Node/DOM类型掩盖Core生产类型边界。

`check:platform`发出私有夹具声明，再从Vue工作区解析已固定的TS6（不运行Vue编译器），并从Core解析TS7消费两类声明；同时检查Core无浏览器/Node类型和两包真实pack dry-run内容。npm12的JSON以包名为key，检查器拒绝空文件列表。dry-run缓存位于本项目.artifacts，不要求全局npm缓存写权限。没有创建正式tgz或进行发布。

`test:e2e:platform`只执行Core/DOM Chromium；每包入口通过--package筛选对应两个场景。宿主只监听127.0.0.1:4170，strictPort，reuseExistingServer=false；每次runId随机并由测试核对/__ready，避免测试到其他服务。其他框架、浏览器与packed模式明确拒绝，留给后续任务。

只运行宿主时先构建两包，再运行：

```text
node scripts/serve-smoke.mjs --app platform --mode workspace --port 4170
```

浏览器打开[Core工程页](http://127.0.0.1:4170/core)或[DOM工程页](http://127.0.0.1:4170/dom)。这不是Task3的长期watch预览服务，退出验证后不会常驻。

## 报告与限制

- `.artifacts/task2/contracts-red.log`：实现前缺少产物/配置的7项预期失败。
- `.artifacts/task2/engineering-green.log`：22项工程测试最终输出。
- `.artifacts/task2/platform-checks.json`：环境类型反例、TS7声明发出、TS6/TS7消费及pack文件列表。
- `.artifacts/task2/e2e-all.json`：完整四项Chromium报告；包独立验证可能覆盖playwright/results.json。
- `.artifacts/task2/e2e-core.json`、`e2e-dom.json`：对应独立包命令各2项验证。
- `.artifacts/task2/task1-portable-regression.log`：Task2接入后的无Volta工具链回归。
- `.artifacts/task2/npm-ls-all.json`：完整依赖树，退出0。
- `.artifacts/fixtures/platform/`：声明夹具产物，未进入两包dist和files。
- `.artifacts/task2/platform-build/`：私有platform宿主构建，未进入产品包。

E2E负例故意抛出“Core/DOM package import failed”，页面必须报错且控件保持禁用；这些预期错误不计为产品缺陷。进程可能输出工具环境NO_COLOR/FORCE_COLOR冲突提示，与测试断言无关。

公共入口为空，因此声明兼容结果仅覆盖空公共声明和私有复杂类型夹具，不承诺未来实际产品API天然兼容。三框架组件、SSR/水合、跨浏览器、外部tgz消费与体积验收均未执行；分别属于Task3–5及产品任务。
