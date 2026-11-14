# 开发交接状态

> 最终授权接续（2026-11-13）：同一PR #13个人分支在e1bd28a后推进，贯穿管理请求的模型/账户检查、Source命令与落库、文件发布和延迟重启的原上下文复查；撤权后的配置恢复仅允许新的管理授权，工具/后台不能代为恢复。完整68文件/1278测试、类型检查/构建和三个真实无模型profile通过，四轮复审的问题已修复，最终复审无可操作回归；新提交CI另核验。M0仍0/14整项，M0-14/M1 BLOCKED，实际Worker隔离/子会话/全部Gateway仍待完成。详见[本批验收](acceptance/M0-final-authorization-20261113.md)。

> Mac 接续（2026-11-13）：从PR #12实际head1475ffa创建个人分支；归档其全部成功CI。新增受信根Session绑定投放/撤权/恢复及原请求上下文撤权复核；完整67文件/1263测试、类型检查/构建通过，真实无模型profile绑定重载/持久撤权通过。实际Worker隔离、子会话投放及全部Gateway仍未完成；M0-01—13 IN_PROGRESS、M0-14 BLOCKED、0/14整项，M1未准出。详见[本批验收](acceptance/M0-local-bindings-20261113.md)。

PR #12 已建立，20c576d的首轮CI43361201100中review、SuperAgent完整检查及三个真实profile全PASS；OS夹具命令PASS但证据目录归root导致审计FAIL。已读完整日志并修复记录器权限边界，待新CI；旧失败原件保留。两版Harness当时仍运行，不算本批全量已通过；M0仍0/14整项，M0-14 BLOCKED。

最新接续（2026-11-13，北京时间）：个人分支 `feat/m0-trust-and-permission-baseline-20261113` 从 PR #11 的130a766建立。实际产品补丁完成管理认证、持久安全最小表、只读 Session、权限最终拒绝及自动执行安全门禁；最新完整 pnpm check 65文件1252测试/类型检查/构建 PASS，三个真实临时 profile 模式各两次启停 PASS。配置账户是明确的 CLI Fixture；无模型/业务 Worker 运行。PR #11 CI 最终 failure（两版 Harness 完整通过、依赖探针误判失败）；本批新CI待取。M0-01—13 均 IN_PROGRESS、M0-14 BLOCKED，0/14整项完成。详细证据、历史失败、代码分工及仍待实现部分见 [验收接续](acceptance/M0-trust-permissions-20261113.md)。以下为历史批次，不能据旧表判断当前能力。

更新日期：2026-11-12（北京时间）。本批继续执行 M0；阶段状态 BLOCKED，M0-14 未通过。

> **2026-11-14 V1.2 设计补丁交接（独立文档分支，不计入 M0 实施）**：针对 DeepSeek 2026-11-13 应用 API 与 Harness `dsh-v0.2.2-rc.3` 的复用能力，仅修订 Markdown 设计、开发清单与上游/兼容矩阵；固定当前 SuperAgent/Harness 源码、依赖锁和历史 CI 日志，未运行新版或业务 Worker。新增 V12-01—V12-10 全部 `NOT_RUN`。截至本分支从 PR #13 `bc99a8d` 创建的快照，**M0-01—13 IN_PROGRESS、M0-14 BLOCKED、0/14 整项完成、M1 未准出**。相关版本可用性仅属官方公开资料静态核对，详见 [V1.2 设计](SuperAgent_Harness_Design_Final.md)、[新增开发清单 §14](SuperAgent_Harness_Development_Checklist_V1.0_20261112.md)、[上游能力核验](upstream-capabilities.md)、[兼容矩阵](compatibility-matrix.md)。**本条为从 PR #13 分叉时的状态快照，不代替其后任何新 PR/CI 状态**。

## 当前接手：原生 profile 依赖卸载/恢复（2026-11-13）

分支 feat/m0-profile-dependency-lifecycle-20261113，基于 PR #10 的 15364bd。新增真实 DSH 未配置 profile 的依赖切换模式：卸载并恢复原生 PermissionPresetService，验证旧 Mesh/Runtime 拒绝、重新加载后新服务就绪、权限预设保持一致且 provider 唯一。最终两次进程 PASS，Bridge 安装/清理每次各 2、优雅退出 0；原有两次启停模式也通过。SuperAgent 完整检查 62 文件/1233 测试、类型检查和构建 PASS；22 Python /9 Node 回归最终通过，原失败记录保留。新 CI 已接入强制命令证据和完整轨迹工件上传。没有修改产品源码或权限策略。

PR #7 run 43320117493 现已四个 job 全部 success，两版 Harness 原始全量均通过；基线/review 最终原包已收取核验，四份原件本地齐全；新两份原包公开上传被自动审批拦截，仅完成索引先提交，详见本批验收记录。该结果属于 8cc9ec0，不包括后续派发修复或本次新 probe。

M0-05 仍 IN_PROGRESS；真实已配置 profile、持久任务恢复及一次历史聚合检查间歇失败的原因仍未闭合。M0-14 / M1 仍 BLOCKED。详见 acceptance/M0-profile-dependency-20261113.md。

## 前批：M0-05 依赖边界复审（2026-11-13）

分支 fix/m0-service-dependency-boundaries-20261113，基于 PR #8 的 7e47fe1。实际复现并修复上一版单轮派发中首个 handler/limit 回调撤销依赖后仍启动后续工作的缺口：每个 kind 和工作项启动前复查。新增异步 Setup 后/Session 准备后的启动拒绝回归。完整 pnpm check 62 文件/1233 测试、类型检查、构建 PASS；真实临时未配置 profile 两次优雅启停 PASS；22 项根回归 PASS，原失败保持 FAIL。详情见 acceptance/M0-service-boundaries-20261113.md。

