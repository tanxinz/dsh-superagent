# M0 全量结果核查与 CI 取消留证修复

日期：2026-11-12（北京时间）。负责人：本次获授权 Codex 开发会话。任务 M0-01 / M0-13，均保持 IN_PROGRESS；M0-14 / M1 保持 BLOCKED。

## 基线与分支

本次核对 PR #1—#4 均 open，均未合并；#1 非草稿，#2—#4 为草稿。当前 head 与交接一致，按指示从 #4 建立个人分支 `fix/m0-ci-process-evidence-20261112`，起点 `7d9f51d0d1f63c5cd2fd189b1b81bca64c437779`。PR 目标为 #4 分支，供只审查本批差异；合并整条依赖链后再调整目标。

| PR | base → head | head SHA |
| --- | --- | --- |
| #1 | main → chore/team-handoff-20261112 | bc841de6c78d6ebcb8e0d812eb13473e09d80a68 |
| #2 | chore/team-handoff-20261112 → fix/m0-baseline-verification-20261112 | b86845a1020d30a2a53a5e9184bfbdf79d633ba9 |
| #3 | fix/m0-baseline-verification-20261112 → feat/m0-ci-review-20261112 | 7ca9fcb5633100d4a35b9898e554918d06e3b178 |
| #4 | feat/m0-ci-review-20261112 → docs/m0-ci-evidence-20261112 | 7d9f51d0d1f63c5cd2fd189b1b81bca64c437779 |

## 全量结果与失败分析

