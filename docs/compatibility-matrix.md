# M0 兼容矩阵

> 最终授权接续（2026-11-13）：同一PR #13个人分支在e1bd28a后推进，贯穿管理请求的模型/账户检查、Source命令与落库、文件发布和延迟重启的原上下文复查；撤权后的配置恢复仅允许新的管理授权，工具/后台不能代为恢复。完整68文件/1278测试、类型检查/构建和三个真实无模型profile通过，四轮复审的问题已修复，最终复审无可操作回归；新提交CI另核验。M0仍0/14整项，M0-14/M1 BLOCKED，实际Worker隔离/子会话/全部Gateway仍待完成。详见[本批验收](acceptance/M0-final-authorization-20261113.md)。

> Mac 接续（2026-11-13）：从PR #12实际head1475ffa创建个人分支；归档其全部成功CI。新增受信根Session绑定投放/撤权/恢复及原请求上下文撤权复核；完整67文件/1263测试、类型检查/构建通过，真实无模型profile绑定重载/持久撤权通过。实际Worker隔离、子会话投放及全部Gateway仍未完成；M0-01—13 IN_PROGRESS、M0-14 BLOCKED、0/14整项，M1未准出。详见[本批验收](acceptance/M0-local-bindings-20261113.md)。

记录日期：2026-11-12（北京时间）。本次运行 Node 24.22.1，Linux x64。

首表保留首次本地批次结果；CI 当前结果以文末及 [接手复审记录](acceptance/M0-ci-process-review-20261112.md) 为准，不将历史 IPC 失败视为当前 CI 构建状态。

| 对象 | 声明 / 实际版本 | 安装 | 类型检查 / 测试 / 构建 | 组合结论 |
| --- | --- | --- | --- | --- |
| SuperAgent 原型及本次补丁 | 基线 8c32a9d；pnpm 11.7.0；DSH 包 0.2.1-alpha.2；Cordis 4.0.5-alpha.1 | 按声明 pnpm 和 frozen-lockfile 成功 | tsc 通过；1209/1209 测试通过；tsdown 通过 | CANDIDATE，尚缺真实 profile 与 Session 等验收 |
| Harness 固定源码 | e8f7b93；版本 0.2.2-rc.2；pnpm 11.28.5；Cordis 4.1.0 | 按声明 pnpm 和 frozen-lockfile 成功 | 完整构建 BLOCKED：IPC EPERM；完整测试 NOT_RUN | CANDIDATE，未完成独立构建验收 |
| 两仓库直接组合 | DSH 版本不同；Cordis 与 Schemastery 精确 peer 声明不匹配 | 未建立集成安装 | 配置树 / Session / 受限执行 NOT_RUN | INCOMPATIBLE（当前依赖声明）；运行时兼容性仍 UNTESTED |
| Jev SDK | 候选包 @typesafe-ai/sdk | 未锁定精确版 | 在线请求 NOT_RUN | UNTESTED，留待 M1-06 前完成锁版 |

Node 同时满足两仓库引擎要求只是候选条件，不能证明插件兼容。最初环境默认 pnpm 实为 11.25.0，已改用 npm exec --package=pnpm@<精确版本> 重做冻结安装；该差异保留在证据中。

已通过项不覆盖干净容器重建、真实 DSH profile、可信身份、受限主/Worker/子 Session、OS 资源与网络隔离。全部出口条件完成前不将组合改为 VERIFIED。

## M0-01 后续核验：依赖声明与构建前置

以下为交接提交 bc841de6c78d6ebcb8e0d812eb13473e09d80a68 和 Harness e8f7b93a344964de3dca1ace9e72b6e4d6de87cb 的静态声明核对，不是新的组合运行结果。

| 包 | SuperAgent 精确 peer 要求 | Harness vendor 实际版本 | 声明结果 |
| --- | --- | --- | --- |
| @deepseek-ai/cordis | 4.0.5-alpha.1 | 4.1.0 | 不匹配 |
| @deepseek-ai/schemastery | 3.18.5-alpha.1 | 3.19.0 | 不匹配 |

不能通过忽略 peer 校验或只放宽版本字符串把组合改为 VERIFIED。应先选择匹配的发布组合，或完成接口适配、锁文件更新和真实 profile 回归。新增 `scripts/m0-preflight.mjs` 可复验这两个精确声明、Unix socket 和当前 Node 安装目录的开发头文件；它不解析 DSH semver 范围、不校验全部依赖、不替代锁文件/构建/运行验收。

