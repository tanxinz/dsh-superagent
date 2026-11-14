# SuperAgent × Jev：正式设计发布与开发状态索引

> 更新基准：2026-11-14。本文件是面向 `main` 正式文档的**版本与证据索引**，不是 M0 产品源码或通过验收的声明。历史开发过程和完整命令输出以固定 GitHub 提交、CI Job 与原始 Artifact 为准。

## 当前两个版本边界

| 分支 | 本次作用 | 能否据此宣称可运行 |
| --- | --- | --- |
| `main` | [V1.2 主设计](SuperAgent_Harness_Design_Final.md)、[实施清单](SuperAgent_Harness_Development_Checklist_V1.0_20261112.md)、[兼容矩阵](compatibility-matrix.md)、[接口核验](upstream-capabilities.md)、[V1.2 静态复审](reviews/V1.2-DeepSeek-Harness-Static-Review-20261114.md) | **不能**。只代表正式设计文档与静态审计资料 |
| [`feat/m0-local-20261113-mac`](https://github.com/tanxinz/dsh-superagent/tree/feat/m0-local-20261113-mac) | M0 原型任务分支、原生 Store/Effects/受限 Session 的实施尝试和 [M0 验收记录](https://github.com/tanxinz/dsh-superagent/tree/feat/m0-local-20261113-mac/docs/acceptance) | 仅以准确提交对应的实际测试判断；M0 阶段尚未准出 |

## PR 与 CI 的可验证进展

- [PR #18](https://github.com/tanxinz/dsh-superagent/pull/18) 已合并至 M0 任务分支；[Run #43551553456](https://github.com/tanxinz/dsh-superagent/actions/runs/43551553456) 中修订日期夹具的 Harness baseline 全量和原始 matching candidate 全量均 `SUCCESS`。原始未修订 baseline 的 [Run #43544511314](https://github.com/tanxinz/dsh-superagent/actions/runs/43544511314) **FAIL** 仍是历史事实，不得覆盖。
- [PR #14](https://github.com/tanxinz/dsh-superagent/pull/14) V1.2 文档已合并到 M0 任务分支；主设计另曾直接同步到 `main`。本分支所附静态修复尚须按最终 PR 记录审阅/合并。
- [PR #19](https://github.com/tanxinz/dsh-superagent/pull/19) 文档 CI 分流在本次查询时仍是 Open；独立 docs-review [Run #43551881399](https://github.com/tanxinz/dsh-superagent/actions/runs/43551881399) 通过，组合 M0 [Run #43551881352](https://github.com/tanxinz/dsh-superagent/actions/runs/43551881352) patched baseline 完整测试尚未最终完成。**这些工作流不在 `main` 中**。
- V1.2 Web/Stagehand/Schedule 等新增能力和 [V12 子例](SuperAgent_Harness_Design_Final.md) 仍是 `NOT_RUN`；不得由设计层通过推断运行许可。

## 质量门禁与遗留事项

- **M0-01—13 = `IN_PROGRESS`；M0-14 = `BLOCKED`；M0 完成 0/14；M1 未准出。** 这是本次已核对 M0 任务文档的快照，后续应由新的原始证据更新。
- 静态修订已明确 `CLAIMED → UNKNOWN_RECONCILE` 的合法故障迁移、同库原子保存 ContextPatch 不可变载荷、V12 关键子例以及原生 Effects 的重复队列载荷覆盖/无跨进程持久租约风险。**这些均属于 `DESIGN_CORRECTED / CODE_UNTESTED`**，不能宣称 R18-A、R24-C 或 V12 项目动态 PASS。
- 修改仓库项目维护者审批规则仅影响 GitHub 维护；业务运行态 `Mandate/Policy/ToolGuard/ActionGateway` 的强制验证与 Worker OS/网络隔离不会因此放宽。PR 合并不等于 M0 及产品功能准入。

## 使用说明

首先阅读 [主设计第 6、9、13、16、17 章](SuperAgent_Harness_Design_Final.md)，按 [开发清单 §14](SuperAgent_Harness_Development_Checklist_V1.0_20261112.md) 选择特定能力；需要验证产品行为时，前往 M0 开发分支查看相应确切 SHA 的实际日志、限制与未完成项。不可仅以 GitHub PR `Merged`、模型回答或文档中历史 CI 通过记录宣称工作流程已投入运行。
