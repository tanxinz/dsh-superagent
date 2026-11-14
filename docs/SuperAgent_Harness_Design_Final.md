# SuperAgent × Jev 智能企业认知事件总线：DeepSeek Harness 扩展详细设计

**架构底座：DeepSeek Harness / Cordis｜业务宿主：SuperAgent｜覆盖范围：L1—L5 全部 17 个模块**

> **强约束**：本项目必须基于 DeepSeek Harness 进行插件扩展或在其上运行的 SuperAgent 业务插件中进行最小改造。功能输入 `superagent_x_jev(2).html` 定义的 5 层、17 个模块与 3 个场景全部保留为目标范围。首期采用 M0—M5 可运行学习原型：按模块选择真实接线、轻量规则或隔离 Mock，不把静态演示当作业务实现，也不搭建第二套 Agent 编排平台。

**本次框架核验修订（2026-11-11）**：保留已有 18 章、5 层、17 模块、S1/S2/S3 与学习版 M0—M5。基于官方仓库的公开代码结构，明确 **TypeScript + Node.js + Cordis + SuperAgent 原生 Bundle** 为第一版工程路线；新增兼容版本矩阵、fork-first 接线、同步领域命令边界、最小生命周期样例与真实 M0 验收。**公开源码说明不等于本项目已完成编译**：所有 `mesh_*`、`CognitiveMeshService`、ActionPlan、Jev 适配均属拟新增工程，须以锁定 Commit 和实际编译/测试确证。Notion 版不随本地 Markdown 自动同步。

> **V1.2 设计修订（2026-11-14；仅 Markdown 静态修订）**：在 V1.1 五层/17 模块与 M0—M5、G0—G5 双门禁不变的前提下，收敛 DeepSeek 全家桶 API 与 Harness v0.2.2-rc.3 的复用边界；记录 P0-01—06、P1-01—05、P2-01—02 对应修订和验收。项目当前基线**不切换**到 rc.3；本轮不修改 Harness gitlink、依赖锁、产品源码或历史证据。官方功能存在不等于本项目组合已验证；新能力均保持 `CANDIDATE/UNTESTED`。

## 1. 项目目标、范围与不可突破的边界

### 1.1 最终目标

把 DeepSeek Harness 中的 SuperAgent 业务插件扩展为企业认知事件总线：多源事件可以持久记录、语义评估、跨渠道归并、同时派发多个动作，旁路可以审查企业本体与跨事件趋势，四级执行器承担不同复杂度任务，L5 对授权、执行进展和对外汇报进行约束。每一个关键动作均能追溯到输入事件、决策、Ticket、授权、执行尝试与交付证据。

### 1.2 严格系统边界

1. **Harness 为唯一 Agent 运行底座**：Agent Session、模型、工具、沙箱、技能、子 Agent、会话日志都由 Harness 插件能力提供；不自研第二套 Agent Loop。
2. **SuperAgent 的领域核心为业务真相来源**：`Source → Trigger → Thread → Eval → Decision → Ticket → Assignment → Executor → Outbox` 维持原有语义。扩展动作执行与旁路并不绕过 Engine 修改既定 Ticket。
3. **扩展优先，首期 fork-first**：第一版默认 fork `dsh-superagent-prototype`，在原生 Bundle 内优先增加小型 TypeScript 桥接、Source/Assessor/Executor 适配与领域扩展，利用已有 Cordis 生命周期；不先搭独立 npm 多包工作区，也不通过包外深层 import 访问未导出内部类。如需修改原型核心，仅允许经过 M0 证实必要的**最小改造白名单**：`ports.ts` 扩展接口、`runtime.ts` 组合根、`engine.ts` 受控领域命令、`store.ts` 迁移、`sessions.ts` 受限角色 preset、`assessment.ts` 的 Jev 映射及 `outbox.ts` 的发送前校验；每项必须记录锁版源码位置、必要性与原生回归测试。不得重写 Harness `core/agent-loop` 或建立第二套 Engine。
4. **不引入重复中间件**：首期继续使用原型 SQLite `Store` 和持久化 `Effects`；暂不引入 Graphile Worker、Temporal、Kafka 或独立 PostgreSQL 任务主库。后期可通过 Repository Port 切换存储。
5. **功能目标完整、首期能力收敛**：17 模块保留完整设计，但 M0—M5 只交付隔离环境中的最小可运行原型；“源码接线”“简化功能已运行”“生产条件已通过”是不同验收等级，不能混淆。
6. **基本安全不可暂缓**：学习版一律 `SANDBOX`，真实资金、生产数据库、生产配置、真实推送/合并等有副作用操作全部禁用，任何高风险演示仅使用 Mock；Worker 无生产凭据，实际隔离与工具拒绝从 M0 生效。Jev 概率不能代替强制授权判断。
7. **领域关联须经授权**：跨渠道语义相似只形成候选或不授予权限的上下文，不能绕过 SuperAgent 原生 `Correlation` 与 `Subscription` 的区别。任何持久订阅变更只能经 Engine 接受并校验。
8. **可靠性边界明确**：内存缓存不是审计证据库；外部已发生但结果未知的副作用必须先对账再决定是否重试，本地发送请求成功不等于对端渠道已经接受，更不等于最终收件人已送达；必须分别记录可验证状态。

### 1.3 交付等级与当前实现目标

本设计同时描述**目标架构**与**学习版最小实现**。二者不设为两套代码或两套领域模型：均运行在 Harness + SuperAgent 内，均复用原生 Engine/Store/Effects/Outbox。实际可用性以运行结果而非模块图标或目录数量判断。

| 等级 | 含义 | 对外声明边界 |
|---|---|---|
| `WIRED`（接线完成） | 插件/Port 能编译、装配，调用能到达目标接口 | 不代表业务已实际运行 |
| `PROTOTYPE`（最小功能完成） | 输入、判定、动作或提案**确实运行**，有持久状态、证据与可重放测试；高危调用用隔离 Mock | 是本轮 M0—M5 的交付目标，不代表生产可靠性 |
| `PRODUCTION_READY`（生产准备完成） | 完整授权审批、真实隔离、数据恢复、性能、多租户适用性、渠道送达和运维指标均通过相应 G0—G5 门槛 | 必须另行验收，M0—M5 通过不自动满足 |

本轮交付要求：**17 个模块至少具备明确的最小行为、输入输出和真实运行证据**；其中 1C 可使用遥测 Fixture、3C1 可使用 Schema Fixture、4A 使用隔离 Mock RPC、4B 使用固定三节点流程、4D 使用固定双 Session 串行交接。Fixture/Mock 仍必须经过真实 Port/Engine/Effects/Session 接线，不得用空接口或纯 HTML 动画冒充已实现。M0—M5 是**学习版实施里程碑**；原有 G0—G5 是更严格的工程与生产准出路径，两套名称和验收不能相互替代。

### 1.4 学习版约束与推迟范围

- **首期一实例、一租户、一个 SQLite Store**；使用受控测试目录及独立容器/虚拟机运行 Worker，不接生产数据与生产密钥。
- **首期只有 Mock RPC / Mock Channel 会产生业务输出**；GitHub/飞书接入可逐步从本地 Fixture 切换到真实只读/事件 Webhook，不允许触发真实扣款冻结、生产配置修改、强推或合并 PR。
- **优先复用原生 Port**，不得为形成 17 个插件数量而提前创建大量空包；只有出现实际依赖时才创建新包和迁移。
- **延期**：审批 UI、完整 IncidentEpisode 处理、高吞吐遥测、高可用、正式本体发布、自动重启、通用 DAG 引擎、复杂 Team 排程与多租户共享部署。
- **保留底线**：Engine 受信写入、稳定幂等与事务接线、跨渠道候选不等于 Subscription、模型不签发 Mandate、外部副作用安全边界、结果证据不可伪造。

## 2. 基础框架与业务宿主集成

### 2.1 DeepSeek Harness：底层能力与调用位置

| 已公开能力 | 集成位置 | 用途 |
|---|---|---|
| Cordis 插件 / profile / patch | 插件清单、`cordis.patch.yml`、`dsh --profile ... --dump-config` | 将全部新服务装配在 Harness 进程内 |
| `ctx.agents` / Agent Session | 注册实例、收发消息、子 Agent 调用 | Tier 3/Tier 4 执行核心 |
| `ctx.sessions` 与 SessionEvent | 持久化 Agent 执行事实和回放 | Worker 轨迹、Watchdog 取证 |
| `ctx.tools` 与 `tools/pre-execute` | 可扩展权限流程/审批拦截 | L5 异步判定与工具调用审查 |
| `ctx.tools.guard()` | 同步最终守卫（具体签名以 G0 锁版类型为准） | 已知禁止项的不可覆盖拒绝；不承担异步 Jev 判别 |
| `agent/*`、`agent.inject()` | 会话生命周期与下一步上下文注入 | Context Patch 与监护观察 |
| `ctx.sandbox`、工具与能力注册 | 隔离执行环境 | Tier 3/Tier 4 沙盒边界 |

> 这些是 Harness 公开的扩展能力。具体事件签名、Scope 和注册方法必须通过所锁定的发行版本 TypeScript 类型确认，禁止把设计伪代码直接视作可安装实现。

### 2.1.1 新发布能力的最小复用矩阵（V1.2 候选，不代表当前锁版可用）

| 能力 | 上游实际落点 | 本项目应负责 | 验证状态 |
| --- | --- | --- | --- |
| DeepSeek 独立 Search / Fetch | `@deepseek-ai/dsh-web` 的 `ctx.web.search/fetch`，`@deepseek-ai/dsh-web-deepseek-api` 注册 `deepseek-search-api/deepseek-fetch-api` | 查询授权、来源限制、EvidenceCapture 与业务审计；**不自建搜索 HTTP 客户端** | rc.3 源码核实，组合未测 |
| 普通 Web 工具 | `@deepseek-ai/dsh-tool-web`、原生 HTTP Fetch、旧 Messages 搜索提供方 | 显式选择 `searchProvider/fetchProvider`；防止默认本地获取泄露内网 | rc.3 源码核实，组合未测 |
| AgentTeam / 具名子 Agent | `@deepseek-ai/dsh-agent-team` 与 `dsh-tool-agent-team`；子代理组件负责消息与恢复 | 保留业务 `TeamRun/Assignment/Mandate`；不复制任务板 | rc.3 源码核实，组合未测 |
| Browser Use | `dsh-browser-use` + Playwright MCP / Chrome DevTools MCP / Stagehand（实验性） | 授权、URL/身份边界、证据与效果对账；不假造统一 `click()` API | 官方实验性，组合未测 |
| Host Schedule | `ctx.schedule` / `dsh-tool-schedule` | 仅时间触发；业务工作仍经原 Engine + Effects | rc.3 源码核实，组合未测 |
| OCR / 文件 / 深度搜索 | DeepSeek 独立识别 API 与模型服务端工具 | 按业务需要做输入适配；服务端工具不视为本地 ToolGuard 已审计 | 官方已发布，项目未测 |

**默认配置及出站风险**：rc.3 基础 profile 默认 `searchProvider: deepseek-search-api`、`fetchProvider: http`；DeepSeek 独立 Fetch 需显式选择 `deepseek-fetch-api`。上游原生 HTTP Fetch **不限制环回、私网和云元数据地址**，不允许将其直接暴露给不可信 URL 或不受限 Agent；必须有目标验证、网络隔离及负向测试。

**两种工具信任域**：`deepseek_web_search` 与 `deepseek_read_url` 在 DeepSeek 模型服务端执行，不能假定请求逐次经过本地 `ctx.tools.guard()`。必须逐次审批、留存原文或受限出站的任务应使用经受信控制的 `ctx.web` 本地工具路径；服务端自动搜索只用于被明确允许的低敏研究型会话。上游能力文档不等于组合 TypeScript/API/Session 验证通过。

