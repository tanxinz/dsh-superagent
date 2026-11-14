# M0 上游能力核验

> 最终授权接续（2026-11-13）：同一PR #13个人分支在e1bd28a后推进，贯穿管理请求的模型/账户检查、Source命令与落库、文件发布和延迟重启的原上下文复查；撤权后的配置恢复仅允许新的管理授权，工具/后台不能代为恢复。完整68文件/1278测试、类型检查/构建和三个真实无模型profile通过，四轮复审的问题已修复，最终复审无可操作回归；新提交CI另核验。M0仍0/14整项，M0-14/M1 BLOCKED，实际Worker隔离/子会话/全部Gateway仍待完成。详见[本批验收](acceptance/M0-final-authorization-20261113.md)。

> Mac 接续（2026-11-13）：从PR #12实际head1475ffa创建个人分支；归档其全部成功CI。新增受信根Session绑定投放/撤权/恢复及原请求上下文撤权复核；完整67文件/1263测试、类型检查/构建通过，真实无模型profile绑定重载/持久撤权通过。实际Worker隔离、子会话投放及全部Gateway仍未完成；M0-01—13 IN_PROGRESS、M0-14 BLOCKED、0/14整项，M1未准出。详见[本批验收](acceptance/M0-local-bindings-20261113.md)。

基线与版本见 UPSTREAM_BASELINE.md。源码路径相对 upstream/superagent。公共 DSH 类型来自原型 lockfile 安装的 0.2.1-alpha.2 包，尚未将它们与 Harness 0.2.2-rc.2 源码混用。

| 符号 / 扩展点 | 真实落点 | 核验结果 | 尚待验证 |
| --- | --- | --- | --- |
| Bundle name/inject/apply | src/index.ts；package.json 的 dsh.bundle；cordis.patch.yml；src/extensions/mesh/index.ts | 原生 apply 创建 Runtime 并登记 stop，ready 后接入 M0 Bridge；真实 dsh 配置树仅一个原生条目，未配置 profile 两次启停通过；Cordis 同进程重启/注销回归通过 | 配置完毕的 profile、CognitiveMeshService；尚不授予 M0 准出 |
| SourceKind / 注册 | src/sources/kind.ts；src/sources/registry.ts 的 register | 存在；返回注销函数；原生来源测试通过 | 新企业 Source 的真实认证和接线 |
| Assessor | src/app/assessment.ts；src/core/ports.ts | MasterAssessor 使用持久 assessment Effect；Engine 决策在事务内 | Jev SDK、输出映射与异常回退 |
| Engine | src/core/engine.ts | receive/decide/reply 等使用原生 repo.atomic | 受信扩展命令与 ActionPlan |
| Store.atomic | src/app/store.ts | 原生 SAVEPOINT 同连接；本次增加 async/Promise/thenable 拒绝；嵌套与故障测试通过 | 扩展迁移与持久身份；禁止事务内网络调用的静态门禁 |
| Effects | src/app/effects.ts | 同 SQLite；kind/key 唯一；等待载荷覆盖并增加 generation；失败重置/完成项重新入队可行 | 业务执行恢复协议；没有持久在途 lease 或单独 reactivation API |
| Session 生命周期 | src/app/sessions.ts 的 ensure/install/decorate/limitSubagent | ensure 无条件设置 danger-full-access；子会话仅继承工具约束。此问题未在本批声称修复 | M0-10/11 的真实受限 preset、恢复与隔离 |
| Worker 启动与恢复 | src/executor/dsh.ts 的 start/launchQueued/launch/resume | start 入队 launch；launch 在 prepare、ensure 之后递送输入；resume 重排队或标中断 | M2 启动预算闸必须早于工作目录准备、prepare 命令、Session 与输入递送；不能只在最后工具调用处拦截 |
| ToolGuard | @deepseek-ai/dsh-tools 公共导出 ToolGuard / ToolRuntime.guard | 发布类型声明 guard 在 pre-execute 后、工具体前单调拒绝；返回 undefined 不能恢复别的 guard 的拒绝 | 真实调用负例、权限公式和本地快照未完成 |
| PermissionPresetService | @deepseek-ai/dsh-permission-presets 公共导出的 resolve/current/set | 可以核验预设配置和当前值，不能仅凭预设名称断言隔离 | 主/Worker/子 Session 的实际执行与重放 |
| Outbox | src/app/outbox.ts 的 send/deliver | receipt 与 reply Effect 原子持久化；发送在事务外；原生测试通过 | SANDBOX 发送前最终安全校验 |
| 模型请求消费证据 | Sessions 的 systemPrompt section、promptFor；公共 Session 事件类型 | 有提示词版本绑定线索 | Patch→具体模型请求的消费证明 UNTESTED；不补造 requestId API |
| Cordis Service 生命周期 | @deepseek-ai/cordis 公共 Service / Context | 发布类型明确 super(ctx,name) 注册且随 owning fiber 卸载 | CognitiveMeshService 尚未实现，也未据类型声明标接线成功 |

