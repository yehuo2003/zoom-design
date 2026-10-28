# 仓库外 tarball 消费

Task7：Vue根与/button公开同一个ZButton及六项类型，组件CSS独立出口；所有公开JS/types/CSS/Sass逐一解析、realpath和摘要验证。TS6与vue-tsc消费真实生成声明；13项产品诊断按文件、行和代码核对。旧五类负例保留，增加Button JS/声明缺失和错指、Button CSS/theme CSS/Sass partial缺失共七类；命名集合要求12类及各自恢复正例全部执行。Sass夹具另有4类负例。

Vue标准消费者继续无Sass。其自己的Vite从三个独立HTML/TS入口构建size/button、size/named、size/unused；前两者只导入Button CSS和公开组件。unused以无副作用的void引用保留TS值导入，要求实际转换后仍有import、模块图遇到实现、最终输出无实现；故意保留实现的控制构建必须被拒绝，恢复后输出摘要一致。button-size.json为产品绝对大小，旧size-baseline.json保留工程场景。/minimal/button/和/minimal/named/由packed服务显式路由至这些输出，三浏览器检查独立CSS和交互。

Task6 扩展：三框架增加 `theme.css` 和可选 `theme.scss`；后者仅允许 `_index.scss`、`_defaults.scss`、`_theme.scss`、`_density.scss`，检查相对依赖完整且不指向 src/test。标准消费者不直接声明 Sass，Vue 还确认未安装 Sass，继续显式消费聚合 CSS；Angular 构建工具的传递开发依赖与主题 CSS 的消费要求分开判断。

`check:pack` 另外在 `zoom-design-sass-*` 临时目录安装真实 tarball 与固定版本 Sass，使用自身 `NodePackageImporter` 验证导入无输出、with 定制、两容器主题、三框架相同 CSS，并对缺 partial、错误 Sass export、额外私有 SCSS 和越界引用执行拒绝及恢复正例。它不替代四个标准消费者与原五类 packed 负例。结果保存在本轮 `theme-sass.json`；Vue 主题 SSR 与三浏览器证据见 [Task6 验收](./task6-acceptance.md)。

在仓库运行 `npm run check:pack`。每次清理并重建五包，先检查 npm pack dry-run，再检查实际 tgz 的 manifest、JS、声明、CSS、依赖和文件摘要。Core/DOM/Vue/React从各自包目录打包，Angular从根dist/angular的APF打包。当前全部为private 0.0.0，不执行公开发布。

脚本在os.tmpdir创建新的zoom-design-packed-*目录，通过Windows原生realpath展开短路径；拒绝仓库内目录、仓库祖先、其他npm workspace祖先和junction消费者。四个消费者均是独立private项目，vendor放复制后的真实tgz，manifest使用file:vendor相对路径。每次先npm install，再npm ci，校验锁文件没有变化。

platform安装Core/DOM；Vue、React、Angular各安装Core/DOM和自己的适配包。框架包仍无Core/DOM运行依赖，Vue现有产品Button；其余框架公共API为空。私有TS7泛型/回调/联合类型夹具与交互探针保留在消费者，不进入tgz，也不冒充产品API。

消费者各自声明并解析工具：platform/React为TS7.0.2，Vue/Angular为TS6.0.3。Vue显式将本地TS6传给本地vue-tsc；Angular由本地ngc/官方application builder检查模板并构建。所有配置启用strict和skipLibCheck=false；没有源码paths、外部extends、workspace链接、NODE_PATH或根编译器回退。公共声明与原生模板/JSX均执行正例和有具体诊断要求的负例。

验证器从消费者自身执行import.meta.resolve，核对实际文件、原生realpath、非链接安装、CSS公开出口及内部深层路径拒绝。Node无window/document时导入公开JS；Vue产品Button、主题及原工程probe分别SSR，React保留工程SSR。图验证单一运行时，并检查实际外部Vue导入与runtime实现片段，允许createVNode等合法外部helper；Angular使用APF编译图和peer解析。

check:pack依次注入缺tgz、错误exports、缺CSS、漏声明Core本地依赖、Vue实际安装错误TS7五类输入，要求验证器非零退出，并在finally还原。错误TS使用npm ci恢复。全部还原后再跑四消费者完整类型/构建/解析流程，最后才将本次状态写为passed。

`npm run test:e2e:packed`只接受latest.json指向的成功check:pack记录，先复核安装文件和工具版本，再默认运行五suite×三浏览器。服务直接读取消费者browser生产产物；Vue/React的/ssr用各自生产SSR产物渲染，并加载同一生产客户端完成水合。五suite复用工作区断言，包括交互、清理、重载、导入失败门禁和SSR节点保留；CSS另记录真实生产请求和computed marker。负例按manifest定位实际JS chunk，避免拦截含CSS的应用主文件。

```text
npm run check:pack
npm run test:e2e:packed
npm run test:e2e:packed -- --package vue --browser chromium
npm run check
npm run ci:verify
```

check是版本、构建、类型和工程/单测门禁；完整ci:verify额外包括覆盖率、工作区三浏览器、check:pack和packed三浏览器。按包ci:verify保持局部质量/工作区E2E范围；五包tarball统一安装门禁使用单独check:pack或无过滤完整CI。

报告入口为.artifacts/task5/latest.json，包含本次runId、状态、报告目录与外部consumerRoot。runs/<runId>保存真实tarball/清单、命令日志、四份安装锁文件记录、类型正反例、解析/构建图、负例、Vue体积及packed浏览器报告。新运行先写running，失败写failed；不能仅凭旧文件存在判断成功。浏览器summary独立记录exitCode，check:pack通过不等于浏览器通过。

保留本次外部消费者便于复核；操作系统清理临时目录后需重新运行check:pack。调试用--phase pack/prepare/verify/negative不会产生完整passed状态，不能据此运行正式packed入口。Windows受限执行宿主可能限制原生构建器访问临时目录祖先或Playwright结束自己的进程树，应在允许这些本地测试操作的环境执行相同命令。Linux入口已保留，实机仍未执行。
