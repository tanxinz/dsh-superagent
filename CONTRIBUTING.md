# 协作开发

## 访问与分支

仓库属于 GitHub 个人账户 tanxinz，目前公开。直接推送需要仓库协作者权限，由所有者在 Settings → Collaborators 添加具体 GitHub 账户，成员接受邀请；也可 fork 后提交 PR。ChatGPT 项目成员名单不作为 GitHub 授权名单。

PR 合并前以 chore/team-handoff-20261112 为当前开发基线，合并后使用 main。先拉取最新代码，再从基线建立个人任务分支。一项任务一个 PR，由另一名成员复审，避免同时修改同一核心文件。

## 代码位置

- upstream/superagent 是普通源码目录，已导入上游固定版本及本项目补丁；在本仓库直接修改、提交，无须向 DeepSeek 上游推送。
- upstream/harness 是 Git 子模块，仅引用未修改的固定 Commit。需要修改 Harness 时，先在团队可写 fork 中提交并推送，再更新 .gitmodules 与 gitlink；上层提交不得引用尚未推送的子模块 Commit。
- 不执行 submodule update --remote 自动升级。换版先更新兼容矩阵、lockfile、测试证据和 ADR。
- 不创建第二套 Engine、Ticket 主库或队列。源码内部相对导入可用，跨包只能使用已导出的公共入口。

## 执行任务与交接

先读开发清单、docs/DEVELOPMENT_STATUS.md 和 docs/acceptance/M0.md。认领时记录任务编号、负责人、验收条件和范围。以实际代码及运行证据更新状态；前置条件未完成时，不勾选整个任务。M0-14 未通过，不开展 M1 的运行集成。

结束开发前提交源码、命令、结果、剩余问题和下一步，更新交接文件。GitHub 中已提交且可取得的版本是跨成员接力依据；聊天进度不代替代码证据。

## 验证

```bash
cd upstream/superagent
npm exec --yes --package=pnpm@11.7.0 -- pnpm install --frozen-lockfile
npm exec --yes --package=pnpm@11.7.0 -- pnpm check
```

新增测试和源码模块必须同步登记到该目录 docs/007-architecture.md 的 Tests / Modules 表，保留原生文档测试。pnpm check 包含类型检查、全部单元测试和构建。M0 崩溃探针仅使用临时 SQLite 和无害文件，不调用模型、不使用业务凭据。

Harness 自有 pnpm 为 11.28.5；当前完整构建受到 IPC 限制阻断，详情见 M0 验收记录。配置树、真实 Session、隔离和在线 SDK 测试缺失时记 BLOCKED/NOT_RUN，不能记 PASS。CI 门禁仍待 M0-13 补全。

提交前检查 diff，排除 .env、Token、私钥、生产数据、node_modules 与缓存。日志须脱敏并记录源码版本、退出码和证据引用。
