# CI 文档与 M0 全量验证分流（2026-11-14）

## 背景与状态

PR #14 只改 Markdown，但原 `.github/workflows/m0-offline.yml` 对所有 `pull_request` 触发，执行两版 Harness 全量测试。Run [43544511314](https://github.com/tanxinz/dsh-superagent/actions/runs/43544511314) 的未修改 baseline `e8f7b93` 失败，**不能被文档修订掩盖**。失败根因和隔离补丁另见 [Issue #17](https://github.com/tanxinz/dsh-superagent/issues/17) / [PR #18](https://github.com/tanxinz/dsh-superagent/pull/18)。

本分支只为 PR 的自动触发做**有界分流**，不修改 Harness 子模块、锁文件、业务源码、已有工作流的 CI 命令、退出码或原始证据。修改后的工作流 **还需 GitHub Actions 实际验证**。

## 两条明确的 CI 轨道

| 情况 | `docs-review.yml` | `m0-offline.yml` |
| --- | --- | --- |
| PR 仅改 `**/*.md`（包括 README 和设计文档） | 运行文档审查（preflight、证据记录器、清单审计） | 不自动运行完整 Harness |
| PR 只改代码/测试/工作流/依赖/配置（非 Markdown） | 不自动触发 | 原 M0 完整审查、SuperAgent、隔离、两版 Harness |
| PR 同时改 Markdown 与任一非 Markdown | 同时触发文档审查 | 同时触发完整 M0 |
| 手动触发 M0 `workflow_dispatch` | 可单独手动审查文档 | **始终保留**原 M0 全量入口 |

**注意**：这里只按 `.md` 后缀识别纯文档 PR，不按 `docs/` 目录一刀切。位于 `docs/` 的源码、配置、Fixture 或 CI 文件一旦不是 Markdown，仍会触发 M0 全量。混合 PR 仍然全量。此规则的路径比较由 GitHub PR event 处理，不能用一句聊天结论当作已执行的实测。

## 强制边界与保护规则

1. 本次分流**仅影响 PR 的自动执行策略**，不是通过率调整、skip 失败测试、M0 准出或 V12 功能准入。M0-01—13 仍 IN_PROGRESS，M0-14 BLOCKED，M1 不能运行集成。
2. `m0-offline.yml` 仍有独立的 `workflow_dispatch`，可在任何当前分支运行真实全量检查；M0 正式准出必须查阅准确基线、两版 Harness 的完整原始全量测试和实际隔离证据，不得以文档审查 PASS 代替。
3. 原 PR #14 Run 43544511314 的 baseline FAIL **永久保留**；未来 PR #18 的修订夹具补丁版若通过，也必须标注为 `patched baseline` 而不是未修改 baseline 的 PASS。
4. 若 GitHub Branch Protection/Ruleset 配置把旧 Harness job 名称列为每个 PR 的必选 Check，而文档 PR 不再触发该 Job，GitHub 可能一直提示 `Expected — Waiting for status to be reported`。仓库管理员必须在不降低源码 PR 门禁的前提下，分开配置文档审核与源码 M0 的必选规则（或改用一个始终存在的聚合 Gate）；**本 PR 没有权限擅自更改仓库 Branch Protection**，更不能把全部强制检查直接取消。
5. 纯文档变更虽不自动跑 Harness，但 Reviewer 仍要核对 PR 的 changed files 与 staged changes，并检查设计状态和测试声明的真实性。Markdown 检查不能证明设计得到独立人审。

## 静态审查与待实测

- 代码审查应确认：`paths-ignore: '**/*.md'` 只屏蔽全为 Markdown 的 PR；`docs-review.yml` 的 `paths: '**/*.md'` 仅在包含 Markdown 时触发。
- [ ] 在真实纯 Markdown PR 上检查仅 docs-review 自动运行；旧 M0 不出现失败/未报告必选检查阻断。
- [ ] 在真实仅源码/CI PR 上检查 M0 full 自动运行、docs-review 不触发。
- [ ] 在真实混合 PR 上检查 docs-review + M0 full 都自动运行。
- [ ] 在 GitHub UI 验证手动 `m0-offline.yml` 仍允许完整两版 Harness 运行，并保留全部原始工件。
- [ ] 核对仓库 Ruleset/Branch Protection 的必选检查名，不应通过隐藏失败或取消源码验收实现分流。
- [ ] 两种工作流的 CI recorder/audit 均以真实命令退出码与日志为准，不声明 `NOT_RUN` 为 PASS。

## 与其他成员的文件分工

仅认领 `.github/workflows/m0-offline.yml`、`.github/workflows/docs-review.yml` 及本设计说明；不碰 PR #13 app/infra/SourceHost、PR #14 的 V1.2 详细设计或 PR #18 的 LiveShare 测试补丁/独立工作流。先经独立审阅再决定合并，M0 与 V12 门禁各自保留。

## 第四轮实测与文档审核质量修复（2026-11-14）

- 针对 [临时 Markdown-only PR #20](https://github.com/tanxinz/dsh-superagent/pull/20)，GitHub Actions 只调度了 [docs-review Run #43551618865](https://github.com/tanxinz/dsh-superagent/actions/runs/43551618865)，实际执行结果 **SUCCESS**；相同分支查询无自动 M0 工作流。此验证使用 PR #19 的分支为目标；不会自动覆盖其它受保护分支的必选检查策略。
- 针对 PR #19 自身的 YAML + Markdown 混合修改，文档审查及完整 M0 均已真实触发，但 Harness 两版原生 full job 的最终结论必须以对应 run 的完整日志为准。不能仅据本节宣称 M0 通过。
- 增加 `scripts/docs_review_check.py`：以准确 PR base SHA 和 GitHub checkout 全历史获取实际变更的 Markdown，离线检查本地相对链接、未闭合代码围栏和 Git 冲突标记；新增 `scripts/test_docs_review_check.py` 单元回归，所有输出进入 `ci_record.py` 证据审计。
- 静态文档检查是语法与引用完整性检查，**不替代设计、授权、安全和变更内容的独立 Reviewer**。本次同样没有把旧 Harness baseline FAIL 改写为 PASS。

已完成的真实纯文档触发验收与尚未验证的 Branch Protection/Required Checks 必须独立标注；PR #19 合并前由仓库管理员核对 required-check 约束，确保不会因路径跳过而产生不可解的 Expected 检查。合并与功能准入的其他约束仍保持原样。
