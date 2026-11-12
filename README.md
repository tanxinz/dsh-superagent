# dsh-superagent

SuperAgent × DeepSeek Harness 协作开发仓库，当前处于 M0 底座验证阶段。

`upstream/superagent/` 是本仓库可直接修改和提交的 SuperAgent 源码，源自固定上游 Commit，保留原许可证和说明；`upstream/harness/` 仍为固定版本 Git 子模块。

## 获取当前开发版本

PR 合并前使用协作分支：

```bash
git clone --branch chore/team-handoff-20261112 --recurse-submodules https://github.com/tanxinz/dsh-superagent.git
cd dsh-superagent/upstream/superagent
npm exec --yes --package=pnpm@11.7.0 -- pnpm install --frozen-lockfile
npm exec --yes --package=pnpm@11.7.0 -- pnpm check
```

本次 Node 为 24.22.1。检查结果：类型检查通过、60 个测试文件 / 1209 项测试通过、构建通过；新增 11 项原生事务/Effects 崩溃探针。M0 尚未准出，不能按完成产品部署。

- [当前交接状态](docs/DEVELOPMENT_STATUS.md)
- [M0 验收与阻断项](docs/acceptance/M0.md)
- [兼容矩阵](docs/compatibility-matrix.md)
- [上游能力核验](docs/upstream-capabilities.md)
- [协作流程](CONTRIBUTING.md)
- [设计基线](docs/SuperAgent_Harness_Design_Final.md)
- [开发清单，正文 V1.1](docs/SuperAgent_Harness_Development_Checklist_V1.0_20261112.md)

按清单依赖继续推进。单仓库测试通过不代表 Harness 组合、受限 Session、操作系统隔离或全部 17 模块通过。上传前排除凭据和生产数据。
