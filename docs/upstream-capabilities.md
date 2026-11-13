# M0 上游能力核验

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