本次新环境复验：Unix socket 为 EPERM；Node 原生 TypeScript 可用；Node-API 开发头文件缺失。后者是绕过 tsx 入口后暴露的第二个前置阻断，不能据此宣称原生 addon 或完整构建通过。详见 [本批接手记录](acceptance/M0-followup-20261112.md)。

## GitHub Actions 复验（run 43177871800）

| 对象 | 冻结安装 | 完整原始构建 | 原始全量测试 | 结论 |
| --- | --- | --- | --- | --- |
| SuperAgent 当前源码子树 | PASS | PASS（pnpm check） | 60 文件/1209 项 PASS | 独立回归通过，组合未验 |
| Harness e8f7b93 原基线 | PASS | PASS | FAIL，900 秒超时且已出现断言失败 | 构建环境阻断已在 CI 解决；组合声明仍不匹配 |
| Harness d743267 匹配候选 | PASS | PASS | FAIL，900 秒超时且 workflow-ptc 已失败 | CANDIDATE，不标 VERIFIED |

候选为上游正式发布记录中的 `dsh-v0.2.1-alpha.2`（预发布），tag object `6851e496285b2c9670066fdd142e7e46da586649` 指向 commit `d743267388641bc76f17c45ce8b4c231aed1d32c`。其 DSH 为 0.2.1-alpha.2、Cordis 为 4.0.5-alpha.1、Schemastery 为 3.18.5-alpha.1、pnpm 为 11.28.5；仅消除了已发现的两个精确 peer 声明冲突，未证明全部 peer/实际 profile 兼容。当前 gitlink 保持原基线，避免在测试未通过时换版。

CI 使用 Ubuntu 24.04 / Node 24.22.1，保留原生 addon 步骤，没有替换 tsx 入口。旧的本地 EPERM 记录仍然有效，但不再代表这个 CI 环境不能构建。证据见 [CI 验收记录](acceptance/M0-ci-review-20261112.md)。

## 第三轮全量复验（run 43232199162）

匹配候选 d743267 的完整原始 pnpm test 已退出 0：1975 文件通过、17 跳过；41652 测试通过、1 预期失败、185 跳过。完整构建、沙箱探针与定向测试也通过。基线 e8f7b93 的原始全量也已退出 0：2701 文件通过、20 跳过；56662 测试通过、1 预期失败、199 跳过。独立测试通过不证明 SuperAgent 组合 profile、真实 Session 或全部 peer 兼容；候选仍为 CANDIDATE，gitlink 不切换，M0 仍 BLOCKED。

## 原生 Bridge / 未配置 profile 的候选组合

| 验证对象 | 实际结果 | 组合结论 |
| --- | --- | --- |
| npm CLI 0.2.1-alpha.2，无额外精确锁 | 宽范围解析到 Cordis 4.0.5、Schemastery 3.18.5，与原型精确 peer 不同；原始解析 lock 保留 | 声明不匹配，不启动该组合 |
| 独立 fixture：CLI 0.2.1-alpha.2 + Cordis 4.0.5-alpha.1 + Schemastery 3.18.5-alpha.1 | 全部 23 个 peer 与原型锁版参考值一致；全新临时目录 npm ci 成功；真实配置树与两次未配置启动/关闭通过 | CANDIDATE；尚缺配置完毕、Service、Session/权限等验收 |
| SuperAgent 本批 Bridge | pnpm check：61 文件/1213 测试、类型检查、构建 PASS；4 项真实 Cordis 生命周期回归 | 最小 Bridge 实证，不等于 M0-04 整项准出 |

该 npm fixture 独立保存 package-lock.json，不修改产品 pnpm-lock.yaml 或 Harness gitlink。发布产物与 d743267 源码的逐字节对应未验证。日志、命令及版本见 [Bridge 验收记录](acceptance/M0-bundle-profile-20261112.md)。

PR #5 的复测 run 43241222611 也已完成两版原始全量及证据完整性审核，测试/跳过/预期失败计数与第三轮相同。该运行不包含后续 Bridge 源码；完整 ZIP 在 evidence/m0-ci/run-43241222611/，不挪作 Bridge 新 CI 通过证据。

