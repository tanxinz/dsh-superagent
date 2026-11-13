# M0 身份、权限和原生 Session 接续验收（2026-11-13）

阶段结论：**BLOCKED，M0-14 未准出，M1 不可宣称可运行**。本批从 PR #11 实际 head `130a766a142ff0c009c9d563e4f3c17309eb258a` 创建个人分支 `feat/m0-trust-and-permission-baseline-20261113`；未覆盖其他成员分支，不自动合并。唯一整项口径仍为原开发清单 M0-01—M0-14。本批没有勾选 DONE。

## 交接与 CI

已重新核对 PR #1—#11：均 open/unmerged，head/base 构成连续链，未发现他人更新。#1/#2 无关联 Actions run；#3—#10 最新关联 run success；#11 run [43328280921](https://github.com/tanxinz/dsh-superagent/actions/runs/43328280921) 已 completed/failure。准确 refs、run、步骤及时间见 `../evidence/m0-trust-permissions-20261113/pr-snapshot.json`、`pr-ci-snapshot.json`、`ci11-run.json`、`ci11-jobs.json`。

#11 的 review 和两版 Harness 原始完整构建/全量测试 PASS；SuperAgent 的完整 pnpm check 与旧 profile PASS，新依赖切换 profile FAIL。CI 合并快照 `78c660a46066b149a3cde1dc4ea31af68fc60a0c` 和 PR head 分开记录。两版 Harness 原生源码分别为 `e8f7b93a344964de3dca1ace9e72b6e4d6de87cb`（56662 PASS、199 跳过、1 expected fail）、`d743267388641bc76f17c45ce8b4c231aed1d32c`（41652 PASS、185 跳过、1 expected fail）。原命令均退出 0。所有 result 的原日志 SHA-256 已复算吻合。

原始四份 CI #11 ZIP 本地保留；摘要与日志/命令/退出码索引见 `ci11-archive-index.json`。ZIP 摘要依次为：baseline 13996027565 `a67af333759edbb0c33b1ba290c87194fcd4636c14e47395a289b1600e8bff77`；candidate 13994339709 `14609becc7ef80736a2216c52f0d8b72a04086003da3eb466d47b36f02aa2620`；SuperAgent 13994645209 `d42290dbf00a1b868a945d8c00fee3fb7e8f1305d2bcc3f2802894e8ee2fa007`；review 13992838794 `71f0e4d48037bf740b1d63ba3d17e41310353229ec9c5839df5751316d9cad9a`。没有重新公开原 ZIP，也没有上传待明确批准的 **13992801388.zip / 13990600501.zip**。上述旧 run 只属于其准确源码，不能充当本批新源码已测。

## 实际实现与自动复审

