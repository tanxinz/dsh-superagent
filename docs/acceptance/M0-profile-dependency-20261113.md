# M0-05 原生 profile 依赖卸载与恢复

日期：2026-11-13（北京时间）。个人分支 feat/m0-profile-dependency-lifecycle-20261113，基于 PR #10 的 15364bd81d04546f851b7495668b99c1cd2f8445。核对 PR #7—#10 均 open/unmerged，head 无更新；本批不修改它们。M0-05 保持 IN_PROGRESS，M0-14 / M1 仍 BLOCKED。

## 实现与实际行为

扩展 scripts/m0-profile-probe.mjs，新增 --boot-service-dependency-cycle 模式；原 --boot-unconfigured 和 --dump-only 保留。新增测试专用 observer fixture，仅用于自建隔离 profile：从包公共导出加载锁版 PermissionPresetService，使用公共 ctx.registry.get、runtime.fibers、fiber.parent/config/dispose 和 ctx.plugin 卸载并恢复真实原生权限服务，不提供假权限服务、不修改产品源码。

每个进程先实际调用 CognitiveMeshService.assertReady；卸载权限服务后确认 Mesh 不再发布，旧服务句柄拒绝、旧 Runtime 入站拒绝且 lifetime 已中止；再以原预设配置恢复原生插件，确认 Mesh 重新加载且就绪，旧服务及 Runtime 在恢复后仍拒绝。检查权限 provider 数量仍为 1、预设内容与卸载前不可变快照一致。调用 runtime.receive(null) 专门验证在解析/写入前拒绝，不作为有效业务输入；只接受明确的就绪/停止错误，不把任意 TypeError 当作通过。

新模式仍是未配置 profile（repositoryUnset），不提供账户或模型凭据，不创建业务 Worker。已配置 profile、真实模型 Session、持久任务跨进程恢复不由此验收。不能将它们记为通过。

CI 在 SuperAgent 原完整检查及原 profile 探针后执行新模式，并要求 superagent-dependency-profile 命令证据；完整 dependency-profile-details 随工件上传。缺失/失败不能授予 M0 准出。

## 验证与自动复审

- 冻结安装、原始完整 pnpm check 退出 0：62 文件/1233 测试、类型检查、构建 PASS；产品源和锁文件没有变化。
- 最终真实 profile 新模式两次进程均 PASS；每次原生权限服务实际卸载/恢复一次，Bridge installed/disposed 各 2，优雅退出 0、无强杀。retainedRefused/intakeRefused/staleRefused/staleRuntimeRefused/reloaded/presetsUnchanged 均 true，providerCount=1，Worker running/queued 均 0。
- 原有未配置 profile 模式重新完整跑两次，installed/disposed 各 1、退出 0，PASS；9 项 Node 预检回归 PASS。
- Python 22 项回归一次在取消夹具等待启动标记处超时失败，原记录保留，未运行到其取消语义断言。相同源码复跑 22 项 PASS；没有据此修改记录器或放宽断言。
- 增强版 probe 曾有一次聚合恢复检查 FAIL，旧诊断未记录具体布尔项，因此原因未证实。增加分项诊断、卸载前不可变预设快照和键序规范化比较，并要求明确拒绝错误；诊断版/重复版及最终版均通过。失败原件保留，不声称已定位产品缺陷或已完全消除间歇风险；新 CI 保留严格断言。
- final-audit.json：完整性 PASS，最终必需命令 PASS；历史 FAIL 均保持 FAIL。M0 阶段检查退出 2，未勾选整项完成。

本地 inputs.json 指明基线 HEAD、实际根脚本/helper/workflow 哈希和构建入口哈希；source_commit 为基线 HEAD，不冒称后续提交已测。summary.json 发布无环境配置的结果，完整本地原件（所有失败/通过日志、命令、退出码、profile 配置）保存在 local-evidence.zip，逐文件与外包摘要在 local-evidence-index.json。该本地包暂不写入本次 Git tree；CI 新步骤会以 artifact 保存此提交的完整原生 profile 轨迹，尚未运行前不得冒称已取得该 CI 工件。

## PR #7 全量闭环

run 43320117493 已完成，4 个 job 全部 success。补存此前尚未完成的基线 Harness 原 ZIP 13992801388 及 review 原 ZIP 13990600501；前批已存的 SuperAgent 13990351052、候选 Harness 13990729002 原包保持不变。四个最终原包的外部 digest、完整命令日志哈希及退出码均核对。

| 检查 | 实际全量结果 |
| --- | --- |
| Harness e8f7b93 | 2701 文件/56662 测试 PASS，20 文件/199 测试 skipped，1 expected fail；原始 pnpm test 退出 0 |
| Harness d743267 | 1975 文件/41652 测试 PASS，17 文件/185 测试 skipped，1 expected fail；原始 pnpm test 退出 0 |
| SuperAgent | 完整检查及真实 profile 两次启停 PASS，原包见前批 |

索引 docs/evidence/m0-ci/run-43320117493/completion-index.json，单独保留前批 PENDING_AT_CAPTURE 快照，避免篡改当时记录。该 CI 测的是 PR #7 的 8cc9ec0，不包含 PR #9 的派发修复或本次新 probe，不能冒称本批两版全量已通过。

## 文件分工与下一步

本批认领根 scripts/m0-profile-probe.mjs、新 scripts/fixtures/m0-profile-runtime/mesh-dependency-observer.mjs、共享 workflow 的新验证/归档接线和本次验收证据。其他成员改这些文件时协调本 PR；产品 Runtime/Effects/Session/Service、Harness gitlink/.gitmodules 和所有依赖锁不改。独立人工复审仍待安排。

继续核对新 CI、调查聚合检查的历史间歇失败，并补真实已配置 profile 的依赖切换/持久任务恢复实证；随后推进 M0-06/07 的受信身份和持久安全落点。本批不授予权限隔离、安全公式或 M1 运行集成准出。

## 新完成的两份原包公开状态

完整原件已下载核验，但本次自动审批拒绝把此前未列明的两份 ZIP 写入公开 GitHub 仓库，认为此前三份 ZIP 的明确授权不覆盖这两份新增日志。当前 Git tree 只提交完成索引和摘要，前文补存归档指本地原件；未通过其他渠道绕过发布。等待针对下面文件及公开仓库 github.com/tanxinz/dsh-superagent 受众的明确同意：

- docs/evidence/m0-ci/run-43320117493/13992801388.zip：基线 Harness 构建/安装/沙箱/定向/原始全量日志，SHA-256 de72a5bf0b339175e751af35f64427399861bc14b09066e45b54c81df703debd。
- docs/evidence/m0-ci/run-43320117493/13990600501.zip：review 原始完整命令日志，SHA-256 0ace40cd5b1b0dd12c9695aefbfb58d8189add67aa2d89a9233e823b811e5b59。

这不影响已核实的 CI success 状态，但完整公开归档仍未补齐；M0 不据此准出。
