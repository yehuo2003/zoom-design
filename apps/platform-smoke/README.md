# Private platform smoke host

Core/DOM工程消费宿主，非发布产品。先通过包名导入两包dist，再启用/core状态探针与/dom事件清理探针；探针源码复用packages/*/test/fixtures，不引用产品src，不对外增加稳定API。

```text
npm run build --workspace @zoom-design/dom
node scripts/serve-smoke.mjs --app platform --mode workspace --port 4170
```

访问http://127.0.0.1:4170/core或/dom；Ctrl+C退出。自动验证使用根npm run test:e2e:platform。Task2不提供长期watch、框架组件、主题或packed模式，后续分别在Task3–5交付。
