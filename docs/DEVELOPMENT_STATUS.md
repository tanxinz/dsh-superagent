# 开发交接状态

更新日期：2026-11-12（北京时间）。本批继续执行 M0；阶段状态 BLOCKED，M0-14 未通过。

## 当前接手：自动检查与 CI 复验

### 本次个人任务分支

- 负责人：当前获授权的 Codex 开发会话；任务 M0-01 / M0-13；分支 `fix/m0-ci-process-evidence-20261112`，基于 PR #4 的 `7d9f51d0d1f63c5cd2fd189b1b81bca64c437779`。PR #1—#4 核对时均未合并，head 与交接一致；本分支不修改其他成员的分支。
- 第三轮 `43232199162` 匹配候选 d743267 的原始全量 `pnpm test` 已 PASS：1975 文件通过、17 跳过；41652 测试通过、1 预期失败、185 跳过；退出 0，完整日志和归档摘要已校验。基线 e8f7b93 的原始全量也已 PASS / 0：2701 文件通过、20 跳过；56662 测试通过、1 预期失败、199 跳过。两版结果分别存证，不将跳过项计为通过。
- 修复 CI 记录器 SIGINT/SIGTERM 导致证据丢失、原始临时日志残留和同进程组子进程未清理的缺口；在旧版本复现两个信号失败，修复后最终 22 项 Python 回归、9 项 Node 回归通过。新增全日志完整性自动复审，不把定向命令放入全量证据 ID。
- 文件分工及验收条件见 [本次接手记录](acceptance/M0-ci-process-review-20261112.md)。Harness gitlink、.gitmodules、两版源码和锁文件均保持原样；M0-14 / M1 仍 BLOCKED。

### 前序分支交接记录（以下运行中描述为当时快照）

- 工作分支 `feat/m0-ci-review-20261112`，PR #3，基于 PR #2；按原清单 100 项任务的依赖顺序推进，未完成项不勾选。
- 已运行 GitHub Actions 43177871800：SuperAgent 冻结安装、60 文件/1209 测试、类型检查和构建 PASS，依赖文件无漂移。Harness 原基线 e8f7b93 与匹配候选 d743267 的冻结安装及完整原始构建均 PASS。
- 两套 Harness 原始全量测试均在 900 秒处超时，且已出现真实失败用例。共同失败为 workflow-ptc 的取消后延迟发布清理；基线另有 worktree/forge 超时失败。全量测试保持 FAIL，不能把已通过构建当作组合通过。
- 找到发布候选 dsh-v0.2.1-alpha.2（d743267388641bc76f17c45ce8b4c231aed1d32c），Cordis 4.0.5-alpha.1、Schemastery 3.18.5-alpha.1 声明匹配。尚不切换 Harness gitlink，真实 profile/Session 未验收。
- 自动审查修复：上一版预检未检查 Node engines，现增加已核对表达式的判定，未知表达式保留 UNTESTED，9 项回归通过。新增清单结构/前置依赖/DONE 证据声明检查，防止缺项或提前勾选；它不是实际能力认证。
- 新增 CI 证据记录器，记录失败/信号/超时和文件哈希，在线 SDK/真实 Session 显式 NOT_RUN。14 项 Python 回归通过（记录器 8、清单审查 6），第二、三轮 CI 自动审查均通过。
- 第二轮 43231192738 独立复现两版 workflow-ptc，均在子代理启动前报 sandbox-unavailable：CI 漏配沙箱前提，并非已经证实取消清理缺陷。已提交 7ca9fcb，执行锁版上游 bubblewrap 准备及探针，关闭遥测并对齐上游用例超时设置。第三轮 43232199162 中两版真实沙箱探针、SuperAgent 和自动审查已通过，Harness 后续测试仍在运行；全量结论待结果。
- 完整清单尚未完成；M0-01/02/03/08/09/13 仍 IN_PROGRESS，M0-14/M1 仍 BLOCKED。详细记录见 acceptance/M0-ci-review-20261112.md。

## 历史批次：M0-01 本地预检