## 原生 Effects 的实测限制

同 kind/key 相同载荷仍会更新 generation；不同载荷会覆盖等待项。原生完成行会删除，无永久终结墓碑；原生 enqueue 可再次创建同 key 的工作。失败项 enqueue 会清除失败计数并使其到期。在途排他来自 Effects 实例内的 tasks Set，进程死亡不会留下可查询的持久认领。

11 项 M0 探针证实：事务提交前被 SIGKILL，probe 与 Effect 均不可见；提交后未执行被杀，重启可重放；执行后尚未删除 Effect 被杀，则副作用见证文件出现两次执行。这个队列可支撑持久重试，不能独自提供业务副作用恰好一次。

本次只利用原生队列和 probe 表，不新增第二个调度器、ActionRun 租约或业务主库。

## 原生 profile 接续实证

详见 acceptance/M0-bundle-profile-20261112.md。独立 npm fixture 锁定发布 CLI 0.2.1-alpha.2 及原型要求的 Cordis/Schemastery；仅固定 CLI 的宽范围安装会发生 vendor 版本漂移，不能凭 CLI 版本号断言组合兼容。fixture 解析出的全部 23 个 peer 与原型 devDependencies 锁版参考值一致，真实 profile 启动时停在 repositoryUnset / setupPending，不创建业务 Worker。此实证验证配置树和最小生命周期，没有证明 npm 发布产物与候选源码逐字节对应，也不替代权限或模型请求核验。

## 后续服务与 Session 改造的实际入口

以下是本分支锁版源码的静态调用核对，不是对应路径的执行验收。位置按符号引用，避免后续插行使行号失效。

| 路径 | 已核对的调用次序 | 后续实现必须覆盖 |
| --- | --- | --- |
| Runtime.initialize | 注册 HTTP → Setup.run；未配置即返回；配置成功后 Sessions.install → Executor.install → ensure 主 Session → Policy sync → resume → passes/effects start | 关键 Mesh Service/安全依赖须在主 Session 和后台循环前落实；不能仅在 ready 后注册健康日志就声称控制 Intake/分配 |
| Sessions.ensure | resolveAgent → 不存在时 create/再次 resolve → initializeRoleModel → decorate → permissionPresets.set(danger-full-access) → rename | 新建和同 ID 恢复都会经过当前宽权限设置；M0-10 必须替换并核验有效预设，不能只修改 create 参数 |
| Sessions.install | agent/created 触发 decorate；agent-preset/selected 尝试恢复角色预设，失败被 catch；session/event 维护重试健康 | 角色选择失败的默认拒绝、恢复加载和重选路径仍需真实受限 Session 反例 |
| Sessions.decorate / limitSubagent | 主/Worker 注册各自工具约束；其他 Agent 沿 parentSession 向上查找至 Worker，最多 8 层，再套用 workOnly | 这只是工具可见性及 Ticket 存活 guard，不等于子 Session 的资源/环境隔离或完整权限交集；未知或越界父链的安全策略未验 |
| DshExecutor.start / launchQueued / launch | 先把 launch 放入原生 Effects；执行时校验当前 Ticket/Assignment → 必要时 prepareDirectory/外部 prepare 命令 → Sessions.ensure → 递送工作输入 | M2 启动授权/预算闸必须早于 prepare 和 Session；只在 prompt 的 authorize 回调校验会晚于目录及 shell 副作用 |
| DshExecutor.resume / deliverQueued | resume 中断旧 Assignment 或将 pending 重入 launch；delivery 路径也可能调用 Sessions.ensure | 不可只拦首次 launch；恢复、重新递送和同 ID ensure 同样需要统一拒绝 |

本批未修改上述权限或调度代码。Bridge 位于 ready 后，仅证明生命周期；CognitiveMeshService 及安全前置接线仍待后续实现。

## M0-05 接续（2026-11-13）

`src/extensions/mesh/service.ts` 使用公共 Service(ctx, 'cognitiveMesh') 注册，真实 Cordis inject 消费及卸载句柄拒绝纳入回归。Runtime 在打开 Store 前、ensure 主 Session 前以及启动 resume/passes/effects 前调用 assertReady；构造失败释放目录锁。原生 Effects 增加默认不变的可选 dispatchAllowed 回调，Runtime 接入服务检查以保留待处理行；Source/Runtime Intake、paused/closing 同步检查。依赖恢复后仍由原生 pump 推进，没有新增调度器。

