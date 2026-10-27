# @zoom-design/core

框架无关算法、状态和行为的预留产品包。当前公共入口为空，只有ESM与声明工程基线；私有状态夹具不会成为公开API。

```text
npm run build --workspace @zoom-design/core
npm run typecheck --workspace @zoom-design/core
npm run test:unit --workspace @zoom-design/core
npm run test:coverage --workspace @zoom-design/core
npm run test:e2e --workspace @zoom-design/core
```

生产配置为TS7.0.2、ES2022、NodeNext，lib仅含ES2022，types为空，skipLibCheck=false。不包含DOM/Node公共类型、框架运行依赖或样式。包只输出dist/index.js和dist/index.d.ts，src/test深层入口不可导入。

工程测试验证两个私有实例独立、0值保留、真实包导入和消费链路。生产逻辑覆盖率为N/A；测试夹具通过不等于已提供状态管理产品API。TS6/TS7的验证范围目前仅为空公共声明和私有复杂声明夹具，未来产品API须重新验证。

Node/npm继承根配置，命令使用本包解析的工具。先build再执行typecheck/unit/e2e。细节见[工程基线](../../docs/engineering/baseline.md)及[Task2验收](../../docs/engineering/task2-acceptance.md)。