- 执行负责人：当前获授权开发会话；分支 `fix/m0-baseline-verification-20261112`，基于 `bc841de6c78d6ebcb8e0d812eb13473e09d80a68`。人工合并审核人尚未指定。
- 范围：依赖声明及本地构建前置诊断、6 项预检回归、独立证据目录；未改 SuperAgent 产品源码或 Harness gitlink。
- 新确认：Cordis 和 Schemastery 均不满足 SuperAgent 精确 peer；当前环境最小 Unix socket 报 EPERM；直接执行锁版 native 构建脚本又在 Node-API 头文件检查处失败。
- 已实现：`scripts/m0-preflight.mjs`，不依赖 npm 安装，输出输入文件哈希及受限结论。6 项测试 PASS；真实预检 BLOCKED（退出 2），不是验收失败被隐藏。
- 限制：仅经连接器取得所需源码快照并逐文件核对 Git blob；本地 GitHub/npm 直连超时，未完成 clone/冻结安装/完整构建或原有 1209 项测试复跑。未使用远端设备。
- 下一步：具备网络、Unix socket、对应 Node 开发头文件的环境中，选择匹配发布组合或适配组合，再按原始完整命令安装/构建/测试；之后继续 M0-02。M0-01 仍 IN_PROGRESS，M0-14/M1 仍 BLOCKED。
- 本批详细验收和可重复命令见 [M0 follow-up](acceptance/M0-followup-20261112.md)；原始验收与日志保持原样。

## 已提交的代码与证据

1. SuperAgent 由上游基线引用转为仓库内可编辑目录 upstream/superagent，保留许可证。
2. 修复飞书消费进程健康状态的跨 stdout/stderr 时序问题：同次连接内的解析错误或警告不再被迟到的 ready 覆盖；新连接重新计算健康状态。
3. Store.atomic 拒绝原生 async 回调，在执行前抛错；普通同步回调返回 Promise/thenable 时在提交前拒绝并回滚，afterCommit 不执行。
4. 新增 11 项 M0 探针，覆盖同步故障、原生入队失败、嵌套回滚、重开数据库重放、同键载荷覆盖、失败/完成项重新入队、真实 SIGKILL 和在途重复执行。
5. 上游已有的飞书失败已复现并修复。最终 pnpm check：类型检查通过、60 个测试文件 / 1209 项测试通过、构建通过。

完整日志及元数据见 [M0 验收记录](acceptance/M0.md)、evidence/m0/ 和 runtime-baseline.json。

## 清单状态

M0-01、M0-02、M0-03、M0-08、M0-09、M0-13 为 IN_PROGRESS，已经产生实现或核验记录。其余任务保留原状态。探针通过不等于整项依赖已经闭合，不勾选完成。

没有实现业务 ActionPlan、受限 Session、M2 启动预算闸或 17 个模块。没有运行真实 Agent 或外部副作用。

## 当前阻断与下一步

1. 本地曾受 Unix IPC EPERM 和开发头文件限制；后续 GitHub CI 已完成两版 Harness 原始构建并通过，本地失败仅保留为历史证据。当前阻断是全量测试结果和真实组合/profile 验收，不再把本地环境错误列为 CI 构建失败。
2. 当前 Harness 为 DSH 0.2.2-rc.2 / Cordis 4.1.0；原型锁文件为 DSH 0.2.1-alpha.2 / Cordis 4.0.5-alpha.1。两份最新源码不能直接视为兼容组合。下一步优先选定并验证与原型相符的发布版或适配组合。
3. M0-04/05 尚未新增并经真实 profile 验证 Bridge/CognitiveMeshService。
4. 接着完成 M0-06/07 的受信身份与持久迁移，以及 M0-10/11/12 的受限 Session、OS 隔离和最终拒绝。当前 Sessions.ensure 仍含上游 danger-full-access，不能启用业务 Worker。
5. 原生 Effects 在途认领只在内存，崩溃可重复执行；M2 必须按设计增加业务效果键、一次性许可、结果对账与受控入队，不能把原生重新入队误当为一次性副作用。
6. M0-13 的 CI 与在线用例分类仍待完成；M0-14 未通过前不进入 M1 运行集成。