- 原生 Session：移除 ensure 无条件 danger-full-access，改为核验真实 `read-only + ask` 定义和生效值；同 ID 宽权限覆盖拒绝，主/Worker/子会话保持受限；未知/循环/过深父链默认拒绝。工具注册包装也检查权限，覆盖直接调用工具定义的路径。
- 身份：Runtime 私有 WeakMap 签发不可伪造上下文，tenant/actor/requestId/roles 来自验证器和持久事实；对象克隆、其他签发器、过期、角色不足、跨租户查询、策略版本/epoch 变化均拒绝。真实消费者为所有 SuperAgent 管理 HTTP 路由，认证先于资源/正文解析；等待启动和读取正文后复查。顶层 query/body 和保留 header 的 tenant/actor/roles/requestId 自报字段直接拒绝并审计，即使携带有效管理凭据也不会接受。它不代表全部来源认证/所有长异步命令的授权已验收。
- 管理凭据：以 `DSH_MESH_ADMIN_TOKEN`（至少32字符，部署应使用随机值）首次受信注入，立即从宿主进程环境删除；只将 SHA-256 摘要保存在原 SQLite，重载后读取摘要。管理员 grant 24小时有效；重新注入可续期/换凭据。Web 登录只在页面内存持有凭据，不写 URL/浏览器存储；CLI status 发送同一认证头。未注入则默认拒绝管理访问。
- 原生 Store：同一个原连接/迁移事务添加最小 identity、safety policy、拒绝审计和 Session 安全绑定；扩展 schema 版本2，核验字段名、类型和审计索引。空库/重开/备份读取/故障回滚/损坏事实拒绝测试通过；不存在平行 Ticket 表。DDL/TS 完整自动对应和全套迁移升级矩阵仍待继续。
- 权限公式：工具/资源/环境逐维 Allow 交集减 Deny 并集，含父链；缺快照/过期/冲突 Session/撤权/未加载/循环均拒绝，审计失败不放行。真实公共 ToolRuntime 最终 guard 实验验证：即使 pre-listener 返回 allow，仍不能进入被拒绝的工具体。
- Runtime 安全门禁：原生只读 preset 不保证网络/进程可见性隔离。`LocalSafetyGate.executionReady()` 当前固定 false；没有环境变量开关绕过。已配置时可创建不调用模型的受限主 Session，但不启动 Worker 恢复、Passes、Effects、同步外部账户；受管请求、直接工具执行和消息递送拒绝。旧业务回归使用明确的隔离 mock，不能算真实 Worker 安全通过。
- 修复实际启动竞态：HttpHost 改为惰性读取 Runtime.ready，避免 initialize 在 ready 赋值前注册 HTTP 导致旧路由误跳过等待。
- 修复 CI11 probe：旧全局 Registry fiber 数包含合法的不同 isolation scope，不等于当前作用域重复 provider。按公开 Context.isolate / Fiber.store 核验当前作用域 provider=1，另创建真实隔离 provider 证明不会误判；预设比较改用公共 names/resolve，不读私有 presets。

## 本地实际结果与边界

完整记录见 `local-command-index.json`，原失败未覆盖。最新 `identity-claims-full-check` 原始 **pnpm check：65 文件、1252 测试、类型检查/构建 PASS，退出0**；根 Node 9项 / Python22项回归 PASS。锁文件、Harness gitlink、.gitmodules 未改。

三个最新模式各完成两次真实 DSH 进程，全部退出0：`final-claims-original` Bridge 1/1；`final-claims-dependency` 每次2/2；`final-claims-configured` 首次3/3、第二次2/2（包括首次账户夹具配置重载）。后者使用明确标记的 **FIXTURE_CLI_NOT_REAL_GITHUB**，真实原生 Session 创建、同 ID 解析、角色切换受限、宽权限覆盖拒绝、真实 ToolRuntime 工具体0次、依赖卸载恢复后的同 ID 只读、持久 Effect 保留均通过；不是实际外部账户联调，不是模型请求，也不是 Effect 已恢复执行。自动处理保持 **BLOCKED_ISOLATION**。

本机 `os-boundary-probe` **FAIL/1**，原 stderr：`bwrap: loopback: Failed to create NETLINK_ROUTE socket: Operation not permitted`。没有关闭网络隔离重试冒充通过。新增独立 CI isolation-fixture job 在一次性 runner 上验证只读挂载、越界读写、独立网络/PID namespace、拥有的宿主 loopback 服务不可访问、假凭据不继承及目标前后哈希；该独立工具实验即使通过也不替代业务 Worker 路径集成验收。

保留失败：管理登录后旧 UI 测试未登录和架构表漏登记；guard 测试的公共 API 拼写和 class 文档；未知父链的新拒绝与旧期望冲突；mock Runtime 没有 health；configured observer 未经 inject 直接取 sessionPersistence；恢复后完整复测发现 schema 查询未转义 notnull，导致原生 Store 回归失败，已修复后跑完整1252项和三个 profile。进程丢失的 current-full-check 只有原 raw，退出码 **UNKNOWN**，不作为通过；后续复测另目录保存。

记录器/audit 历史字段 `real_session: NOT_RUN` 不自行认证 Session；本批真实无模型 Session 的分类以上述原生 profile 详细报告为准。`final-audit.json` 的证据完整性 PASS 不等同所有命令 PASS 或 M0 准出。

## M0 逐项阶段核验

