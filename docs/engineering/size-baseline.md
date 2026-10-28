# Vue 工程消费体积基线

Task7另建立`baselineKind=product-button`的`button-size.json`，从仓库外Vue消费者自身Vite分别构建子路径挂载、根named挂载、未使用导入三个入口。挂载场景只包含Vue运行时、最小应用壳与Button CSS，排除主题/聚合CSS、工程probe、主题/Button playground、SSR及其他框架；unused按最终JS检验实现移除。实际数值和runId见[Task7验收](./task7-acceptance.md)。这些绝对总量包含Vue，不能解释为库独有增量，也不作传统库节省比较。

最终候选bf6ce646-3195-443e-bac7-83cf9ee1ff0f的pack runId为e302e0db-f49d-48cc-86ca-f5c2b4f109a0；原始JSON在该run目录的button-size.json。

| Task7最小产品场景 | raw字节 | gzip字节 | Brotli字节 |
| --- | ---: | ---: | ---: |
| /button挂载 + Button CSS | 70955 | 27002 | 24493 |
| 根named挂载 + Button CSS | 70955 | 27002 | 24493 |
| 未使用导入控制（无CSS） | 737 | 428 | 349 |

unused保留TS值导入到bundler：实际Oxc转换后仍有import，构建图确实遇到Button实现，最终JS无组件代码。另将组件故意保留在globalThis，门禁明确拒绝该21046字节构建；恢复后正例摘要一致。不能仅凭“模块图遇到/未遇到文件”宣称可消除。以上为整个最小应用输出，包含Vue运行时与应用壳，压缩算法沿用每资产单独压缩后求和。

下列数值保留为 Task5 的历史快照。Task6 新增延迟加载的私有主题样本和共享主题 CSS，当前打包报告会包含所有可达预览资产，场景说明已同步；最新实际 runId 与大小见 [Task6 验收记录](./task6-acceptance.md) 指向的 `size-baseline.json`。这些数值仍不是 Button 产品体积，也不表示等功能节省。

2026-10-28；runId为48857888-4b10-41d9-a46a-38cfc3fedcb7。原始数据见[size-baseline.json](./size-baseline.json)。

场景是仓库外独立Vue消费者：空公共@zoom-design/vue包、显式CSS marker和私有SFC探针，覆盖输入/计数/事件/卸载。mode=packed-production，baselineKind=engineering，target=ES2022，Vite生产构建。Node26.12.1、npm12.2.1、Vue3.5.44、TS6.0.3、vue-tsc3.3.13、Vite8.3.5及插件版本均记录于JSON。

| 页面实际引用资产 | raw字节 | gzip字节 | Brotli字节 |
| --- | ---: | ---: | ---: |
| assets/index-B_h7Civp.js（Vue运行时及工程宿主） | 70625 | 27595 | 24973 |
| assets/dist-BvRk9kiK.js（实际动态导入的空包入口） | 0 | 20 | 1 |
| assets/index-Ds9d3kEc.css（工程marker） | 52 | 57 | 52 |
| 合计 | 70677 | 27672 | 25026 |

从生产HTML引用入口出发读取实际构建图，追踪工程页面使用的静态/动态导入与CSS，按路径去重共享chunk。该Task5历史构建只有一个页面；Task6/7后的预览增加受控延迟示例，最新工程场景单独记录。每个资产分别用Node zlib默认参数gzip/Brotli压缩后求和，空JS也产生压缩容器开销。生产CSS请求和computed marker另由三浏览器验证。

不计source map、SSR服务端构建、未引用资产、node_modules安装占用、tarball大小和HTTP/TLS开销；压缩字段是可复算的资产压缩字节，不代表服务器实际传输压缩配置。

该快照浏览器图没有React/Angular、TS/Sass编译器、测试工具或仓库apps。TS/vue-tsc属于消费者开发链，不能把安装体积计入浏览器传输。快照当时公共入口为空，表中主要是消费者Vue运行时和私有工程宿主。Task7的产品基线另建，不据此作传统库节省结论；等功能对照尚未实施。