2026-11-13 接续：PR #11 run43328280921 的两版 Harness 原始完整构建/全量均PASS；SuperAgent 的新依赖 probe FAIL（不同 isolation scope 被全局计数误判），本分支已修复。匹配发布 CLI0.2.1-alpha.2 的真实配置夹具 profile/无模型 Session 受限与恢复通过；不是外部账户或真实模型验收，组合仍不提升整项 VERIFIED。新源码CI须独立核验。见 acceptance/M0-trust-permissions-20261113.md。

## 2026-11-14 V1.2 Harness rc.3 兼容性候选（静态，不替代现有 M0 基线）

| 对象 | 当前项目及已验证范围 | v0.2.2-rc.3 公开事实 | 本项目判定 |
| --- | --- | --- | --- |
| SuperAgent 依赖 | DSH `0.2.1-alpha.2`、Cordis `4.0.5-alpha.1`、Schemastery `3.18.5-alpha.1` 精确 peer | rc.3 预发布根 `package.json` 使用 pnpm 11.28.5、Node >=24.9.0；实际 workspace 依赖需冻结安装核验 | `CANDIDATE_NOT_COMBINED` |
| Harness gitlink | 原固定 `e8f7b93`，另有发布匹配候选 `d743267`，两者旧全量测试通过的证据分别保留 | `dsh-v0.2.2-rc.3` tag commit `38a6a5c965aa99ab525161efb7cc5cf1fe62fced` | **不修改 gitlink** |
| SuperAgent CI | PR #13 报告 68 文件/1278 测试通过、无模型 profile 通过；不能视为 Worker 实际隔离 | rc.3 与 SuperAgent 的 full install/build/test/profile 尚未运行 | `UNTESTED` |
| Web | 当前锁版具体 Web Provider 必须检查编译及配置树 | rc.3 `@deepseek-ai/dsh-web-deepseek-api` 提供独立 Search/Fetch；默认 Search=DeepSeek API、Fetch=本地 HTTP | `NOT_PORTED` |
| AgentTeam / Browser | 真实 Worker/子 Session OS/网络/密钥隔离尚未闭合 | rc.3 持久 Team 任务板和实验性 Browser Use，不负责业务授权和远端对账 | `NOT_PORTED` |
| Schedule | 业务 Engine/Effects 继续负责持久执行 | rc.3 Host Schedule 仅将消息投递至 Session inbox；回执不代表业务执行成功 | `NOT_PORTED` |
| M0 | M0-01—13 IN_PROGRESS；M0-14 BLOCKED，0/14 整项完成 | 新能力发布不解除现存前置问题 | `M0_BLOCKED` |

**升级门禁**：须在单独验证分支固定完整 Git SHA、Node/pnpm/lockfile、实际解析的 Cordis/Schemastery/DSH 包；各仓库全量 install/build/test 与原始日志不可混用；再做真实配置树、主/Worker/子 Session、ToolGuard/非 Tool Gateway、Store/Effects/Outbox、出站网络隔离、Team/Browser/Schedule/API 用例。所有证据注明真实/Mock、失败、跳过、expected-fail 和命令退出码。未达到兼容准入不提修改原 gitlink/锁文件；M0-14 未准出不进入 M1 运行集成。

详见 [V1.2 详细设计](SuperAgent_Harness_Design_Final.md) 和 [开发清单 V12-01—V12-10](SuperAgent_Harness_Development_Checklist_V1.0_20261112.md)。

### V1.2 第二轮候选兼容审核补充

新增待测接口与配置：`sendOriginalQuestion: false`、`ori_question` 实际 HTTP 载荷、`searchBilling/fetchBilling` 在不同模型路由下的真实选择、业务直调 `ctx.web` 的独立 EvidenceGateway、`WebFetchResult.statusCode` 与 DeepSeek Fetch Provider Error 差异、Browser MCP 进程目录隔离、Schedule inbox/receipt 重放窗口。涉及不同锁版的公共 API 名称和配置字段必须通过 TypeScript/配置树验证；**不能假定 current DSH 0.2.1-alpha.2 具备 rc.3 行为**。V12-01—V12-10 及其子例目前 `NOT_RUN`，保持 `CANDIDATE_NOT_COMBINED`。
