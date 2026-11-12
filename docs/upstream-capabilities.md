# M0 上游能力核验

基线与版本见 UPSTREAM_BASELINE.md。源码路径相对 upstream/superagent。公共 DSH 类型来自原型 lockfile 安装的 0.2.1-alpha.2 包，尚未将它们与 Harness 0.2.2-rc.2 源码混用。

| 符号 / 扩展点 | 真实落点 | 核验结果 | 尚待验证 |
| --- | --- | --- | --- |
| Bundle name/inject/apply | src/index.ts；package.json 的 dsh.bundle；cordis.patch.yml | 存在；apply 创建 Runtime 并登记 stop；本次未修改入口 | 真实 profile 配置树和重载 |
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