contracts.ts 的 11 项依赖与 Bundle inject 共享。此处只验证服务可用性与生命周期，不认证服务实现、Actor 或模型权限，不替代 M0-06/10/11/12。已经运行的异步副作用不在撤销保证内。验收及剩余条件见 acceptance/M0-service-20261113.md。

## 原生 profile 依赖切换实证（2026-11-13）

根 probe 新模式 --boot-service-dependency-cycle：通过锁版包公共 PermissionPresetService 和 Cordis Registry/Fiber API 在真实未配置 DSH 进程卸载/恢复依赖，观测原生 Bundle 注销/重装、旧服务和 Runtime 拒绝、新服务消费及预设一致性。最终两次进程各 installed/disposed=2，退出 0。只验证未配置 profile；没有用伪服务替代生产权限服务，不等同已配置主 Session、Worker 或持久工作恢复。历史一轮聚合检查失败原因尚未证实，严格断言和新 CI 保留。具体版本、命令及剩余条件见 acceptance/M0-profile-dependency-20261113.md。

## 2026-11-13 身份/权限接续（覆盖上述历史 Session 未修复描述）

- `Sessions.ensure/decorate/workOnly/limitSubagent` 现在默认 read-only+ask，真实 `resolve/current/set` 校验和宽权限覆盖拒绝；无模型原生主 Session 的重开/同ID/角色切换/依赖恢复已测。Worker/子会话真实集成矩阵仍 IN_PROGRESS。
- 公共 `ToolRuntime` 实例真实执行证明 guard 在 pre-listener allow 后仍拒绝；被拒绝体未运行。非 Tool Gateway 全覆盖尚未闭合。
- Runtime/HTTP 真正消费受信身份服务；原 SQLite 扩展 schema2 保存 grant/策略版本/epoch/拒绝审计/Session绑定。无第二主库、队列或 lease。
- 公共 `SandboxProvider` 类型明确只定义 file effects，network/process visibility 不在模式词汇内；因此 read-only 不是 OS/网络/密钥隔离。本机 bwrap 网络 namespace setup FAIL，自动执行固定关闭，独立探针不能替代业务 Worker 证据。
- Registry fibers 可跨 isolation scope；重复注册检查必须限定 `Context.isolate` 的服务 scope，并验证活 provider。CLI0.2.1-alpha.2 / Cordis4.0.5-alpha.1 实验已通过。

详见 [本批验收](acceptance/M0-trust-permissions-20261113.md)；未证实的 API/在线能力继续保留缺口。

## 2026-11-14 V1.2 公开上游功能核验（静态；不覆盖 M0 实测）

> 本节锁定公开 `dsh-v0.2.2-rc.3` 进行源码/文档核验。**不是**当前产品 `DSH 0.2.1-alpha.2` 与新版本的真实组合证明，仍不修改 Harness gitlink。2026-11-13 M0 权限、Service/主 Session 证据保持原判定；Worker/子 Session/全部 Gateway/网络密钥隔离未完成。

| 能力 | rc.3 已公开事实 | 易误判之处 | SuperAgent 适配职责 |
| --- | --- | --- | --- |
| Search / Fetch | `@deepseek-ai/dsh-web-deepseek-api` 注册 `deepseek-search-api`、`deepseek-fetch-api`，经 `ctx.web` 提供 Web 能力；`dsh-tool-web` 暴露模型工具 | 默认 `searchProvider=deepseek-search-api`，但 `fetchProvider=http`；默认 HTTP Fetch 不阻断 loopback/私网/云元数据；Messages 搜索另属独立提供方 | 先检查选中 provider、费用与出站网络，再做薄层 EvidenceCapture；不重复实现 Search/Fetch 网络栈 |
| 服务端深度搜索 | `deepseek_web_search / deepseek_read_url` 在 DeepSeek 服务端执行 | 无法假定逐工具经过 Harness `ToolGuard`，模型/服务器搜索结果不构成原件或业务授权 | 拆成显式允许研究路由与受控本地审计路由；敏感内容禁止外送 |
| AgentTeam | 原生具名多级 SubAgent，按根 Session 保存 Team mode、任务板及 CAS；Root/descendants 共享 checkout | 默认 Team mode off；`writeScopes` 仅警告写入冲突；不能跨进程协调，失联任务不自动解除占有 | 只做业务 TeamRun/Assignment/Mandate 与证据映射；Verifier 只读隔离 |
| Browser Use | `ctx.browserUse.register(name)` 管理唯一提供方；实验性 Playwright MCP、CDP、Stagehand | 没有统一 `ctx.browserUse.click()`；浏览器状态不是 Session 重启持久事实，取消不能撤回已执行动作 | 工具级授权、网络隔离、操作证据、UNKNOWN_RECONCILE；不自建 Browser Agent Loop |
| Schedule | Host 持久 Schedule 触发向 Session inbox 发送 follow-up | Receipt 只证明入箱，不证明模型/业务成功；不提供业务级 exactly-once 效果保证 | 由 Engine/Effects 继续校验稳定业务键、授权和恢复 |
| 通用 ToolGuard | `ctx.tools.guard()` 能最终拒绝 Harness 本地工具 | 并不涵盖模型服务端工具、旁路直接 API 或 OS/network；工具预设不是系统级隔离 | 将非 Tool Gateway、受限容器/网络、凭据和撤权作为独立验收 |

