# M0 Mac 接续：受信 Session 绑定与请求撤权

阶段仍为 **BLOCKED**：M0-01—13 IN_PROGRESS，M0-14 BLOCKED，0/14 整项完成；M1 未准出。负责人为本次获授权的本地开发会话，独立成员人工复审仍待安排。

## 起点与分工

个人分支 `feat/m0-local-20261113-mac` 从 PR #12 分支的实际 head `1475ffa241f89ff806c9d5e01684ffa50bd0e246` 建立，没有从 main 开发或更新他人分支。PR #1—#12 均 open/unmerged，head/base 和各提交最新 CI 已重新读取，见 `../evidence/m0-local-20261113-mac/pr-snapshot.json`、`pr-ci-snapshot.json`。

本批认领 mesh 下 safety/security-store/service 与新 session-bindings、Runtime/Sessions/HTTP 接线、对应测试和架构登记、原 profile probe 与 observer、本批文档/证据。没有改其他成员分支、Harness gitlink、.gitmodules、产品依赖或锁文件，没有包外深层 import，没有第二 Engine、队列或主库。未使用 AgentDock117，未接生产凭据或运行业务 Worker。

## PR #12 完整 CI 归档

[run 43361818104](https://github.com/tanxinz/dsh-superagent/actions/runs/43361818104) 已 completed/success，5 个 job 均 success：review、SuperAgent、独立 isolation-fixture、两版 Harness。head 为1475ffa，实际合并快照为 `40e0ba719cb25ad44689c6e9c021794f91a30159`。两版完整原始构建与 pnpm test 均退出0；基线56662通过/199跳过/1 expected fail，候选41652通过/185跳过/1 expected fail。不是本批未提交源码的新 CI，也不授予 M0 准出。

七份原 ZIP 逐一与 GitHub digest 核对，并复算所有 result.json 指向的完整 command.log 摘要。原件位于 `../evidence/m0-local-20261113-mac/ci12/<artifact-id>/artifact.zip`，完整命令/退出码/哈希索引为 `ci12-archive-index.json`，job/artifact 原始元数据同目录。两份最终 Harness 原包14010291985=`e110b31dc8c8a05bfaf87ffbcfc050433948b68e4a23b975fc3eaf72ddfae06f`、14010101788=`ce6ae29c9a6493f9983d99e0f07a9943ff323053aa477e8735792af70068eea7`。

本批没有取得或公开上传待逐文件批准的 **13992801388.zip / 13990600501.zip**。不覆盖旧失败和 UNKNOWN 记录。

## 实际行为

- 管理 HTTP 增加 `POST /orchestrator/api/mesh/sessions/:id/issue|restore|revoke`，请求体必须是 `{}`。先认证再解析目标；tenant/actor/角色/有效期和权限不来自请求 JSON。仅已装饰且有效只读的受管根 Session 可投放，未知/其他/子 Session 拒绝。
- 绑定从受信管理身份、当前 grant/version 和 safetyPolicy/epoch 投放，在原 SQLite 同步事务中写入。有效期最多15分钟且不超过身份及父绑定期限。重复投放只接受原绑定，不默默续期、提权、换父或替换身份。
- 恢复重新核验目标、权限、身份版本、有效期、安全版本/撤权 epoch 和完整父链。普通业务 Policy 与 safetyPolicy 分离，未加入“业务 Policy 改版即撤销”逻辑。撤权保存不可复用的 Session tombstone；重开库和父绑定撤权均保持拒绝，不能通过同 ID 的 issue 复活。换身份/安全版本后需要新受信授权流程，当前不自动续发。
- 持久 JSON 入口验证非空标识、安全整数 expiry/version/epoch 和逐维字符串集合。损坏/缺失过期时间不再可能被比较表达式当作无限期授权。
- 管理请求在启动等待和读请求体后复用并复核**原始上下文**。撤权后旧请求失败；新的独立认证请求仍可按当前事实获准。此前每次重验凭据都会新签上下文，丢失旧请求看到的撤权版本。
- Sessions 在解析目标、读取历史后的实际消息递送前重查执行就绪及有效只读 preset。Runtime 工具最终守卫同时要求安全绑定和 OS 就绪；固定关闭的 OS 闸不能因投放了有效绑定而被绕过，拒绝仍同步持久审计。

## 验证与复审

本机 Node24.21.0/Python3.12.13；pnpm11.7.0。最初 npm exec 因受限执行环境 DNS ENOTFOUND 失败，日志保留；下载相同版本包后按原 frozen-lockfile 安装成功，锁文件无漂移。初次 pnpm check 的 PATH/可执行位错误也保留，未归因于产品。

完整原始 `pnpm check` 在允许拥有的 loopback 测试的既有执行环境通过，**67 文件 / 1263 测试、类型检查、构建 PASS/0**（`reviewed-full-check`）。没有筛选或跳过服务脚本测试。受限执行环境中的原完整命令因 loopback listen EPERM 出现八个服务脚本超时，原始日志和退出1保留；不是通过修改断言修复的产品故障。早一轮还有一处拒绝文案冲突，已恢复统一拒绝响应。

根 Python22项、Node9项通过。定向18项绑定/原生ToolRuntime及113项HTTP/Runtime回归通过，只代表各自当时源码。恢复时初次完整检查曾只有 raw 日志，暂记 **UNKNOWN**；最终补核发现记录器已保存退出1及完整日志（同样是八项loopback EPERM），现明确记为FAIL，不算通过。早期全检查期间有后续编辑，不能把其父提交字段或快照当成整项可复现通过证据；最终完整检查与 profile 对应 `source-after-review-fix/` 的补丁、新文件副本和 SHA-256 清单。

用户要求的 `codex review --uncommitted` 首次被 in-process app-server 的 EPERM 阻断。`codex --no-daemon review --uncommitted` 实际完成并指出一项P2：隔离拒绝捷径漏写持久审计。已把 OS 拒绝纳入 LocalSafetyGate 同步审计，新增有效绑定+隔离未就绪及审计故障负例，并重跑完整检查。第一次复审仅保留最终意见，工具中间输出曾截断，不冒称完整原日志；修复后的再次复审通过记录器保存完整输出，以实际结果为准。

修复后的 `reviewed-codex-review` 退出0，最终结论为未发现可操作回归；该复审只独立运行了类型检查，没有把读到的运行结果冒称它自己重新执行了测试。`checklist-final` 结构PASS、阶段出口退出2，M0仍0/14。最终命令/完整日志审核见 `final-evidence-audit.json`；完整性通过不等于全部历史命令成功或阶段准出。

真实临时配置 profile 使用明确的 `FIXTURE_CLI_NOT_REAL_GITHUB`，不是在线账户/模型证据。首次实际原生主 Session 投放绑定→同 ID 恢复→卸载原生依赖→重装Runtime/服务→原样恢复绑定→撤权拒绝；第二次进程读取持久 tombstone，issue/restore 均拒绝。真实 ToolRuntime 工具体0次，两个进程均退出0；持久Effect行保留，自动处理 `BLOCKED_ISOLATION`。审计修复后原普通/依赖切换/配置模式均另目录复跑；准确退出码和报告见各 result.json / profile-probe.json。record_command 的通用 `real_session: NOT_RUN` 字段不认证此分类，以真实 profile 细分报告为准。

## 仍未完成的清单条件

| 任务 | 状态 | 当前缺口 |
| --- | --- | --- |
| M0-01 | IN_PROGRESS | 干净组合整体认定、Jev精确候选，不能由旧CI替代新提交验证 |
| M0-02 | IN_PROGRESS | 全部恢复/启动入口、真实模型关联证据 |
| M0-03 | IN_PROGRESS | 随前置整项闭合后冻结最终白名单 |
| M0-04 | IN_PROGRESS | 生命周期已有实证，前置整项未闭合 |
| M0-05 | IN_PROGRESS | 真实账户/模型/持久工作的实际恢复执行 |
| M0-06 | IN_PROGRESS | 来源认证、长异步命令在最终副作用处的授权全覆盖 |
| M0-07 | IN_PROGRESS | 全套TS/DDL映射、升级矩阵；本批复用schema2，不新增业务表 |
| M0-08 | IN_PROGRESS | 前置整项闭合，保留原生无持久在途lease及重复副作用边界 |
| M0-09 | IN_PROGRESS | 实际服务命令全接线及前置整项 |
| M0-10 | IN_PROGRESS | 真实Worker/子会话生命周期；当前Runtime拒绝对子会话投放 |
| M0-11 | IN_PROGRESS | 真正业务Worker的OS/网络/密钥隔离与健康失效停止分配 |
| M0-12 | IN_PROGRESS | 根Session绑定已投放/撤权/恢复；全部Gateway、规范化资源目标和实际隔离仍缺 |
| M0-13 | IN_PROGRESS | 本批新CI及在线/真实Worker恢复矩阵 |
| M0-14 | BLOCKED | 上述整项依赖未满足；不宣称M1可运行 |

底层子绑定的权限/期限收窄与父撤权有原单库测试，但 Runtime 尚未投放子会话，不计真实子会话能力。`session:<id>` 是当前绑定资源标识，不是文件路径/网络地址规范化授权的完成证据。Settings 等长异步命令在外部校验后的最终提交、全部非Tool Gateway及原生请求事件的末端拦截仍需继续。独立Linux隔离夹具已通过，实际Worker路径尚未接通；不通过环境开关或Mock解除固定关闭闸。

外部联调仍需专用非生产测试账户/模型及允许所选隔离后端的runner；不在聊天或公开仓库写凭据。上述条件不掩盖仍待实现的代码。下一批顺序：长异步命令最终授权/规范化资源→真实隔离执行适配及失效停止分配→受限Worker/子会话与持久工作恢复。新草稿PR保留文件分工，不自动合并。
