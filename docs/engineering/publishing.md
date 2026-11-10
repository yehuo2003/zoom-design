# Zoom Design 测试版本发布

根目录与 `apps/*` 是私有 npm 工作区；公开包是 `@zoom-design/core`、`@zoom-design/dom`、`@zoom-design/vue`、`@zoom-design/react` 和 `@zoom-design/angular`。包名的 `@zoom-design` scope 决定它们归属 npm 上的 `zoom-design` 组织。

在仓库根目录使用项目指定的 Node 26.12.1、npm 12.2.1，并确保当前 npm 凭据有权向该组织发布公开包。发布脚本使用根目录的本地 `.npmrc`，不会把令牌写入脚本或报告。

先预览下一次要发布的版本：

```powershell
npm run publish:all:test -- --dry-run
```

确认后在根目录执行：

```powershell
npm run publish:all:test
```

脚本会查询 npm 上五个包已占用的版本，从根版本开始逐个递增补丁号，选择五包共同可用的第一个版本。例如当前是 `0.0.1`，且它已被发布，下一候选版本是 `0.0.2`。项目要求五个公开包与根项目同版本，DOM/Vue 的包间依赖也必须与该版本精确一致。因此脚本会同步更新根项目、五包、四个私有消费示例及 `package-lock.json`。

发布前会检查 npm 登录状态、`README.md` 是否可读、版本与锁文件约束，并运行现有的 `check:pack` 构建和打包消费检查。Angular 从生成的 `dist/angular` 发布，其余四包从各自的 `packages/*` 目录发布。发布命令使用 `--access public --tag test`。完成后控制台逐包显示成功、失败或跳过的原因，结果另存于 `.artifacts/release/latest.json`。任何包失败都会使脚本以非零状态结束；Core 失败会跳过 DOM/Vue，DOM 失败会跳过 Vue，React/Angular 仍会尝试发布。

如果在真正发布前检查失败，脚本会尝试还原本轮版本修改。如果已有包发布成功，版本修改会保留；再次运行时会重新查询 npm，选择五包共同可用的下一个版本。npm 的版本一经发布不能重用。发布前查询与实际上传之间若有其他人抢先发布相同版本，脚本会报告冲突，不会盲目重试上传。

可用以下命令检查某个包的发布结果及标签：

```powershell
npm view @zoom-design/core@0.0.2 name version --registry=https://registry.npmjs.org/
npm dist-tag ls @zoom-design/core --registry=https://registry.npmjs.org/
```

其中版本号请替换为本次报告里的版本。`--tag test` 用于指向测试版；首次发布新包时也要实际检查 `latest` 标签，不要假设它一定未创建。