| 清单 | 状态 | 本批证据 / 尚缺 |
| --- | --- | --- |
| M0-01 | IN_PROGRESS | 两版锁版完整构建/原始全量、匹配发布 profile；新提交 CI、组合整项认定和 Jev 精确候选仍需收敛 |
| M0-02 | IN_PROGRESS | 原生扩展点、最终 ToolRuntime 拒绝和无模型 Session 实证；真实模型请求关联/全部恢复入口未闭合 |
| M0-03 | IN_PROGRESS | 白名单 ADR 增补；仍单 Runtime/Engine/SQLite/Effects，无包外深层 import；随前置定版 |
| M0-04 | IN_PROGRESS | 多模式真实 Bridge 生命周期；前置整项未闭合 |
| M0-05 | IN_PROGRESS | 当前作用域原生依赖切换、旧句柄/Runtime拒绝、配置夹具真实 Session 和持久行保留；真实账户/模型/持久工作的恢复处理未验 |
| M0-06 | IN_PROGRESS | 全管理 HTTP 认证、双租户反例与角色/有效期；来源认证及完整命令授权接线仍需继续 |
| M0-07 | IN_PROGRESS | 最小安全持久表、回滚/重开/备份/索引；完整映射/升级矩阵和前置整项未闭合 |
| M0-08 | IN_PROGRESS | 原生11项探针与全量回归通过；原生无持久在途 lease，重复副作用边界保留，前置未闭合 |
| M0-09 | IN_PROGRESS | 原单库同步联合事务与 SIGKILL 探针通过；前置未闭合，不冒称业务 ActionPlan |
| M0-10 | IN_PROGRESS | 受限主/Worker/子会话补丁、真实原生主 Session 路径；真实 Worker/子会话全生命周期矩阵仍需集成实证 |
| M0-11 | IN_PROGRESS | 独立 OS 探针、本机失败、启动失败关闭；真正业务执行路径隔离尚未接通 |
| M0-12 | IN_PROGRESS | 持久绑定/公式/最终 guard/RPC工具包装负例；绑定投放、全部非 Tool Gateway、OS 前置未完成 |
| M0-13 | IN_PROGRESS | 完整原生复测、失败保留、源码/日志哈希及 CI 新模式；本批新CI和在线用例未闭合 |
| M0-14 | BLOCKED | 上述整项依赖未完成；不进入 M1 运行 |

下一批代码顺序：完整原生安全绑定投放/撤权并覆盖所有命令 Gateway → 实际隔离执行路径集成及 fail-closed 健康探针 → 真实受限 Worker/子会话恢复矩阵 → 受控测试账户/模型和持久工作恢复 → 完整 CI/逐项准出。外部需要：专用非生产 GitHub/模型测试账户（不得在聊天或公开仓库贴密钥）、允许所选隔离后端的执行 runner；这些外部条件不掩盖仍有待实现的代码。原两份待授权 ZIP 不阻断上述代码。

## 文件分工及复现

本分支认领：`src/app/{runtime,sessions,http,store}.ts`、`src/extensions/mesh/{auth,security-store,restricted-session,safety,service}.ts`、管理登录/API/CLI、相关原生测试、根 profile/isolation probe、CI 和本批记录。其他成员修改这些共享文件前先协调。新源码/测试全部登记原生 `docs/007-architecture.md`。不改 Harness 原始源码/引用/锁版。

使用 CONTRIBUTING 声明的 pnpm11.7.0 冻结安装后执行原始 `pnpm check`；根命令为 `node --test scripts/m0-preflight.test.mjs`、`python -m unittest discover -s scripts -p 'test_*.py' -v`。profile 运行时用 `scripts/fixtures/m0-profile-runtime/package-lock.json` 冻结 `npm ci --ignore-scripts`，再按 `local-command-index.json` 中完整命令运行三个模式；新输出目录不得复用。新 CI 只测试其实际 head/merge，后续结果另行归档，不回写为旧源码已通过。

本地若干中间失败只有父提交、命令和完整日志，未保存每次完整工作树，不作为整项已闭合的可复现源码证据。最终通过输入以 source-snapshot.json 核验，新 CI 将以实际提交/合并快照补齐；本地记录器 source_commit 仍是未提交工作树的父提交130a766，不能单靠该字段认定它测试了父提交原码。
