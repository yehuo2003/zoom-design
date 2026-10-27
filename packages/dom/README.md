# @zoom-design/dom

焦点、测量、事件和清理等浏览器能力的预留产品包，保留显式Core0.0.0运行依赖。当前公共入口为空，没有DOM产品API；导入包不会执行浏览器操作。

```text
npm run build --workspace @zoom-design/dom
npm run typecheck --workspace @zoom-design/dom
npm run test:unit --workspace @zoom-design/dom
npm run test:coverage --workspace @zoom-design/dom
npm run test:e2e --workspace @zoom-design/dom
```

build先清理并构建Core前置包。生产配置为TS7.0.2、ES2022、NodeNext，lib含ES2022/DOM/DOM.Iterable，types为空，skipLibCheck=false。私有监听夹具只在明确调用后注册事件，dispose移除监听；不写inline style、不引入品牌主题或Sass。

包内只有dist/index.js、dist/index.d.ts、README和manifest进入打包清单；src/test深层入口不可导入。jsdom和Chromium验证点击1次后dispose，再点击计数仍为1。这是工程夹具结果，生产逻辑覆盖率为N/A。TS6/TS7只验证了空公共声明和私有声明夹具，产品API出现后需复验。

Node/npm继承根配置，命令使用本包解析的工具。先build再执行typecheck/unit/e2e。细节见[工程基线](../../docs/engineering/baseline.md)及[Task2验收](../../docs/engineering/task2-acceptance.md)。