PR #7 的 SuperAgent/真实 profile 和候选 Harness 原始全量通过（41652 测试、185 跳过、1 expected fail），完整原包已下载核验；本批三份 ZIP 再获用户逐项明确批准后已补齐到后继证据分支（见验收记录）；基线 Harness 仍在运行，未提前声称两版通过。PR #8 原 profile 上传已获用户批准并完成，不再作为当前公开归档阻断。M0-05 保持 IN_PROGRESS，真实已配置 profile 动态切换及前置整项仍待闭合；M0-14 / M1 仍 BLOCKED。

## 前批：M0-05 CognitiveMeshService（2026-11-13）

个人分支 `feat/m0-cognitive-mesh-service-20261113` 从 PR #6 的 e8fb99f 建立。核对 PR #1—#6 均 open/unmerged，依赖链 main → #1 → #2 → #3 → #4 → #5 → #6；没有更新他人分支。

PR #6 run 43249058103 已完成，四个 job success；两版原始全量 pnpm test 均退出 0。基线 2701 文件/56662 测试通过，20 文件/199 测试跳过；候选 1975 文件/41652 测试通过，17 文件/185 测试跳过，各有 1 expected fail。四份最终原 ZIP、原始退出码和日志哈希已校验归档到 docs/evidence/m0-ci/run-43249058103/，实际 CI 合并快照 3eefe007 与分支 e8fb99f 分开记录。

新增原生 CognitiveMeshService：只提供 health/assertReady，Runtime 构造、主 Session 前、后台循环前实际消费；所有原生 Bundle 注入项共用同一依赖清单。依赖缺失拒绝 Intake 并暂停原生 Effects 派发，恢复后由原生 pump 处理原 SQLite 队列。保留服务句柄在卸载或 Runtime 停止后拒绝调用。不新增队列/Engine，不修改 Harness gitlink。

M0-05 IN_PROGRESS，前置 M0-04 未整项闭合；M0-14 / M1 仍 BLOCKED。此检查不是身份授权/权限隔离，也不撤回已经运行的副作用。详情见 acceptance/M0-service-20261113.md。

## 前序接手：自动检查与 CI 复验

### 本次接续：原生 Bundle Bridge 与真实未配置 profile

- 负责人：当前获授权 Codex 开发会话；分支 `feat/m0-bundle-profile-verification-20261112`，基于 PR #5 的 `5f8aba71847651926b1432c7bd15c4294c5bb05f`。未改 #5，其 run 43241222611 现已完成：自动审查、SuperAgent 完整检查、两版 Harness 原始全量及证据审核均通过；完整原包存于 docs/evidence/m0-ci/run-43241222611/。
- 已实现 M0-04 最小 Bridge：在原生 Runtime ready 后安装，按 owning fiber 去重并随重启/卸载清理。完整 `pnpm check` PASS：61 文件 / 1213 项测试、类型检查、构建；新增 4 项真实 Cordis 生命周期用例。
- 新建隔离 profile 验证器及独立 npm fixture lock：发现仅固定 CLI 仍会把宽范围解析到不匹配的稳定版 Cordis/Schemastery；fixture 锁定原型精确版本，全部 23 个 peer 与锁版参考值一致。从新目录 npm ci 后，真实 `dsh --dump-config`、共享临时状态的两次未配置 profile 启动/优雅关闭均 PASS，每次 Bridge 安装与清理各一次，运行及排队 Worker 为 0。
- 这不包含配置完毕的组合、真实模型 Session、CognitiveMeshService、身份/安全迁移和隔离拒绝。M0-04 改为 IN_PROGRESS，其他原任务状态不提前勾选；M0-14 / M1 仍 BLOCKED。详情见 [Bridge 验收记录](acceptance/M0-bundle-profile-20261112.md)。

### 前一批个人任务分支（PR #5）

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

M0-01、M0-02、M0-03、M0-04、M0-08、M0-09、M0-13 为 IN_PROGRESS，已经产生实现或核验记录。其余任务保留原状态。探针通过不等于整项依赖已经闭合，不勾选完成。

没有实现业务 ActionPlan、受限 Session、M2 启动预算闸或 17 个模块。没有运行真实 Agent 或外部副作用。

## 当前阻断与下一步

1. 本地曾受 Unix IPC EPERM 和开发头文件限制；后续 GitHub CI 已完成两版 Harness 原始构建并通过，本地失败仅保留为历史证据。当前阻断是全量测试结果和真实组合/profile 验收，不再把本地环境错误列为 CI 构建失败。
2. 当前 Harness 为 DSH 0.2.2-rc.2 / Cordis 4.1.0；原型锁文件为 DSH 0.2.1-alpha.2 / Cordis 4.0.5-alpha.1。两份最新源码不能直接视为兼容组合。下一步优先选定并验证与原型相符的发布版或适配组合。
3. M0-04 Bridge 已实现并经真实未配置 profile 核验，前置任务仍未闭合；下一步为 M0-05 CognitiveMeshService 的真实注册、消费、卸载拒绝及依赖缺失行为，不能用 Bridge 日志替代 Service。
4. 接着完成 M0-06/07 的受信身份与持久迁移，以及 M0-10/11/12 的受限 Session、OS 隔离和最终拒绝。当前 Sessions.ensure 仍含上游 danger-full-access，不能启用业务 Worker。
5. 原生 Effects 在途认领只在内存，崩溃可重复执行；M2 必须按设计增加业务效果键、一次性许可、结果对账与受控入队，不能把原生重新入队误当为一次性副作用。
6. M0-13 的 CI 与在线用例分类仍待完成；M0-14 未通过前不进入 M1 运行集成。