**V1.2 必须新验证**：provider 选择与查询次数、敏感出站/SSRF、证据可信级别与哈希、Team CAS/持久不确定/Verifier 隔离、浏览器真实负向动作与未知结果、Schedule 重复触发/Engine 去重、API 错误分类与预算。参见 [详细设计 §16.6](SuperAgent_Harness_Design_Final.md) 的 V12-01—V12-10；所有用例均保持 `NOT_RUN`。

公开依据：[Web](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.2-rc.3/docs/subsystems/web.md)、[DeepSeek Web API Provider](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.2-rc.3/packages/web/web-deepseek-api/README.md)、[AgentTeam](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.2-rc.3/packages/team/agent-team/README.md)、[Browser Use](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.2-rc.3/docs/subsystems/browser-use.md)、[Schedule](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.2-rc.3/docs/subsystems/schedule.md)。

### V1.2 第二轮静态发现：配置与错误语义补充

- **默认隐私字段**：rc.3 `dsh-web-deepseek-api` 的 `sendOriginalQuestion` 默认 `true`，会将最近人工问题（最多128字符）作为 `ori_question` 发送；企业路径须显式设 `false` 并验证实际 HTTP 请求体。
- **三条调用链**：Harness 模型 `web_search/web_fetch` 进入 ToolRuntime；服务插件直接 `ctx.web.search/fetch` 不自动经 ToolGuard，须额外受信业务校验；DeepSeek 模型服务端 Web Tools 独立执行，也不经本地逐次 Guard。
- **Fetch 错误**：本地 HTTP Fetch 可返回 `WebFetchResult.statusCode=404/500` 而不抛错，且会遵循其网络策略；远端 DeepSeek Fetch API 的非成功抓取是 Provider 错误，响应不提供最终重定向 URL。二者不能以同一成功规则或“原站字节”处理。
- **凭据与预算**：`searchBilling/fetchBilling=auto` 随当前会话模型路由及账户/API Key 选择而变；插件实例 QPS 并非账户级全局限流；授权与派发应核验真实 endpoint/凭据引用/预算。
- **Schedule**：Host 先保存 Session inbox 后保存 receipt，中间崩溃可能重复投递；必须由业务稳定周期标识及 Engine 幂等处理。Browser MCP 进程在 Session 启动目录启动，后续目录改变不会迁移，不能替代 OS/网络隔离。

本轮只完成公开官方源码核查及设计问题登记；相关运行负例依旧 `NOT_RUN`。参见 [复审记录](reviews/V1.2-DeepSeek-Harness-Static-Review-20261114.md)。

### 第三轮外部反馈：上游限制（2026-11-14）

- **Stagehand Native**：使用独立模型与 API Key，推理和费用不纳入 DSH Session 统计；取消不保证本次推理终止，rc.3 不支持 DeepSeek endpoint/baseURL。业务默认禁用。
- **Web 最终派发**：WebRuntime 在调用时选择 Provider，DeepSeek Transport 内异步解析凭据/endpoint；当前公共接口无原子业务许可入参。需固定配置的隔离执行域与实际网络出口控制，或经独立验证的最终派发 Gate；不能用预检查代替实际发网验证。
- **Schedule 手动执行**：runNow() 每次重新生成 occurrenceAt，没有业务 manualExecutionRequestId 参数。必须先持久化人工请求身份，再由 Engine/Effects 去重；未实测时禁止手动调度触发可写业务。
- **阶段与功能门禁**：可选能力的实际启用需对应 V12-01B、V12-03C、V12-08C、V12-09B、V12-10B、V12-GATE 安全恢复验收，全部 NOT_RUN。

官方源码：[Stagehand Native](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.2-rc.3/packages/experimental/browser-use-stagehand-native/README.md)、[WebRuntime](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.2-rc.3/packages/web/web/src/index.ts)、[Web Transport](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.2-rc.3/packages/web/web-deepseek-api/src/transport.ts)、[Schedule Runtime](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.2-rc.3/packages/schedule/schedule/src/runtime.ts)。
