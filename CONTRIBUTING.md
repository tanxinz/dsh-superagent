# 协作开发

## 访问与分支

仓库属于 GitHub 个人账户 tanxinz，目前公开。直接推送需要仓库协作者权限，由所有者在 Settings → Collaborators 添加具体 GitHub 账户，成员接受邀请；也可 fork 后提交 PR。ChatGPT 项目成员名单不作为 GitHub 授权名单。

PR 合并前以当前任务链明确指定的基线为准（现阶段 PR #14、#18、#19 均以 `feat/m0-local-20261113-mac` 为目标）；正式进入 main 前仍须单独核对上游分支依赖和 M0 准出条件。先拉取最新代码，再从正确基线建立个人任务分支；一项任务一个 PR，避免同时修改同一核心文件。

## PR 审核与合并决策：tanxinz 责任制

- **统一审核人和合并责任人：GitHub 账户 `tanxinz`。** 本仓库不再要求必须由另一名协作者提交 `APPROVE` 才能合并；其他成员审核可自愿邀请，但不是项目级强制前置条件。
- **GitHub 不允许 PR 作者批准自己创建的 PR。** `tanxinz` 对自己的 PR 通过 GitHub Conversation 评论或 `COMMENTED` Review 记录 `OWNER_REVIEW: READY_TO_MERGE` 或 `OWNER_REVIEW: BLOCKED`，不能自称已取得独立 `APPROVE`、不能伪造审阅账户。此记录只代表项目内部责任人批准，不等于 GitHub 原生 `APPROVED` 状态。
- 每次 Owner Review 必须对应**当前 head SHA**，记录：变更文件与范围、测试命令和对应 CI Run/Artifact、PASS/FAIL/NOT_RUN/UNKNOWN 的真实状态、安全/凭据/数据影响、遗留风险、上游锁版与 gitlink 是否变化，以及最终“允许合并/阻止合并”的明确决定；head、依赖分支或运行配置变更后必须重新核对。
- **真实门禁不降低**：源码/CI/依赖变更必须完成对应的定向与完整验证、留存原始失败证据；文档变更仍需文档/静态审查及适用的设计验收。不能用通过的定向测试替代完整测试，不能用补丁版 Harness PASS 冒充未修改 baseline PASS。M0-14 仍为 `BLOCKED`，M1 运行集成未准出，V12 未运行的可选能力继续禁用。
- 当 PR 涉及跨团队授权、安全边界、真实生产凭据、删除证据或高风险合并冲突时，`tanxinz` 必须将风险写明并停留在 `BLOCKED` 直至有足够的客观验证；可主动邀请其他成员，但不自动改变上述审核责任人。
- **GitHub 分支保护是另一层规则**：如 Settings → Rules → Branch protection / Rulesets 存在“Require approvals”且要求他人批准，GitHub 可能仍阻止作者合并；由仓库所有者在相应目标分支把强制他人批准改为不要求，同时**保留适用的 CI/status checks**。仅修改本文件不会自动修改 GitHub 仓库设置，不得绕过仍生效的服务器侧保护。

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

Harness 自有 pnpm 为 11.28.5；两版完整构建已在 GitHub CI 通过，本地 IPC 阻断只保留为历史证据。最新全量结果及完整日志见 docs/acceptance/M0-ci-process-review-20261112.md。配置树、真实 Session、隔离和在线 SDK 测试缺失时记 BLOCKED/NOT_RUN，不能记 PASS。CI 门禁仍待 M0-13 补全。

CI 命令使用 scripts/ci_record.py 留存退出码、超时、取消信号和脱敏完整日志；scripts/evidence_audit.py 核对原始命令、日志摘要、必需证据和可选源码 SHA。证据完整性 PASS 与命令 PASS 分别报告，均不授予 M0 准出。SIGKILL、runner 丢失或外部平台未上传工件时，缺失结果保持 UNKNOWN，不按取消处理成功。

提交前检查 diff，排除 .env、Token、私钥、生产数据、node_modules 与缓存。日志须脱敏并记录源码版本、退出码和证据引用。
