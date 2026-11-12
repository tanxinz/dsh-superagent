# M0-05 依赖切换与派发边界复审

日期：2026-11-13（北京时间）。个人分支 fix/m0-service-dependency-boundaries-20261113，基于 PR #8 的 7e47fe11ae9ae689724b6fdb4bda53a429db235d；PR #7/#8 核对时仍 open/unmerged，未更新。M0-05 保持 IN_PROGRESS；M0-14 / M1 仍 BLOCKED。

## 发现、修复与原始反例

上一版 Effects 只在 dispatch 入口调用 dispatchAllowed。两个新增反例实际失败：首个 handler 同步撤销就绪状态，仍派发后续行和其他 kind；limit 回调撤销就绪状态后仍启动该行。原始定向命令退出 1，13 项 PASS、2 项 FAIL，完整日志保留，不冒充全量或覆盖失败。

本次仅在每个 kind 和每条待派发行启动前再次检查 stopped/dispatchAllowed。就绪状态失效即停止当前派发；已启动任务不撤销，尚未启动行仍留在原 SQLite 队列，恢复后仍按原生顺序及 handler 限额处理。没有新增队列、租约、Engine 或业务表。

新增两项 Runtime 回归覆盖异步边界：真实 Setup.run 完成后暂停，注销关键依赖再恢复，必须拒绝 ready 且不创建主 Session、不 resume、不启动 passes/effects；Session.ensure 返回后注销依赖，必须拒绝后台恢复及循环启动。原生产启动检查已能满足这两项测试，没有为测试修改 Runtime 源码。该宿主使用真实 Cordis/Runtime/SQLite 和模拟 Session/CLI，不能称真实已配置 DSH profile 或实际模型会话。

## 最终验证

- 冻结 pnpm 11.7.0 安装退出 0，产品 package.json/pnpm-lock 无漂移。
- 原始完整 pnpm check 退出 0：62 文件/1233 测试 PASS、类型检查和构建 PASS；包含新增 4 个回归。
- 真实临时未配置 profile 配置树和两次启动/优雅关闭 PASS；每次 installed/disposed 各 1、退出 0、无强杀及业务 Worker。
- 根目录 22 项 Python 回归 PASS；M0 整阶段检查退出 2，保持预期阻断。
- evidence_audit 完整性 PASS，最终所需命令全部 PASS；admission-negative 原始 FAIL 保留。完整日志/命令/退出码/profile 配置在 ../evidence/m0-service-boundaries-20261113/local-evidence.zip，逐文件和外包哈希见 index.json；先解包，再对 local/ 运行审核器。用户已明确批准公开完整 profile 工件，一次性 URL token 仍脱敏。
- inputs.json 列明基线及实际未提交工作树源码/测试哈希、构建入口哈希；本地 source_commit 字段为当时基线 HEAD，不能冒称后续提交已在 CI 测过。

## 前批 CI 收取

PR #7 run 43320117493 的 SuperAgent 完整 pnpm check、冻结 profile runtime 安装和真实 profile 两次启停均 PASS；原始 artifact 13990351052 已下载、ZIP digest 和内部完整命令日志哈希均核对，原包和索引在 ../evidence/m0-ci/run-43320117493/。

该运行的候选 Harness d743267 原始 pnpm test 已 PASS / 0：1975 文件/41652 测试通过、17 文件/185 测试跳过、1 expected fail，原始 artifact 13990729002 已完整核验归档。基线 Harness 尚在运行；不将候选或定向结果记作两版全量通过。以上是 PR #7 的 8cc9ec0 结果，不包括本批派发补丁。PR #8 是证据更新，其 review/SuperAgent job 已通过，Harness 仍按运行快照记录，未提前宣称整轮通过。

## 文件分工和剩余条件

本批认领 src/app/effects.ts 的三行运行检查，以及已有 effects.spec.ts/runtime.spec.ts 的反例和异步启动回归，新增本次证据和验收记录。Runtime/Service/index 本次源码不变；其他成员改 Effects 或这两份测试时先协调本任务分支。Harness gitlink/.gitmodules/源码、依赖锁和 workflow 不变。独立成员人工复审仍待安排。

M0-05 仍缺真实已配置 profile 的动态依赖切换实证及前置整项闭合；本次不据单元测试关闭这些条件。后续继续收取前批和本批 CI，随后推进 M0-06/07 的受信身份与持久安全落点。依赖可用性不是身份授权、最终权限公式或 OS 隔离；M0-14 未准出前不运行 M1 集成。

## 当前公开归档限制

完整原件已下载/生成并逐份核验，保留在本工作区。自动审批在将本批新 ZIP 写入 GitHub tree 时拒绝，理由为“同意上传”缺少具体文件/公开受众上下文；虽然此前用户已批准同类完整工件，自动审批仍要求本批具体确认。源码、测试和哈希索引正常提交，本次公开提交暂不包含下列三个 ZIP，前文“归档”指本地已保存，不表示 Git tree 已有原包：

- docs/evidence/m0-service-boundaries-20261113/local-evidence.zip：本批失败/通过日志及新临时 profile，完整性 PASS。
- docs/evidence/m0-ci/run-43320117493/13990351052.zip：PR #7 SuperAgent 完整工件，SHA-256 13109c44264cd2a568f2c890a39824b2252247868a08caa6770447e4408be024。
- docs/evidence/m0-ci/run-43320117493/13990729002.zip：PR #7 候选 Harness 完整工件，SHA-256 ea72f8299522268fb6a50744c9cf20d4d262e847713eab36bfdc64d5031e0edf。

目标受众为公开仓库 github.com/tanxinz/dsh-superagent 的访问者。未将被拒绝原包通过其他方式发布；完整公开归档待确认，M0 不据此完成。