资料：[DeepSeek Search / Fetch](https://api-docs.deepseek.com/guides/search/)、[Web Tools](https://api-docs.deepseek.com/guides/web_tools/)、[Harness Web API Provider](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.2-rc.3/packages/web/web-deepseek-api/README.md)、[Browser Use](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.2-rc.3/docs/subsystems/browser-use.md)、[AgentTeam](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.2-rc.3/packages/team/agent-team/README.md)。

### 2.1.2 第二轮复审：Web 的三条执行路径与默认隐性数据外送

1. **Harness 模型 Web 工具**：通过 `web_search/web_fetch` 进入 ToolRuntime，可使用 `ctx.tools.guard()` 作为最终工具拒绝；模型工具仍需要网络目的地限制。
2. **业务代码直接调用 `ctx.web.search()/fetch()`**：直接 Service 调用不得假设自动经过 ToolRuntime/ToolGuard。必须先经过受信 `EvidenceGateway` 的身份、外送范围与预算准入；但 **rc.3 的 `ctx.web` 服务接口不接受不可变的 provider/endpoint/credential 授权凭据，也不证明业务预检查与内部派发使用同一快照**。因此新增能力在满足 §5.1.3 的受控静态运行域或可证明最终拦截前，保持 `DISABLED/FIXTURE_ONLY`，绝不能把调用前配置检查当作已解决竞态。`EvidenceGateway` 为现有 Runtime 的逻辑步骤，不是新 HTTP 客户端、Engine、队列或数据库。
3. **DeepSeek 服务端 `deepseek_web_search/deepseek_read_url`**：执行发生在模型服务端，不经本地 ToolRuntime；只能按显式模型路由允许低敏研究，不能视为已经完成本地逐工具审批。

**新增 P0 风险**：rc.3 `@deepseek-ai/dsh-web-deepseek-api` 的 `sendOriginalQuestion` **默认 `true`**，会把最近人工提问前 128 字符作为 `ori_question` 发往 Search API；仅脱敏 `query` 仍会泄露原问题。企业受控路线必须显式设置 `sendOriginalQuestion: false`，并以 HTTP 夹具检查真实请求体缺失 `ori_question`。`searchBilling/fetchBilling: auto` 会随会话模型路由、账号/API Key 解析，必须依照 §5.1.3 证明**实际派发**的 provider、endpoint、凭据/计费来源属于批准范围；不能只凭派发前的配置读取作出该结论。

### 2.2 SuperAgent：业务领域核心与扩展位置

| 组件 / 公开文件 | 保留的职责 | 需要补足的能力 |
|---|---|---|
| `src/core/engine.ts` | 领域状态的单一写入者、事务边界 | 外部 ActionPlan/Team/旁路的授权提交入口 |
| `src/core/intake.ts` | Trigger 入站与 Subscription fan-out | 多来源实体锚点投影，不改变 Intake 核心 |
| `src/core/evals.ts` | Eval 和 Decision 的生命周期 | Jev 初筛 + 复合 Assessor 输出映射 |
| `src/core/tickets.ts` | Ticket、Mandate、Inputs 与 Subscriptions | 一源多动作引用和关联建议应用 |
| `src/core/assignments.ts` | Assignment 与 Report | Team Executor 状态映射 |
| `src/core/ports.ts` | Repositories/Assessor/Executor/Outbox Port | 拟新增 ActionPlan、关联确认、SideRouter 与 Governance Port（以 G0 编译结果为准） |
| `src/app/runtime.ts` | 组合根，建立依赖并启动 | 插件服务与适配器装配、关闭顺序 |
| `src/app/store.ts` | SQLite 存储/事务/只读查询/迁移 | 新投影表与迁移，不重复主表 |
| `src/app/effects.ts` | 持久化 side-effect 任务 | 扩展逻辑任务：action、side-route、watchdog、team 等；原生评估/回复/投递优先复用既有 Effects，实际 kind 与 Key 按 §13.2 和 M0 源码核验，不为每个模块新造队列；在原事务内持久化入队 |
| `src/app/assessment.ts` | MasterAssessor | JevAssessor 插槽或组合 Assessor 桥接 |
| `src/app/sessions.ts` | Session 创建与角色权限预设；上游默认可能设置 `danger-full-access` | G0 验证并改造 `Sessions.ensure()`，确保 Worker/子 Agent 实际采用受限预设与隔离环境 |
| `src/app/executor.ts` | DshExecutor | Tier 3 复用，Team 执行适配器新增 |
| `src/app/outbox.ts` | 渠道消息可靠发送与回执 | L5 准出适配与发送前检查 |
| `src/sources/kind.ts`、`registry.ts` | SourceKind 注册、Channel、ThreadContext | 企业事件 Source 类型 |

基础运行约束：Engine 是唯一原生领域聚合写入者；事务扩展通过受控领域命令同步写入新表，不允许旁挂插件另起第二个领域事务。`Store.atomic()` 负责提交原生聚合与扩展表，`Effects.enqueue()` 必须在该事务内持久入队；外部副作用在提交后由 Effects 执行。`afterCommit()` 仅适用于无需崩溃恢复的进程内回调，**不能代替持久 Effects**。Store 只有一个 SQLite 文件及目录进程锁；首期只支持单实例单写入者。

**历史基线说明（V1.2）**：下段描述的是原始上游 `Sessions.ensure()` 的风险，并非当前 PR #13 开发分支仍未修改。2026-11-13 的 M0 记录已覆盖主 Session 的只读预设/撤权回归，但 Worker/子 Session 的真实 OS/网络/密钥隔离仍未完成；以 `docs/DEVELOPMENT_STATUS.md` 和该批验收为当前状态，不改写历史核验记录。

**已由公开源码确认**上游 `Sessions.ensure()` 在解析/创建 Session、初始化角色模型之后调用 `ctx.permissionPresets.set(result.agent.session, 'danger-full-access')`，与学习版最小权限目标**直接冲突**。M0 必须在 fork 的 `src/app/sessions.ts` 删除/替换这条无条件放宽权限的逻辑，并用受限角色策略与锁版 Harness API 核实**新建、恢复、同 ID 重新解析以及子 Session** 不再被重新提升；配置受限不等于 OS 隔离，仍须独立测试容器、最小挂载/凭据/出网和执行前 ToolGuard。测试应使用无害的禁止目标模拟（例如对隔离只读 Fixture 的写入尝试），检查目标文件哈希未变化与审计拒绝，避免真的触碰生产数据。任何路径回落 `danger-full-access`、守卫未加载、容器隔离失败时立即停止 Worker 分配；首期保持 `SANDBOX`。**未取得实际运行日志前，不得声明漏洞已在源码层修复。**

### 2.3 学习版上游复用与最小改造边界

M0 先以锁定源码核对实际可调用接口：原生 Source/Assessor/Engine/Executor/Effects/Outbox 能实现的部分不得重复造轮子。若上游 Port 不够，允许在**业务插件层**做可回归的最小修改：`ports.ts` 增加扩展契约、`runtime.ts` 装配注入、`engine.ts` 承接受控扩展命令、`store.ts` 加入必要迁移、`sessions.ts` 限制不安全角色预设。改动须有原生回归测试，禁止直接重写 Harness Agent Loop。

学习版需重点验证两条硬事实：① 原生 Ticket/Assignment 与扩展 ActionPlan/ActionRun/Effects 能否在**同一个 Store 事务**中提交；② Worker 能否在**真正受限的环境**运行。若任一项暂时无法通过，停留在本地隔离 Fixture 模式，不把模拟运行报告为已完成的真实原生接线。

### 2.4 开发语言、运行时与版本兼容基线（2026-11-11 公开源码核验）

**唯一首期主实现栈**：Node.js 上的 **TypeScript（ESM）** 开发业务扩展、Cordis 接线、领域命令、Source/Assessor/Executor 适配与测试；沿用 SuperAgent 的 `pnpm`、`tsc`、`tsdown`、`Vitest`。SQLite/SQL 只承担事务、表与迁移；YAML/JSON 是插件装配和 Fixture；原 HTML/CSS/TS 是可视化外壳，后续需要复杂前端时可选择 React + TypeScript。**不另外用 Python/Java 实现平行业务 Engine/Agent Loop/任务主库**。DeepSeek 指 Harness/Agent 运行底座及模型服务；TypeSafe Jev 是**另一条独立的语义判定 SDK/API 调用路径**，不能当成 Harness 自带的评估方法或共用模型凭据。

| 组件 | 公开仓库当前声明/定位（不代表已组合验证） | 本项目 M0 锁定要求 |
|---|---|---|
| DeepSeek Harness `master` | 根 `package.json` 公开示例：`node >=24.9.0`、`pnpm@11.28.5`、版本 `0.2.2-alpha.3` | 填写实际 commit SHA、tag、包锁版本、Node/pnpm 和 `dsh` 版本；不可依赖浮动 `master` |
| SuperAgent `main` | `dsh-superagent-prototype/package.json`：Node 22.x（>=22.19.0）或 Node >=24；`pnpm@11.7.0`、DSH 范围 `^0.2.1-alpha.2`、Cordis peer `4.0.5-alpha.1` | 填写实际 commit SHA、`pnpm-lock.yaml` 中 `@deepseek-ai/*` 解析版本与构建结果 |
| Node.js | **24.9+ 仅是同时满足当前两份 Node 引擎声明的候选起点** | 在真正所选锁定组合上实测，不能把引擎范围交集当作兼容性证明 |
| pnpm | 两仓库 `packageManager` 声明不同 | 在**各自仓库**使用所记录的包管理器版本与 lockfile；不强行假设两个主分支共用一个 pnpm 版本 |
| TypeSafe Jev | `@typesafe-ai/sdk` 是独立 JS/TS SDK，声明的最低 Node 版本需按锁版核验 | 填实际精确 SDK 版本、认证变量约定、模型标识、一次请求/错误回退记录；不填假定的稳定版本 |
| 项目扩展 | `CognitiveMeshService`、`ActionPlan*`、`mesh_*` 等为**项目新增** | 记录项目 Git SHA、migration、实际可用 Port、编译和三场景运行证据 |

**版本说明**：原始上游 Node 引擎声明为 `^22.19.0 || >=24.0.0`。这个版本表达式必须放在表格之外，以免竖线破坏 Markdown 表格列结构。

**锁版操作**：不要把上表的两份最新公开分支自动拼成一个可运行环境。M0 先选择一份与原型兼容的 Harness 安装或 release，再 fork/固定 SuperAgent Commit；如遇依赖冲突，回退到与其 `engines.dsh`/peerDependency 对应的 Harness 版本并记录验证结果。只有 `install → typecheck → test → build → dsh 配置树 → Session/事务实验` 全部完成，版本组合状态才可从 `CANDIDATE` 更新为 `VERIFIED`；未做过的记 `UNTESTED`，失败记 `INCOMPATIBLE`。

**项目版本记录（须由 M0 填写，不得虚构值）**：`harnessCommit=<TBD>`、`superagentCommit=<TBD>`、`node=<TBD>`、`pnpm=<TBD>`、`dshVersion=<TBD>`、`cordisVersion=<TBD>`、`jevSdkVersion=<TBD>`、`storeSchemaVersion=<TBD>`、`lockfileSha256=<TBD>`、`compatibilityStatus=UNTESTED`。镜像/环境可重建后才允许冻结契约。来源见 §18 的官方 `package.json`、插件入口和 Bundle patch 链接。

### 2.5 源码证据分级与最小接线原则

| 层次 | 已有或待做 | 防误解检查 |
|---|---|---|
| **上游明确存在** | `src/index.ts` 导出 `name / inject / apply`；`dsh.bundle.patch` 装配 `cordis.patch.yml`；`Store.atomic()` 同步执行回调；`Sessions.ensure()` 设置 `danger-full-access` | 具体签名/行为在锁定 Commit 再次检验 |
| **项目必须新增** | `CognitiveMeshService` 桥接、业务 ActionPlan/Run、JevAssessor、企业专用治理及迁移 | 不能因 Markdown 有 interface 就判定已有 API 或可运行实现 |
| **运行时待证实** | Cordis Service 公开/消费方式、Engine 内部受控命令、Effects kind、Hook/Guard 签名、Session 受限 preset 与模型请求消费证据 | `pnpm check`、真实 Bundle 装配和负向测试；不采用不稳定深层导入作为默认方案 |

## 3. 目标总架构与运行链路

```text
DeepSeek Harness (Cordis 插件树 / Session / Tools / Sandbox / Logs)
  └── SuperAgent 业务插件 (保留 Engine、Store、Effects、Outbox)
        ├── L1：GitHub/CI Source；飞书/Slack Source；APM/账单 Source
        │       └── SourceKind + SourceContext.receive + Trigger/Thread
        ├── L2：FastPathPlugin → JevEvalPlugin → 领域 Eval/Decision
        ├── L3：MainRouterPlugin ↔ MemoryLineageProjection
        │       ├── OntologySideRouter (异步)
        │       ├── TrendSideRouter (异步) → ContextPatch
        │       └── LazySynthesizer (DeepSeek Session)
        ├── L4：ActionPlan/ActionRun → Tier1 RPC / Tier2 SOP / Tier3 DshExecutor / Tier4 TeamExecutor
        └── L5：AuthorityGate + Watchdog + ExitGate → Outbox
```

**数据流分离**：① 事实入站流（必须留痕）；② 命令与状态流（只能由 Engine/扩展领域服务事务写入）；③ 异步副作用流（事务内持久 Effects 入队，事务提交后执行）；④ 推理上下文流（Thread、Input、Context Patch）；⑤ 证据与知识提案流（旁路只写候选，不直接覆盖事实）。

**学习版运行路径（按 M0—M5 逐步启用）**：先使用 Fixture/Mock Channel 接入一条单事件主路；再用可验证的 `ActionPlan → Mock RPC + Harness Worker` 跑通 S1；然后加入精确关联与旁路 ContextPatch 跑通 S2；最后加入 Guard、Watchdog、Exit 与固定 SOP/Team。图中原始 HTML 的 `SCENARIOS` 只是静态演示脚本，M5 必须以真实运行的状态/事件驱动架构图高亮，不得把预置动画作为验收数据。

### 3.1 核心不变量

- I-01：同一个来源事件修订只有一个稳定 `Trigger.id`；重投递不得重复创建事实或重复执行业务动作。
- I-02：`Ticket/Mandate/Assignment` 的状态最终写入点只有 Engine；Cordis 旁挂插件不得直接 `UPDATE ticket`。
- I-03：`Correlation` 只提供关联上下文；无明确授权依据的跨渠道关联不得自动建立拥有后续投递效力的 `Subscription`，也不得扩大 Mandate。
- I-04：ActionPlan、ActionRun、ExecutionAttempt 均可追溯；逻辑任务身份稳定，业务幂等键和队列 Key 不随重试次数变化。
- I-05：主路与旁路不得在无状态竞争控制下提交相反动作；失败建议保留审计证据。
- I-06：模型输出不能单独准许资金、配置、生产数据库等副作用；可信策略和独立执行守卫具有最终否决权。
- I-07：Worker 重启、ContextPatch、外部评论和跨渠道消息不得扩大既定 Mandate。
- I-08：任务完成由执行证据验证，不以 Jev 评分或 LLM 自述代替。
- I-09：在确认成功接收前，原始事件或足以恢复的上游游标必须已经可靠保存；内存聚合不能承担“零丢失”承诺。
- I-10：Agent 工具调用中的同步禁止项由 Harness 最终守卫拒绝；Tier1/Tier2 外部 RPC 还必须经过 ActionGateway 的等效强制校验。
- I-11：入站静默、是否建立 Ticket、是否对外通知分别决定；`RECORD_ONLY` 不得删除审计和后续可用上下文。
- I-12：Outbox 渠道接受与终端送达是不同事实；远端结果未知不得谎称已送达或自动无限重发。
- I-13：`businessEffectKey` 跨计划版本稳定；重新规划或告警修订不得隐式重新执行已完成的业务副作用。
- I-14：原生 Ticket/Assignment、扩展 ActionPlan/ActionRun、持久 Effects 在一个 SQLite 事务中完成关联的合法提交；提交后回调不能作为持久队列替代品。
- I-15：Session 的角色权限与运行环境必须实际受限；主 Session、Worker、Team 子 Agent 不得被上游 `danger-full-access` 预设重新放宽。
- I-16：正常 Policy 变更不默认撤销已签发 Mandate；实时安全禁止/紧急撤权通过独立的安全策略版本强制生效。

### 3.2 V1.2 外部能力分流与信任边界

- **受信事实流**：Source 验证后的事件进入原生 Engine / Store / Effects；搜索结果、模型总结、网页截图只能作为带来源的 `Evidence/Proposal`，不能直接改写 Ticket 或签发 Mandate。
- **只读证据流**：Engine/受信请求指定允许的查询、目标与数据等级；经 `ctx.web` 中选定提供方获取结果，由 `EvidenceCapture` 归档摘要、来源及可复核范围。不能以只读工具名称推定本地 HTTP Fetch 的网络目的地安全。
- **模型服务端研究流**：独立选择允许自动搜索的模型路由；此路径产生服务端工具记录，但本地逐工具 Guard 不可覆盖，严格限制外送的数据等级，不将模型回答视为原始证据。
- **可写执行流**：浏览器提交、MCP 写操作、RPC、Shell、Git 等进入现有受信授权、一次性许可和最终执行守卫；外部已发生或结果未知时按既有对账协议处理。浏览器工具不新增第 18 个业务模块。
- **宿主调度流**：Harness Schedule 负责定时投递，不授予业务身份或执行资格；后续由 Engine 按逻辑键去重并复核授权。

## 4. 17 个功能模块与最小实现矩阵

模块编号与 HTML 蓝图保持一致。表中 `M*` 表示学习版里程碑，**首次出现不意味着该模块已具备全部能力**；`PROTOTYPE` 必须留存实际调用与状态记录。

| 模块 | 上游复用与建议实现位置 | 学习版最小行为、首次交付阶段 | 延后功能 |
|---|---|---|---|
| **1A DevOps/研发事件** | GitHub Source、`SourceKind` | **M1**：Fixture/只读 GitHub Issue、PR 事件规范化、签名与消息去重；M3 接真实测试仓库 Webhook（具备权限时） | 完整 CI/CD 适配矩阵 |
| **1B 飞书/协同消息** | Feishu Source、`SourceKind` | **M1**：飞书事件 Fixture 或测试群输入，经真实 Source 接线形成 Trigger；M3 接测试群 | Slack、邮件与正式业务群 |
| **1C 监控遥测** | `SourceContext.receive` | **M5**：从本地告警 Fixture 接收、稳定故障 ID 去重与计数，支持模拟严重度升级 | 高吞吐、跨天真实资损风控 |
| **2A FastPath** | Source + Policy + Trigger | **M1**：来源校验、去重、观察模式与合法路由 | 复杂规则管理与性能优化 |
| **2B JevEval** | Evals/Assessor Port | **M1**：实际调用一次锁版 Jev SDK 判别有效诉求；网络失败安全回退并保留证据 | 高并发批量评分与校准平台 |
| **3A MainRouter** | Engine/Tickets/Policy | **M1**：候选召回和新 Ticket 建议；**M2**：合法提交最小 ActionPlan 并派发两项动作 | 多租户大规模候选路由 |
| **3B Memory/Lineage** | Store/Trigger/Ticket/SessionEvent | **M1**：SQLite TicketCard/事件摘要读取；M2 起保存动作血缘，M3 查询最近 7 天事件 | 向量图库、自动摘要优化 |
| **3C1 本体旁路** | Effects + 简单 Schema 文件 | **M2**：对预设领域 Schema 进行一个真实差异检查，保存 `OntologyProposal`，**不自动发布** | 正式图数据库及 Schema 自动演进 |
| **3C2 趋势旁路** | Store/Effects/Session | **M3**：按明确的业务锚点/时间召回历史事件，产出 `TrendFinding` 和可投递 Patch | 大型向量检索、根因自动证明 |
| **3D 惰性合成** | Harness Agent Session | **M2**：DeepSeek 生成 Ticket 摘要与结果文案（有可用模型时）；**Mandate 只由 Engine 确认** | 复杂上下文压缩策略 |
| **4A Tier1 RPC** | Effects / ActionGateway | **M2**：Mock `BILLING_FREEZE` 等受信动作，回写执行证据 | 任何真实财务/生产写 API |
| **4B Tier2 SOP** | Effects + Store | **M5**：运行固定三节点 `RULE → MOCK_ACTION → VERIFY`，保存逐步执行结果 | 通用 DAG、复杂补偿/审批 |
| **4C Tier3 Worker** | DshExecutor / Harness Session | **M2**：真实创建受限 Session，在测试仓库/Fixtures 中完成一次只读诊断或测试任务 | 生产 SRE 工具、高自由度写入 |
| **4D Tier4 Team** | Harness 子 Session + 原生 Assignment | **M5**：至少两个**真实且独立**的受限 Agent Session 按 `Planner/Worker（产生可验证工件）→ Verifier（独立核验工件）` 固定串行交接，结果汇总到一个 Assignment | 并行 Team、复杂角色编排 |
| **5A AuthorityGate** | `ctx.tools.guard()` 与 ActionGateway | **M0**：隔离环境与禁止真实高危操作生效；M4 加入 Jev 风险辅助和真实拒绝审计 | 生产审批平台与全渠道强治理 |
| **5B Watchdog** | SessionEvent / Effects | **M4**：读取最近五步，标记重复失败；最多一次受控提示，不能自动重启 | 自动自愈调度与复杂观测 |
| **5C ExitGate** | 原生 Outbox | **M2**：用 Mock Channel 生成/保存结构化结果；M4 实施有证据的三类准出 | 外部多渠道送达与对账运营 |

**实现事实的判定**：只有 Mock 数据但走完了真实 Port/Engine/Effects/Session 的流程，可标记为 `PROTOTYPE` 并注明 `fixture/mock`；仅返回硬编码结果、不经原生接线的模块最多是 `WIRED` 或 UI 演示。使用实际 Jev/DeepSeek、真实两个 Agent Session 的模块应留存测试调用与可核查的 SessionEvent/Engine 记录。

## 5. 插件工程组织与装配方式

下面的多包布局只是**长期逻辑拆分目标**，不是 M0 立刻能运行的 npm workspace。**首期选定默认路线为 fork 官方 `dsh-superagent-prototype` 并在其原生 Bundle 内增量实现**；只有在包导出、依赖图及实际插件注册完成后，才可以把某个模块独立为 `packages/plugin-*`。

```text
superagent-cognitive-mesh/                 # 独立业务扩展工作区 / 允许上游 fork
  packages/contracts/                      # 共享类型、事件契约、错误码
  packages/plugin-jev/                     # TypeSafe SDK 调用/响应规范化
  packages/plugin-fastpath/                # 规则准入
  packages/plugin-main-router/             # 候选 Ticket / ActionPlan
  packages/plugin-memory-lineage/          # 投影、索引与血缘读取
  packages/plugin-side-ontology/           # 版本化本体提案
  packages/plugin-side-trend/              # 跨事件趋势与 ContextPatch
  packages/plugin-lazy-synth/              # 惰性生成
  packages/plugin-executor-rpc/            # Tier1
  packages/plugin-executor-sop/            # Tier2
  packages/plugin-executor-team/           # Tier4
  packages/plugin-governance/              # Authority/Watchdog/Exit/Session 角色限制
  packages/plugin-source-telemetry/        # 生产遥测 Source
  packages/plugin-source-im/               # 飞书拓展/Slack/邮件 Source
  packages/superagent-bridge/              # 原业务插件端口注入的最小兼容层
  test/fixtures/                            # 三场景标准事件及期望状态
  test/integration/                         # 端到端原生回归
  profiles/cordis.patch.yml                 # 可覆盖的插件装配样例
```

**首期实际工程落点（优先实施）**：fork `dsh-superagent-prototype`，沿用根 `package.json`、`src/index.ts`、原生 Bundle `cordis.patch.yml` 和 `src/app/runtime.ts`；在 `src/extensions/mesh/` 只增加一个可注销的 TypeScript 桥接入口与小型契约/测试文件，待 M1/M2 确认真实依赖时再拆分。不要直接 `import 'dsh-superagent/src/app/runtime.ts'` 或从外置包访问未列入 `exports` 的内部模块；SuperAgent 的 `package.json` 当前主要暴露 `. /client /github-watch /feishu-watch` 等公共入口，**没有保证 Engine/Runtime 内部路径可外部深层导入**。

```text
dsh-superagent-prototype/                 # M0 的真实 fork，而非第二套服务
  src/index.ts                            # 原 Cordis Bundle 入口：只加最小桥接初始化
  src/app/runtime.ts                     # 原组合根：仅新增经过验证的受控服务注入
  src/extensions/mesh/
    index.ts                              # M0 桥接生命周期日志 + 注销
    contracts.ts                          # 只保留当前实际可用的 TS Port
    safety.ts                             # 受限 Session / Guard 最小适配（必须实测）
  src/app/store.ts                       # M0 probe migration；M2 才加业务表
  src/app/sessions.ts                    # 修复宽权限 preset
  cordis.patch.yml                       # 优先复用，不重复插入同名插件
  test/mesh-m0/                          # 真实装配、事务/回滚、安全负向测试
```

首期不要求 `packages/*` 目录存在。M0 应在原生 Bundle 启动和销毁日志中看到桥接初始化/清理；M1/M2 开发受控 `CognitiveMeshService` 后再验证真实调用及 Port 注入，不能把一个日志样例冒充服务注册。**如果以后改为独立 Cordis 插件**，先显式发布可消费的服务和 `./mesh` 导出、编译产物、依赖声明，再通过 patch 注册并验证 `dsh --dump-config`；未满足这四项不得声称插件已装配。不允许绕过原生 `dsh` profile，不能用另一个 Node Server 维护第二份 Ticket。

### 5.1 扩展 Port（拟新增类型，为项目扩展类型）

以下接口均为项目拟新增的 Port，**不声称上游已导出同名接口**。M0 必须以锁定源码编译确认，所有会改变原生聚合的命令都必须复用 Engine 领域边界；模型调用一律在 SQLite 事务外。

**受信上下文规则**：`TrustedCommandContext` 只能由 Engine 的身份/来源适配层在验证后构造，不向 Jev/LLM/外部 Webhook 公开可信构造入口。TypeScript interface 的结构类型**本身不构成授权**；运行时必须复核会话或服务身份、租户绑定与来源证据。每个改变领域状态的命令显式携带该上下文；单租户学习版也必须验证租户一致性，不能由模型填写 `tenantId`。

```ts
// 项目类型示例；须通过 M0 类型检查后与锁定上游契约对齐。
export interface TrustedCommandContext {
  readonly tenantId: string;   // Engine 验证后的租户，非请求体直接传入
  readonly actorRef: string;  // 受信身份（系统/人类/来源服务）
  readonly requestId: string; // 端到端审计标识
  readonly sourceRef?: string;
}
export interface ProposedActionPlanItem {
  tier: Tier;
  kind: string;
  targetRef: string;              // 候选目标；Engine 验证并规范化
  args: Record<string, unknown>; // 未授权参数提案
  prerequisiteRefs?: string[];
  // 禁止携带可生效的 businessEffectKey / 新 businessIntentId。
}
export interface CognitiveMeshPorts {
  jev: JevDecisionPort;
  candidates: TicketCandidatePort;
  association: AssociationCommandPort;
  actionPlans: ActionPlanCommandPort;
  lineage: LineageReadPort;
  telemetryEvidence: TelemetryEvidencePort;
  sessionMandates: SessionMandateBindingPort;
  ontology: OntologyProposalPort;
  trend: TrendEvidencePort;
  authority: AuthorityPort;
  watchdog: WatchdogPort;
  exit: ExitDecisionPort;
}
export interface JevDecisionPort {
  evaluate(input: AdmissionInput): Promise<AdmissionDecision>;
  selectTicket(input: TicketMatchInput): Promise<TicketMatchDecision>;
  proposeActions(input: PlanInput): Promise<ActionProposal[]>;
}
export interface AssociationCommandPort {
  propose(ctx: TrustedCommandContext, input: AssociationProposalInput):
    Promise<TicketAssociationProposal>;
  validate(ctx: TrustedCommandContext, input: {
    proposalId: string; ruleVersion: string;
  }): Promise<AssociationVerdict>;
  commit(ctx: TrustedCommandContext, input: {
    proposalId: string; expectedTicketVersion: number;
  }): Promise<AssociationCommitResult>;
}
export interface ActionPlanCommandPort {
  commitPlan(ctx: TrustedCommandContext, input: {
    ticketId: string;
    expectedTicketVersion: number;
    mandateRef: string;            // 只作为待验证引用，非权限凭据
    existingBusinessIntentRef?: string; // 可选已有意图引用；Engine 验证或生成
    proposedItems: ProposedActionPlanItem[];
  }): Promise<{
    planId: string;                // Engine 创建
    businessIntentId: string;      // Engine 绑定或创建
    committedActionIds: string[];
    reusedActionIds: string[];
    aggregateVersion: number;
  }>;
}
export interface TelemetryEvidencePort {
  acceptAndCheckpoint(ctx: TrustedCommandContext, input: NormalizedTrigger):
    Promise<{ committedRef: string; replayCursor?: string }>;
  loadWindow(ctx: TrustedCommandContext, key: string):
    Promise<TelemetryWindowSnapshot | null>;
}
export interface SessionMandateBindingPort {
  getActiveBinding(ctx: TrustedCommandContext, sessionId: string):
    SessionMandateBinding | undefined;
  // 必须从本地受信快照同步读取并校验 tenantId；守卫内不发远程 RPC。
}
```

**领域写入分工**：路由器仅提交 `ProposedActionPlanItem`；`commitPlan()` 在 `Store.atomic()` 内验证真实 Ticket/Mandate、租户/行为者、已有 BusinessIntent 的归属、当前 Policy/ExecutionScope 及 `expectedTicketVersion`，由 Engine 生成 `planId/actionId` 和可执行 `ActionPlanItem`，并按 §6.2 的唯一规范重算 `normalizedArgsHash/businessEffectKey`。调用方自报的同名字段即使出现在外部 payload 中也应忽略并审计；不能把 TS 类型检查当成安全边界。若语义参数与已存在的相同意图操作冲突，返回 `BUSINESS_INTENT_CONFLICT`，不能因新哈希而绕过原动作。

**ActionPlan 原子提交命令的实施约束**：`commitPlan()` 必须在一个 `Store.atomic()` 内同时完成：验证原生 Ticket/Mandate 与 expectedVersion → 写入 `mesh_action_plan`、`mesh_action_run` 或复用已有 ActionRun → 增加资源/幂等唯一约束 → 为需要执行的新 Action 持久 `Effects.enqueue()`。任何异常整体回滚。不得先 `afterCommit()` 再插入持久 Effect，也不得让旁挂插件先独立提交扩展表而后“通知 Engine”。外部 Jev/LLM/RPC 调用只能在事务外；结果携版本令牌回交 Engine。

**领域关联约束**：Jev 提议不能自动完成 Subscription。`AssociationCommandPort.commit()` 的租户与行为者来自 `TrustedCommandContext`，不再接收调用方自由提供的 `actorRef`；只接受来源可验证的 Ticket 专属引用、明确可信的人类确认，或唯一且符合原生领域策略的关联证据；同仓库、同服务、同客户仅为候选召回证据。须核验候选唯一性、租户、角色、Mandate 和 Ticket 版本。

**Session 权限绑定**：同步最终守卫仅使用本地受信授权快照及实时安全拒绝列表；按租户查询，并核对 `expiresAt/emergencyRevocationEpochSeen`。数据未加载、过期、冲突或紧急撤权时拒绝。正常 Policy 更新按原生 Mandate 生命周期处理，不能把所有 Policy 版本变化直接解释为活跃授权撤销。

### 5.1.1 异步适配器与同步 Engine 命令的唯一边界

已公开的 `Store.atomic<T>(operation: () => T): T` 接受**同步回调**，上游 Engine 领域状态推进为同步命令；§5.1 中 `Promise<...>` 是供异步 Source/路由器使用的**外层 Port 契约**，不能理解为事务本身可 `await`。建议落地为两个清楚的过程（以下是**项目拟新增伪代码**，不是现成上游 API）：

```ts
// 网络、Jev、LLM、只读外部查证必须在事务外。
async function commitPlanAdapter(
  trustedCtx: TrustedCommandContext,
  proposal: ProposedPlanInput,
): Promise<CommitPlanResult> {
  const prepared = await prepareExternalEvidence(proposal);
  // 内层同步执行；事务中不得再调用异步函数。
  return engineExtension.commitPlanSync({ trustedCtx, proposal, prepared });
}

// 这是待开发的 *同进程* Engine 扩展命令，不是另一个服务/数据库。
function commitPlanSync(input: VerifiedPlanInput): CommitPlanResult {
  return store.atomic(() => {
    assertTrustedActorTenantMandateAndVersion(input);
    const saved = writeNativeAggregateAndExtensionPlan(input);
    // 同一 Store.atomic 内对每项新的 ActionRun 单独创建持久工作项。
    for (const action of saved.createdActions) {
      effects.enqueue('action', `action:${action.actionId}`, action.immutablePayload);
    }
    // saved.reusedActions 仅记录 REUSED 引用，绝不重复入队。
    return saved.result;
  });
}
// 事务提交后 Effects 才执行 RPC/Worker；执行结果用新命令回交 Engine。
```

**实施约束**：伪代码中的 `engineExtension`、`prepareExternalEvidence`、`writeNativeAggregateAndExtensionPlan` 均须项目实现并用 M0/M2 编译测试；`saved.createdActions`/`saved.reusedActions` 为项目拟新增的同步提交结果，不代表原生返回类型。每个新动作必须在**同一事务中**各自入队；任意一个 Effect 入队失败时整个 Plan/ActionRun/Effects 回滚，已复用的动作只添加引用不入队。真实 `Effects.enqueue` 的 kind/Key/Handler 注册按 §13.2 校验。`Store.atomic()` 的任何回调都不得返回 Promise、`await` Jev/LLM/RPC 或启动不受持久 Effects 跟踪的副作用。M0 先验证原生 `Store.atomic + mesh_m0_probe + Effects` 的提交/回滚，M2 才补真实 ActionPlan/Run 单事务提交；两者不得混淆。

### 5.1.2 EvidenceCapture：只实现业务证据契约，不复制 Web 网络层

本项目建议提供轻量 `EvidenceCapturePort`（拟新增项目类型，**不是**声称 Harness 存在该导出）：

| 输入 | 输出 | 不变量 |
| --- | --- | --- |
| 来自受信 HTTP/Service 入口的 `TrustedRequestContext`（§14.4）及只读外送许可、实际 provider/endpoint、批准查询或 URL、数据等级 | `evidenceRef`、`captureStatus`、`sourceUri`、`retrievedAt`、`capturedContentHash`、`artifactRef`（可空）、实际 `model/tool/usage` 引用 | 先授权/校验目的地再网络调用；项目只存必要脱敏快照和来源，不建第二数据真相库 |
| 原生搜索结果 / 网页 Markdown / OCR 提取 / API 错误 | `SOURCE_METADATA_ONLY / NORMALIZED_TEXT / VERIFIED_ORIGINAL` 等可复核级别及失败原因 | 搜索摘要≠抓取原文；Markdown 哈希≠原始 HTML 字节哈希；不将模型生成回答标为外部原文 |

权限检查由受信业务边界和工具/网络限制共同执行；`EvidenceCapture` 不可自带直连隐藏后门或伪造 `TrustedCommandContext`。在 M0 仅完成静态契约和离线 Fixture，正式接入以该阶段上游公共接口、费用和审计证据实测为前提。禁止在 `Store.atomic()` 回调内执行 Web / 模型 / OCR 网络请求。

**只读与写入身份不能混用（V1.2 复审）**：`TrustedRequestContext` 在 §14.4 定义为只读请求的受信身份契约；§5.1 的 `TrustedCommandContext` 是 Engine 写入命令的独立受信输入。二者都须服务端验证并绑定同一真实租户/actor，不能从 LLM/HTTP Body 自报构造。`TrustedRequestContext` **不足以写入** ActionRun；`EvidenceCapture` 直调 `ctx.web` 必须经显式 `EvidenceGateway` 校验而不是假设 ToolGuard 自动覆盖。

### 5.1.3 Web 网络派发的可实施绑定与故障关闭（V1.2 第三轮复审）

**上游限制（源码已核对，组合未测）**：rc.3 `WebRuntime.search()/fetch()` 在调用时才通过 `selectSearchProvider()/selectFetchProvider()` 读取当前可变配置；DeepSeek Provider 的 `dispatchDeepSeekWeb()` 又异步解析密钥和最终 endpoint 后才发出 `fetch()`。公开 `ctx.web` 接口没有“业务审批决定 + 不可变最终 endpoint/凭据绑定”的入参，也没有可由 SuperAgent 完全证明的统一 pre-dispatch Gate。Transport 内部 `waitToSend/recordRequest` 不是已公开的领域授权接口，不能当作所有 Provider 的通用安全钩子。

**优先实现的方案 A（锁版隔离静态执行域，不改上游网络栈）**：

1. 在单独受限容器/进程的固定 profile 中，**只装配一个经批准的 Web Provider**，锁定 Search 与 Fetch 的 Provider ID、最终 base URL、固定计费方式/凭据来源，禁止运行中改配置、热替换或账号路由回退。实际配置及启动环境由部署者控制；不为不可信 Worker 开放 Provider 设置 API、修改环境、读取凭据或任意直接网络出口。
2. 业务请求首先取得受信 `EvidenceGateway` 只读批准，记录 `authorizationRef/actor/tenant/dataClass/providerId/endpointOrigin/credentialIdentityRef/egressPolicyVersion/budgetRef/revocationEpoch`。此处的身份引用**不是明文 API Key**；业务批准与供应商请求计费、出站审计分别留证。
3. 通过**不可绕过的出站网络策略/固定代理**将该执行域限制在被批准的目标端点和目的地；验证 HTTPS、重定向、DNS/IP、代理通道及进程级旁路阻断。对于直接 `ctx.web` 与模型侧 `web_search/web_fetch` 均应走同一受限执行域，或分别证明每条真实出口受同等约束。
4. 安全策略和凭据轮换期间应先暂停接纳新请求/排空或终止旧执行域，再创建经新审批的执行域；中途被撤权的在途网络请求不能声称可自动撤回，须审计并对账。不能证明配置不可变、凭据来源固定及网络边界有效时，**关闭该 Provider 的真实调用**，仅允许离线 Fixture。

**方案 B（仅在需要动态 Provider 时另立隔离验证分支）**：通过锁版最小扩展让 WebRuntime/Provider 向受信最终派发策略传入**已选 Provider ID、请求/数据级别、真实 endpoint origin、凭据引用/类型（不含明文）、预算与撤权 epoch**，在真正发网之前执行原子一致性校验，拒绝未经批准的变化；还须对任何其他 Provider / API / 网络旁路设置隔离。它是**拟新增接口，不是现成 Harness 公共 API**；没有编译、竞态探针、网络阻断和多 Provider 回归证据前禁止使用。不得为实现方案 B 新建第二业务队列/Engine，也不得提前升级 Harness gitlink。

**必测竞态与不可推定能力**：在 Gate 通过后、Provider 选择前切换配置；在凭据异步解析时更换账号或同一 `credentialRef` 内容；在 Provider 已选后改变 endpoint；在取消/撤权与实际发出间制造竞争；绕过 `ctx.web` 直接调用底层 HTTP；模型工具独立路径。记录发网次数、捕获 endpoint/凭据**类型及引用**、策略版本和拒绝证明，**不记录密钥内容**。若任一可写/敏感数据路径无法证明最终出站等同批准值，则 fail-closed。

**结论**：用户界面、Markdown 配置、业务“发出前检查”都不是实际网络策略的证明。只有静态隔离执行域 + 实际出口验证，或经过单独审查与真实运行验证的最终派发拦截，才能使 Web 能力从 `FIXTURE_ONLY` 申请 `READY_READONLY`。只读 ≠ 可无约束外送；任何真实外送都须先通过本功能准入。

### 5.2 Cordis 服务与扩展领域桥接

统一服务入口命名为 `CognitiveMeshService`，作为 Cordis 服务供 Source、Assessor 与治理插件共享。服务对外暴露 `acceptSourceEvent()`、`proposeTicketLink()`、`evaluateAdmission()`、`proposeActionPlan()`、`enqueueAction()`、`publishContextPatch()`、`inspectAssignment()`、`evaluateExit()` 等类型化方法；其中所有会修改 Ticket、Mandate、Assignment 的请求必须经过 SuperAgent Engine 领域命令，不允许调用方直接写 Store。

插件初始化顺序为 `contracts → store extensions → governance policy → source adapters → decision services → action gateway → executors → side routers → watchdog/outbox`。任何新插件应声明依赖，提供健康状态及退出钩子；因端口未就绪导致启动失败时必须停止接入新的事件，同时允许已持久化的 Effects 在服务恢复后重试。

插件禁用分为两类：**接入类**禁用后停止接收新增事件，但历史事实保留；**执行类**禁用后不再分配新动作，运行中动作进入可恢复的暂停或安全结束流程。插件卸载不能删除持久化 SessionEvent、Ticket 或 ActionRun 数据。

### 5.2.1 M0 Bridge 生命周期的最小 TypeScript 骨架（设计样例，未编译）

官方 SuperAgent `src/index.ts` 是一个 Cordis 插件入口，公开 `name`、`inject`、`apply(ctx, config)` 并 `new Runtime(...)`，其 `package.json` 通过 `dsh.bundle.patch` 指向 `cordis.patch.yml`。**第一版不必再发布单独的 `dsh-superagent/mesh` npm 子路径**：只在这个已加载的 Bundle 里安装受控桥接，减少包导出和版本漂移。以下代码演示真实**安装/注销职责**，不是完整 Service 或生产插件：

```ts
// 新文件 src/extensions/mesh/index.ts：M0 仅做 Cordis 生命周期最小验证
import type { Context } from '@deepseek-ai/cordis';

export function installMeshM0(ctx: Context): void {
  ctx.logger.info('[cognitive-mesh] m0 bridge installed');
  ctx.effect(() => () => {
    ctx.logger.info('[cognitive-mesh] m0 bridge disposed');
  });
}

// 在 fork 的 src/index.ts 既有 apply() 内，原生 Runtime ready 后接入：
// import { installMeshM0 } from './extensions/mesh/index.ts';
// await runtime.ready;
// installMeshM0(ctx);
// 注意：这只验证 Bundle 管理的生命周期，不代表已注册 CognitiveMeshService。
```

**下一步才是 Cordis Service**：M0 核对锁定 `@deepseek-ai/cordis` 的 Service 注册/`inject` 类型及插件卸载事件后，再在原生 `Runtime` 内暴露受控 `CognitiveMeshService`，仅对已验证 Source/Assessor/Engine 暴露端口；若 Service 装配不能通过编译，应停止进入 M1。独立子插件的包入口、`exports["./mesh"]`、`name: dsh-superagent/mesh` 及 patch 插入必须同时存在、经 `pnpm check` 与 `dsh --dump-config` 验证，不能直接复制示意字符串假装已安装。

### 5.3 按需建立代码包，避免 17 个空插件

- **M0 建立**：`superagent-bridge`、`contracts`（仅当前用到的类型）、最小 `governance` 与 Fixture/测试目录；验证 Cordis 注册与销毁。
- **M1 增加**：`plugin-fastpath`、`plugin-jev` 和必要 Source/内存投影；已有 GitHub/Feishu Source 能用则直接复用，不创建空的同名替代插件。
- **M2 增加**：`plugin-main-router`、`plugin-executor-rpc`、最小 `lazy-synth`/`side-ontology`；Tier3 直接复用 DshExecutor，除非实证需要桥接包。
- **M3 增加**：`plugin-side-trend` 与 ContextPatch 适配，不预装向量数据库。
- **M4 增加**：Watchdog 与 ExitGate 的最小实现，复用已有治理包。
- **M5 增加**：固定 `executor-sop`、最小 `executor-team`、遥测 Fixture Source、架构图运行数据只读视图。

各阶段必须写清“复用的上游实现”“新增的业务逻辑”“未实现的目标能力”。所有扩展模块通过一个 `CognitiveMeshService` 入口装配，**不得因为新增了一个阶段就创建第二套 Engine、Ticket 或独立任务队列**。

## 6. 领域模型、扩展数据和状态机

### 6.1 保留原生领域实体

- `Source`：事件源种类与实例；保留接入位点、Channel 和线程上下文。
- `Trigger`：一个来源事件的不可变事实，保留 Source 原生身份和稳定 ID。
- `Thread`：来源定义的消息/事务线程；`Correlation` 仅提供上下文不自动路由。
- `Eval / Decision`：一次批量语义准入判断与可追溯结论。
- `Mandate / Policy`：授权依据与范围；不得直接由非可信文本写入。
- `Ticket`：一项经授权的工作；`Assignment`：某次执行器绑定。
- `Subscription / Input`：后续上下文投递到Ticket 的原生机制。
- `Outbox / Receipt`：渠道回执和重试。

### 6.2 拟新增扩展数据（不可替代原生 Ticket）

扩展记录在同一个受控 Store 中保存，均带 `tenant_id`、记录版本及必要的创建/修改时间。主键引用原生 Trigger、Ticket、Assignment；绝不建立平行的 `bus_ticket`。下述为规范字段清单，实际 DDL 和 TypeScript 类型必须由同一份 Schema 源生成或在 CI 中比对。

| 记录 | 主键 / 必需业务字段 | 唯一性与写入责任 |
|---|---|---|
| `mesh_entity_anchor` | `tenant_id, trigger_id, anchor_type, anchor_key, source, confidence` | `(tenant_id,trigger_id,anchor_type,anchor_key)`；Source 规范化 |
| `mesh_ticket_card` | `tenant_id, ticket_id, ticket_version, summary, anchors, state, tokenizer_profile, serialized_token_count, budget_status` | `(tenant_id,ticket_id,ticket_version)`；只读投影 |
| `mesh_decision_trace` | `tenant_id, eval_id, decision_seq, engine, prompt_version, model, outcome, confidence, evidence_ids` | `(tenant_id,eval_id,decision_seq)`；JevAssessor |
| `mesh_relation_proposal` | `tenant_id, proposal_id, trigger_id, candidate_ticket_id, rule_version, proposal_version, evidence_fingerprint, evidence_refs, evidence_kind, candidate_count, actor_ref, decision_actor_ref, status, expected_ticket_version` | `(tenant_id,trigger_id,candidate_ticket_id,rule_version,proposal_version)`；同证据指纹禁止产生平行提案；关联领域服务 |
| `mesh_action_plan` | `tenant_id, plan_id, ticket_id, ticket_version, origin_trigger_id, business_intent_id, plan_version, supersedes_plan_id, status, row_version, settlement_state, outstanding_action_count, settlement_event_ref, outcome` | `(tenant_id,plan_id)`；另有 `(tenant_id,ticket_id,business_intent_id,plan_version)` 唯一；`settlement_state=OPEN/SETTLED` 是执行结清投影，独立于 Plan 生命周期；Engine 扩展命令 |
| `mesh_plan_settlement_event` | `tenant_id, plan_id, settlement_event_id, refset_fingerprint, action_versions_fingerprint, outstanding_action_count, outcome, settled_at, actor_ref` | `UNIQUE(tenant_id,plan_id)`；仅在全部引用已结清时同一 Store 事务写入一次；结清事实去重，不是独立调度队列 |
| `mesh_action_run` | `tenant_id, action_id, primary_plan_id, business_intent_id, business_effect_key, action_kind, canonical_target, normalized_args_hash, tier, status, reason_code, next_retry_at, budget_id, attempt, mandate_ref` | `(tenant_id,business_effect_key)`；Engine 扩展命令 |
| `mesh_plan_action_ref` | `tenant_id, plan_id, action_id, ref_kind` (`CREATED/REUSED`) | `(tenant_id,plan_id,action_id)`；引用已完成动作不重新执行 |
| `mesh_action_attempt` | `tenant_id, action_id, attempt_no, execution_attempt_id, assignment_id, budget_id, budget_charge_ref, effect_key, effect_payload_fingerprint, remote_request_ref, remote_operation_ref, remote_idempotency_key, call_started_at, ended_at, result_ref, error_class, reconcile_status, last_reconcile_evidence_ref, permit_state, permit_token_digest, permit_issued_at, permit_expires_at, permit_consumed_at, permit_safety_epoch_seen, permit_version, gateway_verdict_ref` | `(tenant_id,action_id,attempt_no)` 及 `(tenant_id,execution_attempt_id)` 唯一；`assignment_id` 可空；外部请求标识与不确定结果证据保留，缺失远端回执不得伪造 |
| `mesh_execution_budget` | `tenant_id, budget_id, owner_kind, owner_id, mandate_ref, root_budget_id, parent_budget_id, first_started_at, start_admission_ref, deadline_at, max_attempts_total, attempts_used, budget_version` | `(tenant_id,owner_kind,owner_id)` 唯一；M2 根预算固定为同 Ticket/Mandate 的 `MANDATE_ROOT`，所有 ActionRun/Assignment/Session/Team 共享根截止时间和总尝试次数；可选受信子预算只能收紧 |
| `mesh_context_patch` | `tenant_id, patch_id, ticket_id, ticket_version, session_id, binding_version, mandate_ref, patch_version, payload_ref, payload_bytes, payload_format, payload_hash, evidence_refs, status, enqueued_at, injected_at, model_request_ref, evidence_status, consumed_observed_at, model_request_occurred_at, expires_at` | `(tenant_id,ticket_id,session_id,patch_version)`；`payload_bytes` 与创建/队列事实同 SQLite 事务落地，`payload_ref` 指向受限不可变内容；`EXPIRED` 不复活 |
| `mesh_context_patch_evidence` | `tenant_id, evidence_id, patch_id, model_request_ref, request_occurred_at, observed_at, session_id, source_event_ref, evidence_fingerprint, verdict` | `UNIQUE(tenant_id,patch_id,evidence_fingerprint)`；核验通过的请求引用另设条件唯一索引；不可变证据明细是权威来源，Patch 主表仅为兼容投影；M3 |
| `mesh_ontology_proposal` | `tenant_id, proposal_id, domain, schema_version, proposal_fingerprint, candidate_diff, evidence_refs, review_status` | `(tenant_id,domain,schema_version,proposal_fingerprint)`；OntologySideRouter |
| `mesh_trend_finding` | `tenant_id, finding_id, cluster_key, observation_window_id, evidence_fingerprint, event_ids, hypothesis, confidence, decision` | `(tenant_id,finding_id)`；另有 `(tenant_id,cluster_key,observation_window_id,evidence_fingerprint)` 唯一，保留窗口新证据 |
| `mesh_sop_step` | `tenant_id, sop_run_id, step_id, step_version, state, input_hash, output_ref, checkpoint_ref, retry_of_step_version, logical_effect_ref` | `(tenant_id,sop_run_id,step_id,step_version)`；M5 固定 SOP 真实步骤状态 |
| `mesh_team_run` | `tenant_id, team_id, ticket_id, parent_assignment_id, state, budget_ref, verifier_ref` | `(tenant_id,team_id)`；TeamExecutor |
| `mesh_team_subtask` | `tenant_id, team_id, subtask_id, session_id, role, state, artifact_ref, evidence_ref` | `(tenant_id,team_id,subtask_id)`；M5 独立 Agent 会话与交接 |
| `mesh_watchdog_observation` | `tenant_id, observation_id, assignment_id, observation_window_id, trajectory_hash, score, action` | `(tenant_id,observation_id)`；另有 `(tenant_id,assignment_id,observation_window_id)` 唯一 |
| `mesh_gate_audit` | `tenant_id, gate_audit_id, action_id, session_id, mandate_ref, mandate_policy_version, safety_policy_version, emergency_revocation_epoch, verdict, reason_code, evidence_ref` | `(tenant_id,gate_audit_id)`；Authority / Exit |
| `mesh_session_mandate_binding` | `tenant_id, session_id, assignment_id, ticket_id, budget_id, immutable_mandate_ref, mandate_policy_version, safety_policy_version_seen, emergency_revocation_epoch_seen, scope_ref, binding_version, active, parent_session_id, expires_at` | 单一 Session 同时最多一个有效绑定；Engine 受信路径 |
| `mesh_incident_episode` | `tenant_id, incident_id, upstream_incident_id, episode_scope_key, source_instance, rule_id, entity_id, episode_index, lifecycle_state, source_epoch, last_accepted_source_epoch, last_accepted_source_seq, last_accepted_event_ref, order_basis, opened_at, last_seen_at, closed_at, current_severity, business_intent_id` | `(tenant_id,source_instance,incident_id)` 与 `(tenant_id,source_instance,episode_scope_key,episode_index)` 双唯一；只有可信的同作用域单调先后证据才能推进 CLOSED→OPEN，乱序待定不派新意图 |
| `mesh_telemetry_window` | `tenant_id, source_instance, source_epoch, aggregation_key, window_start, window_version, count, max_severity, evidence_refs, replay_cursor, incident_id` | `(tenant_id,source_instance,source_epoch,aggregation_key,window_start,window_version)`；来源 epoch 隔离游标与窗口 ID，引用规范故障实例，TelemetrySource |
| `mesh_exit_report` | `tenant_id, ticket_id, report_kind, report_version, evidence_refs, render_ref, outbox_key, workflow_status, transport_state, delivery_state, receipt_ref, human_work_item_id` | `(tenant_id,ticket_id,report_kind,report_version)`；ExitGate / Outbox；人工待办与普通通知分离 |
| `mesh_human_work_item` | `tenant_id, work_item_id, ticket_id, exit_report_ref, reason_code, evidence_fingerprint, owner_ref, state, opened_at, due_at, acknowledged_at, resolved_at, resolution_evidence_ref` | `(tenant_id,ticket_id,reason_code,evidence_fingerprint)` 去重；M4 持久人工处理入口，即使 ExitReport 静默也必须可查询 |

**Ticket Card 的默认预算**：对整张卡片的规范序列化形式使用锁定 tokenizer 计量 `≤150 Tokens`；`summary ≤80` Unicode 字符（学习版建议默认值，后续以实测调整）、`anchors ≤10` 是辅助约束，不能替代 Token 计数。优先保留精确 Ticket/PR/Commit/租户标识，超预算走 `CARD_BUDGET_EXCEEDED` 回退，不截断精确身份。

**业务幂等身份**：`businessIntentId` 由 Engine 在验证受信业务请求或已绑定的 `IncidentEpisode` 后确定性创建/复用，MainRouter 只能建议动作而不能自行签发新意图；在重新评估、告警修订、重新规划时复用；`businessEffectKey = SHA256(UTF8(JCS(["v1",tenantId,businessIntentId,actionKind,canonicalTarget,normalizedArgsHash])))`，**不得包含 `planVersion`、`attemptNo`、随机 Action ID**。只有独立且获授权的新业务意图才可以创建新的 `businessIntentId`。不同计划重复请求相同 `businessEffectKey` 时，只引用已有 ActionRun 或已确认结果，绝不再创建执行项；`mesh_plan_action_ref` 记录复用关系，原 ActionRun 仍只属于其原始 primary plan。

**规范化哈希版本**：`JCS` 表示 RFC 8785 规范 JSON 序列化，采用 UTF-8 字节、无歧义 JSON 数组与固定字段顺序；`v1` 是本项目业务键规范版本，不能与业务 Plan 版本混用。所有字符串需先按 actionKind 的受信规则进行身份/目标规范化；任何算法升级必须有兼容迁移与旧键复用策略，不能重新执行已存在的业务效果。

**ContextPatch 不可变载荷与恢复来源（M3）**：`payload_bytes` 是在同一 SQLite Store 中保存的、受大小限制且经过脱敏的规范 UTF-8/JSON 字节（`payload_format` 指定编码/规范化版本）；`payload_ref` 是同租户、同 `patch_id` 的受限行内载荷引用，不是 Session/模型自由提交的外部 URL。由受信 Engine 在事务外准备原始内容，然后在一个 `Store.atomic()` 中保存 `ticket_version/mandate_ref/binding_version/evidence_refs`、原始 `payload_bytes`、`SHA256(payload_bytes)` 和唯一持久投递 Effect；任一环节失败整体回滚。**仅保存哈希、无法取回原始内容，不满足 M3 可靠恢复要求**。恢复时从该行获取精确字节并重新计算哈希；不得让模型重新生成替代内容，不得接受客户端自报的 payload 引用。内容丢失、哈希不匹配、租户/授权/会话版本不合法时返回 `PATCH_PAYLOAD_UNAVAILABLE` 或 `PATCH_PAYLOAD_MISMATCH`，拒绝投递并保留审计。敏感载荷需实施最小访问、大小上限、保留期、删除后引用可验证性和日志脱敏。原表增字段，不新增并行业务队列或第二事实库。

**ContextPatch 双轴证据枚举**：`status` 是唯一投递生命周期，`evidence_status` 为单独只读证据投影，取 `NO_REQUEST_EVIDENCE / ACTIVE_REQUEST_VERIFIED / HISTORICALLY_CONSUMED / INVALID_EVIDENCE`；初始 `NO_REQUEST_EVIDENCE`，正常在有效期内合法 `CONSUMED` 对应 `ACTIVE_REQUEST_VERIFIED`，`EXPIRED` 后才发现原有效期内模型请求只能为 `HISTORICALLY_CONSUMED`，不可转回 `CONSUMED`。不可信证据可记 `INVALID_EVIDENCE`，不得覆盖已经核实的有效证据。补录须由受信 Adapter 追加不可变请求证据引用并以版本/CAS 更新投影，防止乱序重复回执改变历史事实。

**ContextPatch 多请求不可变证据契约（M3）**：`mesh_context_patch_evidence` 才是“哪个模型请求何时实际包含了哪份 Patch”的权威多行事实，记录来源事件、Session、受信请求发生时间及核验结论 `VERIFIED/REJECTED`；同一 `(tenant_id,patch_id,evidence_fingerprint)` 重放不重复插入，重复提交同一可信 `model_request_ref` 不产生第二条已核验消费。`mesh_context_patch.model_request_ref/consumed_observed_at/model_request_occurred_at` 是兼容显示用的**确定性汇总投影**（选择最早受信请求时间、再按请求 ID 排序），不能把第二次请求覆盖为唯一历史。新增证据在同一 `Store.atomic()` 中先落不可变证据行再 CAS 更新汇总；若主表已 `EXPIRED`，仅更新 `evidence_status=HISTORICALLY_CONSUMED`、不修改 `status`，也不重新注入。无受信发生时间/Session 身份不能标为 `VERIFIED`；无效证据不覆盖已经核验的真实消费。

**关键语义**：`mesh_context_patch.injected_at` 表示投递成功，不等于模型已收到。`model_request_ref` 必须可验证为包含该 Patch 的模型请求；不具备该证据时维持不确定态。Outbox 的渠道接受（Channel accepted）与收件人送达（Delivery confirmed）分别存储；不支持终端送达回执时只承诺渠道接受。

**Mock 参数规范化（首期足够，不做通用规则引擎）**：每个启用的 `actionKind` 必须注册一个确定性规范化器。`BILLING_FREEZE` Mock 仅以受信 `accountId`、目标扣款状态 `enabled=false` 等**真实效果参数**计算 `normalizedArgsHash`；请求时间戳、告警严重度、解释文本和 `planVersion` 不进入哈希。生产意义的参数（账户、金额、目标环境、最终操作）变化时必须停下重新评估和重新授权，不能靠修改哈希绕过同一业务意图的防重约束。M2 只需要实现当前使用的 Mock Action 规范化测试。

**首期参数指纹的明确计算方式**：`normalizedArgsHash = SHA256(UTF8(JCS(["args-v1", actionKind, normalizedSemanticArgs])))`。其中 `normalizedSemanticArgs` 只能由 Engine/ActionGateway 针对已登记的 `actionKind` 白名单抽取并按固定字段类型规范化；例如 `BILLING_FREEZE` 只使用已核实的 `accountId`（字符串）和 `enabled=false`（布尔值）。统一输入 `actionKind`、同一语义效果不得因参数顺序、非业务解释文本、重试时间变化而改变指纹；不同账户/操作效果不能被错误合并。M2 用固定向量测试相同含义复用、不同含义拒绝。

**原生执行关联与认领边界**：`ActionRun` 是一次稳定业务动作，原生 `Assignment` 是 Agent 执行分配，不强制一对一。`mesh_action_attempt.assignment_id` 是可空受信引用：Tier1 无 Agent 时为 `NULL`；Tier3/4 在创建或绑定原生 Assignment 后由 Engine 以相同 `tenant_id + ticket_id + mandate_ref` 验证并写入。相同 ActionRun 重试可在不同 Attempt 关联不同 Assignment；通过 `(tenant_id,assignment_id)` 索引可以从 Watchdog/Session 反查 Attempt → ActionRun → 业务效果。禁止从 Worker/LLM 自报 Assignment 身份。`ActionRun.CLAIMED` 的认领事实以锁版原生 Effects 工作项 `(kind,key)` 的状态/租约为权威，`mesh_action_run` 不重复维护独立 `claimed_by/lease_until` 争夺锁；若原生未提供所需租约能力，M0 必须记为待验证，M2 禁止声称具备可靠并发认领。 **可恢复工作项**的恢复与认领必须经同一受信 Engine/Effects Adapter 做 CAS：先核验 Effect 当前未在途且不可变 payload 与 `businessEffectKey` 一致，再在同一个 `Store.atomic()` 中保存 ActionRun 合法迁移和对原逻辑 `(kind,key)` 的重新激活/延迟调度；不得通过新 `actionId`、`attemptNo` 或改变 Key 绕过幂等。若锁版原生 Effects 不能安全重新激活已完成/失败工作项，M2 仅允许保留 `PAUSED/RETRY_WAIT` 及人工显式恢复入口，**不得宣称自动恢复可用**。

**ExecutionAttempt 计费与原子闸（M2）**：`max_attempts_total` 在本项目 M2 明确定义为**同一根工作内可产生外部副作用的执行许可总数**；只读 Worker/模型回合不计入该计数，但必须受同一根墙钟、Session 角色与实际工具权限限制（不得将可写工具伪报为只读）。区分 Effects 调度领取、资源锁检测和**可能真正触发外部副作用的执行许可**。单纯 `CLAIMED`、`RESOURCE_BUSY`、锁释放或测试期间的只读检查不扣 `attempts_used`；受信 Engine/Effects Adapter 在即将发起首个可产生副作用的 RPC/Tool 之前，必须通过 `Store.atomic()` 同时（1）验证 Mandate/Scope/根预算截止时间与原 Effect claim 的权威状态，（2）在根预算上 CAS 验证已由首次工作启动固定的时限（若当前执行本身就是首项工作，则原子初始化根时钟），并将 `attempts_used` **增加一次**，（3）插入唯一 `execution_attempt_id` 与同一 `budget_charge_ref`、原 Effect Key 和不可变 payload 指纹，再授予可追踪的单次执行许可。`UNIQUE(tenant_id,execution_attempt_id)` 及版本/CAS 使崩溃重放同一许可不会重复扣费；一旦许可已发，即使进程在实际网络发送前崩溃也**保守计为已使用**，除非有受信事实可证明未发生效果且明确实现受控退款审计，学习版默认不退费。下一次实际尝试须经原业务键、前次结果对账和新的有界许可；不得以重新领取/新 Assignment 免费执行。根额度耗尽返回 `EXECUTION_BUDGET_EXHAUSTED`，未发送且无未知结果的动作依合法状态进入 `BLOCKED`，结果不明则保持 `UNKNOWN_RECONCILE` 并人工处理。**此处为拟新增 Adapter 契约，不声称锁版原生 Effects 已存在 claim_token/租约接口；未实测原子闸时禁止自动可写执行。**

**执行许可生命周期与撤权竞态（M2，依附 ActionAttempt 而不另建调度器）**：每个实际可能对外写入的 `ActionAttempt` 持久保存 `permit_state=ISSUED/CONSUMED/EXPIRED/REVOKED/ABORTED`、`permit_token_digest`（不保存可直接调用的明文令牌）、`permit_issued_at/permit_expires_at/permit_consumed_at`、`permit_safety_epoch_seen`、`permit_version` 和 `gateway_verdict_ref`。Engine 在 §6.2 的原子计费事务中签发 **短期、仅一次、仅指定调用** 的许可：绑定 `tenantId/actionId/executionAttemptId/businessEffectKey/effectKey/effectPayloadFingerprint/mandateRef/budgetId/operationKind/canonicalTarget/normalizedArgsHash` 及当前撤权 epoch；模型与普通 Worker 不得自行签发或接触高权限明文凭据。`ISSUED` 只有在受信 ActionGateway/ToolGuard **每次实际外发前**经过租户、目标、一次性令牌、原生 Effect claim、实时安全快照及 epoch、期限、根预算/资源锁的重新校验，并在同一 Store 事务完成 `ISSUED → CONSUMED` 的 CAS 后才允许发起该次调用；两个并发消费者最多一人成功。未消费的许可到期/撤权为 `EXPIRED/REVOKED`，无网络发送的受信取消可为 `ABORTED`；这些状态不得转回 `ISSUED` 或转为已消费。消费后既不能再次消费，也不能用同一令牌重发；已消费但缺失可信远端回执的 ActionRun 必须进 `UNKNOWN_RECONCILE` 并优先查询远端，不能凭 Worker 自报“尚未发送”自动退款/重发。**安全撤权与许可消费必须针对同一持久撤权 epoch 串行验证**：先完成撤权提交者使旧许可的消费 CAS 失败，先成功消费者可能已经成为在途调用；本地事务与外部网络调用不具备原子性，必须保守对账，**不能承诺撤权可追回已消费或已发出的远端效果**。若业务要求撤权生效后远端绝不再执行，即须远端共同校验撤权版本或使用可阻断的可信网关，否则该安全级别不可宣称通过、`ACTIVE` 不启用。学习版只在隔离 Mock 证明上述边界，M0/M2 要实证原生 Hook/Handler 能否完整拦截所有可写路径。

**外部写请求的最小对账凭证（M2）**：每个真正可能产生副作用的 Attempt 在发送前存储 `execution_attempt_id`、`businessEffectKey`（跨所有重试固定）、`effect_key`、`effect_payload_fingerprint`（对不可变执行载荷 JCS 哈希）、可追踪的本地 `remote_request_ref` 和目标环境/资源受信引用；实际请求按远端契约传送 `remote_idempotency_key=businessEffectKey`，服务端若返回 `remote_operation_ref` 则追加保存。结果、错误类别、远端可验证状态和 `last_reconcile_evidence_ref` 指向受访问控制保护的**不可变**证据，后续每次对账以受信时间、操作者、版本和证据引用追加审计而不覆盖既有远端事实。断线/超时/响应丢失进入 `UNKNOWN_RECONCILE`；优先按远端幂等键或操作 ID 查询，能证明未执行并且有效授权/根预算未超额时才允许原逻辑工作项受信继续。**远端无可查询状态且不支持可验证幂等键时，禁止自动重试**，保留 `UNKNOWN_RECONCILE + reasonCode=RECONCILIATION_MANUAL_REQUIRED` 并通过受信对账命令/后续 M4 HumanWorkItem 人工处置；不可拿本地发送成功当成远端已执行，也不能把未知简单改为失败。

**只读 Attempt 的字段约束**：仅在需要执行可写 RPC/Tool 时，`mesh_action_attempt.permit_*` 才必须非空且扣减根额度；只读 Worker/纯查询可保留用于 Assignment 关联的 Attempt（许可字段为 `NULL`），其启动仍须通过根时钟准入和 ToolGuard。不得将 `NULL` 许可字段解释为写入可通行。

**副作用单元与远端幂等键边界**：M2 的一个 `ActionRun` 仅定义**一个确定性外部业务效果**；其多次 Attempt 可以在同一远端幂等契约下复用固定 `businessEffectKey`，但一个 Tier3 Agent Session 若拟进行两个**不同语义**的写操作，必须分别经受信 Engine 建立明确的两个 ActionRun/效果键（或在未来 G 阶段另设计已审计的稳定子操作键），不得把相同 `remote_idempotency_key=businessEffectKey` 盲用在两个不同 RPC 上。只读工具调用不消耗副作用许可，但仍须在开始工作前纳入根时钟与同步 ToolGuard；任何未在 ActionPlan 中获授权的可写 Tool 必须拒绝。

**学习版 Schema 收敛规则**：§6.2 列出的是目标数据清单，不要求 M0 在 SQLite 里一次创建全部表。M1 只新增已实际使用的事件/工单卡投影；M2 增加 ActionPlan、ActionRun、ActionAttempt、稳定 `mesh_execution_budget`、业务复用关系和最小提案；M3 增加 ContextPatch/TrendFinding；M4 增加 Watchdog、`mesh_human_work_item` 与治理审计；M5 再增加 `mesh_sop_step`、`mesh_team_subtask`、`mesh_incident_episode` 和模拟遥测窗口表。每次扩展必须提供可重复执行的 migration、字段类型、唯一索引及必要恢复测试。

学习版不建设审批 UI，真实需要审批的动作一律拒绝；`approvedBy` 等字段在 Mock 流程中不伪造人工批准。若未来开启 `ACTIVE`，再补充审批数据实体、审批人范围、有效期、撤回和真实 Mandate 的一致性测试。

### 6.3 索引与唯一约束

- `UNIQUE(tenant_id, business_effect_key)` 约束真实业务副作用；`plan_version` 不进入副作用幂等键。禁止通过生成随机 ID 或增加计划版本绕过原操作去重。
- `mesh_action_plan` 新增 `ticket_version`（提交时受信 Ticket/CAS 快照）及可空 `supersedes_plan_id`（必须同租户、同 Ticket、同业务意图）；实施 `UNIQUE(tenant_id,ticket_id,business_intent_id,plan_version)`，禁止同一版本生成多个计划。新版本保留旧 ActionRun 与复用引用，不能因 supersede 重发原业务副作用。
- 对同一 `business_intent_id + action_kind + canonical_target` 的语义效果，提交前在受信 Engine 事务中检查已有动作的参数指纹：相同参数复用，**不同语义参数拒绝并返回 `BUSINESS_INTENT_CONFLICT`**。M2 可对启用的 Mock Action 增加 `UNIQUE(tenant_id,business_intent_id,action_kind,canonical_target)` 防并发双写；真实允许同目标多次独立操作时必须签发新的受信业务意图。
- `mesh_relation_proposal`：`UNIQUE(tenant_id,trigger_id,candidate_ticket_id,rule_version,proposal_version)` 和 `UNIQUE(tenant_id,trigger_id,candidate_ticket_id,rule_version,evidence_fingerprint)`。同一规范证据重复上报复用既有 Proposal，**新证据**由受信 Engine 递增 `proposal_version` 后创建新行；终态提案不原地复活，提交时重新核验 Ticket/证据版本。证据类型与候选数量必须与字段一致。
- `mesh_action_plan.row_version` 是并发 CAS 版本，**不同于**业务 `plan_version`；`mesh_plan_settlement_event(tenant_id,plan_id)` 唯一，所有 `settlement_state=SETTLED` 必须有且仅有一条同事务的结清事件，并保存固定引用集与终态 Action 版本的指纹。结清先从 `mesh_plan_action_ref` 重算，不能以无保护的计数器 `-1` 递减。
- `mesh_action_attempt` 的 `permit_token_digest` 在同租户唯一，`execution_attempt_id` 与不可变 Effect/业务指纹绑定；只允许受信 Gateway 将 `ISSUED` 以版本/有效期/实时撤权 epoch 及消费 CAS 转为 `CONSUMED`。未消费许可撤销或超时不得再被使用；已消费许可的远端未知结果不能免费重试。

- `UNIQUE(tenant_id, ticket_id, session_id, patch_version)` 用于热补丁；重复投递还需根据证据哈希和已见模型请求判别是否已投递。`EXPIRED` 后的迟到证据只追加/更新受信证据字段，不再次入队；`evidence_status=HISTORICALLY_CONSUMED` 不能直接等同于当前 `status=CONSUMED`。
- `mesh_context_patch_evidence`：`UNIQUE(tenant_id,patch_id,evidence_fingerprint)`；对 `verdict=VERIFIED AND model_request_ref IS NOT NULL` 建立 `(tenant_id,patch_id,model_request_ref)` 的 SQLite 条件唯一索引，防止同一模型请求反复记为消费。证据行不可变，Patch 的单值请求字段只能是受信明细派生投影。

- `UNIQUE(tenant_id, domain, schema_version, proposal_fingerprint)` 用于本体演进提案。
- `UNIQUE(tenant_id, ticket_id, report_kind, report_version)` 与持久 Outbox key 建立稳定绑定。
- `mesh_action_attempt(tenant_id,assignment_id)` 为可空反向索引，回查原生 Assignment、SessionMandateBinding、Watchdog 轨迹和 ActionRun；所有非空绑定须校验同租户、Ticket、Mandate。不要给 `mesh_action_run` 添加强制 `assignment_id`，以免 Tier1 Mock 和多次恢复被误设成一对一。
- `UNIQUE(tenant_id,owner_kind,owner_id)` 约束 `mesh_execution_budget` 的**稳定预算所有者**；**M2 默认根预算所有者**是 `(tenant_id, ticket_id, immutable_mandate_ref)`，在 `mesh_execution_budget` 中以 `owner_kind=MANDATE_ROOT`、`owner_id=JCS(["root-v1",ticketId,mandateRef])` 唯一登记；`root_budget_id=budget_id`，`parent_budget_id=NULL`。根 `start_admission_ref` 必须指向一次已持久化的受信 `beginAuthorizedWork()` 准入事件，首次准入的 `first_started_at/deadline_at` 在同一事务由受信时钟 CAS 一次固定；即使随后启动 Worker 前崩溃，也不得回退或延后根时钟（保守提前计时）。同一 Mandate/Ticket 下所有 Plan/ActionRun/Attempt、原生 Assignment 与子 Session 的 `budget_id` **均引用这个根**，不能分别领取一份 30 分钟或独立 `max_attempts_total`。根在首次获受信 `beginAuthorizedWork()` 工作准入并提交时（发生在 `Assignment`/Tier1 Effect/只读 Worker 的实际工作之前）由 Engine 同步 CAS 固定 `first_started_at` 与 `deadline_at`；并发两个动作只允许一个成功初始化，另一项读取相同截止时间。若将来存在真正独立的 Mandate/Ticket，可经新授权创建不同根预算；若引入子预算，则 `parent_budget_id/root_budget_id` 必须显式链接且不得延长根期限或增加根尝试总额度。
- `UNIQUE(tenant_id,assignment_id,observation_window_id)` 用于 `mesh_watchdog_observation`；`observation_window_id` 按受信 SessionEvent 步骤范围/结束序号形成稳定 ID，重启同一窗口不重复注入。
- `UNIQUE(tenant_id,cluster_key,observation_window_id,evidence_fingerprint)` 用于 `mesh_trend_finding`；`evidence_fingerprint` 来自排序后的受信证据引用与规则版本，允许同一聚类在新窗口或新证据版本产生新事实，禁止对 `cluster_key` 单独作永久唯一约束。
- `mesh_relation_proposal.actor_ref` 和 `decision_actor_ref` 分别来自提出/提交时的受信 `TrustedCommandContext.actorRef`，不可从模型、Webhook 自报字段直接写入；确认者可空，未确认时不得伪造。
- `mesh_incident_episode` 除内部规范 `incident_id` 唯一外，`UNIQUE(tenant_id,source_instance,episode_scope_key,episode_index)` 防止同一 episode 并发双建。上游 `upstream_incident_id` 可以重用，但重新打开时需由可信状态机递增 `episode_index` 并生成新的规范 `incident_id`；窗口引用后者而非上游原始 ID。`last_accepted_source_seq` 只可在相同已验证 `source_epoch` 和 episode 作用域内按 CAS 前进；新 epoch 须有签名/可信游标世代或经过受信来源管理命令验证，旧 epoch 重放不得覆盖新 epoch。epoch 变化本身不授权重开，不得跨 epoch 直接比较 seq；无法建立跨 epoch 的可信因果关系时标记 `ORDER_UNVERIFIED` 并保持旧 episode 待定。跨不同 nativeEventId 的普通 revision 不自动构成全序。已有 `(sourceInstance,sourceEpoch,nativeEventId,nativeEventRevision)`（可全局唯一事件 ID 的来源允许省略 epoch）去重账本与可信 source cursor/序号同时参与审计。
- `mesh_session_mandate_binding`：对活跃行使用 SQLite 部分唯一索引（见下方 SQL），禁止同一 Session 同时绑定两个 Assignment；需实现 CAS 与回收后归档。子 Agent Session 须独立绑定且 `effectiveScope ⊆ parentScope`，继承父 Assignment 的剩余时间预算，不得重置或扩大。

```sql
CREATE UNIQUE INDEX ux_mesh_session_active
ON mesh_session_mandate_binding (tenant_id, session_id)
WHERE active = 1;
```
- `mesh_plan_action_ref(plan_id,action_id)` 允许新计划显式引用先前 ActionRun，禁止多个 ActionRun 表示同一业务副作用。
- 查询索引最小集合：`(tenant_id,updated_at)`、`(tenant_id,ticket_id,status)`、`(tenant_id,anchor_type,anchor_key)`；索引列必须存在于实际 DDL。所有读写都显式携带 `tenant_id`。
- 仅受信服务构造 `TrustedCommandContext`，所有写命令与实际执行时的查询显式使用受信 `tenantId`；即使首期单租户，也执行“事件 tenant 与当前实例 tenant 一致”的断言，禁止把请求体字段直接当作身份认证。
- G0 须提供 TypeScript 类型、DDL、Schema migration、唯一索引自动化一致性测试；未明确的字段不可依赖隐式 JSON 承诺其数据库约束。

### 6.4 状态机与事实分离

下表为**唯一规范状态机**。其余章节只能引用这些状态，不能新增未定义状态。状态表区分**提交前内存状态**与**可持久状态**；学习版只实现当前 M 阶段需要的子集，未实现的分支必须明确拒绝。`BLOCKED_CONFLICT` 属于 `reasonCode`，对应 `ActionRun.status=BLOCKED`，不是独立状态。

| 聚合 | 合法状态与关键迁移 | 不变量 |
|---|---|---|
| `ActionPlan` | **命令暂态**：`PROPOSED → VALIDATED`（仅 `commitPlan` 内存）；**持久态**：`COMMITTED → DISPATCHED → FINISHED / FAILED`；`COMMITTED/DISPATCHED → SUPERSEDED`；无动作合法 No-op 时可 `COMMITTED → FINISHED` | 正常 `FINISHED` 必须检查该 Plan 的**全部** `mesh_plan_action_ref(CREATED/REUSED)`，非仅已派发子集；`PENDING/CLAIMED/RUNNING/PAUSED/RETRY_WAIT/RECOVERING/UNKNOWN_RECONCILE/AWAITING_APPROVAL` 任一存在均不能结清；`SUPERSEDED` 仅停止旧 Plan 的新派发，保留 `settlement_state=OPEN` 直到全部引用动作终态，随后独立记录 `SETTLED/outcome`；不得伪称所有外部效果停止。原子取消必须证明未执行且无其他有效引用，健康 `RUNNING` 不被强行转恢复 |
| `ActionRun` | `PENDING → CLAIMED / PAUSED / AWAITING_APPROVAL / BLOCKED / CANCELLED`；`CLAIMED → RUNNING / PENDING / PAUSED / UNKNOWN_RECONCILE / BLOCKED / CANCELLED`（仅受信证据无法排除外部副作用时才允许 `CLAIMED → UNKNOWN_RECONCILE`；确认未调用外部资源才可退回 PENDING/PAUSED）；`RUNNING → SUCCEEDED / RETRY_WAIT / PAUSED / RECOVERING / UNKNOWN_RECONCILE / FAILED / BLOCKED`（转 PAUSED 必须证实尚无外部副作用）；`RETRY_WAIT → CLAIMED / PAUSED / BLOCKED / FAILED`；`PAUSED → PENDING / BLOCKED / CANCELLED`；`AWAITING_APPROVAL → PENDING / BLOCKED / CANCELLED`；`RECOVERING → RUNNING / PAUSED / UNKNOWN_RECONCILE / FAILED / BLOCKED`；`UNKNOWN_RECONCILE → SUCCEEDED / FAILED / BLOCKED / PENDING / PAUSED`（恢复排队仅在受信对账证明远端未执行后） | `PAUSED` 用于临时资源占用或可恢复授权等待，`RETRY_WAIT` 用于有界重试，均不是终态；`SUCCEEDED/FAILED/BLOCKED/CANCELLED` 是**不可被普通重放恢复的终态**。终态后的真实新业务请求必须重新授权、分配新的 BusinessIntent 并关联旧失败/取消事实，禁止为重试伪造新身份。`RESOURCE_BUSY` 对应 `PAUSED`、`TRANSIENT_EXECUTION_FAILURE` 对应 `RETRY_WAIT`；`CLAIMED → UNKNOWN_RECONCILE` 必须有外发可能性/崩溃窗口的受信证据、保存原 Effect 与 Attempt 关联并拒绝盲重试；`BLOCKED_CONFLICT` 仅用于确定不可解决的冲突 |
| `TicketAssociationProposal` | `PROPOSED → CONFIRMED / REJECTED / AMBIGUOUS`；终态不原地重开；新受信证据产生新 `proposal_version` 和 `evidence_fingerprint` | 同证据指纹重复请求只复用原记录，不得靠新版本重复授权；`CONFIRMED` 需 Engine 重验身份、唯一候选、Policy、Mandate 和预期 Ticket 版本，`AMBIGUOUS` 不授权 Subscription |
| `ContextPatch` | `CREATED → QUEUED / REJECTED / EXPIRED`；`QUEUED → INJECTED / REJECTED / EXPIRED`；`INJECTED → CONSUMED / DELIVERED_UNVERIFIED / EXPIRED`；`DELIVERED_UNVERIFIED → CONSUMED / EXPIRED`；`EXPIRED` 为投递生命周期终态 | `INJECTED` 不等于模型消费。若 `EXPIRED` 后才收到受信模型请求证据，**状态仍为 `EXPIRED`**，仅追加/核准独立的 `evidence_status=HISTORICALLY_CONSUMED`、`model_request_ref`、`model_request_occurred_at` 与 `consumed_observed_at`；请求必须发生在原 Session 有效授权且 Patch 未过期的时间内，否则记 `INVALID_EVIDENCE`，不得追认授权、重新注入或宣称当前会话仍在处理 |
| `ExitReport` | `PREPARED → SUPPRESSED`（静默保留、不排 Outbox，但必须处理的人类待办不消失）；`PREPARED → OUTBOX_PENDING → SENDING`；`SENDING → CHANNEL_ACCEPTED / SENT_UNCONFIRMED / FAILED`；`SENT_UNCONFIRMED → RECONCILING / CHANNEL_ACCEPTED / DELIVERY_CONFIRMED`；`RECONCILING → CHANNEL_ACCEPTED / DELIVERY_CONFIRMED / FAILED / MANUAL_REVIEW`；`CHANNEL_ACCEPTED → DELIVERY_CONFIRMED`（须有终端回执）；`MANUAL_REVIEW → RECONCILING / FAILED`（仅受信人工处置，不盲重发） | `SUPPRESSED` 是静默报告终态；无终端回执时 `CHANNEL_ACCEPTED` 为稳定可接受状态，不假装送达；进入人工处理要保留原因与证据 |
| `OntologyProposal` | `CANDIDATE → EVIDENCE_REVIEW → APPROVED → APPLIED → ROLLED_BACK`；`EVIDENCE_REVIEW → REJECTED` | 无审批不得 `APPLIED`；学习版仅生成提案，不执行正式 Schema 修改 |
| `HumanWorkItem`（M4） | `OPEN → ACKNOWLEDGED → RESOLVED / ESCALATED`；`OPEN → ESCALATED`；`ESCALATED → ACKNOWLEDGED / RESOLVED` | 与 `ExitReport.status` 解耦，`SILENT` 只影响外部通知；每次确认/解决由受信 actor、证据、expectedVersion 记录，超时未处理保持可查询并产生运维告警，不可自动关闭 |
| `SopStep`（M5） | 首期固定三节点：`READY → RUNNING → SUCCEEDED / FAILED`；**同一步的 `FAILED` 版本为终态**，受信重跑创建 `step_version+1` 的新 `READY` 行；目标扩展：`READY → WAITING_APPROVAL → READY / FAILED`、`RUNNING → COMPENSATING → COMPENSATED / FAILED`（旧 FAILED 版本如需补偿，须创建新的受信补偿记录，不原地复活） | 不允许在原失败行直接 `FAILED → READY`；新版本保留 `retry_of_step_version` 与 checkpoint；RPC 仍复用原业务 ActionRun/`businessEffectKey`，未知远端结果先对账，换 stepVersion 不能绕过幂等 |
| `TeamRun`（M5） | `PLANNED → DISPATCHED → EXECUTING → VERIFYING → COMPLETED / FAILED`；`PLANNED/DISPATCHED/EXECUTING → FAILED`（可核查不可继续且无未知副作用）；`DISPATCHED/EXECUTING → RECOVERING`（存在不确定执行或失联）；`RECOVERING → EXECUTING / VERIFYING / FAILED / CANCELLED`（必须先核查子任务/ActionRun 对账）；`VERIFYING → EXECUTING`（有界返工）；`PLANNED/DISPATCHED/EXECUTING/VERIFYING/RECOVERING → CANCELLED`（已发出未知结果仍保留独立对账） | Worker 崩溃、预算耗尽、无工件可从早期阶段以受信故障/预算证据结束，不能伪造 VERIFYING；未知副作用不得径直宣称 FAILED 无效果；M5 不实现 PAUSED；Verifier 无真实工件不得 COMPLETED |

**ActionPlan 全量聚合与结清（唯一判定规则）**：`status` 表示计划是否仍可调度，`settlement_state=OPEN/SETTLED` 表示所有**固定引用集合**（`mesh_plan_action_ref` 中 `CREATED` 和 `REUSED` 两类）是否已结清；`outstanding_action_count` 在受信 Engine/Store 同一快照中按**全量引用集合**中尚非 `SUCCEEDED/FAILED/BLOCKED/CANCELLED` 的动作数量计算，包含从未派发的 `PENDING` 和暂时等待的 `CLAIMED/PAUSED/RETRY_WAIT`。只有 `outstanding_action_count=0`，且所有未知远端状态已对账，才可写 `settlement_state=SETTLED` 和 `outcome=SUCCESS/PARTIAL/FAILURE`；合法零动作 Plan 单独记录 `outcome=NO_ACTION` 和独立无动作证据，不制造业务成功。正常 Plan 此时才可转 `FINISHED`。旧计划即使已 `SUPERSEDED` 或调度故障已 `FAILED`，仍保持该生命周期状态，直到所有引用动作结清才独立写 `SETTLED/outcome`；UI/ExitGate 以 `settlement_state` 和可信 ActionRun 证据判定结清，不将 `SUPERSEDED` 或 `FAILED` 当作执行完成。重规划期间**不能丢弃已经固定的引用集合**，重算只更改结清投影而非增加新的旧计划动作。

**Plan 结清投影的原子 CAS（M2）**：`mesh_plan_action_ref` 在对应 Plan 首次 `COMMITTED` 时成为固定引用集合，后续重规划只创建新版 Plan/引用，不移除旧 Plan 的引用。在 **ActionRun 每次合法迁移为终态**、Plan 首次提交引用、Plan `SUPERSEDED/FAILED` 及崩溃恢复校验时，受信 Engine 在同一 `Store.atomic()` 中按 `(tenant_id,plan_id)` 枚举受影响的全部 Plan，使用当前快照重新查询 `CREATED+REUSED` 引用和 ActionRun **权威终态**及版本，计算 `outstanding_action_count` 和 `outcome`，通过独立 `row_version` CAS 持久更新。没有完成远端对账的 ActionRun 不能假设终态。`outstanding_action_count` **只能重算不能以异步事件简单减一**，避免重复事件、同一 Action 被多个 Plan 引用和并发终态导致计数漂移。只有引用数为零且验证无未知效果时，在该事务中完成 `OPEN → SETTLED`、写入 `settlement_event_ref`、同时插入唯一 `(tenant_id,plan_id)` 的 `mesh_plan_settlement_event`（包含固定引用指纹和终态 Action 版本指纹）；同一个 Plan 的结清事件最多一次。若 CAS 或唯一键冲突，**重读权威状态后重新计算**，不得直接覆盖投影。Runtime 重启时先对比引用集/状态与投影，发现不一致则在开放计划上安全重算并审计；已有 `SETTLED` 事件不通过重放再次产生结清/通知。SQLite 单写者与同库事务是此设计的前提，跨独立数据库的异步缓存不得被当成权威。

`ExecutionScope` 不作为 Ticket 状态机的替代物。授权快照到期、紧急撤销或违反实时安全规则时，主动停止受影响 Session 后续工具执行，记录 `SCOPE_EXPIRED / SAFETY_REVOKED`；受影响 `ActionRun` 在能证明无副作用时进入 `BLOCKED`，否则进入 `UNKNOWN_RECONCILE`。对于 `TeamRun` 使用 `CANCELLED`，不得写未定义的 `TeamRun.BLOCKED`。普通策略改版不自动撤销已有 Mandate（见 §6.8）。

所有持久态迁移记录 `eventId、aggregateId、version、expectedVersion、changedAt、reasonCode、actorRef、evidenceRef`，通过受信 Engine/CAS 执行。对未列出的迁移统一返回 `INVALID_STATE_TRANSITION` 并写审计；仅在内存中出现的 ActionPlan `PROPOSED/VALIDATED` 不伪造已持久化证据。

### 6.5 标准事件信封及关联契约

所有 Source 先将外部输入映射为同一 `NormalizedTrigger`，然后提交给 Intake。该结构是 **Source 规范化结果**，不是绕过原生 Trigger 表的第二份事实来源。

**遥测类型约束**：本项目规范信封与 §7.3 的新 SourceKind 均使用 `telemetry-watch`；历史/第三方的 `telemetry` 如出现，只能由 Source Adapter 显式映射到该规范值，不允许两个类型直接混存。`incidentId` 在通用接口里可选，但 `sourceKind === "telemetry-watch"` 时**在提交 Intake 前必须成为非空的受信规范 episode 身份**：先验证上游 `incident_id` 并保存在 `upstream_incident_id`，由受信 Source/Engine 对同一上游故障的打开/关闭序列维护持久 `episode_index`，最终规范 `incidentId=SHA256(UTF8(JCS(["incident-v1",tenantId,sourceInstanceId,episodeScopeKey,episodeIndex])))`。即使上游关闭后重开仍复用同一原始 ID，也生成**新的规范 incidentId 和 BusinessIntent**；未关闭的窗口/严重度修订沿用同一 episode。不同来源实例以 `(tenantId,sourceInstanceId,incidentId)` 隔离。不能从消息正文/模型猜测 ID；生成失败时进入隔离审计，不派发重复业务动作。M5 Fixture 同时测试重复升级与独立故障。

```ts
interface NormalizedTrigger {
  schemaVersion: '1';
  tenantId: string;
  sourceKind: 'github' | 'ci' | 'feishu' | 'slack' | 'mail' | 'telemetry-watch';
  sourceInstanceId: string;
  nativeEventId: string;
  nativeEventRevision: string;
  sourceEpoch?: string; // telemetry-watch 使用可验证来源序号域；非遥测源可省略
  nativeThreadId?: string;
  occurredAt: string; // ISO 8601
  receivedAt: string;
  actor: { id: string; kind: 'HUMAN' | 'BOT' | 'SYSTEM'; trusted: boolean };
  addressed: boolean;
  text?: string;
  anchors: Array<{ kind: string; key: string; source: string }>;
  severity?: string;
  incidentId?: string; // telemetry-watch 在规范化完成后必填；由可信源规则确定，不信任原始文本
  payloadRef: string; // 原始证据引用，不放敏感密钥
  traceId?: string; // 可空；不用于跨渠道关联的唯一依据
}
interface TicketAssociationProposal {
  tenantId: string;           // 仅存储值；运行授权以 TrustedCommandContext 为准
  proposalId: string;
  triggerId: string;
  candidateTicketId: string;
  ruleVersion: string;
  proposalVersion: number;  // 同一规则的新证据版本由受信 Engine 递增
  evidenceFingerprint: string; // 规范化证据 hash，同一证据重放复用
  actorRef: string;          // 提案创建时从受信上下文写入
  decisionActorRef?: string; // 确认/拒绝时从受信上下文写入
  evidenceRefs: string[];
  evidenceKind:
    | 'EXPLICIT_TICKET_REFERENCE'
    | 'UNIQUE_RECORDED_CHANGE'
    | 'RELATED_SOURCE_CONTEXT'
    | 'SEMANTIC_CANDIDATE'
    | 'AMBIGUOUS_OR_CROSS_TENANT';
  candidateCount: number;
  status: 'PROPOSED' | 'CONFIRMED' | 'REJECTED' | 'AMBIGUOUS';
  expectedTicketVersion: number;
  score?: number;             // 仅排序参考，不能当授权证据
}
```

**来源 epoch 信任规则**：`sourceEpoch` 不是客户端任意提交的字符串，而是由经认证的 Source Adapter 从上游启动世代、签名 cursor lineage 或受信人工切换记录提取并校验的不可变序号域。只有来源保证事件 ID 全局稳定且游标没有重用时才可以按兼容模式省略 epoch；若上游重启后序号或 ID 可能重置却没有可核验 epoch，遥测生命周期必须 `ORDER_UNVERIFIED` 且不能自动重开；不得通过重置 `sourceInstanceId`/构造任意 epoch 来伪造新业务意图。

**验收规则**：一般来源的去重身份沿用 `(tenantId,sourceKind,sourceInstanceId,nativeEventId,nativeEventRevision)`；对会跨重启复用 nativeEventId、且使用来源生命周期序号的 `telemetry-watch`，规范去重身份必须增加**已验证** `sourceEpoch`（或由可信来源实例命名空间等价承载），不同 epoch 的同名事件不能误合并，同一 epoch 的重投不能形成两条业务事实；编辑产生新修订；重复回调不重复触发 Task。业务主体标识由来源规则映射成稳定锚点，不根据显示名称直接认定两个身份相同。原始 `payloadRef` 受到存储访问控制，非可信外部文本不能被当作授权指令。

### 6.6 扩展状态转换的持久化语义

`ActionPlan` 在 `commitPlan()` 命令内先经过**暂态** `PROPOSED → VALIDATED` 校验，校验通过才在一次事务中首次以 `COMMITTED` 落库；`ActionRun` 一旦 `SUCCEEDED`，后续计划只能引用该成功结果，不能重新执行。收到超时、连接断开或未知远端回执时置为 `UNKNOWN_RECONCILE`，禁止直接判失败或盲重试。已证明确实未发生副作用且仍获授权，**仅非终态** `UNKNOWN_RECONCILE/PAUSED` 才可经受信 CAS 转回 `PENDING`；普通重试使用 `RETRY_WAIT` 和同一业务幂等键。`FAILED/BLOCKED/CANCELLED` 终态不得因旧事件重投、同一意图重规划或换 Assignment 而复活。**CLAIMED 的外发不确定窗口**：执行器应先持久提交合法 `RUNNING`/Attempt 再外发；若恢复时权威状态仍为 `CLAIMED`，而已知远端可能执行且无法证明绝未外发，只允许经 §6.4 所列的受信 CAS 转为 `UNKNOWN_RECONCILE`，保存原业务键、Effect/Attempt 和远端请求引用，不得直接转 PENDING/PAUSED/FAILED 或重发。能证明未外发时方可按表中合法路径退回队列。可恢复的资源占用必须预先归类 `PAUSED`，瞬时失败归类 `RETRY_WAIT`；真正终态后的独立新请求应重新验证授权、外部状态与需求真实性，签发新 BusinessIntent，并在审计中关联旧 ActionRun，禁止仅为重试而换 ID。

`ContextPatch` 仅在一次**可归因的模型请求实际包含 Patch**时标记 `CONSUMED`；`agent.inject()` 返回、`agent/inbox/inserted` 或 `agent/inbox/claimed` 均不单独满足条件。若锁版 Harness 无法提供可靠请求证据，保持 `DELIVERED_UNVERIFIED` 直到过期。**未过期时**迟到的可靠证据可以 `DELIVERED_UNVERIFIED → CONSUMED`；**已经 `EXPIRED`** 则不发生状态逆转，只以受信补录写入 `evidence_status=HISTORICALLY_CONSUMED` 及原请求时间、观察时间和模型请求引用，须核对原有效授权窗口，且 UI 分开展示“投递已结束/历史确曾进入模型请求”。无法确定请求发生时间或无法验证身份、会话、租户、授权的证据不能补录为消费。

`ExitReport` 的 `CHANNEL_ACCEPTED` 仅表示渠道接口已接受发送请求；`DELIVERY_CONFIRMED` 需要该渠道实际提供可靠的收件送达证据。没有终端回执时保留 `CHANNEL_ACCEPTED`，不虚构已送达。结果未知经 `RECONCILING` 查询；无法对账时进入 `MANUAL_REVIEW`，不得无界重发。

`OntologyProposal` 无审批不可应用；`TeamRun` 无独立 Verifier 证据不得完成。所有状态迁移均需在 Engine 或受控扩展领域命令事务中持久化。原生 Ticket 状态独立于 ActionRun，不能根据模型评分自动覆盖.

**旧 Plan 替代与终态保护（唯一处理规则）**：Engine 在提交新版 Plan 的同一事务中标记旧计划 `SUPERSEDED`，完整列出其既有 `mesh_plan_action_ref`，并设置/维护独立的 `settlement_state`：由新 Plan 或其他仍有效计划引用的 ActionRun 必须继续保留；从未认领/派发且受信证据确认没有副作用的 `PENDING`，若无人再引用，才可按 Effect CAS 与版本条件取消；`CLAIMED` 只有锁版 Effect Handler 能证明未开始执行并已安全释放认领时才可取消。**仍在健康执行的 `RUNNING` 不因为 supersede 转 `RECOVERING`，保持原 Assignment/Effect 的真实状态、继续追踪原 ActionRun 结果**；只有受信心跳/租约证明失联才转 `RECOVERING`，远端实际效果不明才转 `UNKNOWN_RECONCILE`。若新版不再需要已在途的工作，可记录受信取消意向并在可靠的安全检查点停止，但未取得停止证明前不能标记 `CANCELLED` 或重新派发。`SUPERSEDED` 仅终止旧计划新增派发权，不改变已有业务键、不删执行事实，也不等于 `settlement_state=SETTLED`；运行中与未知结果仍计入未结清数量。

**预算权威与恢复不变量**：M2 的 `maxRuntimeMinutes=30` 与可写副作用 `maxAttempts` **默认授权给整份 `(tenantId,ticketId,immutableMandateRef)` 工作范围**，而非每个 ActionRun。Engine 在受信 Mandate 已确认后创建一个根 `mesh_execution_budget(MANDATE_ROOT)`，所有同根的 Plan/ActionRun/Assignment/Session/Team 子任务共享根 `budget_id`、同一个 `deadline_at` 和同一份 `attempts_used/max_attempts_total`；不得拆成两个动作各自获得 30 分钟。由**首次获 Engine 受信工作准入的 ActionRun/Assignment**（包括即将启动的只读 Worker、Tier1 Effect）在实际工作开始前于 Store 同步 CAS 中固定 `first_started_at` 与 `deadline_at=min(first_started_at+maxRuntimeMinutes,mandateExpiry,parentDeadline)`；根未启动时也必须检查 Mandate 本身的到期时间。**首次开始工作不是仅指第一次远端写**，不得通过先运行只读 Worker 推迟根截止时间。并发尝试以根预算 CAS 串行化，后来的动作继承原截止时间。**暂停、等待、离线和重启都计入墙钟**；超期拒绝新执行，但保留只读对账及受信审计。若业务需独立动作授权额度，必须由 Mandate 显式声明且采用根/子层级预算（子限制只能更严格），不得由动作数、Plan 版本、Session 或重试次数扩大根额度。

**首次工作准入闸（M2）**：允许已持久创建的原生 Assignment 进入实际执行、启动只读 Worker、领取 Tier1/Tier2 的实际工作或启动 Team 子会话之前，必须先由受信 Engine 执行同步 `beginAuthorizedWork({trustedCtx,rootBudgetId,startRequestRef})`；在**同一个** `Store.atomic()` 内核验 Mandate/Ticket、已有 Session 绑定（尚未建 Session 时核验拟建 Assignment 的受信身份，并在建立绑定后再次校验）和当前安全 epoch、预算未到期、来源授权，若根时钟为空则 CAS 写入受信时钟 `first_started_at`、稳定 `start_admission_ref`、`deadline_at=min(first_started_at+maxRuntimeMinutes,mandateExpiry,parentDeadline)`，若已启动则只能读取原截止时间并拒绝超期。该准入事务**成功提交后**，才允许触发 Worker/Effect 实际工作、Tools 或受限只读任务；未提交、CAS 失败或安全状态不明，一律不启动。两个并发 Assignment 只能有一个根时钟；准入后但尚未真正运行即崩溃时仍保留原起点（宁可提前计时，不得向后重置）。工作许可与副作用许可**不同**：只读 Worker 也要通过开始准入/守卫，但只对可写调用发放一次性 ExecutionAttempt 许可并扣 `attempts_used`。在原生 Hook 不能拦截所有启动路径之前，学习版禁止把未受控 Session 标成已具备该能力。

**Patch 多请求汇总更新**：模型请求证据经受信 Adapter 先写 `mesh_context_patch_evidence` 不可变事实，随后按明确的有效会话/有效期条件从明细确定性重算主表 `evidence_status` 和代表性 `model_request_ref`；同一个 Patch 多次出现在模型请求中不会覆盖旧证据。延迟到达的证据若与原授权窗口不一致应写 `REJECTED` 证据明细但不计为消费；`EXPIRED` 投递状态不倒退。

### 6.7 事件、任务与业务结果的引用关系

`SourceEvent(1) → Trigger(1) → Eval(0..n) → Ticket(0..n) → ActionPlan(0..n)`；`ActionPlan ↔ ActionRun` 由 `mesh_plan_action_ref` 记录“本计划创建”或“复用先前结果”，每个 ActionRun 仍恰好归属于一个 primary Plan；`ActionRun → ActionAttempt(0..n) → Assignment(0..1/Attempt)`；`Ticket(1) → Assignment(0..n) → Session(0..n)`。Tier1 无 Assignment，Tier3/4 的 Attempt 通过受信 `assignment_id` 反查 Watchdog/Session，同一 ActionRun 可跨 Attempt 关联不同 Assignment。`Trigger ↔ Ticket` 是审计关联，并不意味着能够自动建立 `Subscription`，实际扇出须经 SuperAgent 领域命令授权。

**原子提交契约**：一次 Engine 扩展命令在单个 `Store.atomic()` 中同步完成原生聚合的合法状态写入、`mesh_action_plan` 与所需 `mesh_action_run`/复用关系写入、业务幂等唯一约束检查、持久 `Effects.enqueue()`。任一步失败则全部回滚；成功后才由 Effects 在事务外执行。`afterCommit()` 只是进程内通知，不是可靠队列。模型推理或 RPC 在事务外执行，结果以 `requestId + expectedVersion` 回交 Engine；远端写结果不明时进入 `UNKNOWN_RECONCILE` 对账。

### 6.8 执行授权快照（ExecutionScope）

SuperAgent 原生 `Mandate` 是不可变授权来源，记录被接受工作时的 **`mandatePolicyVersion`**。普通 Policy 更新按原生语义通知现有 Ticket，不会自动撤销已有 Mandate。执行层为每个 Assignment 生成受信、只读 `ExecutionScope`，并额外引用**当前生效的** `safetyPolicyVersion / emergencyRevocationEpoch`；该实时安全控制可以收紧既有工具权限，但不能扩大 Mandate 范围。

```ts
interface ExecutionScope {
  mandateRef: string;
  budgetId: string;                  // 同 Ticket/Mandate 共享的受信根预算 ID，多个 ActionRun 也相同
  firstStartedAt?: string;           // 未开始时可空；首次受信工作准入提交后 CAS 固定（即使真正启动前崩溃也不延期）
  deadlineAt?: string;               // 已开始后必须有值，不可在恢复时向后推移
  mandatePolicyVersion: string;      // 接受工作时的授权快照，不随普通 Policy 变更而被替换
  safetyPolicyVersion: string;       // 同步安全守卫使用的当前强制规则版本
  emergencyRevocationEpoch: number;  // 紧急撤权单调递增，旧快照拒绝
  allowedActions: string[];
  prohibitedActions: string[];       // 默认含 DIRECT_PROD_DB_WRITE / GIT_FORCE_PUSH / MERGE_PR
  allowedResources: string[];
  allowedEnvironments: Array<'SANDBOX'|'STAGING'|'PRODUCTION'>;
  maxRuntimeMinutes: number;         // 默认是整份 Mandate/Ticket 根工作 30 分钟，不是每个 ActionRun 30 分钟
  maxAttempts: number;                // 默认根作用域所有 ActionAttempt 共用，分配子限额不能增加根额度
  approvedBy?: string;
  expiresAt: string;
}
interface SessionMandateBinding {
  tenantId: string;
  sessionId: string;
  assignmentId: string;
  ticketId: string;
  budgetId: string;  // 从稳定执行预算绑定而来，不因新 Session 重置
  immutableMandateRef: string;
  mandatePolicyVersion: string;
  safetyPolicyVersionSeen: string;
  emergencyRevocationEpochSeen: number; // 与当前 epoch 比对，旧值立即拒绝
  scopeRef: string;
  parentSessionId?: string;
  bindingVersion: number;
  active: boolean;
  expiresAt: string; // 与 expires_at 对应；到期不得执行后续工具
}
```

**合成有效权限（集合运算以每个维度独立计算）**：对 Tool/Action、Resource、Environment 分别求 `EffectiveAllow = (MandateAllow ∩ ExecutionAllow ∩ ParentAllow ∩ RoleAllow) \ (MandateDeny ∪ CurrentSafetyDeny ∪ ParentDeny ∪ RoleDeny)`。根 Session 不存在父级时省略父允许/禁止项；`CurrentSafetyDeny` 是**禁止集合，只能作差集、不能参与允许集交集**。任意允许集缺失、受信安全快照缺失或集合为空一律 fail-closed，不将未配置的 Allow 解释为全权限。`prohibitedActions` 及实时禁止列表优先于允许列表；范围之外还必须分别验证 `mandatePolicyVersion`、实时 `safetyPolicyVersion/emergencyRevocationEpoch`、租户、身份、审批、Session/Binding 有效期与预算。

**跨 Assignment/多动作共用根预算（以首次准入事务为计时点）**：`ExecutionScope.budgetId`、`mesh_action_run.budget_id`、`mesh_session_mandate_binding.budget_id` 均指向同一 `MANDATE_ROOT`（未来经明确授权的子预算只能附加约束）；同步守卫以根 `deadlineAt`、根 `attemptsUsed/maxAttemptsTotal` 和最新 CAS 版本校验，必要时再应用父/子较严限制。根 `firstStartedAt/deadlineAt` 由同一 Ticket/Mandate 下**第一次实际开始工作（包含只读 Worker）**在受信 Store 事务中固定；多个 ActionRun 不得分别初始化根。30 分钟墙钟计入暂停、等待、关机和重启，不因换 Plan、Attempt、Assignment、Session 或增加子任务而重置；尝试次数在该根下**合计**扣减。超期 fail-closed，仅允许已知效果的只读对账/审计。

**授权许可的最末端检查**：`ExecutionScope` 与 `SessionMandateBinding` 并不是可重用的远端写令牌。所有 Tier 的可写 Tool/RPC 均须经同一个受信 ActionGateway/ToolGuard 接口取得并**一次性消费** §6.2 定义的 `ExecutionAttempt` 许可，消费 CAS 对当前持久撤权 epoch、根截止时间、目标与 Effect claim 重新确认；普通 Jev/LLM/Worker 不可凭旧 Scope 直接外发。对于无法经过该入口的进程/外部网络写，必须依赖 OS/容器权限封堵并在 M2 禁止执行。已消费许可与随后紧急撤权之间存在不可原子消除的远端执行窗口，需对账和远端撤权能力，不能承诺撤回已在途 RPC。

**策略变更区分**：普通 Policy 改版只影响后续评估或通过领域通知影响在途 Ticket，不默认中止活跃 Mandate。安全紧急撤权由可信管理员或规则签发，在持久化状态中提高 epoch、停止分配、使同步守卫立即拒绝旧快照，并主动终止/暂停受影响的 Session；已经发出的外部副作用进入对账，不假定撤权可以撤销已发生动作。守卫的本地可读安全快照未准备、版本不可证实或存在冲突时默认拒绝。

**执行会话硬边界**：上游 `Sessions.ensure()` / 角色 preset 可能使用 `danger-full-access`；必须在 G0 最小修改中将 Worker、Team 子 Session 和需要受控执行的主 Session 切换为受限能力，配合独立 OS/容器账户、文件挂载、网络和凭据隔离。ToolGuard、Prompt 禁止词和 Shell 黑名单只构成多层防线的一部分，不替代 OS 隔离。对受限 preset 的任何意外覆盖须使 Session 启动失败。

## 7. L1 多源异构事件接入（1A / 1B / 1C）

### 7.1 1A：GitHub、CI/CD、研发事件

**复用**现有 GitHub Source 的 Issue/PR 评论接入及原生 Sender/Thread/Channel 规则。**新增** CI Pipeline Source：构建失败、部署回滚、测试失败等以 `Trigger` 输入，并保留原始 `run_id`、`repo`、`sha`、`actor_kind=BOT/HUMAN`、Webhook 签名验证结果。

**规范化**：`source_kind, instance_id, native_event_id, native_thread_id, actor_id, actor_kind, addressed, occurred_at, correlation_keys, payload_ref`。`Trigger.id` 必须基于来源主键确定性生成（修改事件附带更新版本）。同一 CI run 重投递不能产生多份相同事实。

**验收**：Issue/PR/CI 重投递同 ID 只入站一次；Bot 不被赋予人类显式请求强度；GitHub Thread 订阅逻辑原样工作。

### 7.2 1B：飞书、Slack、邮件

**复用**现有飞书 Source；Slack/邮件按 `docs/008-cookbook.md` 的 SourceKind 模式添加。保留群组、原生身份、引用链、@提及、附件摘要、消息原始位置、编辑/删除版本。聊天线程可与 PR 通过候选关联服务产生跨来源证据关系，但**不得伪造统一技术 trace_id**。

**验收**：群聊消息虽然不另建工单，仍可以作为已订阅 Ticket 的 Input；不同身份域不凭显示名称自动合并；回执幂等。

### 7.3 1C：生产遥测与业务告警

新增 `telemetry-watch` SourceKind（APM、对账、资损、风控）。与 §6.5 的 `NormalizedTrigger.sourceKind="telemetry-watch"` 对齐：所有被接收入业务评估的遥测 Trigger 必须带受信 `incidentId`，原始来源的 `incident_id` 经签名/来源规则验证后映射；无可靠外部 ID 时按持久化的故障开启/关闭与 `episode_index` 生成，不得因告警窗口变化重新签发身份。**统计窗口聚合键**使用 `tenant_id + source_instance + rule_id + entity_id + window_definition + window_start`，**不包含 `severity`**；严重度作为窗口可变属性（如 `maxSeverity`）及升级事实记录。跨窗口持续故障由稳定的 `IncidentEpisode` 关联 `businessIntentId`；一个窗口不是一个新业务意图。优先接收来源自带的可信 `incident_id`；没有时根据来源规则、实体与明确的故障打开/关闭状态生成可恢复的 `episode_index`。不应仅凭相同 rule/entity 将很久以后新的独立故障永久归并。指标样本与触发 Agent 评估的业务异常分层处理，不将每条原始样本转换为独立 Agent 请求。

**接收与证据可靠性**：
1. Source 必须声明 `evidenceMode=UPSTREAM_REPLAYABLE | LOCAL_DURABLE`，并在配置中提供游标/重放能力或本地持久化实现。没有任一能力时仅允许 `OBSERVE_UNRELIABLE` 演练模式，禁止向来源确认“可靠接收”。
2. `UPSTREAM_REPLAYABLE`：先落可恢复的 Source Offset/水位线及已处理窗口，再确认源端消费；故障恢复按游标重放并幂等去重。上游保留每条原始告警的审计事实；系统持久化证据引用与窗口汇总。
3. `LOCAL_DURABLE`：接收确认前将需审计的原始事实或可验证的原始证据清单持久化（可采用本项目受控 Store/顺序日志），再聚合和批量刷投影，不能只在内存计数。
4. 窗口开始时立即创建第一条高价值 `NormalizedTrigger`；重复告警只更新已可恢复的窗口计数及证据索引。跨阈值或窗口结算时可以生成有版本的增量 Trigger，但同一业务意图必须沿用已持久化的 `businessIntentId`，不能借事件修订或计划版本重新执行相同冻结/止损动作。内存窗口只是加速器，重启从已持久化记录/上游重放恢复。
5. 默认使用**固定时间桶**，并明确桶边界时区与迟到事件处理规则；若改用滑动窗口，必须定义事件可能命中多个窗口时的唯一归因与增量计算规则。

**背压与单写入者保护**：每个 Source 使用有界缓冲和独立限速；SQLite 写入排队严重时暂停或减缓上游消费、保留重放游标，不允许默默丢弃待审计事件。遥测与 GitHub/飞书的 Effects 采用合理并发配额。性能收益以实测为准，不承诺固定两个数量级。

**验收**：1000 条重复告警仅生成预期数量的业务动作，并可核验每条必须审计的上游原始证据或已持久化原始事实；在聚合中间强杀进程恢复后计数、游标与触发结果正确。对同一业务意图新增一个告警修订或 Plan 版本，必须命中已有 `businessEffectKey`，不能重发生产动作；源端不可重放时不允许把数据丢失风险标记为通过。

**Incident 重开、乱序和来源 epoch 协议**：`upstream_incident_id` 只是上游关联键，`episode_scope_key` 是受信来源规则/实体与可选上游身份组成的作用域。Source Adapter 必须先对 `(sourceInstanceId,nativeEventId,nativeEventRevision)` 去重，再确认上游是否提供**在同一 episode_scope_key 范围内可比较的单调生命周期序号、可靠持久游标或明确的 CLOSE→OPEN 因果版本**；单条消息的 `revision`、未经证实的 `occurredAt` 时间戳、模型结论均不构成跨事件全序。受信 Engine 在 Store 原子 CAS 中核验 `last_accepted_source_seq` 与当前 `lifecycle_state`：首次可信 OPEN 建立 `episode_index=1`，更高序号的 CLOSE 记录 CLOSED 和关闭事件引用，**仅严格晚于该 CLOSE 的新 OPEN** 才递增 `episode_index`、派生独立规范 incidentId，并在业务授权后建立新 BusinessIntent；旧 OPEN 或迟到的修订命中旧序号/已处理事件时仅记回放审计，不新建 episode。**若来源不提供可验证先后顺序**，将跨事件先后关系标为 `ORDER_UNVERIFIED`/隔离待定，保持已有 episode、不自动重开或签发新意图，需受信人工确认或增强 Source 接线后再处理。M5 只在具备可信序号的 Fixture 中演示自动重开，并增加乱序到达反例。

**来源序号重置/epoch 切换**：上游生命周期序号只能在 `(tenantId,sourceInstanceId,sourceEpoch,episodeScopeKey)` 内比较。Source Adapter 必须维护可信 `sourceEpoch`/游标世代与 `last_accepted_source_epoch` 的持久对应，证明新 epoch 来自签名的来源重启、可信 cursor lineage 或经审计的来源管理员操作；不能自行随机生成 epoch 来规避历史水位线。epoch 发生变化时，先保存切换凭证并继续去重/留存，但**epoch 变化自身不等于 CLOSE→OPEN**。若可信来源协议提供跨 epoch 的因果桥（例如持久 CLOSE 引用和后继 OPEN 关系），才能在 Engine CAS 下依据桥接证据合法重开；否则保留 `ORDER_UNVERIFIED`，不以新 epoch 的小 seq 作为“更晚事件”，不创建新 `incidentId`/BusinessIntent。所有可重放窗口、游标及 `(nativeEventId,revision)` 身份在 epoch 可能复用时必须含 epoch 命名空间，旧世代迟到事件只能登记回放审计。

**学习版 1C 实现**：M5 使用含**可信且可比较的 source lifecycle seq 与 `sourceEpoch`** 的本地 JSON Fixture 模拟严重度升级、告警重投递、窗口切换、旧 OPEN 迟到及**同一上游 `incident_id` 关闭后重新打开**。同一 episode 对应一个 `businessIntentId`，不因 `severity` 或窗口变化重新签发；可信重开必须有新的规范 `incidentId` 与 BusinessIntent。另用独立 `incident_id` 验证不同故障不误合并。Fixture 模式不对外 ACK，不声明生产遥测可靠性。正式遥测源上线时仍需执行前述可靠接收、留存/重放和故障恢复要求。

## 8. L2 准入过滤（2A / 2B）

### 8.1 2A：Fast-path

规则顺序：校验签名和来源配置 → 生成稳定 id → 接受入站并持久留痕 → 已见事件去重 → Actor 与 Scope 分类 → 来源速率和聚合 → 输出 `ROUTE_EVAL / ATTACH_CONTEXT / RECORD_ONLY / REJECT_INVALID`。**不可把 `NO_NEW_TICKET` 直接实现成丢弃所有上下文**。对无效签名保留必要审计，不保存秘密正文。

**接收留痕与业务去重的顺序**：先持久化来源收据或最小安全审计，是为证明收到并支撑可靠 ACK，并不表示每次重投递都新增一条业务 `SourceEvent/Trigger`。持久化收据后按受信 `(tenantId,sourceKind,sourceInstanceId,nativeEventId,nativeEventRevision)`（遥测事件 ID 可跨来源代际复用时额外包含可信 `sourceEpoch`）查询并施加唯一约束；命中重复时只追加/累加轻量 `DUPLICATE_RECEIVED` 审计计数或引用原始记录，直接返回既有 `TriggerId`，**不再生成 Eval、ActionRun、Effects**。如果是新修订，建立新不可变事实但沿用已绑定业务意图；不保存多份原文。M1 增加同一事件重复 10 次和首次提交前崩溃恢复测试。

`OBSERVE` 模式下仅记录模型决策，不派发外部动作；`SANDBOX` 允许隔离演练；`ACTIVE` 需能力清单允许后再接入有副作用目标。超时或异常保持现有 Engine 的重试与 `unavailable` 语义。

### 8.2 2B：Jev 语义门禁

**两条模型路径明确分离**：`JevAssessor` 通过锁定的 `@typesafe-ai/sdk` 与 TypeSafe Jev API 交互，提供结构化评估建议；`LazySynthesizer` / `DshExecutor` 使用 Harness Agent Session 及所选 DeepSeek/其它受支持模型服务。Jev 不是 `ctx.agents` 的原生方法，也不能把 DeepSeek 模型连接地址当作 Jev API 地址。M1 独立核实 TypeSafe SDK 的包版本、请求结构、必要环境变量（如 `TYPESAFE_API_KEY`，以官方锁版 SDK 文档为准）、账户配额、429/超时和回退；无凭据时可跑 Fixture，但**不得以 Mock 宣称在线 Jev 已接通**。

`JevAssessor` 适配 SuperAgent `Assessor`，通过持久 Effects 异步执行，不在 SQLite 事务内等待外部 API。使用经 G0 锁版的官方 `@typesafe-ai/sdk` `systemOne()/noul()/score()/choice()` 类型；蓝图中的 `jev.decide()` 是概念代码而非可直接编译的 SDK 用法。概率和类别必须依据版本锁定后解析，超时与低置信度进入 `UNDECIDED` 并保留记录，固定规则/原生 MasterAssessor 作保守回退。

**判别结果分离三个语义轴（本项目契约）**：

```ts
interface AdmissionDecision {
  actionableProbability?: number;
  urgencyScore?: number;
  shouldStaySilent?: boolean;  // Jev 独立语义问题；不是 route 的别名
  retention: 'AUDIT_MINIMAL'|'RECORD_EVIDENCE';
  workIntent: 'NO_NEW_TICKET'|'PROPOSE_TICKET'|'CONTEXT_ONLY'|'UNDECIDED';
  notificationIntent: 'SILENT'|'ACK_WHEN_REQUIRED'|'EXIT_ONLY';
  evidenceRefs: string[];
  modelVersion: string;
  ruleVersion: string;
}
```

- `shouldStaySilent=true` 只表示通知偏好或静默建议，不等于“不接入”“不留存”，也不等于没有工作诉求。多个 Trigger 的 `notificationIntent` 须分别落受信决策血缘：普通 ACK 与最终 Exit 通知为不同阶段，按来源 Policy/已授权收件范围**分别聚合**；同一 Ticket 的后续 `SILENT` 不得覆盖前一条已核准的通知意向，但更高优先级的渠道禁发 Policy 始终能否决外发。`HUMAN_DECISION_REQUIRED/HARD_BLOCKER` 的人工待办由 Engine 必须生成，独立于最终通知意向。

**L2 → 原生 Eval/Decision 适配矩阵（项目契约，非上游现成 API）**：FastPath 是**入站处理指令**，`AdmissionDecision.workIntent` 是**语义建议**，原生 `stop/ignore/unavailable/accept` 是**领域决策**；三者不同层级。须以锁定 SuperAgent 版本的实际 Decision 类型、Policy 与 Engine 命令验证；任何一个轴都不能单独产生新的 Mandate。

| 2A FastPath | 2B workIntent/条件 | 允许的原生行为 | 留痕与限制 |
|---|---|---|---|
| `REJECT_INVALID` | 不进入 Jev | 不创建合法 Eval/Ticket；安全审计 | 签名/来源无效不得被模型重新放行 |
| `RECORD_ONLY` | 无需判别；概念上 `NO_NEW_TICKET` | 合法事实留存，若需落原生 Decision 可采用 `ignore`，不得直接映射 `stop` | `RECORD_ONLY` **不是** workIntent 枚举值，仍可记录未来关联上下文 |
| `ATTACH_CONTEXT` | `CONTEXT_ONLY` | 验证已有 Ticket 和可靠引用后追加合法 Input/只读 Context；不产生新 Ticket | 无法验证时仅保留 Proposal；不自动建立 Subscription |
| `ROUTE_EVAL` | `PROPOSE_TICKET` | Engine/Policy 在原生 Eval 上验证后才可 `accept` 并建 Ticket | Jev 只建议；不符合授权时 `ignore` 或保持证据 |
| `ROUTE_EVAL` | `NO_NEW_TICKET` | 原生 `ignore`（不新增工作），但按 retention 留存事实 | 不能由此自动停止现有 Ticket |
| `ROUTE_EVAL` | `CONTEXT_ONLY` | 经受信 Ticket 证据校验后追加 Input/Context，未命中时只保留 Proposal | 不转为 `accept`，不创建 Ticket，也不自动 Subscription |
| `ROUTE_EVAL` | `UNDECIDED`、Jev 429/超时/类型错误 | 原生 MasterAssessor 安全回退；回退也失败时 `unavailable` 并按原生语义重试/留痕 | 禁止猜测为 `accept` |
| `ATTACH_CONTEXT` | `PROPOSE_TICKET` | **不允许本轮直接建 Ticket**，保留提案与决策不一致审计 | 如 Policy 允许新工作，必须重新走受信 `ROUTE_EVAL`，不可提升权限 |
| `ATTACH_CONTEXT` | `NO_NEW_TICKET` | 保留入站证据，不产生新的 Ticket 或未经授权的 Input | 记 `ROUTE_COMBINATION_MISMATCH`；禁止猜测属于已有 Ticket |
| `ATTACH_CONTEXT` | `UNDECIDED` | 保留证据，回退到受信 MasterAssessor，未取得明确关联前不投递 Input | 不将模型未知解释为许可 |
| `RECORD_ONLY` | 任意 workIntent（原则上不调用 2B） | 2A 规则优先：仅留存/最小审计，忽略不应存在的 workIntent | 对意外的强制 `PROPOSE_TICKET` 记录 `ROUTE_COMBINATION_MISMATCH`，不建 Ticket |
| `REJECT_INVALID` | 任意 workIntent（原则上不调用 2B） | 安全拒绝与最小审计 | 不因模型输出重新放行，不能产生 Eval/Ticket/Action |
| 可信且已明确批准的终止请求 | 不依赖 Jev 自行终止 | 仅 Engine 的受信 `stop` 路径 | `shouldStaySilent=true` 或 `NO_NEW_TICKET` 都不等于 `stop` |

**维度独立**：`retention` 决定证据保留级别，`notificationIntent` 决定默认通知意向，`workIntent` 决定是否提议新工作。2A FastPath 只负责确定性入站门禁；任何转换过程均不能由 Jev 评分赋予执行权限。M1 必须用每一行的正/负向测试，核对实际原生 `Eval/Decision` 字段。四个 FastPath 值与四个 workIntent 的 **4×4=16 种组合均应覆盖**（`RECORD_ONLY/REJECT_INVALID` 各以通配行覆盖 4 种不应调用 Jev 的情况）；对越级提案仅记录 `ROUTE_COMBINATION_MISMATCH`，绝不自动提升授权。

- `RECORD_ONLY` 是 2A FastPath 的入站处理指令，**不是** 2B `workIntent` 枚举成员；必须与 `retention`、`notificationIntent` 分开映射，既有 Ticket 的上下文可在授权后追加而不产生新 Ticket。
- 来源无效签名仍保留必要的最小审计记录（不保存未经验证的敏感正文）；有效但无动作价值的消息进入 `RECORD_EVIDENCE`，不直接进入垃圾丢弃。
- 允许通知的最终决定由来源 Policy 和 ExitGate 共同约束，Jev 不得绕过明确的静默策略，也不得授权任何外部写动作。

Jev 的 `Noul` 是肯定概率，不是工具许可；`Score` 的等级和 `Choice` 选项须按锁定 SDK 类型实现，置信度阈值从样本校准并记录版本。可观测指标分别统计“记录、创建工单、静默、回退”四类，而不合并为单一 `route`。

**学习版 2B 验收**：至少一次真实 Jev SDK 请求返回可解析结果且映射进原生 Eval；用 Mock Jev 适配器验证失败路径，不可把纯假结果计为“已接通 Jev”。对没有配置 API 凭据的开发机，应明确报告本项尚未通过，不进行模拟式成功标记。

### 8.3 服务端工具与 API 结果规范化（V1.2）

DeepSeek 2026-11-13 已提供 Messages / Responses / Chat Completions 的模型服务端网页工具及独立 Search/Fetch/OCR 等 API，但**不同协议和工具组合并不完全等价**。`deepseek_web_search/deepseek_read_url` 无法由 `tool_choice` 强制调用；某些其他工具类型不能与其组合。不得设计成“本地 ToolGuard 必定收到每一次服务端搜索事件”。

原始 HTTP 状态、协议事件、SDK 异常、工具执行/网页获取结果应分别保留。尤其在流式/非流式生成中 HTTP `200` 仍可能对应失败，安全校验也可能导致最终拒答；禁止以 HTTP 200 或已流出的部分文本直接创建已验证决策。规范化适配器至少区分 `COMPLETED`、`INCOMPLETE`、`FAILED`、`REFUSED`、`UNKNOWN`，再依据原生 Eval/Decision 语义保守映射。内容安全检查仅辅助风控，不代替受信身份/策略/业务安全守卫。

## 9. L3 主旁双轨与认知状态（3A / 3B / 3C1 / 3C2 / 3D）

### 9.1 3A：主路快速路由（MainRouter）

先按同租户、精确业务引用和时间窗口召回候选，再由 Jev `Choice` 做**候选排序而非权限判定**。Jev 仅输出 `TicketAssociationProposal`；任何将 Thread 附加到 Ticket 的操作都必须由可信 Engine 域命令判定。

| 证据等级 | 示例 | 允许行为 |
|---|---|---|
| `EXPLICIT_TICKET_REFERENCE` | 消息明确指向目标 Ticket 已登记的 PR/Issue/来源消息或其确认回执 | Source API/Policy/租户/状态验证且候选唯一后，由 Engine 提交 Subscription |
| `UNIQUE_RECORDED_CHANGE` | 来源证实最近变更与唯一目标 Ticket 存在**已持久登记且可验证**的关系 | 必须证明唯一性、相关方授权和 Mandate 边界；与上一行的显式专属引用**两类**均可在严格校验后由 Engine 自动提交 |
| `RELATED_SOURCE_CONTEXT` | PR 与 Ticket 同仓库/同服务/同部署流水线/同客户，但没有 Ticket 专属引用 | 只形成 Proposal 或不授予权限的 ContextPatch；**不能因同仓库而提交 Subscription** |
| `SEMANTIC_CANDIDATE` | 错误描述、时间、实体名称近似 | 仅候选召回、人工确认建议，不能建立 Subscription |
| `AMBIGUOUS / CROSS_TENANT` | 多个候选、来源身份冲突、跨租户 | 直接禁止自动提交，按规则进入人工判定或只记录证据 |

**受控命令**：`proposeThreadAssociation → validateAssociation → commitAssociation`。提交前必须检查 `proposalId, sourceEvidenceRef, evidenceKind, candidateCount=1, actorRef, tenantId, mandateRef, expectedTicketVersion, ruleVersion`，并再次读取候选对象确认没有竞争改变。`Subscription` 会将整个 Thread 的后续消息扇出给 Ticket，不能把它与一次性的只读证据交付混同。对于无权限扩展的上下文，使用受控 Input/ContextPatch，但不得伪造 Subscription 或以其绕过原生领域授权。

**一源多动作与跨计划幂等**：合法 Ticket 建立后生成 `ActionPlan`，每项使用受信的 `businessIntentId` 和稳定 `businessEffectKey`。计划修订、重复告警或重新分析时，执行命令先查询 `(tenantId,businessEffectKey)` 唯一约束：相同效果关联现存 ActionRun 及其结果（`mesh_plan_action_ref=REUSED`），不得创建新副作用。只有业务确实要求独立执行且重新获得授权，才能签发新的 businessIntentId。新 Action 的原生 Ticket、扩展计划、ActionRun 与持久 Effects 在一次 Store 事务内完成提交。

**冲突规则**：同一 `tenant + business_target + action_class` 采用持久版本检查、资源互斥和 CAS。可确定仅是**临时资源锁占用**时，在受信 Engine 校验尚无外部副作用后转 `ActionRun.status=PAUSED`、`reasonCode=RESOURCE_BUSY`，记录 `next_retry_at`/锁所有者证据和稳定工作项；锁释放后仍需检查当前权限、预算、原子认领与原逻辑 Effect 的安全重新激活，不得更换 `businessEffectKey`。对目标策略或不可协调的**永久冲突**才以终态 `BLOCKED + BLOCKED_CONFLICT` 记录。模型不得根据 Jev 分数抢锁、扩大授权或绕开 CAS。

### 9.2 3B：分层记忆与事件血缘

三个查询视图均是从原生事实构建的可重建投影，不建立第二个真相库：

- **Working Memory**：从 `Ticket/Assignment/Inputs` 投影 `TicketCard`：Ticket ID、一句摘要、领域、精确锚点、状态、版本。卡片先保留精确引用，再压缩自然语言摘要。
- **Event/Source Memory**：基于 `Trigger/Thread/SessionEvent` 建立时间和实体索引；原始事实保留在 Source/Store 责任域；可选向量/图检索，但不得用向量相似度取代受信来源关联。
- **Lineage**：使用 `trigger_id/eval_id/ticket_id/action_plan_id/action_run_id/assignment_id/context_patch_id/report_id/outbox_receipt_id` 保存边，附带时间、规则、模型版本、证据与处理状态。

**Ticket Card 的序列化硬约束**：学习版默认 `maxSummaryChars=80`、`maxAnchors=10`、`maxSerializedTokens=150`，分别映射 §14.1 的 `ticket_card_max_summary_chars/ticket_card_max_anchors/ticket_card_max_tokens`。采用锁定 tokenizer 或 Jev 请求侧等价 Token 计量，对整张卡片的规范序列化形式计量，包含字段名、实体锚点等。压缩顺序是降低非关键自然语言、剔除冗余锚点、使用结构化短键；不得截断精确 PR/Commit/租户标识。超预算不进入高频路由批次，记录 `CARD_BUDGET_EXCEEDED` 并改为候选二阶段检索或保守人工判别。通过回归测试确认压缩不会造成错误合并。

**一致性**：原生 Store 仍为单文件事务；所有投影写入依赖 Engine 事件与版本号，使用 schema migration。缓存只作为性能优化，过期或读到冲突版本时重新加载，不直接变更 Ticket。Outbox 发送回执补写血缘边，不将“已生成报告”当作“已送达”。

### 9.3 3C1：本体演进旁路

事件经 Effects 异步投递。先从可配置 `KnowledgeGraphPort` 查询相关 Schema 子图，再执行 `has_schema_gap` Jev 判断，形成 `OntologyProposal`。输出包括差异 JSON、证据、影响域、依赖关系、Schema 版本、验证报告。**提案≠事实**，不根据一次异常自动变更图谱。变更通过 Tier2 SOP（静态规则与版本兼容验证）；跨域重构经 Tier4 Team 出提案；受控审批后才可应用。

最小 KnowledgeGraphPort：`getSchema(domain, version)`、`relatedSubgraph(anchors)`、`validateDiff(diff)`、`stageProposal(proposal)`、`publish(approvedProposal)`、`rollback(version)`。初版可用版本化文件 + SQLite 投影，长期替换 RDF/图数据库；底层存储不强制绑定 Neo4j。

**学习版 3C1 范围**：M2 允许使用版本化 JSON/YAML Schema Fixture，执行一次确定性的属性/关系缺失检查，保存包含 `schemaVersion、missingConstraint、evidenceRefs` 的 `OntologyProposal`。可选由 Jev 辅助描述缺口，但不能将概率判断当成已验证 Schema 事实；**完成提案≠本体已修改**。

### 9.4 3C2：趋势聚类 / 根因线索旁路

**去重身份（M3）**：同聚类 `cluster_key` 不是唯一事件；按受信 `observation_window_id`（固定窗口）及 `evidence_fingerprint`（排序后 `evidenceRefs + ruleVersion` 的规范指纹）确定一条 TrendFinding。重复输入引用同一 Finding，新窗口/新证据版本创建新 Finding，禁止对 `cluster_key` 全局单列唯一。

从跨来源、跨天的可靠证据召回候选（默认近 7 天，可配置），按实体、症状、版本及时间共现形成 Cluster。Jev `Score` 仅提供疑似同因线索，不代表已验证根因；输出 `TrendFinding` 与 `RECORD / CONTEXT_PATCH / CREATE_SYSTEMIC_TICKET` 建议，后一项需重新走 Engine 授权链。

**ContextPatch 持久递送协议**：
1. 在事务外形成规范、脱敏的精确 Patch 字节；**同一 SQLite 事务**生成 `mesh_context_patch(CREATED)`，保存 `payload_bytes/payload_ref/payload_hash/payload_format`、`evidence_refs/ticket_version/mandate_ref/binding_version/session_id` 并登记稳定唯一投递 Effect。`payload_hash=SHA256(payload_bytes)`；不能只保存哈希、在恢复时调用模型重写原内容，也不能把提示词当作新指令授权。
2. Effects 将其置 `QUEUED` 并调用 Harness `agent.inject()` 或受控 AgentDelivery，返回成功时记 `INJECTED`，**仅代表已提交注入请求**。不假设空闲 Agent 自动唤醒，不以此认定模型已经看到内容。
3. `agent/inbox/inserted` 只能证实入 Inbox；`agent/inbox/claimed` 只能证实被消费流水线领取，二者均不足以证明输入确实进入模型。只有实际构造并发送的模型请求有可归因的 `patchId/modelRequestRef`、且锁定 Harness 确实提供该证据时，才允许记 `CONSUMED`（定义为**模型请求包含补丁**，不宣称模型已理解、采纳或完成动作）。
4. 仅有注入/领取证据时记 `DELIVERED_UNVERIFIED`；到期前收到可信请求证据时才允许 `DELIVERED_UNVERIFIED → CONSUMED`，生命周期结束则 `EXPIRED`。**`EXPIRED` 后迟到的可信消费证据只更新独立证据字段，不恢复 `CONSUMED` 或再次注入**；证据必须含可核实的原请求发生时间、patchId、受信 Session/租户/授权版本，且原请求在有效期内。若无请求证据则如实保留未证实状态。G0 若无法暴露可靠模型请求关联，不得把该状态写成 `CONSUMED`。
5. 重复 `tenantId + ticketId + sessionId + patchVersion` 或同证据哈希不重复投递；崩溃恢复先从同库取得**原始不可变载荷**，复验 `payload_hash`、原 Ticket 版本、Mandate、Session 绑定、撤权与过期状态，再查可信 Inbox/模型请求证据。`CREATED/QUEUED` 只有能证明未投递或存在可验证 Inbox 幂等映射时，才按原 Patch ID/Effect Key 重投原字节；`INJECTED/DELIVERED_UNVERIFIED` 已可能被模型看到，无法证明去重/对账时不得盲目重复注入，保持不确定态供人工处置。Session 已结束、取消、强制撤权或过期时，不重新唤醒无权 Worker：**尚未投递**（`CREATED/QUEUED`）的 Patch 可转 `REJECTED` 或 `EXPIRED`，**已经注入**（`INJECTED/DELIVERED_UNVERIFIED`）的依状态机转 `EXPIRED` 或在有效期内用可信请求证据转 `CONSUMED`；过期后补录历史证据不改变终态，不能抹掉曾经注入的事实。线索可作为后续合法 Ticket Input 留存。

**M3 崩溃与未知回执验证**：在数据库提交前、提交后 Inbox 接收前、Inbox 已接受但回执丢失三处注入故障，证明精确载荷可重取、哈希不变、Session/权限不越界、重复事件不创建第二条未经授权的输入。不能证明 Inbox 幂等与原请求身份关联时，保守留在未知投递态，不得自动二次注入。

**双路隔离**：已合法订阅 Thread 的主路 Input/Subscription 和旁路发现的 ContextPatch 是不同语义来源，但对相同证据的副作用不得放大；统一 `businessEffectKey` 保证两路消息不会再次执行已完成动作。

**学习版 3C2 范围**：M3 从 SQLite 中按同一受信业务锚点和最近七天时间范围召回少量事实，使用简单规则或 Jev 评分形成 `TrendFinding`；在已获授权的活动 Session 上走真实 `publishContextPatch()` 投递流程。只具备 `INJECTED` 或 `DELIVERED_UNVERIFIED` 证据时，应如实展示，**不得声称 Worker 已使用该线索**。若没有可验证模型请求关联，则保留不确定态并可用原生合法 Input 做下一次任务消息。

### 9.5 3D：惰性 LLM 合成与 Mandate 边界

仅在首次创建 Ticket、出现足以改变任务说明的重大信息、或满足准出条件需要撰写报告时调用 DeepSeek Session。生成模型负责整理背景、工作目标、证据清单、验证要求及**可审阅的文本草稿**，不负责票据授权或扩大权限。

**最小工具权限（M2 必须生效）**：`LazySynthesizer` 应使用独立的受限 Harness Session，默认**不暴露/不注册 Shell、文件写、外网请求、Git 操作、子 Agent 等可执行工具**，只接收 Engine 提供并已脱敏的 `evidenceRefs` 及所需只读文本/结构化事实；不得复用 Worker 的 `danger-full-access` 角色。仅在有确定的需求与有效授权时，才允许经受信服务提供经过范围控制的只读证据检索。若锁版 Harness 无法确认无工具模式已生效，学习版必须改用确定性文本模板，不把仅靠提示词约束的 LLM 当作安全隔离。M2 负向测试尝试诱导工具调用，应证明工具不可用。

**Mandate 信任链**：来源 Policy 和 Engine 验证身份、规则、资源、当前授权版本，生成原生不可变 Mandate；ExecutionScope 作为只读、受信的执行层快照（见 6.8）。LLM 可输出 `requested_capabilities` 建议，但不能签发 `allowedActions`，也不能修改 `prohibitedActions` 或运行超时预算；请求超界时学习版直接拒绝；目标架构若已有对应、尚未执行的 ActionRun 且支持受信审批流程，才可进入 `AWAITING_APPROVAL`，不得由模型自行改变状态或伪造审批。

**结案报告的惰性生成**：ExitGate 仅在有**与准出原因相匹配的可追溯事实**时，请求 `LazySynthesizer.renderExitReport({ticketId, evidenceRefs, exitReason, notificationIntent})`：`DELIVERABLE_VERIFIED` 要求独立交付验证，`HUMAN_DECISION_REQUIRED` 要求真实待决问题和选项，`HARD_BLOCKER` 要求可证实的阻碍事实；后两者不要求已有成功交付物。生成结果必须通过结构校验，不得凭空宣称 PR/CI 已通过；模型失败时可使用确定性模板降级。`notificationIntent` 仅控制**正常通知的候选意图**，不能抹掉必须人工处理的业务责任：`HUMAN_DECISION_REQUIRED/HARD_BLOCKER` 无论普通通知是否静默，Engine 都在事务内创建或复用一个可查询的 `mesh_human_work_item(OPEN)`，携明确问题/阻碍证据、受信处理人或值班责任域和到期检查；静默时 ExitReport 可为 `SUPPRESSED` 且**不排 Outbox**，但 WorkItem 仍保持 OPEN/ESCALATED，不等于事项已解决。正常通知被允许时才排 Outbox，发送及回执由原生 Outbox 推进。没有获授权的外部渠道时保留持久队列与本地运维提醒，**不得擅自绕过安全静默策略外发**。

继续保留 SuperAgent `stop/ignore/unavailable/accept` 领域语义与 MasterAssessor 兼容路径；Jev 适配器仅提供评估建议，不能创建平行 Ticket。

### 9.6 外部证据与深度研究旁路（V1.2）

优先使用已安装/已验收 Harness `ctx.web` 提供方开展确定性 Search/Fetch；资料检索、PDF/OCR 及深度思考搜索只生成不授予权限的 `Evidence/ContextPatch/Proposal`。查询和内容必须保留 `providerId、requestedAt、capturedAt、sourceUri、status、contentEncoding、capturedContentHash、sourceRevision(可空)、artifactRef(可空)、usage(可空)、requestRef`；按证据级别声明可重放/可比对的范围。对于 GitHub 源码与 CI 使用固定 SHA、原始日志/工件及真实退出码，不能由网页摘要或模型自述替代。

执行端在发送查询前进行数据等级、目的地、权限和预算校验；外部返回的 URL、网页、文档及 OCR 文本一律是**不可信内容**，只可作为引用数据，不允许提升权限、修改策略或要求 Agent 执行其中的“系统提示”。敏感内容需脱敏或拒绝外送。当前 `ctx.web.fetchProvider: http` 不提供内网阻断，必须通过 URL/解析后 IP/重定向复核及容器网络阻断实现 SSRF 防护，或在安全验收前禁止模型触达该提供方。

**Fetch 差异与 SSRF 责任**：本地 HTTP Fetch 对网页 HTTP 404/500 也可能返回正常 `WebFetchResult`，必须检查 `statusCode`、`body.kind`、`truncated` 及业务预期；远端 DeepSeek Fetch Provider 遇到抓取失败可能返回 Provider 错误，并不提供可证明的最终重定向 URL/IP。Fetch Markdown 不能视为原站原始字节，未知 `WebError.code` 必须保留并安全降级。对本地 HTTP Fetch，可信域名字符串/单次 IP 校验不足以防 DNS 重绑定，必须有不可绕过的网络出口限制、受控代理和逐重定向校验；对远端 Fetch，只能在提交 URL 前约束披露范围，不能声称本地验证了远端最终落点。

## 10. L4 四级异构执行光谱（4A / 4B / 4C / 4D）

### 10.1 共同执行契约（拟新增）

```ts
export type Tier = 1 | 2 | 3 | 4;
// 执行态（Engine 已验证并提交）类型，不是路由器可提交的 ProposedActionPlanItem。
export interface ActionPlanItem {
  actionId: string;
  ticketId: string;
  triggerIds: string[];
  tier: Tier;
  kind: string;
  target: string;
  args: Record<string, unknown>;
  businessIntentId: string;   // Engine 绑定后产生的执行态字段；不得从 Jev 接收
  businessEffectKey: string;  // Engine 依据 §6.2 重算的执行态字段
  mandateRef: string;
  executionScopeRef: string;
  prerequisiteIds: string[];
  reusedActionId?: string;    // 已有业务效果只引用，不创建新 ActionRun
}
export interface ActionResult {
  actionId: string;
  attempt: number;
  state: 'SUCCEEDED'|'FAILED'|'BLOCKED'|'CANCELLED'|'UNKNOWN_RECONCILE';
  failureClass?: 'TRANSIENT'|'PERMANENT'|'UNKNOWN'; // Executor 结果分类建议，最终状态由 Engine 核验
  reasonCode?: 'RESOURCE_BUSY'|'BLOCKED_CONFLICT'|'SCOPE_EXPIRED'|'SAFETY_REVOKED'|string;
  evidenceRefs: string[];
  outputRef?: string;
}
export interface ActionExecutorPort {
  supports(kind: string, tier: Tier): boolean;
  execute(item: ActionPlanItem, signal: AbortSignal): Promise<ActionResult>;
}
```

**事务与唯一性**：Engine 在一个 `Store.atomic()` 中写入原生 Ticket 合法版本、ActionPlan、新 ActionRun（或 `mesh_plan_action_ref(REUSED)`）以及持久 `Effects.enqueue()`。不得在事务提交后才单独登记持久执行任务。所有尝试沿用同一个 `businessEffectKey`；`attemptNo` 仅是 `mesh_action_attempt` 记录号。业务效果已成功则直接复用，不另起外部 RPC。

**执行结果与领域状态分离**：`ActionResult.state=FAILED` 是 Executor 的单次尝试报告，不应直接当作 `ActionRun.FAILED` 终态；Engine 必须结合受信 `failureClass`、可验证的“未发生远端副作用”证据、预算、重试次数及原 Effects 租约，将可恢复尝试映射为 `RETRY_WAIT/PAUSED`，不可恢复才落为终态 `FAILED/BLOCKED`，未知提交状态进入 `UNKNOWN_RECONCILE`。不得仅信任 Worker/模型自报的 `failureClass` 或副作用状态。

**执行链双重权限检查**：Tier1/Tier2 的直接外部调用必须使用 ActionGateway 的确定性同步权限检查；Tier3/Tier4 调用 Harness Tools 时必须由受信 Session 绑定及 `ctx.tools.guard()` 再次拒绝不允许的操作。不同 tier 的执行适配器不能将 Jev 输出当成生产写许可；运行时须按 `ExecutionScope` 的剩余预算和紧急撤权状态强制阻断。

**M2 的实际发出顺序**：`beginAuthorizedWork()` 成功提交根预算启动闸 → 原生 Effects/Assignment 认领 → 受信 Engine 针对**单个语义外部效果**签发 `ISSUED` ExecutionAttempt 且原子扣根尝试额度 → ActionGateway/ToolGuard 就具体 RPC/Tool 重新校验实时撤权、Effect claim、预算及许可 TTL 并 CAS 消费为 `CONSUMED` → 事务外唯一一次外发 → 以受信回执/对账证据回写。只读工具跳过副作用许可，但不跳过根时钟准入与同步安全守卫；任何直接 OS 网络写若不能穿过受信网关，则只允许在硬隔离 Mock 中演练，不能称已具生产级拦截。

### 10.2 4A：Tier1 Direct RPC

确定性 `action.kind → handler`，例如模拟 `BILLING_FREEZE`、`FEATURE_FLAG_ROLLBACK`、`CI_RETRY`。Jev 选择只是候选动作；参数通过 schema 校验后由 ActionGateway 执行。`BILLING_FREEZE` 必须从受信来源定位账户。学习版仅调用隔离 Mock，无需伪造人工审批，返回前后状态与审计引用；任何指向真实生产资源的操作直接 `BLOCKED`。未来接入审批后，确实需要授权等待的操作保持 `AWAITING_APPROVAL`，不得将该非终态与永久 `BLOCKED` 混淆。

### 10.3 4B：Tier2 SOP DAG

SOP 定义需具备 `sop_id, version, inputSchema, nodes, edges, retries, compensate, approval`。节点类型 `RULE / EXTRACT / JEV_GATE / RPC / APPROVAL / VERIFY`；状态与合法迁移只引用 §6.4 的 `SopStep` 规范；学习版 M5 仅实现 `READY/RUNNING/SUCCEEDED/FAILED`，`WAITING_APPROVAL/COMPENSATING/COMPENSATED` 保留为目标扩展且不得伪称已启用。DAG 不得由 LLM 在执行时随意修改；每个节点独立幂等。SuperAgent Effects 负责推进到下一节点，不引入第二套队列。支持保留 checkpoint 的**受控新版本重跑**：同一步旧 `FAILED` 行不变，新的 `step_version+1` 行从 `READY` 开始且 `retry_of_step_version` 指向旧版本；每次重跑要重验授权、预算与已有 `logical_effect_ref`，原外部 RPC 未确认则对账、已成功则只复用 ActionRun 结果，不得因 stepVersion 改变业务副作用身份。

**学习版 Tier2 范围**：M5 只实现固定三节点 `RULE → MOCK_ACTION → VERIFY`，每步 `SopStep.status` 按 §6.4 合法迁移并落在 `mesh_sop_step`。每节点有稳定 Step ID、输入输出和状态，按既有 Effects 顺序推进；模拟失败时只允许以上述新 stepVersion + 已有业务键方式重跑或停止；若无合法恢复/安全 Effects 重调度能力则保持失败并标记未实现，不伪造恢复通过。不得把这三个顺序函数伪装成具备任意 DAG 拓扑、审批和补偿能力的通用工作流引擎。

### 10.4 4C：Tier3 DshExecutor

复用 SuperAgent `DshExecutor` 与 Harness Agent Session。上游 `src/app/sessions.ts` 的会话装配可能将角色 preset 设成 `danger-full-access`，与企业受限 Worker 目标不一致；项目必须在 `Sessions.ensure()` 的创建、恢复、切换角色路径进行最小可回归改造，避免上游重建会话时重新覆盖受限配置。G0 需验证主 Session/Worker 的实际 preset、工具可见性、文件挂载、系统身份、出网和凭据，无受限隔离能力的实例不能进入 `ACTIVE`。

Engine 创建 Session 时持久化 `mesh_session_mandate_binding`，绑定 `tenantId,sessionId,assignmentId,ticketId,budgetId,immutableMandateRef,scopeRef,mandatePolicyVersion,safetyPolicyVersionSeen,emergencyRevocationEpochSeen,expiresAt`。这些字段与 §6.2 的表列和 §6.8 的 TS 类型一一对应，当前实时 `emergencyRevocationEpoch` 属于安全策略，不应冒充绑定保存时的 epoch。一个活跃 Session 同时只能有一个合法 Assignment，绑定变更使用 CAS；同步 ToolGuard 从受信快照读取，不接受模型或工具参数提供的 Ticket/Mandate。普通 Policy 改版不自动废止既定 Mandate，但安全紧急撤权立即令旧安全快照失效并终止后续执行。

Worker 默认运行在独立 OS/容器隔离中，不挂载生产 DB 凭据、全局 Git 写令牌或非必要宿主目录。`allowedActions/prohibitedActions` 与命令文本检查是附加约束，**不是**沙盒本身。所有外部写操作必须通过允许的受控 API；`maxRuntimeMinutes` 自**同一 Ticket/Mandate 根预算的首次受信工作准入事务提交（包括计划启动只读 Worker）**开始按墙钟累计（`mesh_execution_budget.first_started_at`），同根全部 ActionRun 及后续 Assignment、Session、Team 子会话共享固定 `deadline_at` 和根尝试额度；不因拆分或重建 Assignment 重新开始。

**启动拦截验收**：`Sessions.ensure()` 创建、恢复、角色切换、Team 子会话及其他执行入口必须在真正允许 Worker 读取上下文/调用 Tool 之前拿到有效 `beginAuthorizedWork()` 事务提交结果；不能先让原生 `assignmentStarted`/Session 运行再异步写根时钟。原生 Assignment 可以先持久创建为未启动，但任何首项工作都须通过该闸；如果上游不能提供足够早的拦截点，M2 只能禁用对应自动执行路径，不能以“已记录 first_started_at”代替真实阻断。

保留原生 `assignmentStarted / inputsDelivered / report` 回写 Engine 的方式。对由 ActionRun 派生的 Worker，在原生 Assignment 经 Engine 建立并确认 `ticketId/mandateRef/tenantId` 一致后，将其 ID 写入对应 `mesh_action_attempt.assignment_id`（Tier1 保持 NULL）。`SessionMandateBinding.assignmentId` → `mesh_action_attempt.assignment_id` → `action_id` 是 Watchdog 反查动作的唯一路径之一，允许一个 ActionRun 跨恢复产生多个 Attempt/Assignment 绑定，不根据模型文字建立关联。ContextPatch 只能在已授权 Session 下一次可接纳步骤注入；实际输入达到模型请求必须有可验证证据，否则维持 `DELIVERED_UNVERIFIED`。会话结束、取消或紧急撤权时不自动重新注入。

### 10.5 4D：Tier4 Working Team

`TeamExecutor` 对上是**一个** Executor/原生 Assignment，对内组织 Planner、Coder、Ontology Modeler、Verifier 等 Harness 子 Agent Session。Team 不创建第二套根 Ticket；子工作与证据存在 `mesh_team_run` 及持久子任务中，最终由受信 Team Lead 汇总 Report，原生 Engine 决定 Ticket 结果。

**继承和隔离**：每个子 Session 都有独立 `mesh_session_mandate_binding` 和有效性检查，`effectiveChildAllow = (parentAllow ∩ roleAllow ∩ childExecutionAllow) \ (parentDeny ∪ roleDeny ∪ currentSafetyDeny)`（分别对工具、资源、环境计算）；工具、资源、文件范围、网络权限、凭据、累计时间与尝试预算均不能超过父 Assignment。父 Session/Assignment 被撤权或结束，所有子 Session 必须停止后续受控工具执行，学习版 `TeamRun → CANCELLED` 并终止未执行子任务（不实现 `PAUSED` 状态）；已发出的未知外部副作用进入独立对账。Team 内不允许把一个子 Agent 的授权共享给其他角色，也不因 Planner 提议而扩大能力。

执行顺序 `Plan → Parallel Work → Verify → Consolidate`；Planner 仅拆解授权工作，Coder 在受限沙盒操作，Ontology Modeler 只能提出 Schema Change，Verifier 独立核验证据与测试。资源冲突由稳定目标锁和 CAS 处理，合并结果保留子任务 lineage。失败限制重试次数，模型不能另造 businessIntentId 来重复副作用；无验证证据不能标记 `COMPLETED`。

**V1.2 原生 Team 优先复用**：`TeamExecutor` 仅映射业务 `Assignment/TeamRun/ExecutionScope/根预算/验证结果` 到 Harness 具名 SubAgent/AgentTeam，不自建成员通信、通用共享任务板和第二调度器。Team 模式默认关闭，启用及恢复需锁版验证；其 `expectedRevision` 只提供 Agent 任务板 CAS，不是业务外部副作用的执行许可。`writeScopes` 为冲突提示而非强制文件锁；独立 Verifier 必须取得不可变工件哈希和隔离的只读工作树或等效隔离，禁止接触有权篡改被审查产物的工具。任务持久写入为 `PERSISTENCE_UNCONFIRMED` 时先读回状态再恢复，不可盲目创建重复业务 ActionRun。AgentTeam 不跨进程协调，也不会自动释放失联任务所有权。

**学习版 Tier4 范围**：M5 至少产生两个不同的 Harness Agent Session ID：第一个承担 `Planner/Worker`（在隔离 Fixtures 中产出具体、可验证的工件，如诊断记录或测试结果），第二个承担 `Verifier`（读取并核验该工件和独立证据）；两者均有独立 SessionEvent、受限权限绑定并向同一个原生 Assignment 回写结果。允许固定串行交接，不要求并行调度、四角色齐全或自动跨域修复。**两个普通函数或仅两段 Prompt 文本不算已实现 TeamExecutor**。

### 10.6 受控 Browser Use 与 Schedule（不是新增业务模块）

`BrowserTaskAdapter` 是业务授权和结果映射的逻辑名称，**不是** `ctx.browserUse.navigate/click` 等假定存在的统一接口。Harness `ctx.browserUse` 当前只注册唯一提供方；操作接口属于被启用的 Playwright MCP / Chrome DevTools MCP / Stagehand 具体工具。浏览器由精确 Agent + Session 拥有，重载或 fork 不恢复登录状态，已执行网页动作无法撤销；外部附着浏览器的 Session 独占仅在同提供方实例内有效，不构成跨进程全局锁。

M2 可先做无凭据、只读截图与导航 Fixture；表单提交、删除、发布、登录态修改及可能产生效果的浏览器操作必须归入具体 `ActionRun`，受末端授权/撤权/预算/效果键控制，返回未知时进入 `UNKNOWN_RECONCILE`，不能根据断线盲目再点击。M5 才按批准范围完善浏览器交互体验。Harness Schedule 只负责 Host 持久定时投递，其 Receipt 证明写入 Session inbox 而**不是**模型完成、业务成功或恰好一次执行；真正业务处理必须通过 Engine/Effects 的幂等入口。

**浏览器隔离补充**：实验性 Playwright MCP 的 Browser 进程在 Session 验证的工作目录启动，后续切换 Session 目录不迁移进程；恢复 Session 不恢复页面/登录态。Browser 必须使用专用容器/用户、无生产密钥、最小挂载与出网约束。工具 schema 随提供方版本变化，Provider 断连、初始化失败、取消已发动作与外部附着跨进程竞争均需负向验证。

**Stagehand Native 的单独模型出站（本轮新增 P1-1）**：rc.3 `@deepseek-ai/dsh-experimental-browser-use-stagehand-native` 的 `stagehand_act/observe/extract` 由 Stagehand 浏览器扩展调用**独立配置的模型、API Key、可选 headers**；这些 Token/请求不进入 Harness 主 Session 模型路由、原生凭据复用或使用量统计，且当前 Stagehand Native 不支持 DeepSeek endpoint/baseURL 自定义。取消不保证原生模型推理停止，配置中的模型在导航-only 模式也必填。为避免第二隐性外送通道，**Stagehand 默认不装配，能力状态为 `DISABLED`**；M2/M5 演示优先选择不含独立推理的隔离 Playwright MCP Fixture。

如以后确需 Stagehand，必须单独完成：固定上游原生模型 provider/model/endpoint/凭据归属和审批、网页/DOM/截图/输入传给模型的最小化与密级验证、独立 API 请求数量/时限/费用预算和费用核对、受控代理与密钥隔离、模型取消后仍可能继续出站或操作的故障对账；保留独立的推理请求/响应与使用量审计（脱敏）。未完成全部证明只能在无敏感数据、专用临时账户的隔离 Fixture 中探索，不能标记为业务 `READY_READONLY` 或 `READY_WRITE`。

## 11. L5 治理、Watchdog 与准出（5A / 5B / 5C）

### 11.1 5A：Authority & Mandate Gate

**先硬规则、后语义辅助；所有硬性拒绝不可被模型或后续插件覆盖。**

1. **受信绑定**：验证 `Session → Assignment → Ticket → immutable Mandate → ExecutionScope`，以及租户、来源、目标资源、环境、审批、累计运行时限和父子会话权限交集。同一活跃 Session 的多个绑定属于非法状态，直接拒绝。
2. **两种策略版本**：`mandatePolicyVersion` 固定记录接受任务时的授权政策；原生普通 Policy 改版不自动撤销活跃 Mandate。`safetyPolicyVersion + emergencyRevocationEpoch` 记录实时强制禁止策略，可收紧操作并触发紧急停止；守卫使用当前可信本地快照，未知/未加载/撤权后版本不符时默认拒绝。
3. **扩展风险判别**：在 `tools/pre-execute` 或 ActionGateway 的可扩展路径使用 Jev 进行任务偏离/Prompt 注入辅助判断；模型不得把拒绝变成允许，也不能签发允许集。模型延迟或失败不影响同步硬拒绝。
4. **最终执行守卫**：Harness Agent Tools 使用同步 `ctx.tools.guard()`（具体签名以 G0 锁版类型为准）；它应在真实工具体执行前检查，并阻止下游监听器重新放行。所有 Agent 角色，包括主 Session、Worker、Team 子会话都需要覆盖。ToolGuard 中不能等待远程数据库或 Jev；需在安全数据加载失败时 fail-closed。
5. **非 Tool 路径**：Tier1/Tier2 RPC、子进程调用、直接渠道 API 和其他绕过 Harness Tool 管线的副作用，必须由 ActionGateway 或基础环境权限实施等效限制；不能因为 ToolGuard 返回拒绝就宣称整个进程安全。
6. **受限进程实际生效**：不得允许上游 `danger-full-access` 角色预设覆盖本项目权限配置。使用隔离 OS 账户/容器、最小挂载、受控网络和凭据；对宿主写文件、生产数据库、强制 Git 推送和子 Agent 提权分别进行真实执行级负向测试。

**Gateway 执行许可不变式**：同步安全守卫必须核验 §6.2 `mesh_action_attempt.permit_state=ISSUED`、许可摘要与原不可变指纹一致、`permit_expires_at` 未过期、当前持久撤权 epoch 未变、执行目标未漂移、预算与原 Effect 认领有效；CAS 消费后不可再次放行同一令牌。拒绝必须留下可恢复审计并阻止网络调用，消耗许可后遭遇超时必须对账。`ctx.tools.guard()` 本身若不具备原子 CAS 能力，则在它拒绝之外还必须通过受信 Gateway 提交许可消费，不能把内存 Guard 当作远端事务保障。

所有拒绝须在副作用发生前生效，写入 `mesh_gate_audit`，携 `mandatePolicyVersion/safetyPolicyVersion/emergencyRevocationEpoch/reasonCode/evidenceRef`，分别映射 §6.2 的 `mandate_policy_version/safety_policy_version/emergency_revocation_epoch/reason_code/evidence_ref`；发生在 guard 中的同步拒绝必须有可恢复的审计落点，不能为写入审计而放行。G0 证明接口及主要危险动作可阻断，G4 完成所有工具和角色的覆盖及红队测试。

### 11.2 5B：Jev Watchdog

默认每 `60s` 对活跃 Assignment 观察**最近 5 个完整且可归因的执行步骤**，配置项 `watchdog_trajectory_window=5`；不按 Token 流进行频繁模型轮询。轨迹来源于 Harness 持久化 SessionEvent 与 Engine Assignment 状态；若样本不完整，不能武断认定“已收敛”。`observation_window_id` 由受信 `assignmentId` 与本次五步观测的 EventRef/最后序号确定，配合 §6.3 唯一约束防重；同一窗口的相同 `trajectoryHash` 复用结果，不重发注入提示。Watchdog 从 `SessionMandateBinding.assignmentId` 反查 `mesh_action_attempt.assignment_id`，得到 `action_id` 及原生 Ticket/Mandate 后方可进行针对性停机/报告；无对应 ActionRun 的原生 Assignment 只记录 Assignment 级观察，不伪造 ActionRun。

**评分协议**：`0=STALLED`（重复失败/循环）、`1=EXPLORING`（有效探索）、`2=CONVERGED`（证据支持的收敛）、`UNKNOWN`（轨迹不足、模型异常或证据不可信）。`UNKNOWN` 是门禁状态，不作为 Jev `Score` 的新数值档位。附带 `trajectoryHash、sampleCount、modelVersion、reason、nextAction`；重复 `trajectoryHash` 和同一观察窗口不重复触发重启。

**自愈选项**：`CONTINUE / INJECT_HINT / RESTART_WITH_BUDGET / ABORT_ESCALATE`；是否重启必须同时满足稳定的 `maxAttempts、maxRuntimeMinutes、approvalScope`，Jev 只能提出建议。自愈流程为“观察 → 指纹去重 → 有界提示 → 下一步实际消费确认 → 记录效果”；仍失败时由受信 Engine 处理对应 `ActionRun.status=BLOCKED`（确认无未知副作用）或记录需要人工决策的 Ticket/ExitReport；**不是**写未定义的 `TeamRun.BLOCKED/Assignment.BLOCKED`。不向已结束/取消 Assignment 注入。Watchdog Effect Key 必须按观察窗口的稳定标识去重，重启不重复巡检同一窗口。

**学习版 Watchdog 范围**：M4 采用最近五步的真实 SessionEvent/Tool 轨迹，能识别连续重复失败并记录一条观察；最多发出一次受控提示，不开启自动重启。若无法验证该提示进入模型请求，只记录 `DELIVERED_UNVERIFIED`，并根据后续测试结果或超时作出保守判断；**注入提示成功≠自愈成功**。只有之后的真实验证证据改善，才能标记“干预有效”；没有结果则标记“已检测/已干预，效果未证实”。

### 11.3 5C：Exit & Silence Gate

SuperAgent Outbox 仍是唯一渠道消息发起者。`DELIVERABLE_VERIFIED` 在独立验证前，还必须检查相关 Plan（包括 `SUPERSEDED` 后仍在途的旧引用）`settlement_state=SETTLED`、`outstanding_action_count=0`；若仍有未知效果，只能如实生成 `HARD_BLOCKER/HUMAN_DECISION_REQUIRED` 的证据型报告或等待，不能宣称全部完成。ExitGate 只在具备可追溯事实时准出：`DELIVERABLE_VERIFIED`（经独立验证的交付证据）、`HUMAN_DECISION_REQUIRED`（一个具体且必要的问题）或 `HARD_BLOCKER`（有证据的无法推进）。Jev 可建议措辞，但不能证明完成或授予通知权限。

**发送与状态协议**：
1. 按来源记录所有受信 Trigger 的 `notificationIntent`，对**入站 ACK**与**准出通知**分别聚合：规则/静默策略不可被模型或后续普通意向覆盖，已验证且有许可的准出意向可触发正常 Exit；`SILENT` 只是不发送普通外部消息。`HUMAN_DECISION_REQUIRED/HARD_BLOCKER` 必须由 Engine 单事务保留或新建 `mesh_human_work_item(OPEN)` 并设置责任域/检查期限；不应通知时 ExitReport 可为 `SUPPRESSED`，不产生 Outbox Effect，人工待办仍保持可审计、可查询、可升级。
2. 符合相应准出原因时，才由 3D `LazySynthesizer` 使用真实证据引用生成结构化报告：成功交付用独立验证证据（M2/M4 是确定性后置校验器，M5 才要求第二 Agent Verifier），人工决策用真实待确认事项，硬阻碍用可复现的失败/权限/外部故障证据；模型失败可回退到确定性模板。
3. Engine 在同一 Store 事务中记录 `mesh_exit_report(PREPARED)` 与证据引用；**只有通知被允许**时才写稳定 `outboxKey` 和待发送血缘引用，并排入持久 Outbox Effect；静默路径转 `SUPPRESSED`。网络发送在提交后进行。
4. 启动发送置 `SENDING`；渠道同步接受返回只能置 `CHANNEL_ACCEPTED`（渠道接受消息，不代表收件人真正送达）；网络超时或响应丢失则置 `SENT_UNCONFIRMED`。
5. 只有具备可验证终端送达事件的渠道才允许转 `DELIVERY_CONFIRMED` 并写入 `receipt_ref`（对应 §6.2 `mesh_exit_report.receipt_ref`）；无此功能的渠道正常保留 `CHANNEL_ACCEPTED`。后续聊天回执、已读状态也必须区分，不得混淆渠道接受、送达及阅读。
6. 未知状态进入 `RECONCILING`，查询渠道状态或在具备稳定远端幂等 Key 的前提下重试；无法确认则进入 `MANUAL_REVIEW`，由受信人工操作才可返回 `RECONCILING` 或终止为 `FAILED`，不无限重复通知。对应血缘边独立标注 `sent_request/accepted_by_channel/confirmed_delivered`，保证可审计但不虚构恰好一次送达。

`mesh_human_work_item` 是业务待处理事项而非第二套 Outbox：`OPEN/ACKNOWLEDGED/ESCALATED/RESOLVED` 的转移只能通过受信 Engine 命令、CAS 和人工证据；M4 至少提供租户受限的只读待办列表与人工确认/解决入口（可为管理 CLI，不强制做 UI），未配置可靠提醒渠道时必须能被本地巡检与告警发现，不能因为 `ExitReport.SUPPRESSED` 视作完成。`ExitReport` 中 `transport_state` 与 `delivery_state` 分开存储；§6.4 的状态名为规范的聚合流程阶段，可由两字段及受信回执派生，不允许将原生 Outbox 的 `sent` 直接映射为 `DELIVERY_CONFIRMED`。非必要的中途进展仅保存在 Ticket/Session；`RECORD_ONLY` 不等于不保留事实。

**学习版 Exit 范围与独立验证者**：M2 的 Mock 账户冻结用执行器之外的确定性后置检查器比较受信前后快照、业务状态和 ActionAttempt；M4 的危险工具阻断用独立负向测试、隔离目标文件哈希和 GuardAudit 验证。两阶段的独立验证无需提前建设 M5 的第二个 Agent Session；不得把动作执行器自己的“我成功了”字符串作为验证证据。M5 再以独立 Harness Verifier Session 扩展验证能力。M2 使用 Mock Channel/Mock Outbox 留存报告、状态、引用，不向真实飞书或 GitHub 发送消息。M4 增加三类准出判断和 **`mesh_human_work_item`**：普通 `notificationIntent` 必须按来源和阶段分别聚合，`SILENT` 只禁止普通外部通知；待人工处理或硬阻碍无论静默与否都保留可查询待办和明确的受信责任人/值班域；超时未处理要触发本地运维检查，不得伪造人工处理成功。模拟出站只能证明“进入 Mock Channel”，不能写成真实收件方 `DELIVERY_CONFIRMED`。

### 11.4 新增外部工具的治理控制点（V1.2）

1. **模型服务端调用**：只有经过部署策略批准的模型路由可声明 `deepseek_web_search/deepseek_read_url`；本地 `ToolGuard` 不能逐次接管这些服务端工具。禁止携带生产密钥、客户资料、私有源码或非公开 URL 到服务端自动搜索；无法限制或验证时关闭该能力。
2. **本地 Web/文件输入**：执行前校验用户/租户/授权 Scope、内容密级、允许主机/解析 IP/最终重定向、协议和响应大小。阻断 localhost、私网、链路本地、云元数据及不受信文件资源，单靠提示词或工具名“只读”不合格。
3. **Browser/MCP**：以每个具体工具调用及真实目标资源判定读/写权限；执行前和派发点复核撤权 epoch，隔离 Session、进程、凭据及网络；已发出动作只能记录并对账，不能称为撤销成功。
4. **输入可信度与审计**：工具响应、页面、OCR、MCP server instructions 均标记不可信，不能生成 TrustedContext/Mandate；结果日志脱敏并记录拒绝原因和版本，不存明文 API Key。
5. **失败关闭**：Guard/网络/证据服务缺失时拒绝可写执行；安全 API `safety_check` 仅作为附加审核，不取代确定性权限及业务策略。

**三路径最终拒绝证明不可互借**：模型 `web_search/web_fetch` 经过 Harness ToolRuntime；业务直调 `ctx.web.search/fetch` 由受信 EvidenceGateway 单独校验；DeepSeek 服务端 `deepseek_web_search/deepseek_read_url` 由路由/数据出站策略限制。任一路通过不能证明其余两路安全；服务端执行不能宣称逐调用受本地 ToolGuard 拦截。

## 12. 三个业务场景的详细端到端时序

### 12.1 场景 S1：大客户账单异常，一源多扇出 + 主旁协同

1. 飞书 Source 收到可信 `Trigger F-001`，2A 验签/持久入站；2B Jev 给出准入建议。Engine 按 Policy 创建 Ticket 与不可变 Mandate。
2. 3D 仅整理调查目标和可验证证据要求。MainRouter 提出动作候选，**Engine** 根据可信来源请求或已登记的 IncidentEpisode 确定性生成/复用 `businessIntentId=BI-001`，计算稳定 `businessEffectKey`，再确认 Tier1 `BILLING_FREEZE (SANDBOX)` 和 Tier3 `SRE_INVESTIGATE` 两项合法动作。
3. Engine 以一次原子事务提交关联 Ticket 版本、ActionPlan、两个 ActionRun、业务唯一约束和各自 Effects；提交后 Tier1 mock 与受限 Tier3 Worker 执行。真实账单冻结无审批/正确资源许可则被 ActionGateway 阻断。
4. 3C1 形成可审阅的 OntologyProposal；3C2 输出带证据 TrendFinding，必要时持久生成 ContextPatch；旁路不得直接授予生产写权限。
5. 同一飞书事件重放、告警修订或 ActionPlan 升级为新版本时，相同业务效果只引用原 ActionRun 的结果，不允许重新冻结。模拟事务提交前、提交后、Effects 执行中崩溃，均不产生孤儿 Action 或重复外部动作。
6. Watchdog 在预算内监测，独立确定性验证器核对 Mock 状态与 Worker 测试证据后 ExitGate 生成结构化报告；Outbox 发送后分别记录 `CHANNEL_ACCEPTED` 与可获得时的 `DELIVERY_CONFIRMED`。从 F-001 可以查到两条动作、各次尝试、旁路提案和实际回执状态。

**S1 学习版最小验收（M2）**：以一条飞书 Fixture 或测试群消息创建一个原生 Ticket，提交一次包含两项动作的 ActionPlan；Tier1 Mock 冻结确实修改隔离测试账户状态并产生 ActionAttempt，Tier3 受限 Harness Worker 对测试仓库运行一次可核查的只读排查/单测；3C1 产生一份可查询提案。对同一 Trigger 重投递十次，Mock 副作用计数不得增加。架构图展示的每条成功状态必须能定位到真实 Ticket/ActionRun/SessionEvent。正式财务系统始终不接入。

### 12.2 场景 S2：飞书与 GitHub 跨渠道连续推理

**S2-A：主路合法归并与原生 Input**
1. 飞书 F-001 已产生 Ticket；GitHub PR#412 评论产生 G-002，二者没有共享 trace_id。Jev 从同租户的锚点召回候选，但不得直接建立 Subscription。
2. **负向测试**：G-002 仅与 Ticket 同仓库/同服务/同客户时，必须留作 `RELATED_SOURCE_CONTEXT`；即使 Jev 置信度很高，也不能自动 `commitAssociation`。
3. **正向测试**：如评论明确引用该 Ticket 已登记的 PR/Issue，或者来源证明与某个已持久登记的近期变更有唯一关联，且身份/租户/Policy/Mandate/expectedVersion 有效，Engine 才能通过 `propose → validate → commit` 建立 Subscription；候选多于一个必须拒绝自动提交。
4. 后续 Input 按原生 Subscription 规则进入在途 Worker，不能改变 Mandate；重复消息不重复附加或派生业务 Action。对结束 Ticket 和只读上下文订阅分别测试，避免误恢复过期工作。

**S2-B：旁路趋势发现与 ContextPatch**
1. 3C2 从默认最近 7 天的历史故障证据生成 `TrendFinding`，经 Engine 限定上下文与权限后记录 `mesh_context_patch`。
2. Effects 提交 `QUEUED`，调用 `agent.inject()` 后只标记 `INJECTED`；Inbox 插入或 claimed 事件只能分别证明排队/领取，不得据此标记模型已接收。
3. 若能从实际模型请求证据核验该 patchId 已被包含，则记 `CONSUMED`，含义只是**输入进入模型请求**；无法证明则记 `DELIVERED_UNVERIFIED`。测试迟到确认、正在运行/空闲/结束/取消 Session、重启与重复 Patch。
4. 主路 Input 与旁路 Patch 的相同业务线索通过证据哈希防重复注入，且执行侧由业务幂等键避免重复动作；父 Mandate 和子会话受限授权均不得扩大。

**S2 学习版最小验收（M3）**：准备飞书工单与 GitHub PR 评论（无共享 trace ID）；只有可信 PR/Ticket 专属引用时，Engine 才允许提交受控关联；仅同仓库或同症状时只记录 Proposal。3C2 在 SQLite 查询受信历史证据，生成 Patch 并经真实 Session 投递通道尝试送达；展示 `QUEUED/INJECTED/DELIVERED_UNVERIFIED/CONSUMED` 中实际发生的状态，不以文字演示替代模型请求证据。

### 12.3 场景 S3：外部 Prompt 注入与 Watchdog 自愈

1. 恶意 PR 评论作为不可信 Trigger 进入系统，尝试让 Worker 对生产 DB 写入。必须先检查 SuperAgent 创建/恢复 Session 的角色预设不再以 `danger-full-access` 覆盖受限策略，并确认 Worker 实际处于最小权限 OS/容器环境且没有生产写凭据。
2. Agent 的危险工具调用经过 `tools/pre-execute` 后，`ctx.tools.guard()` 用受信 `SessionMandateBinding + ExecutionScope + currentSafetyPolicy` 同步拒绝。Tier1/Tier2 的直接 RPC 由 ActionGateway 独立拒绝。**真实目标必须未发生副作用**，不可仅验证回调返回字符串。
3. 模拟普通 Policy 版本更新时，既定 Mandate 保持原生生命周期；模拟安全紧急撤权时，活跃 Worker 和 Team 子会话全部停止后续工具执行，已发出的未知结果进入对账。
4. Worker 对相同单测循环失败时，Watchdog 读最近 5 个可归因步骤，Jev 只提出 `INJECT_HINT/CONTINUE/ABORT_ESCALATE` 等已定义建议，**M4 不实现运行中暂停指令**；实际注入输入进入模型请求之前不得声称 Worker 消费了提示。重复观察不能反复重启或重置 30 分钟总预算。
5. M4 使用独立确定性验证器检查受限目标文件哈希、GuardAudit 和测试/构建结果（不要求 M5 Team Verifier Agent），证据成立后 ExitGate 请求 3D 生成报告，经 Engine 事务排入 Outbox；渠道只接受请求时记录 `CHANNEL_ACCEPTED`，取得收件送达证据才记 `DELIVERY_CONFIRMED`。失败时真实报告 `HARD_BLOCKER`，不可虚构成功或刷屏。

**S3 学习版最小验收（M4）**：在无生产凭据的隔离 Worker 中输入不可信的恶意评论 Fixture，真实调用受信 ToolGuard/ActionGateway 并验证危险动作的 Mock/隔离目标未被执行；Watchdog 基于最近五步识别重复失败，最多注入一次提示，若模型后续测试成功可声明干预有效，否则仅声明已干预；ExitGate 根据真实验证/人工决策/硬阻碍之一生成 Mock Channel 结果。**不能仅靠 Jev 的高风险评分、Mock 文本或前端动画宣称安全阻断和自愈已经发生。**

## 13. 时序、事务和恢复协议

### 13.1 事务外推理，事务内提交

业务写入分为两种事务：① 入站/原生 Eval 决策事务，由 Engine 维护 Trigger/Thread/Eval/Ticket 原生语义；② ActionPlan 提交事务，在**同一 `Store.atomic()`** 中核验当前 Ticket/Mandate 与预期版本，写入 ActionPlan、必要的新 ActionRun 或复用引用、唯一业务幂等约束以及持久 Effects 队列项。禁止“先提交扩展表，再依赖 `afterCommit()` 创建新 Effect”；`afterCommit` 是进程内便利机制，不是持久队列。

**额外运行时闸也必须同步持久**：ActionPlan 的创建事务不等于已授权实际执行。`beginAuthorizedWork()` 在首项 Worker/Effect 工作前单独通过 `Store.atomic()` 固定根时钟；ExecutionAttempt 的签发/计费，以及 Gateway 的最终许可消费分别是后续有因果关系的同步事务。以上任何一步未提交都不能允许对应下游副作用，且不能跨进程用内存布尔值代替受信状态。

`Jev/LLM/RPC` 都属于事务外效果：`外部异步准备 / Jev → 同步 Engine 提交 + durable effect → Store.atomic 返回并提交 → Effects 异步调用远端 → requestId + expectedVersion 回交 → Engine 同步校验并提交结果`。这里的 `commitPlan()` 外层 `Promise` 不使 Engine 领域写入异步化，**Store.atomic 同步回调不能含 await 或返回 Promise**。M0 用最小 probe 事务证明相同连接内“扩展行 + Effect”提交/回滚；M2 再验证原生 Ticket/Assignment 合法变更和 ActionPlan/Run 的真实联合提交。G0 必须实现最小桩并故障注入证明：① 事务提交前失败时无 Action/Effect；② 提交成功但未执行 Effect 时可重启恢复；③ Effect 调用过程中崩溃时进入 `RECOVERING / UNKNOWN_RECONCILE`、不盲重试写操作；④ 重复提交相同 `businessEffectKey` 不产生第二条外部副作用。

### 13.2 幂等与重复投递

必须区分四种身份：`TriggerId`（来源事实修订）、`businessIntentId`（独立业务意图）、`businessEffectKey`（跨计划业务副作用）、`Effects kind+key`（一个持久逻辑工作项）。

- **Source**：稳定 `(tenantId,sourceKind,sourceInstance,nativeEventId,revision)`；重投递保持单条事实。一个修订并不天然生成新 `businessIntentId`。
- **BusinessIntent**：受信 Engine 创建或绑定到可核验的上游业务请求 ID，重新评估、来源增量修订与计划重算必须沿用；只有新授权、独立且真实的业务需求才能产生新 ID。
- **Action**：`businessEffectKey=SHA256(UTF8(JCS(["v1",tenantId,businessIntentId,actionKind,canonicalTarget,normalizedArgsHash])))`，在同租户唯一，按 §6.2 固定业务键规范版本；**不包含 `planVersion/attemptNo/actionId`**。重规划遇到已有记录时生成 `mesh_plan_action_ref(REUSED)` 并读取该 ActionRun 的现有状态/结果。若改变语义性参数或需再次操作，应通过独立批准的新业务意图创建，而非改写已提交的动作。
- **Effects**：原生 `Effects.enqueue()` 若允许同 `(kind,key)` 更新等待任务的 payload，必须由本项目**唯一受控入队封装**执行先查重、规范化哈希/不可变内容指纹校验，再进入原生队列：同 Key + 同内容只复用；同 Key + 不同不可变内容返回 `EFFECT_PAYLOAD_CONFLICT` 并写审计，禁止覆盖。`PAUSED/RETRY_WAIT` 恢复时不能仅作无条件重复 enqueue，必须核验该 `(kind,key)` 的原生队列状态/租约，并在受信事务中以 CAS 恢复原工作项、保持原 payload 指纹和业务键；未验证支持重激活时仅支持显式待处理，不声明自动恢复。逻辑任务 Key 稳定且粒度足够细；重试不使用 `attemptNo` 构造新 Key，`attemptNo` 仅记录在 `mesh_action_attempt`。Effect payload 包含必要的目标、业务键、MandateRef 和版本，不公开敏感凭据。
- **远端写**：向支持幂等的外部 API 传同一 businessEffectKey；调用超时或回执不确定时进入 `UNKNOWN_RECONCILE`，通过远端查询、业务流水号或人工对账确定状态，不能跳过核查重新执行。
- **Outbox**：以稳定 `outboxKey` 持久发送；本地 `sent` 只可映射为渠道级接受（具体依赖 Channel 的 API 契约），不能默认映射为收件方 `DELIVERY_CONFIRMED`。

**持久 Effects Kind/Key 规范（逻辑路径映射，不宣称上游已有同名 Handler）**：M0 须检查锁版 `src/app/effects.ts` 的现有 kind、Key 语义、重试与 Outbox 接线；优先复用原生处理器，避免重复建设队列。若扩展 kind 未注册，必须由受信 Engine/Runtime 完成注册与故障测试后才启用。

| 业务逻辑路径 | 原生复用或扩展策略 | 逻辑工作项稳定 Key | 尝试/结果记录与启用阶段 |
|---|---|---|---|
| JevAssessor / Eval | **优先复用原生评估 Effect**，不直接新增第二份 `jev-assessment`；原生实际 kind/key 由 M0 锁版源码确认 | 原生 Eval 的稳定工作键（以实际接口为准，不能凭空假设） | `mesh_decision_trace`；M1 |
| Tier1/Tier3 ActionRun | 扩展 `action`，通过唯一入队封装与原生 Effects 事务提交 | `action:${actionId}` | `mesh_action_attempt(action_id,attempt_no)`；M2 |
| 本体/趋势旁路 | 扩展 `side-route`（或复用经 G0 验证的现成后台处理器） | `side:${triggerId}:${routerKind}:${inputRevision}:${ruleVersion}` | SideRouter 执行尝试；M2/M3 |
| ContextPatch 投递 | M3 优先核对原生 Agent Input/Delivery 的持久路径，**仅在不满足可靠恢复时**新增 `context-patch` Handler | `patch:${patchId}`（扩展时）；原生路径沿用其真实 Key | `mesh_context_patch` 投递证据；M3 |
| Watchdog 巡检/干预 | 扩展 `watchdog`，若原生已有可复用计划作业则保持原生 kind | `watchdog:${assignmentId}:${observationWindowId}` | `mesh_watchdog_observation`；M4 |
| ExitReport/Outbox | **优先复用原生 Outbox/回复 Effect**，不另建第二套 `exit-report` 队列 | `outbox:${ticketId}:${reportKind}:${reportVersion}` 是本项目业务去重键；实际 Effect Key 按原生协议映射 | `mesh_exit_report`、Outbox accepted/receipt；M2/M4 |
| 固定 Tier2 SOP Step | M5 需可靠逐步执行时注册扩展 `sop-step`，否则复用经验证的原生后台递送 | `sop:${sopRunId}:${stepId}:${stepVersion}` 为步骤调度 Key，**不是**新的业务副作用 Key；RPC 仍复用稳定 ActionRun/`businessEffectKey` | `mesh_sop_step`、`retry_of_step_version`；M5 |
| Tier4 子任务 | 优先复用原生 AgentTeam 任务板与子代理；只有在 M5 证实业务持久派发缺口且单独审核批准时才扩展原生 `team` Effect，不复制协作调度器 | `team:${teamId}:${subtaskId}:${workVersion}` 仅为候选业务逻辑键 | TeamRun 与原生 task/SessionEvent 映射；M5 |

**约束**：表中冒号插值是项目规定的**逻辑 Key 模板**，不是声称原生 Effects 已支持全部 kind。若经 M0 证实原生 Key 需要其他结构，适配层必须保存“逻辑 Key ↔ 原生 Key”一一映射和稳定内容指纹，保证重启/重试不变。对同 Key 不同内容拒绝覆盖的检查必须发生在**唯一**入队封装中；业务插件不能绕过该封装直接调用可能覆盖 payload 的底层入队入口。

**Attempt/一次性许可/预算/远端对账的原 Effect 绑定**：每次外部写之前，用 §6.2 的 `execution_attempt_id` 授权令牌在同步 Engine 事务中完成根预算计次、Attempt 行和不可变 Effect 指纹登记；Effect 领取不等于已计一次有副作用尝试。`remote_request_ref` 在外发前由本地受信生成，`remote_operation_ref` 可为空，`remote_idempotency_key=businessEffectKey` 不随 Attempt/Plan 变化。结果未知时以远端流水/幂等查询和原始证据对账；没有可靠查询或外部幂等保证，不新增同业务键的 RPC，也不能把 `UNKNOWN_RECONCILE` 当成 `FAILED`。M0/M2 先验锁版 Handler 可否安全以**原逻辑 Effect Key**协调恢复；不支持则保留人工对账/单进程 Mock，不能另造任务队列。

**令牌状态与原生 Effects 的界线**：许可状态只存于 `mesh_action_attempt`，不替代原生 Effects claim/lease。`ISSUED` 是有时限、一次性的执行资格，并非已完成外部写；`CONSUMED` 是本地最终 Gateway 已放行且可能开始发送，**也不是远端成功证据**。`REVOKED/EXPIRED/ABORTED` 的未消费许可不得重新消费；已 `CONSUMED` 且进程在网络调用窗口崩溃只能保持未决并对账。Gateway 必须与 Engine 撤权 epoch 的持久化 CAS 串行判定；跨数据库/远端系统并不存在恰好一次跨域提交，真实远端写的撤权截止点需要远端共同执行检查，否则仅承诺最末端本地拦截。

**原生 Effects 的真实能力与实施前置**：已核对锁版 SuperAgent `src/app/effects.ts`：`EffectPayloads` 的原生 kind 联合不包含计划中的 `action/side-route/context-patch/watchdog/sop-step/team`，任何启用必须经最小类型扩展和 Handler 注册，并通过完整编译与失败回归。`Effects.enqueue()` 对相同 `(kind,key)` 的待处理工作项采用 `ON CONFLICT DO UPDATE`，会覆盖载荷并递增 `generation`；必须在**同一 Store 事务**由唯一受信封装计算不可变载荷哈希，重复且同哈希只引用原工作项，不同哈希拒绝并写 `EFFECT_PAYLOAD_CONFLICT`，不可直接调用裸 enqueue 造成隐性覆盖。原生 `tasks` 集合提供**进程内**正在运行项去重，但当前 Effect 表没有可直接证明跨进程互斥的持久 `lease/claim_token/owner`；单进程崩溃重启可再次派发旧 Effect，必须以持久 Attempt + 远端幂等/对账防重，在 M2 故障注入证明前只允许隔离单进程 Mock，不宣称多 Worker 并发安全或可写自动恢复已实现。

**认领字段来源**：`ActionRun.CLAIMED` 不代表 ActionRun 自带租约。`claimed_by/lease_until/claim_token`（名称以锁版源码实际暴露为准）属于原生 Effects 处理器或其受控 Adapter 的工作项状态；业务层通过 `action:${actionId}` 的真实 Effect 键追溯认领和重试。M0 必须实证此能力，M2 必须在进程退出、超时和重复入队时证明认领不造成并发重复执行；否则仅允许单进程 Mock，并将可靠租约能力标记未实现，**不要在 `mesh_action_run` 再造一套独立调度器**。

`inputRevision/workVersion/stepVersion` 对应真正新的受信输入或工作版本，不是为了绕过重试而随意递增。未确认执行结果的 RPC 不能因为启动了新 Plan 就重发；同一业务效果的唯一约束是最终控制点。

### 13.3 崩溃与重启

- Runtime 校验 Store schema、完成兼容迁移、恢复持久 Effects/Assignment，并在启动新 Intake 前恢复活跃 Session 权限绑定及安全策略快照。若无法设置受限角色 preset，停止执行分配并使健康检查失败。
- **根预算冷启动/Crash Window**：重启后先加载 `start_admission_ref/first_started_at/deadline_at` 并验证审计和根 CAS 版本；已准入但 Worker 尚未真正启动即崩溃的根时钟仍保持原值，不能将重启时刻视为首次开始。未经 `beginAuthorizedWork()` 批准的旧进程残留 Session/Effect 直接拒绝继续运行。
- **许可消费与撤权**：启动恢复时扫描 `mesh_action_attempt` 的 `ISSUED/CONSUMED`：过期或已撤权且尚未消费的令牌用 CAS 置 `EXPIRED/REVOKED`，已消费而没有可信远端结果的 ActionRun 走 `UNKNOWN_RECONCILE`；既不能回收成未使用令牌，也不能通过新令牌绕过未知效果的对账。

- `ActionRun.RUNNING` 进程失联时转 `RECOVERING`；存在外部写结果不明时进入 `UNKNOWN_RECONCILE`。只有远端已确认未执行且仍持有效授权，才允许从不确定态回 `PENDING`；已成功的 Action 永不再次发送同一副作用。
- `RETRY_WAIT` 只用于可安全重试且有幂等保护的失败尝试；`next_retry_at`、原 Effect claim/lease 的 CAS 与受信预算剩余量必须先核验，同一逻辑 Action 保持业务幂等键和 Effects Key 不变；未验证原生 Effect 可重新激活时只能标记等待人工安全恢复，不可假称自动重试。
- 计划 `SUPERSEDED` 只禁止旧 Plan 新派发：未被新 Plan 复用的 `PENDING` Action 仅在受信确认 Effect 未执行时可取消；**健康 `RUNNING` 维持 `RUNNING`，不因 supersede 进入 `RECOVERING`**，失联/远端未知才各自进入恢复/对账；被复用旧 Action 不得随旧 Plan 一同取消。`SUPERSEDED` 的 `settlement_state=OPEN` 直到**全部引用动作**终态，不得以“已派发动作结束”计算 `FINISHED` 或通知完成。
- `mesh_execution_budget` 的 `first_started_at/deadline_at/attempts_used` **归属于同 Ticket/Mandate 的稳定 `MANDATE_ROOT`**，不是每个 ActionRun 独立分配。进程重启、新 Plan、其他 ActionRun、Assignment、子 Session、暂停/等待都沿用根截止时间和总尝试数；真正外部执行前在原子事务中扣一次根尝试额度，崩溃后不得免费续期或补跑。超期阻止新副作用但允许只读对账。
- **Plan 结清投影恢复**：重启扫描所有 `settlement_state=OPEN` 的 Plan，通过固定引用集与权威 ActionRun 状态在受信 Store 中重算并 CAS 修复 `outstanding_action_count`；所有 `SETTLED` Plan 必须存在唯一 `mesh_plan_settlement_event`，否则标记投影异常、禁止成功准出并进入审计修复；不能靠重新投递异步 `-1` 计数或再发一次结清通知。

- `ContextPatch` 在重启后核对 Session 版本、Inbox 与模型请求证据；只在可证明未投递且仍获授权时补投。结束/取消/撤权会话不再接收 Patch。**状态仍未过期**且收到可信模型请求证据才可 `DELIVERED_UNVERIFIED → CONSUMED`；已 `EXPIRED` 时必须先向 `mesh_context_patch_evidence` 追加可信不可变请求行，再汇总为 `HISTORICALLY_CONSUMED`，不改变投递终态或重新注入；同一 Patch 的多次合法模型请求均保留。
- `ActionAttempt` 的执行许可与根预算 CAS 在真正外部写前落库；`CLAIMED/RESOURCE_BUSY` 本身不扣执行次数，已发许可即便进程崩溃也保守计数。`remote_request_ref/remote_operation_ref/effect_payload_fingerprint/remote_idempotency_key` 和可信对账证据引用必须保留；远端无对账 API 且不支持请求幂等时保持 `UNKNOWN_RECONCILE` 并要求受信人工处理，不自动重试。
- Outbox 的 `SENT_UNCONFIRMED` 进入 `RECONCILING`；若远端接口只能证明发送请求被接受，则停在 `CHANNEL_ACCEPTED`，不能猜测 `DELIVERY_CONFIRMED`。无查询和无远端幂等能力时进入 `MANUAL_REVIEW`。
- Team 子会话恢复时重新计算与父 Assignment 的权限交集，超过剩余时间预算或父会话被紧急撤权即停止，不能以重启延长授权。
- **Telemetry Source epoch 恢复**：对照持久化 `source_epoch` 与可信来源游标世代；序号重置但新 epoch 缺失/未证实时保留原水位线并转 `ORDER_UNVERIFIED`，不得把低序号新事件自动解释为重开，也不得把不同 epoch 的相同 nativeEventId 错误合并。

- Telemetry 窗口和 Source 游标从持久状态或可重放的上游恢复；与 ACK 边界不一致时阻止可靠接收并要求人工介入。

### 13.4 并发冲突

对 `tenant + business_target + action_class` 使用持久唯一约束或资源互斥、CAS 与已提交状态核查。并发相同业务效果由 `(tenantId,businessEffectKey)` 唯一约束收敛；同一目标上互斥的 enable/disable、freeze/unfreeze 先进入审批/冲突仲裁。**临时**锁竞争且确认尚无远端副作用时置 `ActionRun.status=PAUSED`、`reasonCode=RESOURCE_BUSY`，持久记录锁/租约证据及 `next_retry_at`；释放后只允许在现有原工作项、相同业务键和预算内受信恢复。**不可解决**的授权/业务冲突才置终态 `BLOCKED`、`reasonCode=BLOCKED_CONFLICT`。`UNKNOWN_RECONCILE` 的远端效果不能因为锁解除而直接重发，也不能仅凭 Jev 分数决定高危动作。

**结清投影与许可的并发边界**：并发两个 ActionRun 终态事务均须重算所有受影响 Plan 的 `outstanding_action_count` 并 CAS，而非各自简单扣 1；结清事件以 `(tenant_id,plan_id)` 唯一，重复回调和同一 Action 被多 Plan 复用不能制造第二次结清。并发许可消费者使用同一 `execution_attempt_id/permit_token_digest` 的受信 CAS，只能有一个 `ISSUED → CONSUMED`；撤权事务与消费事务按持久安全 epoch 验证执行顺序。

Session 绑定启用部分唯一约束，父 Session 结束/撤权时对所有子 Session 触发阻断。关联候选提交时同时确认 `candidateCount=1` 和权属证据未变化；失去候选唯一性或遇到跨租户竞争即拒绝而非重试盲提交。

### 13.5 源端确认与准出回执的事务协议

- **Source Confirm**：确保必要的原始审计事实或可恢复的源端消费位点/窗口状态持久化后 ACK；重放时依赖稳定 TriggerId 和业务幂等键去重。
- **Domain/Effects Commit**：原生聚合、扩展计划/动作/复用引用和持久 Effects 必须在一个 `Store.atomic()` 事务内落地；`afterCommit()` 只能在事务提交后通知，不承担持久化。
- **ContextPatch Evidence**：`INJECTED` 只表示注入调用成功；`CONSUMED` 必须有实际模型请求包含 patchId 的可信证据。只有 Inbox 事件则保留 `DELIVERED_UNVERIFIED`。
- **Outbox Transport**：`CHANNEL_ACCEPTED` 表示渠道服务接受发送，`DELIVERY_CONFIRMED` 仅由支持该能力的渠道收件回执证明；原生 Outbox `sent` 不直接等同于送达。未知结果先对账，无解时进入 `MANUAL_REVIEW`。
- **紧急撤权**：安全拒绝版本先写入可信存储并即时传播到守卫缓存，停止新派发和已有 Session 后续工具；普通 Policy 改版不默认删除活跃 Mandate。
- **Exactly Once**：不承诺跨非幂等外部系统的无条件恰好一次；源端、Action、Outbox 以稳定业务 ID、可信回执和异常对账建立可核验的最终一致性。

### 13.6 上游工具状态与业务持久结果不得混同（V1.2）

- `AgentTeam team/task` 日志与 CAS 仅描述协作任务；根 Session 重启、失联认领、持久写入结果不确定时读取原任务板再尝试恢复。业务 `ActionRun/Effect/ExecutionAttempt` 继续由单一 Engine/Store 掌握，不以原生 Team Task 完成替代业务验证或结清。
- Browser Session / Cookie 不属于可重放业务事实。取消、断网、崩溃或重试后，任何可能已触发外部效果的操作记录为 `UNKNOWN_RECONCILE`；通过远端可验证状态、幂等接口或人工核查结清，不自动重复提交。
- Schedule 到期投递仅表示 Session inbox 有持久消息；若需业务执行，必须用稳定来源/周期键经 Engine 去重、检查 Mandate 和当前安全版本。Schedule 既不是业务队列，也不提供跨业务系统的恰好一次执行保证。
- DeepSeek 服务端工具的搜索结果/引用、Fetch Markdown、OCR 文本与模型最终回答必须分别归档证据等级；HTTP `200`、流式片段或 `safety_check` 非拒绝不能作为“任务成功”或“执行许可”。

**Schedule 定时与手动执行需要不同的恢复身份**：Host 先完成 Session inbox 持久写入，后写 Schedule receipt，中途崩溃可能重复投递。**自动定时**仅在权威计划周期稳定且可由受信入口核验时，使用 `scheduleTaskId + authoritativeOccurrenceAt`（结合租户/来源）作业务去重；不能用本次 `messageId` 冒充周期身份。**人工 `runNow()`** 在每次实际调用时生成新的 `occurrenceAt = Date.now()`，重试的时间不同，因此不得使用 `scheduleTaskId + scheduledAt` 判定同一人工业务操作。人工请求须先由受信入口**持久化** `manualExecutionRequestId` 与业务范围，再使用同一 ID 通过 Engine/Effects 处理可写 ActionRun；原生 Schedule `runNow()` 当前不接收该 ID，也不保证可靠关联传给 inbox，**禁止直接通过它派发可写业务**。如以后接入受信关联 Envelope，需分别验证创建、持久 Inbox、receipt 失败、重启后识别同一 ID 及新的真实人工请求不得混同；未经实现/验证仍保持只读通知与人工处理。

## 14. 插件生命周期、配置与可运维性

### 14.1 装配规则

使用官方 `dsh` profile/bundle/patch 机制装配，不直接启动替代的 Node 业务 Server。`dsh --profile web --dump-config` 是本地核查实际装载插件树的步骤。新增插件应含 `apply(ctx,config)`、配置 schema、依赖声明、健康检查、停止时清理订阅、对已落库 Effects 的幂等恢复。

**装配示意（伪配置，字段与包名需按版本适配）**：

```yaml
# 伪配置：演示插件装配意图，不承诺可直接用于上游配置解析器
cognitive_mesh:
  mode: SANDBOX
  jev:
    model: "<PINNED_JEV_MODEL_ID>"  # M1 锁定可用版本；不得使用浮动 latest 作为验收配置
    fallback: MASTER_ASSESSOR
  main_router:
    candidate_limit: 15
    ticket_card_max_tokens: 150
    ticket_card_max_summary_chars: 80
    ticket_card_max_anchors: 10
    # 与 §9.2 maxSerializedTokens/maxSummaryChars/maxAnchors 一一对应；以整卡 token 上限为最终准则
    association_auto_commit: VERIFIED_EVIDENCE_ONLY
  side_ontology:
    enabled: true
    publish_requires_approval: true
  side_trend:
    enabled: true
  action_tiers: [1, 2, 3, 4]
  telemetry:
    evidence_mode: UPSTREAM_REPLAYABLE  # 或 LOCAL_DURABLE
    window_mode: TUMBLING
    ack_before_durable: false
  execution_scope:
    max_runtime_minutes: 30
    prohibited_actions: [DIRECT_PROD_DB_WRITE, GIT_FORCE_PUSH, MERGE_PR]
    production_write_default: DENY
    safety_policy_requires_fresh_snapshot: true
    emergency_revocation_enabled: true
  session_policy:
    force_restricted_preset: true
    refuse_danger_full_access: true
    child_scope_must_be_subset: true
  governance:
    authorization_default: DENY
    require_tool_guard: true
    watchdog_interval_seconds: 60
    watchdog_trajectory_window: 5
```

### 14.1.0 官方 Bundle 装配事实与首期验证方式

官方原型的 `package.json` 含 `dsh: { bundle: { patch: "./cordis.patch.yml" } }`；其 `src/index.ts` 定义了可供 Cordis 加载的主插件，而 `cordis.patch.yml` 已插入 `dsh-superagent`、GitHub watcher 和默认禁用的 Feishu watcher。**这些是上游已存在的装配入口，不应在新 patch 中重复添加同名 ID**。下面只是官方 patch 结构摘录，用来核对加载路径（**不要直接重复追加到文件**）：

```yaml
- insert:
    - id: dsh-superagent
      name: dsh-superagent
    - id: dsh-superagent-github
      name: dsh-superagent/github-watch
    - id: dsh-superagent-feishu
      name: dsh-superagent/feishu-watch
      disabled: true
```

M0 推荐沿用该 Bundle 并从 `src/index.ts` / `Runtime` 内安装 `installMeshM0()`。正确结果是：`dsh` 配置树中出现**原生** `dsh-superagent`，启动日志出现 mesh bridge installed，主动销毁/重启出现 disposed；之后再单独验证 `CognitiveMeshService` 的实际注册、依赖和命令调用。若需创建独立插件，先发布 `./mesh` 导出和编译文件再注册额外 ID，不能直接在 `cordis.patch.yml` 加一个不存在的包名。

**M0 可重复命令（须在实际已配置的 profile 环境运行，`web` 并非所有环境都现成存在）**：

```bash
# SuperAgent fork 内：记录并锁定版本；通过后留存日志与退出码
git rev-parse HEAD
node --version
corepack pnpm --version
shasum -a 256 pnpm-lock.yaml  # macOS/Linux；记录 lockfile 的 SHA-256
node -p "JSON.stringify({engines:require('./package.json').engines,packageManager:require('./package.json').packageManager})"
corepack pnpm install --frozen-lockfile
corepack pnpm check

# Harness 安装环境：profile 名称以已存在的实际配置为准
# dsh --profile <实际Profile名称> --dump-config
# 核对插件 ID、禁用状态、Bundle 注入、Runtime/Bridge 启停日志
```

Shell 示例中的具体命令必须在所锁定的兼容 Harness/SuperAgent 环境验证。`pnpm check` 仅证明 SuperAgent 构建/测试通过，**不等于**扩展桥接安装、Engine 事务或受限 Worker 已通过；后二者需要下列 M0 负向测试。

### 14.1.1 学习版启动 Profile 与 Mock 安全闸

本节为**项目自定义概念配置**，具体字段必须经 M0 类型/装配核验后落实到实际 Profile；不得把下面的演示键误认为上游已支持。

```yaml
prototype:
  enabled: true
  deployment_mode: SINGLE_TENANT_SANDBOX
  fixture_source_enabled: true
  write_to_production: false
  mock_rpc_enabled: true
  mock_outbox_enabled: true
  auto_restart_worker: false
  team_mode: FIXED_TWO_AGENT_SEQUENTIAL
  sop_mode: FIXED_THREE_STEP
  architecture_view: TRACE_BACKED  # M5：从实际事件与状态读取，而非静态 SCENARIOS
```

除已通过测试的只读接入外，默认断开生产网络出口，禁止真实财务 API/生产数据库凭据。没有 Jev/DeepSeek 凭据时可独立运行 Mock 适配器的单测，但对应模型集成验收保持未通过，不能虚构模型调用成功。

### 14.2 监控指标

`source_ingest_total`、`source_duplicate_total`、`jev_call_total{status}`、`jev_latency_ms`、`eval_undecided_total`、`ticket_merge_false_positive`、`action_plan_committed_total`、`action_business_effect_reuse_total`、`action_business_key_collision_total`、`action_retry_total`、`action_conflict_total`、`effect_backlog`、`effect_atomic_commit_failure_total`、`worker_stall_total`、`session_restricted_preset_violation_total`、`active_session_binding_conflict_total`、`ontology_proposal_review_total`、`context_patch_model_request_confirmed_total`、`guardrail_denied_total`、`safety_revocation_enforced_total`、`outbox_channel_accepted_total`、`outbox_delivery_confirmed_total`、`outbox_reconcile_manual_total`、`exit_delivery_duplicate_total`。必须按 Source、租户、模块、tier 及结果分类，并限制高基数标签。

### 14.3 性能要求：待实测而非预设承诺

- 2A 确定性初筛目标 p95 <10ms（不含网络）；Jev/LLM 外部请求实测并记录排队、网络和模型时间，不沿用蓝图中的估算为保证。
- 1000 条重复告警与中途崩溃恢复必须同时满足：业务副作用不重复、审计范围可核验、来源游标与窗口汇总正确。若 `evidenceMode` 的可靠性条件未满足则拒绝 ACK；SQLite 写入堵塞时背压或限速，不能静默丢失。
- 单文件 SQLite 维持单实例单写入者；G0 基准测试需分别测 Intake、Store.atomic 写入、Effects backlog、Jev 与 RPC，禁止靠启动第二个共享文件写入者解决瓶颈。
- 以锁版 tokenizer 对整张 TicketCard 核验 `≤150 Tokens`；单独跟踪 `CARD_BUDGET_EXCEEDED`、召回率、误归并率。
- 以同一 `businessIntentId` 在不同 Plan 版本产生相同业务效果时，外部副作用数必须仍为 1；提交前后故障注入不能产生孤儿计划/Effect。
- 权限验收必须检查真实角色 preset、OS/容器用户、挂载/网络/凭据与同步工具拒绝。常规策略改版与紧急撤权分别测试，保证安全规则不会意外扩大授权。
- ContextPatch 必须区分 `inserted/claimed/model-request-included`，无可靠请求证据不标记 `CONSUMED`；模型结果未知不等于输入未被投递。
- Outbox 测试分别统计渠道接受和实际收件回执，无回执渠道不得生成伪 `DELIVERY_CONFIRMED`；异常发送进入对账或人工处理，不承诺全渠道 Exactly Once。

### 14.4 查询与运维 API（项目扩展端口）

这些 API 可通过 Harness 内的服务插件/管理路由暴露；不是替代 `Engine` 的独立业务后端。接口名称属于项目标准，具体 HTTP 绑定在实现阶段由管理插件确定。

**所有接口的共同强制输入（不是客户端字段）**：HTTP/Service 入口必须认证生成只读 `TrustedRequestContext={tenantId, actorRef, requestId, roles/scopes}`，下表每行的“受信 ctx”均指**服务端注入**，不得读取客户端 Body/Query/Path 自报的 `tenantId` 作为权限身份。每次查询、关联聚合及资源反查必须以 `tenant_id=ctx.tenantId` 过滤并校验授权作用域；**任何领域写入还必须由受信适配层生成 §5.1 的 `TrustedCommandContext`，并由 Engine 重新验证，不能仅凭只读 `TrustedRequestContext` 写入**；跨租户对象返回不泄露存在性的拒绝/NotFound，管理员也须显式授权，不使用无租户过滤的全局查询。M0 实施通用鉴权与拒绝缺失 ctx 的测试；M1–M5 每新增 API 均自动继承此规则。

| 接口 | 输入 | 输出 | 权限/一致性要求 |
|---|---|---|---|
| `GET /mesh/events/{triggerId}` | 受信 ctx.tenantId；triggerId | 原始事件摘要、Eval、关联 Ticket | 只读，保留证据来源 |
| `GET /mesh/tickets/{ticketId}/timeline` | 受信 ctx.tenantId；ticketId | 输入、决策、ActionRun、SessionEvent 时间线 | 以 Engine 事务版本为准 |
| `GET /mesh/actions/{actionId}` | 受信 ctx.tenantId；actionId | 状态、attempt、结果及幂等键 | 只读，脱敏参数 |
| `POST /mesh/actions/{actionId}/reconcile` | 受信 ctx.tenantId、ctx.actorRef；expectedVersion；actionId | 远端对账作业编号 | 审批与幂等，不直接重复写入 |
| `GET /mesh/ontology/proposals` | 受信 ctx.tenantId；domain, status | 本体提案及证据 | 不返回原始敏感 payload |
| `GET /mesh/watchdog/{assignmentId}` | 受信 ctx.tenantId；assignmentId | 观察、恢复次数、终止原因 | 只读，受租户约束 |
| `GET /mesh/actions/by-business-key/{key}` | 受信 ctx.tenantId；businessEffectKey | 逻辑业务动作、复用计划、对账状态 | 严格租户隔离；脱敏业务参数 |
| `GET /mesh/sessions/{sessionId}/binding` | 受信 ctx.tenantId；sessionId | 安全策略版本、绑定有效性、资源摘要 | 管理员只读，不泄露令牌或秘密内容 |
| `GET /mesh/tickets/{ticketId}/exit-reports` | 受信 ctx.tenantId；ticketId | 报告流程、Channel accepted、Delivery confirmed 与证据 | 区分渠道接受与终端送达 |

所有 API 的审计字段统一包含 `requestId、tenantId、actorId、timestamp、aggregateVersion`，其中 tenantId/actorId 取自服务端受信 ctx，外部输入仅作为待验证业务数据；返回异常采用 `code、message、retryable、evidenceRef`，其中 `VALIDATION_ERROR`、`ACCESS_DENIED`、`VERSION_CONFLICT` 为不可盲重试的失败，`UPSTREAM_TIMEOUT`、`RATE_LIMIT` 按退避规则重试。管理命令使用经验证的身份、资源范围及审批，不允许仅凭 Jev 输出开放权限。

### 14.5 HTML 架构蓝图与真实运行轨迹的集成

`superagent_x_jev(2).html` 的 `MODULES/SCENARIOS`、箭头高亮、详情面板可以保留为**展示壳**；其静态场景步骤、延迟、置信度、收益数字只是蓝图样例，不是后端运行证据。

**蓝图功能节点与学习版运行证据对齐**（具体输入输出以 §4/§5/§6 为准，前端原型中的 API 片段仅为需求示意）：

| HTML 场景节点顺序 | 学习版里程碑 | 实际应读取的后端证据 |
|---|---|---|
| S1 `1B → 2A → 2B → 3A → (4A + 4C) → 3C1 → 5C` | M2 | 入站 Trigger/Eval、Plan 与两条 ActionRun、Mock RPC 结果、Worker SessionEvent、本体提案、Mock ExitReport |
| S2 `1A → 2A → 2B → 3B → 3A → 3C2 → 4C` | M3 | GitHub/飞书两来源事实、受信 Ticket 关联提案、同一 Ticket 的证据、TrendFinding、ContextPatch 真实状态 |
| S3 `4C → 5A → 5B → 5C` | M4 | 危险工具拒绝与目标未改变的证明、连续失败轨迹、一次有界提示、真实验证结果及 Mock Report |

其中 `3C1` 的 Schema Fixture 检查只产生可审阅 `OntologyProposal`，不能在图中动画标成“本体已自动应用”；`S2` 的语义关联须通过 Engine 证据门槛，不能仅按 Jev 置信度把 PR 自动订阅到 Ticket；`S3` 的越权拦截以真实 ToolGuard 与 OS 隔离的阻断结果为准，不能以 Jev 的风险评分代替。

M5 增加一个仅供本地学习环境使用的**只读运行轨迹适配器**：

```ts
interface DemoRunTrace {
  runId: string;
  scenario: 'S1' | 'S2' | 'S3';
  startedAt: string;
  events: Array<{
    seq: number;
    nodeId: string;              // 1A / 2B / 3A / 4C / ...
    status: 'STARTED'|'SUCCEEDED'|'FAILED'|'SKIPPED'|'UNVERIFIED';
    triggerId?: string;
    ticketId?: string;
    actionId?: string;
    sessionEventRef?: string;
    evidenceRef?: string;
    occurredAt: string;
  }>;
}
```

可由管理插件只读暴露 `GET /mesh/demo/runs/{runId}`（快照）及 `GET /mesh/demo/runs/{runId}/events?afterSeq=`（轮询增量），仅在测试环境启用。模块高亮从持久化事实/SessionEvent/ActionRun 转换的轨迹驱动；无结果时显示 `UNVERIFIED`，不可自动填充“80ms 成功”“已阻断”“已消费”。页面不应成为写入 Engine 状态的第二个入口，服务端要做最小身份校验和脱敏。

### 14.6 提供方选择、数据出站与调用预算（V1.2）

新增**配置约束而不是第二套配置服务**：显式登记 `providerId、searchProvider、fetchProvider、selectedModelRoute、serverWebToolsEnabled` 和选用的认证来源；敏感凭据仅经 Harness 已验证的受信凭据服务解析，绝不写入仓库、Session 明文日志或证据工件。`ctx.web` 当前默认本地 HTTP Fetch 不限制目的地，未通过 SSRF 与网络隔离验证前不可给不可信网页或 Agent 暴露。

按每一受信 Ticket/Session 及根预算限制最大外部查询次数、Fetched 页面数、OCR 页数、模型 Token、并发数、墙钟时间与重试次数；单独记账模型推理与 DeepSeek Search/Fetch 的计费请求，避免误以为工具调用包含在 Token 费用中。异常按服务端明确的可重试类别和幂等条件退避；对可写浏览器/RPC 不自动盲目重试。日志记录目标域和用量摘要但须脱敏；预算未知时采取保守限制或拒绝新的收费调用。

**新增配置与测试要求**：将 `sendOriginalQuestion: false`（真实出站没有 `ori_question`）、`searchBilling/fetchBilling` 的实际账户/API Key 和 endpoint、provider 动态变更后的授权重核，作为新 Web 能力准入条件。插件 `searchRequestsPerSecond` 仅限制当前插件实例，不能替代跨实例/账号限速与根业务预算；模型工具、业务直调、服务端 Web Tools 三条路径须分别测试，不以 ToolGuard 单路通过推断全部安全。

## 15. 分阶段实施计划（学习版 M0—M5 与完整目标 G0—G5）

### 15.1 完整目标的 G0—G5 工程准出门槛

下表保留最终产品化路径，仅在后续需要可靠生产能力时逐项执行。**学习版 M0—M5 可以先在隔离环境运行，但不能借此跳过真实生产写入前的 G0—G5 要求。**

| 阶段 | 交付能力 | 目标出口门槛 |
|---|---|---|
| **G0 基线验证** | 锁定 Harness/SuperAgent/TypeSafe SDK、最小业务端口及 Session 安全接线 | 完成本节 G0 的十二项实证检查，批准后才能冻结确切扩展契约 |
| **G1 事件与准入** | 1A/1B/1C、2A/2B、3B；来源重放、Jev 影子模式 | 去重与审计、遥测可靠性、零生产副作用及重启恢复通过 |
| **G2 主路与沙盒执行** | 3A/3D、4A/4B/4C 和基础 ExitGate | 一源多动作，跨 Plan 幂等、单事务/持久 Effects、受限 Worker 与初级回执协议通过 |
| **G3 旁路与 Team** | 3C1/3C2、4D；完整 ContextPatch、OntologyProposal | S2-A/S2-B 独立通过，子 Session 权限子集、本体审批和 Verifier 证据闭环 |
| **G4 完整 L5** | 5A/5B/5C 覆盖所有动作与工具 | 工具执行前拒绝、真实 OS/容器隔离、紧急撤权、有界 Watchdog 与 Outbox 对账通过 |
| **G5 全链路验收** | 17/17 模块，三大场景和故障/压力/安全联测 | 跨模块数据一致性、授权、幂等、交付证据全部达到验收口径 |

### 15.1.1 完整工程 G0 必须验证的最小事实

1. **源码与运行锁版**：按 §2.4 记录 Harness/SuperAgent 两个 Git SHA、实际安装的 DSH/Cordis/TypeSafe SDK 版本、Node.js、pnpm、lockfile SHA 和 SQLite schema；完成 `install/typecheck/test/build`、锁版兼容矩阵、原生 Bundle 配置树与所用事件签名核验；不能用“当前主分支”替代固定可复现组合。
2. **Cordis 组合根**：首期 fork 原生 Bundle，沿用 `src/index.ts` 与 `cordis.patch.yml`，先验证 `installMeshM0()` 的初始化/注销及真实 `dsh --dump-config`；随后按锁版 Cordis Service API 实际注册和消费受控 `CognitiveMeshService`，核验依赖及重启恢复；单有 `packages/*` 目录、日志或伪配置不算 Service 接通，不得另建业务真相服务器。
3. **Eval/Decision 兼容**：真实调用 CompositeAssessor 验证 Jev 映射、MasterAssessor fallback、超时/`unavailable` 与原生 Eval 事务推进。
4. **领域关联合法性**：构造同仓库但不同 Ticket 的 PR/Issue，对同主题候选必须拒绝自动 Subscription；仅可验证 Ticket 专属引用或唯一既有变更关系可在授权核验和 CAS 后提交。
5. **原子提交最小桩**：M0 在同一个原生 Store 中创建测试专用的 `mesh_m0_probe` migration 和受控、无外部生产写的 Effect，验证“扩展 probe 行 + Effect”同事务提交/失败回滚/重启恢复；这是**可行性测试**而非真实 ActionPlan 已实现。M2 再验证原生 Ticket/Assignment 的合法写入、ActionPlan/Run/复用引用与 Effect 同事务提交，防止孤儿 Action；完整 G0 准出需覆盖真实原子领域命令。
6. **跨计划幂等**：使用同一 `businessIntentId` 在至少两个 Plan 版本重复计算相同 RPC，验证 `(tenantId,businessEffectKey)` 唯一、第二计划只复用已有 ActionRun、实际副作用最多一次；`attemptNo` 不改变 Effects Key。
7. **Effects 故障语义**：在锁版源码验证同 Key 待处理覆盖、失败退避、Lease/重启恢复、未知远端回执对账，证明不会因为逻辑重试触发双写。
8. **Session 实际权限**：核实上游 `Sessions.ensure()` 是否设置 `danger-full-access`，实施最小改造并验证新建、恢复、主 Session、Worker、Team 子会话的实际受限角色，使用真实无副作用负向测试证明越权工具未被执行。
9. **ToolGuard 与安全版本**：编译并调用 `ctx.tools.guard()`，验证相对于 `tools/pre-execute` 的时序、可信 Session 绑定、普通 Policy 改版的 Mandate 保留、紧急安全撤权的同步拒绝；Tier1/Tier2 ActionGateway 也需独立拒绝。
10. **ContextPatch 投递证据**：实测运行中、空闲、结束、取消会话；`inserted/claimed` 不自动变 `CONSUMED`，只有模型请求包含 Patch 的可靠证据才可确认，否则保留 `DELIVERED_UNVERIFIED`。
11. **遥测源端 ACK/重放**：选定 `UPSTREAM_REPLAYABLE` 或 `LOCAL_DURABLE`，在窗口尚未关闭时强杀进程并恢复，核对审计证据、固定窗口计数和重放游标。
12. **状态机、DDL、Outbox**：将规范状态机转为类型和测试，所有引用字段、唯一约束与 DDL 一致；验证 `CHANNEL_ACCEPTED` 与 `DELIVERY_CONFIRMED` 的区别，以及无收件回执渠道的降级与人工对账流程。

**准出约束**：G0 只要求最小可运行桩和明确契约，不要求 17 个业务模块全部完成。十二项实证均应保留可复现命令、输入、预期/实际结果与版本快照。G0 未通过前不得宣称 `packages/contracts/` 已全面冻结，也不得开放 `ACTIVE` 生产写；工具隔离能力不具备时仅能进行无高危能力的离线沙盒演练。

### 15.2 学习版 M0—M5 的最小可运行路线

每个阶段只引入为本阶段真实验收所必需的源码改动；跨阶段的接口标记为“待实现”，不得伪造“已经运行”。M0—M5 以**可复现实验结果**为准，不以静态 HTML 动画或文件夹存在为准。

| 学习里程碑 | 先完成的最小任务 | 必须通过的验收证据 | 未完成时不得继续宣称 |
|---|---|---|---|
| **M0 底座与关键可行性** | 锁定兼容版本；fork 原生 Bundle 并安装 `installMeshM0`；验证 Cordis 生命周期及最小 Service 接口；修复 `Sessions.ensure` 宽权限；用 `mesh_m0_probe` 验证 `Store.atomic + Effects` 同步原子/回滚 | Git SHA 与 lockfile、`pnpm check`、`dsh --dump-config`、Bridge 启停、Service 实际调用、隔离容器与新建/恢复 Session 拒绝测试、probe/Effect 重启记录 | 不能宣称完整 ActionPlan 已可用、外部插件已发布、Worker 已经生产安全 |
| **M1 事件与真实主路** | Fixture Source → FastPath → Jev 实际调用 → 原生 Eval/Decision → Ticket → SQLite TicketCard；模型不可用保守回退 | 1 个真实 Eval 结果、Ticket ID、重投递去重、模型失败路径记录 | 不能把 Mock Jev 当成实际 SDK 集成 |
| **M2 一源多动作（S1）** | 同 Ticket 的两项 ActionRun，各新动作在同一事务持久入队 Effects（REUSED 不入队）；Tier1 Mock 和受限 Tier3 Worker；同 Mandate 多 Action 共享根预算、Worker 首次工作同步启动闸与 CAS Attempt 一次性许可，临时锁 PAUSED、旧 Plan 安全替代、全引用结清与远端对账证据；3D 摘要、3C1 提案与 Mock Outbox | 两条 ActionRun 对应两条新 Effect、独立确定性后置校验、同 Effect Key 恢复/租约核验、同根两 Action 共用 30 分钟/总尝试额度、Attempt 预扣且结果不明不免费重试、全部引用动作结清才完成 Plan 且结清事件唯一、Gateway 的过期/撤权许可消费拒绝可证明、远端请求/操作引用可查、跨 Plan 重复无新增 Mock 写 | 不能宣称真实冻结、自动重启/重调度可用或本体正式发布 |
| **M3 跨渠道与记忆（S2）** | 测试飞书/PR 事件、受信精确引用关联；相同规则下新证据创建 Proposal 新版本；SQLite 最近七天召回；3C2 TrendFinding 与 ContextPatch 实际投递并通过不可变证据明细表保留多个模型请求及已 EXPIRED 的历史消费证据 | 同证据指纹不重复 Proposal、新证据生成新 proposal_version；Ticket 输入或合法 Session 注入与可信 Patch 状态 | 不能以语义相似自动扩大 Subscription，也不能虚构 Patch 消费 |
| **M4 风险治理（S3）** | 在 M0 已生效的守卫上叠加 Jev 风险评估、最近五步 Watchdog 与一次有界提示、独立确定性安全验证、Exit 三条件及静默时持久 HumanWorkItem | 实际守卫拒绝、目标未修改哈希、可审计 Watchdog、SILENT 下人工待办可查/可关闭、Mock 出站或明确未发送 | 不能仅凭评分宣称安全阻断/自愈或把静默等同人工事项已处理 |
| **M5 模块覆盖与可视化** | 1C 模拟遥测及同一上游 ID 的可信有序关闭/重开、来源 epoch 切换与序号重置、旧 OPEN 乱序重放、固定三节点 SOP 的失败版本恢复、两真实 Agent Session 的最小 Team（含早期失败）；HTML 从运行轨迹读状态 | 两个不同规范 IncidentEpisode、旧 OPEN 延迟到达不产生新 episode、不重放业务副作用、SopStep 新版本与原业务键、TeamRun DISPATCHED/EXECUTING 早期失败证据、真实双 Session 和三场景轨迹 | 不能以两个函数冒充 Team，不能以固定动画充当真实系统 |

**七项独立复审修订的阶段门槛**：M2 以前锁定 `MANDATE_ROOT` 预算、执行尝试原子计费、远端对账证据、健康 RUNNING 的 supersede 规则和全引用 Plan 结清；M3 以前实现 Patch 投递终态与历史消费证据分离；M5 对遥测 OPEN/CLOSE 必须提供可信有序来源证据，不能用普通时间戳猜测。仍需以锁版 Harness/SuperAgent 类型与 Effects Handler 故障注入验证，设计文字不等于功能可用。

**补充契约的阶段归属**：M1 检验 `telemetry-watch` 规范值的 TypeScript 联合类型但遥测 Fixture 到 M5 才启用；M2 必须实现 ActionAttempt 与原生 Assignment 的可空受信关联、Plan 版本唯一与 ActionRun.reasonCode，并验证重启可反查；M3 交付 TrendFinding 窗口/证据指纹去重与 Proposal 操作人；M4 交付 Watchdog 稳定窗口去重；M5 验证可信 `incidentId` 与严重度升级复用原 BusinessIntent。

**依赖硬顺序**：M0 验证原生桥接、安全与事务 → M1 原生 Eval/Ticket → M2 合法一源多 ActionRun → M3 受信关联与 Patch → M4 Watchdog/Exit → M5 固定 SOP/Team/遥测/UI。若 M0 发现所需上游 Port 不存在，先补**最小可回归桥接**，不要开发平行的 Engine；若 M2 的 ActionPlan 不能同原生 Store/Effects 一起提交，必须停止伪多动作实现并返回修正接线。

### 15.2.1 V1.2 升级评估与实施顺序（不改变原阶段出口）

| 时点 | 允许的工作 | 不得宣称 |
| --- | --- | --- |
| **M0 正在进行** | 静态能力核验、独立只读/无凭据 Fixture、候选 rc.3 隔离分支编译/构建/全量测试、接口负向验证 | 不得更换主开发分支 Harness gitlink 或解锁 `executionReady` |
| **M0-14 正式通过后** | 在已冻结的兼容组合上选择 `ctx.web` Provider，按 M1 Source/Eval 前置接线只读证据 | 不得将外部搜索摘要直接视为决策或完整原件 |
| **M2 依赖满足时** | 履行 ActionRun/许可/根预算后做只读浏览器探针；敏感浏览器写操作仍保持 Fixture/Mock | 不得把一次会话点击当成持久成功 |
| **M3—M4** | 引入 Schema/趋势研究证据，完成工具出站、来源可信与撤权负例 | 不得用安全模型评分代替最终拒绝 |
| **M5** | 复用具名 SubAgent/AgentTeam 完成两真实受限 Session 的独立验证，以及按需的浏览器/Schedule 演示 | 不得以共享工作目录或任务板状态冒充独立审查 |

当前固定组合与 `dsh-v0.2.2-rc.3` 是两份**独立候选**，升级评审必须留存两仓库准确 SHA、pnpm/Node/锁文件、Cordis/Schemastery/DSH 解析版本、原生 Bundle/Session/Tool/Store/Effects/Outbox 回归、全量测试与跳过/失败清单。版本升级与 M0 功能验收独立投票，不能互相抵扣。

### 15.3 最小接口与状态实现优先级

学习版优先实现 `acceptSourceEvent`、`JevDecisionPort.evaluate`、原生 Eval/Ticket 接线、`ActionPlanCommandPort.commitPlan`、`ActionExecutorPort(Mock)`、受限 Session `report`、只读时间线。其余接口在相应 M 阶段才加入。

- **M0—M2 必须保证**：M0 先验证 `TrustedCommandContext`、Session 绑定 epoch/expiry、允许集减去禁止集与实际隔离；M1 验证 2A/2B 的 16 种组合与原生 Decision 的完整映射；M2 验证稳定 `Trigger.id/businessIntentId`、Engine 重算版本化 `businessEffectKey`、一个业务效果只对应一个 ActionRun、跨 Assignment 的稳定预算、`PAUSED/RETRY_WAIT` 与终态区分、临时锁等待、旧 Plan supersede 安全取消、逐动作 Effects 入队、独立确定性验证器、`ActionPlan.status/outcome` 聚合及默认拒绝真实危险动作。
- **M3—M5 按需补齐**：M3 补齐关联提案 `evidenceKind/candidateCount/proposalVersion/evidenceFingerprint` 与 Patch 的注入后状态；M4 补齐 GateAudit `reasonCode/epoch`、静默不丢人工待办 `HumanWorkItem`、独立确定性验证与 Watchdog 目标聚合；M5 补齐重开的规范 `incidentId`、固定 SOP Step 失败版本重跑、TeamRun 早期失败/恢复、真实双 Agent 工件/验证及只读轨迹视图。
- **延后到生产化路径**：完整审批实体/UI、外部写对账能力、多租户共享集群、容量门槛验证、完整高并发重放、危险工具全覆盖与任意 DAG 执行，不应成为学习版入门的隐性前置依赖。
- **阶段记录**：每个 M 阶段留下锁版 Commit、启动命令、使用的 Fixture/测试来源、运行的测试、真实/Mock 能力边界及已知缺口；后续 G0—G5 再按更严格的独立标准审查。

## 16. 全量验收规范

### 16.1 模块验收最小条件

- 每个模块有明确 Owner、Cordis 注册入口或 SuperAgent Port、输入输出契约、持久化规则、错误码、监控、测试。
- 每个模块提供 `happy path + failure path + replay/restart` 至少三类案例；L5 增加越权和注入案例。
- 从任意 Trigger 可按事件 ID 查到 Decision、关联 Ticket、ActionPlan、ActionRun、ContextPatch、最终结果和 Source 回执。

### 16.2 三场景硬验收

**S1：一源多动作与跨计划防重**
- 单一飞书 Trigger 经 Engine 创建 Ticket；同一次事务合法提交动作计划、Tier1 mock、Tier3 sandbox ActionRun、持久 Effects；3C1 提案独立持久化。
- 同 Trigger 重放、Plan 版本升级、告警修订与进程崩溃均不得重复外部副作用；第二 Plan 应引用相同 `businessEffectKey` 的已有 ActionRun。
- 负向测试包括事务提交前失败与提交后 Effect 未执行；不能出现孤儿 Action、误授权真实账单冻结。

**S2-A：跨渠道关联的证据等级**
- 无共享 trace_id 的 GitHub 与飞书事件可以形成关联候选，但同仓库/同服务只能为 Context/Proposal，不能自动 Subscription。
- 只有可核验 Ticket 专属引用或唯一已登记变更关系，且 Policy/租户/版本均通过时，Engine 才允许提交。多候选、跨租户、陈旧版本都必须拒绝。既定 Mandate 不变。

**S2-B：旁路 ContextPatch 的真实输入证明**
- 3C2 从过去默认 7 天的真实证据生成 TrendFinding 和 Patch；`QUEUED/INJECTED/DELIVERED_UNVERIFIED/CONSUMED` 遵循状态机。
- `agent.inject()`、inbox inserted、claimed 都不足以证实模型请求包含该内容；可归因模型请求才可标记 `CONSUMED`。迟到确认、重复、结束/取消、重启必须覆盖。

**S3：真实隔离、紧急撤权与出口证据**
- 使用受限 Session 角色实际试运行恶意 Tool Call，确认 `danger-full-access` 不会覆盖业务配置，guard/ActionGateway 在副作用之前拒绝，Worker 没有生产凭据。
- 普通 Policy 变更不能擅自改变已授权 Mandate；紧急安全撤权停止主/子 Session 的后续工具。Watchdog 用最近五步做有界干预，不重置累计时限。
- 独立验证证据（M4 可为确定性测试/安全后置校验，M5 才要求独立 Verifier Agent）成立后，ExitGate 才调用 3D 报告合成；Outbox 使用稳定 Key，渠道接受只写 `CHANNEL_ACCEPTED`，可信终端送达证据才写 `DELIVERY_CONFIRMED`，未知结果需对账。

### 16.3 质量门槛

- G0 锁版代码、十二项最小工程验证和原生回归全部通过；新增模块具正常、失败、重放/恢复用例。
- 原生聚合修改只能经 Engine，扩展计划和持久 Effects 与原生状态使用单个原子事务；故障注入证明没有孤儿 Action。
- 同一 `businessEffectKey` 在重投递、跨 Plan 版本、重试中至多造成一次有效业务副作用；结果未知必须先对账，不能靠重置 actionId 或增加 planVersion 回避。外部写前需原子记录 Attempt 许可、根预算扣次、Effect 指纹及远端请求引用，未知结果按远端能力人工/自动对账，不无条件重发。
- Jev 语义候选不会直接创建跨渠道 Subscription；同仓库不同工单的负向测试必须通过，授权来源可审计。
- 真实角色 preset、OS/容器隔离和 ToolGuard/ActionGateway 同步阻断均有证据；普通 Policy 变更与紧急安全撤权区别清楚，所有子 Agent 权限严格属于父 Scope 子集。
- ContextPatch 的实际模型请求证据可验证或保守停在 `DELIVERED_UNVERIFIED`；`EXPIRED` 后迟到的有效证据只补录 `HISTORICALLY_CONSUMED`，不能改变终态或凭 Inbox 插入/领取伪造模型消费。
- 出站至少证明 Channel accepted；只有可信送达回执可声明 Delivery confirmed；无回执渠道不制造已送达状态。
- 实际 tokenizer 验证 150 Token TicketCard 预算，记录超额回退及误归并率。
- 1000 条遥测风暴和窗口中途强杀恢复后，应保留的原始证据/上游可重放位点和汇总一致；无可靠来源条件时不得 ACK。
- 状态机唯一规范与 TypeScript/DDL/索引字段一致，任何非法状态跳转明确拒绝并审计；Jev 429、超时和类型错误均采取保守回退。
- 本体 Schema 变更必须验证、审批、可回滚；Verifier 未证实的工作不得标为完成。

### 16.4 学习版的场景与模块最小验收

学习版验收不重复要求完整 G0 的十二项工程门槛，但**不能放弃测试环境中的基本安全与幂等**。下列记录均来自实际运行而非静态演示文字。

| 验收点 | 输入与操作 | 最低通过条件 | 必要证据 |
|---|---|---|---|
| M0 底座 | 在锁定 Harness/SuperAgent 上运行原生 Bundle、安装/清理 Bridge；创建测试 probe 事务 | `pnpm check` 与配置树通过；Service 可调用且卸载后不可用；`Store.atomic` 同时提交 probe 行与 Effect，失败全回滚；受限容器无生产凭据，新建/恢复 Session 危险调用在执行前被拒绝 | 两仓库 Git SHA、锁文件哈希、版本矩阵、构建/插件日志、probe/Effect 数据、隔离与拒绝证据 |
| M1 Jev 接线 | 发送真实 Fixture 事件，覆盖 2A 四种入站分支并调用锁版 Jev SDK | 正常请求生成 Eval/Ticket；`RECORD_ONLY` 不创建新 Ticket；`UNDECIDED` 正确保守回退；重复事件不重建 | Request/响应类型、原生 `stop/ignore/unavailable/accept` 映射断言、EvalId、TicketId |
| M2 一源多动作 | 发送 S1 并重复十次，再跨两个 Plan 版本重复计算；尝试伪造 businessEffectKey | **一个 Ticket、两条可追溯 ActionRun**；Engine 重新计算键并拒绝冲突提案；Mock 冻结副作用最多一次；Plan 以全部 `mesh_plan_action_ref` 结清才产生 outcome；两条 ActionRun 共享 `MANDATE_ROOT` 根预算；有前置授权许可/远端证据记录，Worker 是实际 Session | Plan/Run/Attempt、规范 JSON 哈希样例、Mock 账户快照、SessionEvent |
| M2 本体提案 | 检查预设 Schema Fixture | 保存一条含差异与来源证据的 Proposal，正式 Schema 未变更 | Schema 版本、Diff、ProposalId |
| M3 跨渠道 | 飞书与 GitHub 无共享 traceId，测试有/无 Ticket 专属引用 | 有精确可信证据才受控关联；只有同仓库时不建立 Subscription | Proposal、Engine 关联决策与拒绝记录 |
| M3 Patch | 向在途受限 Worker 投递历史线索，并测试在注入前/注入后结束 Session | 有真实排队/注入证据；注入后不能倒退到 `REJECTED`；没有模型请求证据只能标为 `DELIVERED_UNVERIFIED` 或最终 `EXPIRED`；`EXPIRED` 后可信迟到证据只能补 `HISTORICALLY_CONSUMED`，不能改变投递终态 | PatchId、状态、模型请求证据（如有）与 SessionRef |
| M4 安全与 Watchdog | 不可信评论诱导危险命令、连续相同失败 | 真正阻止副作用；至多一次有界提示；没有后续成功证据不得称“自愈” | Guard audit、Tool 目标未修改、观察与验证输出 |
| M4 准出 | 用独立确定性检查验证的交付、真实待决问题、硬阻碍与静默多 Trigger 分别触发 | 正常获许可则 Mock Channel 发送；静默为 `SUPPRESSED` 且不排 Outbox；人工决策/硬阻碍仍有 `mesh_human_work_item(OPEN)` 与受信确认/解决/超时升级出口 | Exit 原因证据、独立校验哈希、报告与 WorkItem ID、Mock Outbox 无发送断言和待办状态 |
| M5 SOP 与 Team | 固定三节点流程失败后通过新 stepVersion 重跑、Team DISPATCHED/EXECUTING 阶段无工件失败、Planner/Worker + Verifier 两角色 | 失败旧 Step 版本不可更改，重跑保留原业务幂等键；Team 早期失败有受信证据，未知效果先 RECOVERING；两独立 Session 和单 Assignment 汇总 | 两版 `mesh_sop_step`、原 ActionRun/Effect Key、失败证据、TeamRun、2 条 SessionEvent 链 |
| M5 UI 与遥测 | 本地告警重发、加载 S1/S2/S3 运行结果 | 告警不因严重度升级或迟到旧 OPEN 重复 Mock 写；仅严格有序 CLOSE→OPEN 重建 episode，页面节点状态来自真实轨迹而非预置动画 | incidentId、TriggerId、DemoRunTrace |

**17 模块最小功能覆盖判定**：对照第 4 章逐项标记 `WIRED / PROTOTYPE / PRODUCTION_READY` 和对应的 `evidenceRef`。M5 结束时，17 项应至少为 `PROTOTYPE`（注明 Mock/Fixture 模式）才能宣称“图中 17 模块的学习版最小能力覆盖完成”；任意未满足可如实标注未完成，不为完成率牺牲事实。三场景的成功以该表中运行证据为准，不能以点击原 HTML 的“下一步”替代后端测试。

### 16.4.1 失败恢复、权限和流程一致性回归用例（新增设计验收）

| ID | 里程碑 | 输入与故障 | 预期状态/不可突破的断言 |
| --- | --- | --- | --- |
| R01 | M0 | 同一工具同时处于受信 Allow 与 CurrentSafetyDeny | EffectiveAllow 必须剔除该工具；父子禁止集均生效，守卫拒绝，操作系统隔离目标不变 |
| R02 | M1 | FastPath 四类与 WorkIntent 四类全组合（16 组） | `ROUTE_EVAL×CONTEXT_ONLY` 不建 Ticket；`ATTACH_CONTEXT×PROPOSE_TICKET` 不越级；RECORD_ONLY/REJECT_INVALID 不执行 Jev 或副作用 |
| R03 | M2 | 两个新 Action + 一个旧 Action REUSED，原子提交中第二个 Effect 抛错 | 所有新 Run/Effect 原子回滚，REUSED 不入队；正常重试时新动作各自只有一个稳定工作项 |
| R04 | M2 | 资源锁被另一合法操作占用，随后释放 | 已证实未发远端时 `PAUSED/RESOURCE_BUSY`；锁释放、权限/预算/原 Effect CAS 均满足后恢复，原业务键不变，Mock 副作用最多一次 |
| R05 | M2 | ActionRun 已 `FAILED/BLOCKED/CANCELLED`，重放 Trigger、Plan 或新建 Assignment | 不得变 `PENDING` 或重发原业务效果；真正独立授权的业务新请求须留下旧 ActionRun 血缘与外部状态核查 |
| R06 | M2 | 旧 Plan `SUPERSEDED`，旧动作分别处于 PENDING、REUSED、RUNNING、UNKNOWN | PENDING 且未执行/无人复用才取消；REUSED 继续引用；RUNNING/UNKNOWN 保留事实和对账，不盲撤销或重复派发 |
| R07 | M2 | 第一个 Assignment 开始后暂停/关机并用第二个 Assignment 恢复 | `budgetId/firstStartedAt/deadlineAt/attemptsUsed` 不变；超出包括停机时间在内的墙钟预算一律拒绝新执行 |
| R08 | M3 | 同 rule/trigger/ticket 先拒绝证据 A，再收到新的可信证据 B | A 重投不生成新 Proposal；B 生成 `proposalVersion+1`，`evidenceFingerprint` 与旧版不同，重新验证再提交 |
| R09 | M4 | `SILENT` 与 `HUMAN_DECISION_REQUIRED/HARD_BLOCKER` 共同出现且有多个 Trigger | 无普通外发；人工 WorkItem 保持 OPEN、可租户内查询/确认/超时升级；不可将 SUPPRESSED 视作已解决 |
| R10 | M4 | S1 Mock 成功/S3 Guard 拒绝，模型输出自称验证成功 | 仅受控独立快照/哈希/守卫证据可导致 DELIVERABLE_VERIFIED，Agent 自述不得替代独立验证 |
| R11 | M5 | TeamRun DISPATCHED/EXECUTING 即崩溃或预算耗尽，无交付物 | 可经有证据的早期 FAILED，结果不明时先 RECOVERING；不可伪造 VERIFYING 或成功 |
| R12 | M5 | 上游 `incident_id` 先 OPEN/CLOSED 后再次 OPEN，原始 ID 不变 | 内部规范 `incidentId` 分属两个 episode、业务意图不同；老事件重投不新增 episode |
| R13 | M5 | SOP Step FAILED 后按 checkpoint 重跑，旧 RPC 执行状态不明确 | 新 stepVersion 与 retryOf 引用旧版本，先对账；已成功的原 ActionRun 复用，不能仅因 stepVersion 改变重新 RPC |
| R14 | M2 | Plan A 包含一条健康 `RUNNING` 的旧 Action，提交 Plan B 标记 A 为 `SUPERSEDED` | ActionRun 仍为 `RUNNING`、原 Session/Effect 不误断；只有失联才能 `RECOVERING`，最终结果仍归旧 ActionRun；UI 保留未结清责任 |
| R15 | M2 | 同一 Plan 的 A=`SUCCEEDED`、B=`PENDING`（或 `PAUSED`）；之后旧 Plan 被替代但 A/B 仍有引用 | 全部 `mesh_plan_action_ref` 未终态前 `outstanding_action_count>0`、`settlement_state=OPEN`；不得 `FINISHED+SUCCESS`，`SUPERSEDED` 仍可在之后独立 `SETTLED` |
| R16 | M2 | 同一 Ticket/Mandate 先启动只读 Worker、后启动两个 ActionRun（并行或串行），再换 Plan/Assignment | 两动作共享同一 `MANDATE_ROOT`、相同 `deadline_at` 和根 `max_attempts_total`；根时钟从只读 Worker 首次工作开始；第二动作不能另领 30 分钟或重置尝试数 |
| R17 | M3 | Patch 已 `EXPIRED`，随后收到可信模型请求证据；再提交错误会话或晚于失效期的请求 | 正确旧请求只补 `evidence_status=HISTORICALLY_CONSUMED` 与两时间/证据，不变 `EXPIRED`、不重新注入；无效证据拒绝确认消费 |
| R18 | M2 | Effect `CLAIMED` 后资源锁占用；随后真正发送前崩溃；重复领取同一许可/新许可 | 资源锁失败不扣根次数；外部写之前原子扣一次并插 Attempt；崩溃不免费重试，同一 `execution_attempt_id` 不二次扣费，根耗尽 fail-closed |
| R19 | M5 | 同作用域 OPEN(seq=10)、CLOSE(seq=20)、旧 OPEN(seq=10) 迟到、随后新 OPEN(seq=30)；另测无可信序号 | 旧 OPEN 不开新 episode；seq=30 可信重开生成新规范 incidentId；无序号保持 ORDER_UNVERIFIED 待定且不派业务动作 |
| R20 | M2 | 外部 RPC 超时、`remote_operation_ref` 缺失；分别模拟支持/不支持远端幂等与查询 | 发送前有 `remote_request_ref`、Effect 指纹、原业务幂等键；可查询则据实对账，无查询且非幂等则保持 `UNKNOWN_RECONCILE/RECONCILIATION_MANUAL_REQUIRED`、禁止自动重发 |
| R21 | M2 | 签发 `ISSUED` 许可后紧急撤权或等待到期；并发两个 Gateway 消费相同令牌；另测先消费后撤权 | 已撤销/到期者消费 CAS 拒绝且无 Mock 写；同令牌并发最多消费一次；已消费再撤权不得宣称撤回远端效果，超时走 `UNKNOWN_RECONCILE`；审计证明真实 epoch 顺序 |
| R22 | M2 | 两个 Assignment 并行请求首次启动，其中一个只读 Worker；首次准入提交后尚未创建 Session 即杀进程 | 只有一个持久 `start_admission_ref` 和不可延后的 `first_started_at/deadline_at`；没有提交准入的 Worker 不能启动；重启不重置时钟、不因此免费获得额外预算 |
| R23 | M2 | 同一 Action 被两个 Plan 复用，两个 ActionRun 并发/重放终态；其中一条仍 PENDING，再同时接收重复回执 | `outstanding_action_count` 按各 Plan 全引用在事务中重算且一致；零之前不 `SETTLED`；零后每 Plan 仅一条 `mesh_plan_settlement_event`、一次完成通知；冲突 CAS 重读而非误减 |
| R24 | M3 | 同一 ContextPatch 先后包含在两个不同可信模型请求中，第二条迟到于 `EXPIRED`；另有重放、错误 Session、缺失发生时间的证明 | `mesh_context_patch_evidence` 留存各合法请求的独立不可变事实；重复去重、无效拒绝；主表取确定性代表性请求，状态不逆转、不丢历史、不重复投递 |
| R25 | M5 | `sourceEpoch=A, seq=99` 后上游序号归零进入未验证 epoch，旧事件重放；再提供受信 `sourceEpoch=B` 和跨 epoch CLOSE→OPEN 因果证据 | 未验证时 `ORDER_UNVERIFIED`、不自动重开也不签发新意图；有效 epoch 隔离重用的 nativeEventId/窗口；只有经证实跨 epoch 因果后合法生成新 episode；旧 epoch 延迟事件不覆盖新水位线 |

**本轮补充子场景，原 R01—R25 编号不变**：`R18-A`（M2）模拟持久 `CLAIMED` 后可能调用远端、尚未持久 `RUNNING` 即强杀或超时，必须合法进入 `UNKNOWN_RECONCILE`、保存原业务键/Attempt/远端查询引用且零盲重发；仅受信证明从未外发时才允许退回合法的 `PENDING/PAUSED`。`R24-C`（M3）模拟补丁载荷与 Effect 原子提交前后崩溃、Inbox 已接受但回执丢失；恢复使用原始持久字节并核验哈希，缺失、篡改、跨 Session、过期或撤权必须 fail-closed，不具备可靠 Inbox 去重时禁止盲重投。两者分别归属 R18/R24，不新增顶层测试编号。

**实现边界**：R01–R25 是设计要求，不代表源码已通过。M2 的自动重启/延迟调度能力须先用锁版原生 Effects 的 lease/CAS/重调度接口实测；缺失时只验收状态正确、原工作项不可重复及人工恢复入口，不能写作“自动恢复通过”。

### 16.5 学习版与完整工程验收的界限

M0—M5 不要求大规模吞吐、复杂审批、生产渠道送达、正式环境的高危自动止损、多租户共享隔离或自动本体发布；**这些能力不能被标成已实现**。但无论阶段如何划分，真实生产写未启用、Sandbox 受限、Jev 不授予权限、Engine 受信提交、稳定幂等、外部结果不伪造，是学习原型的硬约束。若未来需要切换 `ACTIVE`，必须返回执行第 15.1 节所规定的独立 G0—G5 验收。

### 16.6 DeepSeek API / Harness 原生能力增量验收（V1.2）

以下为**新增待执行用例**，不表示测试已通过；用例应分别记录 `PASS/FAIL/BLOCKED/NOT_RUN`、准确源码 SHA、命令、退出码、真实日志、Fixture/真实对象及 SHA-256。

| 验收 ID | 必须验证的现象 |
| --- | --- |
| V12-01 | `ctx.web` 使用明确的 Search/Fetch provider；一次逻辑查询不因重复注册而多次调用/计费 |
| V12-02 | 不可信 URL 的 localhost/私网/元数据、DNS 重绑定与重定向均被拦截，隔离目标无变化 |
| V12-03 | 关闭服务端自动搜索后模型不能绕过本地 Guard 发出联网查询；受允许的模型路由不得外送敏感上下文 |
| V12-04 | Search 摘要/Fetch Markdown/OCR 文本/原始 GitHub 工件按证据等级分开；哈希指向被实际捕获的字节 |
| V12-05 | Messages/Responses/Chat Completions 的 `400/401/402/403/404/429/5xx`、HTTP 200 内部生成失败/流式不完整/拒答被保守分类 |
| V12-06 | AgentTeam CAS 冲突、持久写入结果不明确、任务失联、权限撤销不创建重复业务 ActionRun |
| V12-07 | 两真实 Team Session 的 Verifier 只读且不能篡改 Worker 的工件；共享 checkout 冲突提示不当作文件锁 |
| V12-08 | Browser Session 重载丢失状态、提交后断线、撤权竞态只产生可核查未知结果，不盲目重放 |
| V12-09 | Schedule 投递回执与 Engine 业务完成分离；同周期重复触发不产生重复副作用 |
| V12-10 | 模型/查询/网页/OCR 用量预算、异常退避、取消与日志脱敏生效，且不把测试 Mock 冒称真实在线服务 |

**V1.2 新增关键子例与功能准入验证（正式定义，当前均 `NOT_RUN`）**：以下是 §16.7 所引用子例的正式验收契约。每次测试须提供准确 upstream/project SHA、执行模式、配置摘要、命令及退出码、原始脱敏日志、HTTP/网络/存储证据和负例结论。静态通过不代表功能验收。

| 子例 ID | 必须验证的正/负行为 | 最低证据要求 | 结果 |
| --- | --- | --- | --- |
| `V12-01B` | 准入后切换 Provider/endpoint/凭据；最终派发不得越过已批准出站与身份边界 | 真实代理/网络请求记录、provider/endpoint/凭据引用与阻断证据 | `NOT_RUN` |
| `V12-03C` | 模型 Web 工具、`ctx.web` 直调、DeepSeek 服务端联网分别拒绝越权；HTTP 绕过亦受限 | 三条真实路径分别记录请求数、敏感数据外送与失败关闭 | `NOT_RUN` |
| `V12-08B` | Playwright Browser 隔离挂载/凭据/出网，断线和撤权后不重写未知远端事实 | 容器/进程/网络负例、Session 与远端对账凭证 | `NOT_RUN` |
| `V12-08C` | Stagehand 独立模型 Provider/Key、页面外送内容与取消后在途调用受控 | 脱敏模型请求、模型端点、实际出站、独立凭据与取消证据 | `NOT_RUN` |
| `V12-09B` | 自动周期与人工 `runNow` 身份分离；同一个已持久 `manualExecutionRequestId` 重试不重复写 | Engine/Effects/Inbox/receipt 关联、唯一业务效果计数 | `NOT_RUN` |
| `V12-10B` | Stagehand 独立调用量、Token/费用、墙钟预算、取消后请求均受审计/阻断 | 独立费用与调用记录、越预算和取消的负向用例 | `NOT_RUN` |
| `V12-GATE` | 可选能力与 M/G 项目阶段分离；代码、Provider 配置、执行模式和出站策略改变则旧许可失效 | `capabilityId + executionMode + upstreamCommit + providerConfigDigest + egressPolicyVersion + requiredCaseRefs + reviewedEvidenceRefs` 不可变引用及降级证据 | `NOT_RUN` |

### 16.7 两级准出：项目阶段与可选功能的独立启用许可（V1.2 第三轮复审）

**两套状态不可互相推导**：

- **项目阶段状态**：维持 M0—M5 / G0—G5 的原有依赖、必须完成任务与退出条件；未通过 M0-14 仍禁止 M1 运行集成。
- **功能准入状态**（拟新增设计状态，非已存在代码）：`DISABLED`（默认无真实调用）、`FIXTURE_ONLY`（隔离无敏感数据）、`READY_READONLY`（仅批准的可审计只读/外送）、`READY_WRITE`（另经业务 Effect/Attempt/授权/对账实测的副作用）。状态必须绑定 `capabilityId + executionMode + upstreamCommit + providerConfigDigest + egressPolicyVersion + requiredCaseRefs + reviewedEvidenceRefs`；配置、版本、路由、隔离边界发生变化须重新评审并降级，不能继续沿用旧 PASS。

**准出规则**：某 M 阶段通过，只代表该阶段规定的必选能力通过。新增的 Web、Stagehand、Browser、AgentTeam、Schedule 功能在其首次真实启用**之前**，必须通过与其模式相关的 V12 子例、静态配置审核、动态安全/恢复测试及可追溯的技术证据复核；不是“全部 V12 项必须在 M0 通过”。这里的技术证据复核可以由受信负责人组织，并不等于 GitHub 必须由另一位协作者提交 `APPROVE`，详见 §17.12。不满足时保持 `DISABLED/FIXTURE_ONLY`，禁止仅因 M2 或 M5 完成就自动晋级。阶段任务如显式依赖某功能才能达到该阶段真实出口，则须在**该能力真正启用的同一模式**完成其子例；无法完成则保留该阶段对应任务未完成，不可用 Mock 结果冒充真实模式。

| 能力/模式 | 默认 | 首次业务使用前的最低对应 V12 子例 | 验证未完成时 |
| --- | --- | --- | --- |
| Web Search/Fetch 本地模型工具或 `ctx.web` 直调 | `DISABLED`（离线 Fixture 除外） | V12-01/01B、02、03/03C、04/05、10：Provider 配置绑定、最终网络出口、异常/来源/预算 | 只允许离线 Fixture；不可向真实外网发敏感请求 |
| DeepSeek 服务端自动 Web Tools | `DISABLED` | V12-03/03C 与模型路由出站负例及来源/隐私测试 | 禁止该模型路由启用服务端联网 |
| Playwright MCP Browser（无独立模型） | `FIXTURE_ONLY`（仍需安全隔离） | V12-02、08/08B、10；如可写再加 M2 Effect/Permit 及恢复门禁 | 不允许有凭据/外部副作用 |
| Stagehand Native（独立模型） | **`DISABLED`** | V12-08C、10B，独立模型出站与调用后预算/取消、凭据与内容审计；可写另验 ActionRun | 仅专用无敏感数据 Fixture 且有显式试验批准 |
| Schedule 自动 / 手动 | `DISABLED`（可单独开只读通知） | V12-09/09B，自动周期 / 手动受信请求身份与 inbox/receipt 崩溃重试 | 只读提醒；手动 `runNow()` 不得派发可写 |

**两处判定不能混淆**：文档评审或 GitHub PR 合并通过，不等于上述功能准入已 PASS；PR #14 的 CI 即使通过，也仅属于其实际执行的测试和提交，不自动满足 V12。现有 100 项任务和原阶段出口保持不变，本节只是启用**可选**能力之前的强制条件。仓库合并审批责任见 §17.12，M0/M1 与可选能力状态不随该审批自动提升。

## 17. 工程依赖、风险控制与交付门槛

| 风险 | 级别 | 控制与需验证项 |
|---|---|---|
| 业务原型并非生产成品 | 高 | 锁定 commit、回归/压测，隔离环境开展验证 |
| SourceKind 类型出口与外置插件边界 | 高 | 核对包 `exports`，必要时在业务插件导出稳定桥接入口 |
| 原 Engine 原生一 Trigger → Ticket 不等于多 ActionRun | 高 | 增加 ActionPlan/ActionRun Port 并验证原生状态兼容 |
| Jev 结果类型/低置信度 | 高 | 官方 SDK 真实类型检查，保守降级，不能做权限授予 |
| 两条旁路与主路冲突 | 高 | 版本竞争控制、资源互斥与补偿机制 |
| SQLite 单进程限制 | 中高 | 先单实例，达到容量阈值再作存储迁移设计 |
| Worker 工具与外部操作越权 | 高 | G0 核查并改造 `Sessions.ensure()` 的宽权限预设；Session/子 Agent 最小权限、真实沙盒、guard、ActionGateway 全链路实测 |
| Jev 语义相似误建立跨渠道 Subscription | 高 | G0 验证原生关联规则，提交须受 Engine/Policy 控制；候选不等于授权 |
| 内存聚合故障导致原始审计证据丢失 | 高 | `UPSTREAM_REPLAYABLE` 或 `LOCAL_DURABLE` 才能确认可靠接收；故障恢复试验 |
| ContextPatch 注入但未实际消费 | 中高 | 核验模型请求实际包含 Patch；只有 Inbox/SessionEvent 排队或领取证据时维持 DELIVERED_UNVERIFIED；结束会话降级为 Input |
| Effects 重试 Key 不稳定导致重复副作用 | 高 | businessEffectKey 跨 Plan 版本稳定，EffectKey 不随 attempt 变化；对账前禁止重复写 |
| ActionPlan 与原生 Ticket/Effects 非原子提交 | 高 | 同一 Store.atomic 中完成原生领域命令、扩展 Plan/Run/复用引用与持久 Effects；故障注入验证 |
| 同仓库/同服务被当成唯一归并证据 | 高 | 仅作召回线索，建立 Subscription 需 Ticket 专属或唯一已记录变更关系 |
| 活跃 Session 多绑定或 Team 子 Agent 提权 | 高 | 活跃部分唯一索引、CAS、父 Scope 交集与紧急撤权传播 |
| 普通 Policy 更新误撤销既定 Mandate | 中高 | 拆分 mandatePolicyVersion 与 safetyPolicyVersion；普通更新与紧急撤权独立验证 |
| Outbox 渠道接受被误判为终端送达 | 中高 | CHANNEL_ACCEPTED 与 DELIVERY_CONFIRMED 分开，后者需要真实收件回执 |
| Outbox 回执丢失导致重复通知 | 中高 | 持久发送状态、远端幂等与回执对账；拒绝无界重发 |
| 根因猜测污染本体 | 高 | 证据分级、提案审批、版本回滚 |
| 蓝图中延迟与成本估算需要实测 | 中 | 每阶段通过基准压测验证，不写作产品保证 |

### 17.1 学习版范围失控风险

- **误把模块表等同插件表**：第 4 章 17 项是功能目标，不是“必须新增 17 个插件包”。优先扩展已有 Cordis 业务插件。
- **误把 HTML 仿真等同运行**：必须保存真实 Source/Eval/Ticket/ActionRun/SessionEvent/Outbox 状态；静态场景只能用作说明和回归 Fixture。
- **为演示多 Agent 复制函数**：M5 Team 至少两个真实 Session，具备父子 Scope 与同一个 Assignment 的汇总回写。
- **提前实现完整产品能力**：不为首期引入审批 UI、向量图、独立队列、分布式事务、多租户共享库或真实高危外部 API；需要时另行立项。
- **跳过前置工程事实**：M0 的 ActionPlan 原子扩展与受限角色无法确认时，不得以“功能模块已写完”宣称可用；学习开发可继续 Fixture，但不能伪造原生闭环。

### 17.2 依赖锁定与适配检查

建设和升级环境必须记录 **Harness commit/tag、SuperAgent commit/tag、DSH/Cordis 实际解析版本、TypeSafe JS SDK 版本、Node.js、pnpm、lockfile SHA**、Store schema 版本和 `SourceKind/Assessor/Effects/Session/AgentHook/ToolGuard` 的实际 TypeScript 类型；保存 `dsh --profile ... --dump-config` 输出的插件树。公开主分支 `packageManager/engines` 只是一条候选线索，**不等于彼此兼容**，每次升级需重新编译和测试。锁版 G0 验证 `Sessions.ensure()` 权限 preset、单个 Store.atomic 的领域/Effects 持久一致性、跨 Plan businessEffectKey 去重、可信 Session 绑定、ToolGuard Scope、ContextPatch 模型请求证据、Subscription 授权语义及渠道实际回执能力。对应变更须更新类型与迁移回归；升级后重新跑以上测试，不得默认兼容。

### 17.3 本轮契约修复与实施验证对照（不新增业务平台）

本轮修订解决：① Engine 受信上下文与业务键生成权；② `tenantId`/Session epoch/expiry 的 TS/Schema 一致性；③ 2A/2B/原生 Eval/Decision 映射；④ Effects 逻辑 Kind/稳定 Key 与原生复用界面；⑤ ActionPlan、关联提案、ContextPatch、ExitReport、SopStep 与 TeamRun 的合法状态；⑥ TicketCard 预算、M5 工件及原始 HTML 场景验收口径。**这些是设计契约修订，不代表已经改造源码或通过 M0/G0。** M0 以锁版源码与真实构建/运行记录确认；仍在 M3—M5 才启用的契约不因本轮写入而提前开发。

### 17.4 2026-11-11 框架与语言审核整改登记（设计层关闭 / 代码层待验）

| 审核发现 | 本次设计修订落点 | 真正关闭代码风险的最低证据 |
|---|---|---|
| 开发语言未统一 | §2.4 规定 TypeScript/Node.js、SQL/YAML/HTML 的职责 | `pnpm check`、新增扩展 `.ts` 实际编译、无平行 Agent Loop |
| Harness 与原型版本跨度 | §2.4 兼容矩阵及 §17.2 锁定清单 | 两个 Commit、实际 lockfile、安装成功和运行配置树 |
| `packages/plugin-*` 只是目标目录 | §5 fork-first 最小目录、§5.2.1 Bridge 样例、§14.1.0 官方装配事实 | Bundle/Bridge 启停、真实 Cordis Service 注入和消费，且无深层导入 |
| Port `Promise` 易误用同步事务 | §5.1.1、§13.1 明确事务外异步、事务内同步 | Store 回滚/重启/重复 Effect 实测，事务内不出现 Promise |
| 内部 Runtime/Engine 未公开导出 | §5 和 §5.2 默认 fork 同一源码包桥接 | 实际 TypeScript 类型与可调用性证据；发布新包须有 exports |
| `danger-full-access` 已见于上游 | §2.2、§6.8、§10.4 的 M0 安全闭环 | 新建/恢复/子 Session 与真实工具执行前拒绝；OS/容器隔离 |
| Jev 与 DSH 模型调用混淆 | §2.4、§8.2 区分 TypeSafe SDK 与 Harness Agent | M1 真正的 Jev 请求、证据、失败回退，不以 Fixture 代替 |
| ActionPlan/Run 被误认为原生可用 | §5.1.1、§15 的 M0 probe 与 M2 实体落库分级 | M2 原生 Ticket + 扩展业务表 + Effect 同事务和回滚 |

**本次关闭范围**：上表仅代表详细设计的架构表述和工程路线已修复；`VERIFIED`、`PROTOTYPE`、G0/G1/G2 通过及 Session 安全修复，仍需相应源码和运行证据，不在 Markdown 中虚构。原 17 模块及三场景实施深度不增加。


### 17.5 2026-11-11 P1/P2/P3 遗留契约与文档渲染整改记录

本表记录本轮设计层的精确修订，不改变 §17.4 框架/语言审核的独立范围。`DESIGN_FIXED` 只表示 Markdown/Notion 契约已写明，**不等于**代码、Migration 或运行验收已完成；各项必须在注明的 M 阶段提供真实证据后才能关闭 `CODE_PENDING`。

| 整改项 | 设计修复位置与统一语义 | 代码验收阶段及证据 |
| --- | --- | --- |
| P1 遥测 `sourceKind/incidentId` | §6.5/§7.3 统一 `telemetry-watch`、受信 `incidentId` 必填规则与实例作用域 | M5：Typed Source Adapter、同一故障升级复用、不同故障不混并 |
| P1 ActionRun → Assignment | §6.2/§6.7/§10.4 的 `mesh_action_attempt.assignment_id` 可空受信桥接，Watchdog 反查链路 | M2：Tier1 NULL/Tier3 实际 Assignment + 重启；M4：Watchdog 反查 |
| P2 Effects Kind/Key | §13.2 原有八条路径表保留；补充原生认领/租约权威与扩展 Handler 实证 | M0：源码接口/租约；M1–M5 按路径编译/故障注入 |
| P2 Watchdog/Trend 去重 | §6.2/§6.3 加 `observation_window_id`、`evidence_fingerprint` 和复合唯一索引 | M3 Trend 新证据、M4 同一观察窗口重放不会二次干预 |
| P2 Plan 版本/Run 原因 | §6.2/§6.3 加 `ticket_version`、`supersedes_plan_id`、Plan 版本唯一与 `reason_code`；不平行维护 Effects 租约 | M2：SQLite migration、CAS、重规划、认领恢复、错误原因查询 |
| P2 Proposal 操作人 | §6.2/§6.5 增 `actor_ref/decision_actor_ref`，仅来源于可信 ctx | M3：提案、拒绝、确认、非法身份注入测试 |
| P2 管理 API 租户 | §14.4 全接口声明服务端受信 `ctx.tenantId`，无 ctx 拒绝、无跨租户存在性泄露 | M0 共用鉴权；随功能逐段回归 API 租户过滤 |
| P3 LazySynthesizer 工具隔离 | §9.5 默认无工具/子代理、无权限则使用确定性模板 | M2：真实受限 Session、恶意工具调用负向测试 |
| P3 去重与 5A 格式 | §8.1 明确轻量收据后去重，§4 将易误渲染的分隔符改为“与” | M1：10 次重投递仅一次业务 Trigger/Effect |
| 格式 §2.4 表格 | 版本表达移到无管道符的独立段落，表格仍显示 Node 引擎范围 | 本轮 Markdown 表格列数检查与 Notion 页面回读 |
| 交付附件同步 | 最新 Markdown 与 Notion 正文/附件同源重新上传；不等于运行测试通过 | 同步后核对文件版本、章节、关键字段 |

### 17.6 2026-11-11 权限、终态恢复与流程契约复核整改（设计修正 / 工程待验证）

本轮重新审核确认权限公式和可恢复性属于**真实 P1**，不能沿用此前“设计已定稿”的结论。以下行仅代表文档契约修复（`DESIGN_FIXED`），源码/数据库迁移、Harness/Effects 真实行为仍是 `CODE_PENDING`；不得将修订后的状态图当成已运行证明。

| 审核问题 | 修订位置与约束 | 工程验证阶段 |
| --- | --- | --- |
| P1 禁止集合被错误取交集 | §6.8/§10.5 分维度 Allow 交集减 Deny 并集、fail-closed | M0 ToolGuard/ActionGateway 负向执行验证（R01） |
| P1 终态后原业务键无法继续 | §6.4/§6.6/§13.2 细分 RETRY_WAIT/PAUSED/UNKNOWN_RECONCILE；终态不可擅自复活，真正独立新请求才允许新意图并保留血缘 | M2 R04/R05，Effect 原键 CAS 与安全重调度能力实测 |
| P1 临时资源竞争永久 BLOCKED | §9.1/§13.4 临时 RESOURCE_BUSY→PAUSED、永久 BLOCKED_CONFLICT→BLOCKED | M2 R04，锁释放后原 Effect 与预算核验 |
| P2 SUPERSEDED 计划遗留动作 | §6.4/§6.6 明确 PENDING/REUSED/RUNNING/UNKNOWN 的分类处理 | M2 R06，事务原子取消/引用/对账 |
| P2 关联提案新证据与唯一键 | §6.2/§6.3/§6.5 增 proposal_version、evidence_fingerprint | M3 R08，Migration/CAS/重复投递 |
| P2 TeamRun 早期失败 | §6.4 增 DISPATCHED/EXECUTING 受信 FAILED 与 RECOVERING | M5 R11，无工件/无副作用证据 |
| P2 跨 Assignment 累计预算 | §6.2/§6.8/§10.4 稳定 mesh_execution_budget、预算引用与墙钟到期 | M2 R07，跨会话/停机/暂停不可重置 |
| P2 静默掩盖必要人工处理 | §6.2/§6.4/§9.5/§11.3 持久 HumanWorkItem 与外发通知分离，分阶段聚合多个 Trigger 通知意向 | M4 R09，待办可查询与受信解决出口 |
| P2 M2/M4 独立验证角色缺失 | §11.3/§12/§15–16 确定性后置验证器，M5 才建设双 Agent Verifier | M2/M4 R10，真实 Mock/Guard 证据 |
| P2 L2 未定义组合 | §8.2 补齐 4×4 决策组合和越级拒绝策略 | M1 R02，完整矩阵测试 |
| P3 仅单 Action Effect 伪代码 | §5.1.1 每个新增 Action 独立入队，REUSED 不入队 | M2 R03，第二 Effect 失败全回滚 |
| P3 Watchdog 未定义 PAUSE | §12.3 明确 M4 仅已定义 INJECT_HINT/ABORT_ESCALATE | M4 监护日志/状态合法性 |
| P3 上游同 incident_id 关闭后重开 | §6.2/§6.5/§7.3 规范 episode ID 与上游 ID 分离，重开递增 episode_index | M5 R12，重放/迟到/重开 |
| P3 SOP 失败版 checkpoint 重跑 | §6.4/§10.3/§13.2 新 stepVersion 与原业务效果键分离 | M5 R13，失败版本不可变及远端对账 |

**交付与限制**：仍为 DeepSeek Harness + SuperAgent（TypeScript/Node.js/Cordis）原生框架扩展，保留 18 章、5 层 17 模块、S1/S2/S3 与 M0—M5/G0—G5 两套独立验收路线；不增建平行 Agent Loop、第二业务队列或审批平台。设计复核通过才冻结文档，执行级准出必须取得锁版仓库类型、Migration、模拟故障与原生 Effects 重激活测试证据。

### 17.7 2026-11-12 独立复审第二轮整改记录（设计层关闭 / 源码待验）

本次针对独立审核的 **P1-01/P1-02/P1-03 与 P2-01～P2-04** 精确修复。`DESIGN_FIXED` 只表示当时已写明的设计契约；本轮后续编辑只修改 Markdown、未同步 Notion，**不表示**原生 Effects 支持未知的租约/重新激活 API，也不表示 TypeScript、SQLite Migration、远端对账实际完成。

| 审核编号 | 设计契约修复 | 验收门槛 |
| --- | --- | --- |
| P1-01 旧 Plan 健康 RUNNING | §6.4/§6.6/§13.3：`SUPERSEDED` 不制造 `RECOVERING`；仅有失联或远端未知证据才进入相应状态 | M2 R14，原 Session/Effect 正常继续并回收真实结果 |
| P1-02 Plan 提前 FINISHED | §6.2/§6.4：新增 `settlement_state/outstanding_action_count`，全量 CREATED/REUSED 引用结清方可汇总 | M2 R15，PENDING/PAUSED 未结束不能假成功；SUPERSEDED 与结清分离 |
| P1-03 根预算拆分越权 | §6.2/§6.3/§6.6/§6.8/§10.4：同 Ticket/Mandate 默认唯一 `MANDATE_ROOT`，多动作共享 deadline 和 maxAttempts | M2 R16，两个动作共享根预算且并发 CAS 正确 |
| P2-01 Patch 迟到消费证据 | §6.2/§6.4/§6.6/§9.4/§13.3：生命周期 `EXPIRED` 不倒转，可信历史证据独立补录 | M3 R17，真实模型请求发生时间/会话有效性校验 |
| P2-02 Attempt 计费点 | §6.2/§13.2/§13.3：外部可写调用前 Store 原子许可+根预算 CAS，同许可仅扣一次 | M2 R18，领取不计次、崩溃不可免费重试 |
| P2-03 Incident 来源顺序 | §6.2/§6.3/§7.3：可信生命周期单调序列及旧 OPEN 回放隔离；无全序不自动重开 | M5 R19，乱序与 ORDER_UNVERIFIED 负向测试 |
| P2-04 外部副作用对账 | §6.2/§13.2/§13.3：Attempt 持久远端请求/操作 ID、业务幂等键、Effect 指纹与不可变证据 | M2 R20，未知结果先对账；非幂等无查询的远端禁止自动重试 |

**工程仍待验证**：M0 在锁版 SuperAgent 中查验 `Store.atomic/Effects` 真实队列语义和受限 Session；M2 做 TypeScript/DDL/迁移/根预算与崩溃故障注入；M3 验证模型请求时序证据；M5 验证遥测来源的序号与重放。学习版继续只用 Mock/受限 Worker，不启动生产危险外部写。

### 17.8 2026-11-12 执行许可、根预算、结清投影与来源 epoch 复核修订（仅 Markdown）

本节针对独立复核新增 **P1-04/P1-05 + P2-05～P2-07** 做精确设计修订，新增 R21–R25。**本轮只修改本 Markdown 文件，不更新 Notion、其他附件或源码。** `DESIGN_FIXED` 表示契约写明，`CODE_PENDING` 表示 TypeScript 编译、DDL/Migration、Harness Hook/Effects、故障注入和外部系统行为尚未实测；安全关键入口未通过 G0/M2 时只允许隔离 Mock。

| 编号 | 本轮修订的唯一实现口径 | 阶段验收/不可冒充的能力 |
| --- | --- | --- |
| P1-04 一次性执行许可与撤权 | §6.2/§6.3/§6.8/§10.1/§11.1/§13.2：Attempt 的 ISSUED→CONSUMED CAS、短期绑定令牌、最终 Gateway 重新核验当前 epoch、明确远端在途竞态 | M2 R21；不证明支持所有 Tool/RPC 的最末端拦截，不宣称生产撤权可回滚远端请求 |
| P1-05 根预算工作启动闸 | §6.2/§6.3/§6.6/§10.4/§13.1：beginAuthorizedWork 的同步 CAS、稳定 start_admission_ref、先提交后启动；崩溃时保守提前计时 | M2 R22；两个 Assignment/Session 并发只初始化一个根时钟，绕过启动闸即禁止可写执行 |
| P2-05 Plan 结清并发一致性 | §6.2/§6.4/§13.3/§13.4：权威固定引用集重算、row_version CAS、同事务唯一 mesh_plan_settlement_event，重启校验 | M2 R23；不可通过异步 -1 与重复回执产生多个结清/成功通知 |
| P2-06 Patch 多请求历史证据 | §6.2/§6.3/§6.6：新增不可变 mesh_context_patch_evidence，多模型请求事实与主表投影分离 | M3 R24；EXPIRED 不复活、不覆盖或丢失第二条真实消费证据 |
| P2-07 Incident 序号域重置 | §6.2/§6.3/§6.5/§7.3/§8.1：受信 sourceEpoch、来源 epoch 隔离的游标/去重及跨 epoch 因果证明 | M5 R25；epoch 不可验证时 ORDER_UNVERIFIED、不得自动重开或签发新业务意图 |

**需保留的边界**：① 每个 M2 ActionRun 只代表一个语义外部业务效果，多个不同 RPC 不得共用同一远端幂等键；② 已消费执行许可不证明远端成功，效果不明必须对账；③ 已撤权后未消费许可必须拒绝，但在途外部执行无法仅凭本地 DB 事务撤销；④ `beginAuthorizedWork` 许可与可写执行许可不同，所有只读 Worker 也必须先启动根时钟；⑤ 与既有 §17.4–§17.7 的 `CODE_PENDING` 不冲突，不新增平行 Engine/Effects 队列。

### 17.9 V1.2 审核问题收敛记录（仅设计闭合，执行层保持待验）

| 审核项 | 本次设计修订落点 | 仍需的工程验证 |
| --- | --- | --- |
| P0-01 重复搜索层 | §2.1.1、§5.1.2 | `ctx.web` 提供方真实装配/计费 |
| P0-02 服务端搜索越过本地 Guard | §3.2、§8.3、§11.4 | 不同模型路由的数据出站负例 |
| P0-03 TeamRun 与 AgentTeam 混同 | §10.5、§13.6 | CAS、失联、独立 Verifier |
| P0-04 浏览器统一接口假设 | §10.6、§13.6 | 实际提供方工具、恢复、撤权 |
| P0-05 外送数据/注入/SSRF | §9.6、§11.4、§14.6 | URL/DNS/重定向/密钥/提示注入 |
| P0-06 版本与 M0 准出混同 | §15.2.1、§16.6 | 独立兼容矩阵/全量 CI |
| P1-01—05 证据等级、协议异常、安全校验、调度与预算 | §8.3、§9.6、§10.6、§13.6、§14.6 | V12-04/05/09/10 |
| P2-01—02 OCR 图文精度和浏览器/Team UI | §15.2.1、§16.6 | 分阶段再立真实验收任务 |

**审核声明**：上述“设计修订”只修正文义、职责和测试契约，不代表源码问题已修复、用例已运行、依赖已升级或 M0/M1 已准出。保持五层 17 模块、原 100 项清单、受信 Engine 单写、SQLite + 原生 Effects、Jev 不签发权限及 M0—M5/G0—G5 双门槛。

### 17.10 V1.2 第二轮独立复审修订（2026-11-14）

新增修正：① `ori_question` 默认原始问题外送；② `ctx.web` 直调不自动经过本地 ToolRuntime；③ 已有 §14.4 的只读 `TrustedRequestContext` 与 §5.1 写入 `TrustedCommandContext` 必须分别校验；④ 动态 Provider/计费/凭据选择造成的审授权与执行偏差；⑤ 本地 HTTP Fetch 与 DeepSeek 远端 Fetch 错误、重定向证明能力不同；⑥ Browser 进程/Session 状态不等于安全隔离；⑦ Schedule receipt 故障重复入站。均为 **DESIGN_CORRECTED/CODE_UNTESTED**；新增验收仍属于 V12-01—V12-10，见 `docs/reviews/V1.2-DeepSeek-Harness-Static-Review-20261114.md`，没有更改 M0 与 gitlink。

### 17.11 V1.2 第三轮外部反馈处理（2026-11-14；文档层）

外部审查反馈 P1-1 Stagehand 独立模型出站、P1-2 Web 实际派发点缺少可实施绑定、P1-3 Schedule 手动 `runNow()` 周期键变化，以及 P2 阶段/功能门禁不分，分别修订于 §10.6、§5.1.3、§13.6、§16.7 并在 §14.6/开发清单新增验收子例。所有项当前为 `DESIGN_CORRECTED / IMPLEMENTATION_NOT_RUN`，本 PR 不更改产品代码、M0 状态与 Harness gitlink。原独立设计复审记录追加第三轮评估，不冒充不同成员的运行代码审核。

### 17.12 GitHub 审核责任、Harness 基线证据与 CI 分流交接（2026-11-14）

本节是**仓库工程交付和治理记录**，不新增 L1—L5 业务模块、Engine、Effects、队列或可运行产品能力。以下 CI 状态是对应链接所指 **2026-11-14 当次查询时的快照**；以后必须以准确 PR head SHA、GitHub Actions 最新 Job、原始 Artifact 和退出码重新判定，不得将历史快照自动延用为当前通过。

#### 17.12.1 审核责任制与真实授权边界

- 本仓库 `CONTRIBUTING.md` 已在目标分支 `feat/m0-local-20261113-mac` 的提交 `ff0ed0b1fe8deba73673c1a2d4a28ec9b3a78cec` 中改为 **`tanxinz` 统一审核和合并决策**，项目内部不再强制第二位 GitHub 协作者 `APPROVE`。这只改变 GitHub 仓库维护流程，不修改产品中 `Mandate/Policy/ToolGuard/ActionGateway` 对工具和业务副作用的授权条件。
- GitHub 不允许作者自行对其 PR 提交原生 `APPROVE`。因此由 `tanxinz` 在 PR 评论或 `COMMENTED` Review 记录 `OWNER_REVIEW: READY_TO_MERGE` 或 `OWNER_REVIEW: BLOCKED`；**此为项目责任人审核，不伪称独立成员已批准**。
- 有效 Owner Review 至少包括：`head SHA`、目标分支 SHA、变更范围及敏感信息排查、适用的 CI Run/Artifact、实际完整与定向测试区分、`PASS/FAIL/NOT_RUN/UNKNOWN`、锁版/依赖/数据安全影响、遗留风险与明确合并决定。HEAD、策略或执行环境变化必须重新评估。
- 项目不再要求协作者审阅 **≠** 可以跳过源码、CI、权限边界和失败恢复的客观证据；若 GitHub Branch Protection/Rulesets 在服务器端另有必选审批或状态检查，仍应由所有者检查并合法配置，不能仅凭改写 Markdown 绕过。不同于本项目代码审阅，§10—§16 中的 Verifier 证据隔离和业务权限拒绝仍须独立于模型建议与外部输入，不能合并成“本人认为安全”。
- 学习版的 GitHub/生产配置变更和真正 PR 合并仍属于 §1 所禁用的**模型驱动业务副作用**；这里的 `tanxinz` 维护者行为不授权运行态 Agent 自主合并真实 PR。

#### 17.12.2 Harness 已知固定日期失效与两种不能混写的全量测试

| 项目 | 锁定事实与证据 | 允许的审计结论 |
| --- | --- | --- |
| 未修改 Harness baseline | `e8f7b93a344964de3dca1ace9e72b6e4d6de87cb`；[原始 Run #43544511314](https://github.com/tanxinz/dsh-superagent/actions/runs/43544511314) 的 LiveShare `owner-credential-horizon.host.spec.ts` 两个用例各超时 90 秒；`LIVE` 固定截止 `2026-11-14T00:00:00Z`，运行时已过期 | **原始全量 FAIL，必须永久保留**，不能由后续重跑或补丁 PASS 覆盖 |
| 日期测试夹具修复 | [PR #18](https://github.com/tanxinz/dsh-superagent/pull/18) 的 `patches/harness-baseline-liveshare-horizon-relative-dates.patch` 将 `PAST/LIVE` 改为测试时刻 ±30 天；只修改 LiveShare 测试，不动上游产品判断、锁文件、Harness gitlink | 可独立测试，**不等于主仓已升级 Harness 版本** |
| 已完成的修订夹具全量 | [独立 Run #43548225798](https://github.com/tanxinz/dsh-superagent/actions/runs/43548225798) 完成并成功，覆盖该专用工作流实际执行的构建、定向和完整测试 | 仅称 **patched pinned baseline full PASS**，不称 unmodified baseline PASS |
| 默认 M0 的正式验证 | [PR #18 默认 Run #43551553456](https://github.com/tanxinz/dsh-superagent/actions/runs/43551553456) 使用 `baseline-fixture-patched/harness-test-patched`，另一矩阵 `matching-release-candidate` 仍跑未修改的 `pnpm test` | 查询时 candidate full **PASS**、patched baseline full **IN_PROGRESS**；默认 M0 总结论仍非 FULL PASS |
| 与文档分流组合验证 | [PR #19 组合 Run #43551881352](https://github.com/tanxinz/dsh-superagent/actions/runs/43551881352) 同时含正确的补丁与原 M0 矩阵 | 查询时两版 Harness 全量仍 **IN_PROGRESS**，不得由 docs-review 成功代替 |

固定 `e8f7b93` 和候选 `d743267388641bc76f17c45ce8b4c231aed1d32c` 的测试身份必须记录在每个命令 `result.json`、CI Job 名和证据目录中；`harness-test-patched` 与原始 `harness-test` 不得合并统计。原失败 ZIP、完整 `command.log` 和 SHA-256 记录见 [Issue #17](https://github.com/tanxinz/dsh-superagent/issues/17) 及 PR #18 RCA 文档。

#### 17.12.3 Markdown 变更与 M0 全量 CI 的分流边界

- [PR #19](https://github.com/tanxinz/dsh-superagent/pull/19) 的拟合入规则：仅修改 `**/*.md` 的 PR 由 `docs-review.yml` 检查本地相对链接、代码围栏、冲突标记及相关回归、preflight 和证据审计；只改源码/配置/测试/CI 的 PR 仍跑完整 `m0-offline.yml`；**同时改 Markdown 和非 Markdown 的 PR 两条流程都运行**。`workflow_dispatch` 保留人工执行完整 M0 的能力。
- 真正纯 Markdown 的 [临时 PR #20](https://github.com/tanxinz/dsh-superagent/pull/20) 触发 [Run #43551618865](https://github.com/tanxinz/dsh-superagent/actions/runs/43551618865) 的 docs-only SUCCESS，未触发完整 M0，已关闭未合并。PR #19 当前版本 [docs-review Run #43551881399](https://github.com/tanxinz/dsh-superagent/actions/runs/43551881399) SUCCESS，仍不能冒充实际业务设计审查或两版 Harness 全量。
- 该分流在 **PR #19 合并前不自动回溯改变 PR #14 历史红色 CI**。GitHub Rulesets/Branch Protection 中的 Required Checks 若要求在 docs-only PR 上报告未触发的 Harness Job，可能出现 `Expected/Pending`；必须由仓库所有者核对并保证代码 PR 原有状态门禁有效。
- 合并依赖顺序保持 [PR #18](https://github.com/tanxinz/dsh-superagent/pull/18) → [PR #19](https://github.com/tanxinz/dsh-superagent/pull/19) → [PR #14](https://github.com/tanxinz/dsh-superagent/pull/14)。PR #19 当前验证分支包含与 #18 同一字节补丁以便组合测试；**#18 先合入目标分支后**须重新比较 #19 的新增差异及测试状态，不得作为重复改动再次引入。最终合并后的目标分支并不自动等于 `main`。
- GitHub 合并与应用运行态验收必须分别记录：此段只明确当前工程证据和审核职责；**M0-14 仍为 `BLOCKED`、M0 整体验收 0/14、M1 不允许运行集成，§16.7 的新 V12 动态用例仍 `NOT_RUN`**，可选 Web/Stagehand/Schedule 等能力未经许可保持 `DISABLED/FIXTURE_ONLY`。

### 17.13 静态复核修复与正式文档状态说明（2026-11-14）

本节补充 §17.12 的**历史快照**，不重写其当时的 CI 状态，也不替代任何原始日志或 ZIP。2026-11-14 核验：PR [#18](https://github.com/tanxinz/dsh-superagent/pull/18) 已合并，默认 M0 [Run #43551553456](https://github.com/tanxinz/dsh-superagent/actions/runs/43551553456) 的 patched baseline 与未修改 matching candidate **各自全量 SUCCESS**；[PR #14](https://github.com/tanxinz/dsh-superagent/pull/14) 已合并到 `feat/m0-local-20261113-mac`，主设计正文又单独发布到 `main`；PR [#19](https://github.com/tanxinz/dsh-superagent/pull/19) 在本次查询时仍为 Open，文档分流未进入 `main`，其 [Run #43551881352](https://github.com/tanxinz/dsh-superagent/actions/runs/43551881352) 的 patched baseline 仍未完成。上述变化只证明特定提交/测试矩阵，不代表未补丁原 baseline 历史 FAIL 被修复为 PASS。

`main` 目前是**设计发布分支**，不能推定其中有可运行的 M0 源码、CI 工作流或 `CONTRIBUTING.md` 责任制文件；运行态源码和受控验收资料仍以 [M0 开发分支](https://github.com/tanxinz/dsh-superagent/tree/feat/m0-local-20261113-mac) 固定提交为准。正式 [V1.2 开发清单](SuperAgent_Harness_Development_Checklist_V1.0_20261112.md) 和本文 §16.6 共同定义新子例，其 `NOT_RUN` 不能推断为缺失功能已通过。相关 [兼容矩阵](compatibility-matrix.md)、[上游能力核验](upstream-capabilities.md) 和 [静态审核记录](reviews/V1.2-DeepSeek-Harness-Static-Review-20261114.md) 只作为标注分支/SHA 的历史技术证据。

本次修复范围：§6.4 将可能已外发的 `CLAIMED → UNKNOWN_RECONCILE` 纳入合法状态机并严格限证；§6.2/§9.4 在同库同事务保留 ContextPatch 精确不可变载荷且恢复时再次核验；§13.2 明确原生 Effects 的 kind、覆盖及无持久租约约束；§16.4.1 增加 R18-A/R24-C；§16.6 补齐 V12 子例。**均为 `DESIGN_CORRECTED / CODE_UNTESTED`**。M0-01—13 保持 IN_PROGRESS、M0-14 BLOCKED、0/14 完成、M1 未准出；真实网络/Stagehand/调度能力在其启用门禁通过前仍 DISABLED/FIXTURE_ONLY。

## 18. 设计依据和技术参考

1. 功能蓝图：`superagent_x_jev(2).html`（5 层、17 个模块、3 个动态仿真场景；其动画是展示定义，不是运行时业务记录）。
2. DeepSeek Harness 官方架构：https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md
3. dsh-superagent-prototype 官方仓库（含研究性质说明）：https://github.com/deepseek-ai/dsh-superagent-prototype
4. SuperAgent 领域模型：https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/docs/001-domain.md
5. SuperAgent 执行机制：https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/docs/003-execution.md
6. SuperAgent 架构与源码模块索引：https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/docs/007-architecture.md
7. SuperAgent Source 扩展示例：https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/docs/008-cookbook.md
8. TypeSafe 官方 JS SDK：https://github.com/typesafe-ai/typesafe-sdk-js
9. SuperAgent 授权边界：https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/docs/002-authorization.md
10. SuperAgent 会话与权限预设：https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/src/app/sessions.ts
11. SuperAgent 部署隔离约束：https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/docs/006-deployment.md
12. Harness 工具最终守卫：https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/tools.md
13. SuperAgent Store 事务源码：https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/src/app/store.ts
14. TypeSafe Jev API 字段说明（第三方整理，需以官方 SDK 锁版验证）：https://typesafe-jev.com/en/guides/api/

15. DeepSeek Harness 官方根 package.json（Node/pnpm 声明）：https://github.com/deepseek-ai/deepseek-harness/blob/master/package.json
16. SuperAgent 官方 package.json（Bundle 元数据、exports、构建工具和依赖）：https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/package.json
17. SuperAgent 原生 Cordis 主插件入口（name/inject/apply）：https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/src/index.ts
18. SuperAgent Bundle patch/preset 装配示例：https://github.com/deepseek-ai/dsh-superagent-prototype/blob/main/cordis.patch.yml
19. Harness Cordis 插件开发说明：https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/index.md

### 18.1 V1.2 新增官方参考（静态来源，不代表组合已验证）

- DeepSeek 2026-11-13 应用 API 更新：https://api-docs.deepseek.com/updates/
- DeepSeek 独立 Search / Fetch：https://api-docs.deepseek.com/guides/search/
- DeepSeek 服务端 Web Tools / 失败规则：https://api-docs.deepseek.com/guides/web_tools/
- Harness v0.2.2-rc.3 release：https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.2.2-rc.3
- Harness Web/AgentTeam/Browser/Schedule 官方源码：参见 §2.1.1 所列版本锁定链接。