核查 [第三轮 43232199162](https://github.com/tanxinz/dsh-superagent/actions/runs/43232199162)。head 为 PR #3 的 7ca9fcb；各结果中的 source_commit 保留 GitHub 实际测试的检出版本，不用本分支 head 替代。

| 对象 | 构建、探针、定向测试 | 原始全量命令结果 |
| --- | --- | --- |
| Harness 基线 e8f7b93 | 均 PASS | PASS / 0，2701 文件通过、20 跳过；56662 测试通过、1 预期失败、199 跳过；命令耗时 2113.615 秒 |
| Harness 匹配候选 d743267 | 均 PASS | PASS / 0，1975 文件通过、17 跳过；41652 测试通过、1 预期失败、185 跳过；命令耗时 1051.715 秒 |
| SuperAgent | pnpm check PASS | 本轮 CI job 成功，包含类型检查、完整测试和构建；没有改动其源码 |

首轮两版全量均在 900 秒后超时。候选第三轮全量实际耗时超过 900 秒，说明首轮时间上限不足；这不推翻首轮真实失败。workflow-ptc 的完整断言经第二轮证实为缺少 CI 沙箱前提，PR #3 已使用锁版上游 bubblewrap 准备与真实探针修正。第三轮候选全量通过支持该版本下此前失败已消失；基线第三轮全量也通过，原 forge/worktree 超时未再出现；这与沙箱前置和单用例时间预算修正一并复验有关，不能把所有改善单独归因于其中一个设置。两版保留各自完整汇总与上游跳过项，此处不是覆盖率门禁或全部平台通过。

首轮完整原始 ZIP（内含两份全量日志和候选构建日志）现已补存至 `../evidence/m0-ci/run-43177871800/`；下载 ZIP SHA-256 与原 index 中的 artifact digest 相同，包内日志 SHA-256 与已有 result.json 相同。未改动任何历史 result.json 或失败摘录。第三轮四个原始 ZIP 全部保存在 `../evidence/m0-ci/run-43232199162/<label>/artifact.zip`，包含完整 command.log 与 result.json；另单独保存元数据，便于审阅。使用压缩原包保留原始字节和摘要，不改写颜色码、空白或换行。

## 本批修复与自动复审

旧记录器收到 SIGINT / SIGTERM 时不写 result.json，原始临时日志未脱敏删除、命令进程组未清理。使用旧版脚本与新真实进程回归复现，两个信号均失败，退出 1；修复后取消记录为 FAIL，保存 interrupted_signal 和子命令实际退出码，终止同进程组后代，脱敏后计算完整日志哈希并删除 command.raw。该保证针对 Linux 同进程组；主动脱离进程组、SIGKILL 和 runner 丢失不在此保证内。未取得结果时保持 UNKNOWN，不能记 PASS。

新增 scripts/evidence_audit.py 核查原始 ZIP 或目录中的完整日志存在、SHA-256、源码版本、必需检查、状态与退出/超时/取消是否一致，并拒绝把带文件筛选的命令记入 harness-test 全量证据。证据完整性通过与所有命令通过分开输出；历史 FAIL 也可以是完整可信的失败证据。审查不会独立认证断言或授予 M0 准出。

CI 在全量前先上传已完成的前置工件，避免等长测试结束才能取得构建/定向证据；末尾 always 审核完整日志并核对依赖无漂移。全量命令、时限、上游断言、只读 workflow 权限和所有固定 SHA 不变。

| 本地复验 | 结果 | 证据 |
| --- | --- | --- |
| 旧版取消路径真实进程回归 | FAIL / 1，两个信号失败，保留原断言 | ../evidence/m0-ci-followup-20261112/cancellation-before/ |
| 修复后 Python 回归 | PASS / 0，22 项 | ../evidence/m0-ci-followup-20261112/regressions-final/ |
| Node 预检回归 | PASS / 0，9 项 | ../evidence/m0-ci-followup-20261112/preflight-tests/ |
| 清单 M0 整阶段检查 | 退出 2，预期阻断，0/14 完成 | ../evidence/m0-ci-followup-20261112/checklist-stage/ |
| 两版完整工件自动审核 | 完整性 PASS；必需五项命令 PASS；M0 BLOCKED | ../evidence/m0-ci/run-43232199162/matching-release-candidate/evidence-audit.json |

复审原始 ZIP 的命令示例：`python scripts/evidence_audit.py docs/evidence/m0-ci/run-43232199162/baseline/artifact.zip --source e8f7b93a344964de3dca1ace9e72b6e4d6de87cb --require harness-test`；候选用对应目录与 SHA。初始失败 ZIP 同样可复审，完整性 PASS 与命令 FAIL 并存。

本地工作树测试的源码提交字段为基线 HEAD；实际修改脚本 SHA-256 另记 inputs.json，避免把未提交工作树测试冒称远端提交的 CI 结果。本分支新 CI 结果后续单独记录，不能挪用第三轮冒称本分支已全量复测。

## 文件分工与剩余条件

未提供其他成员实名，按现有 PR 划分文件责任，不能将此表视作已获得其他成员认领。

| 成员工作批次 | 文件范围与交接要求 |
| --- | --- |
| 本次个人分支 | scripts/ci_record.py、test_ci_record.py、新 evidence_audit.py 及其回归、.github/workflows/m0-offline.yml；本次完整日志与接手验收记录 |
| PR #1 的源码维护者 | upstream/superagent/**、原生事务与 Effects 探针及架构测试登记；本批未修改 |
| PR #2 的预检维护者 | scripts/m0-preflight*.mjs；本批只复测，不改实现 |
| PR #3 / #4 的 CI 与证据维护者 | 历史证据保持不变；共享交接文件、CI workflow 的后续修改需先合并或协调本分支，避免并行覆盖 |
| 阶段审核人（待指定） | 核验完整证据与剩余 M0 条件，不能以结构审查替代独立人工准出 |

Harness gitlink 保持 e8f7b93a344964de3dca1ace9e72b6e4d6de87cb，未修改 .gitmodules、Harness 源码或锁文件。没有运行真实业务 Worker、模型调用或 Jev。Bridge/Service、受信身份、持久安全迁移、受限 Session、OS 隔离及最终拒绝仍缺验收；未勾选任何清单任务，M1 不可宣称可运行。
