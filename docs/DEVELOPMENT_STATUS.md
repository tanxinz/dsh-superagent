# 开发交接状态

更新日期：2026-11-12（北京时间）。本批继续执行 M0；阶段状态 BLOCKED，M0-14 未通过。

## 后续接手批次：M0-01 预检

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

1. Harness 原命令在 tsx 创建 Unix IPC 管道时收到 EPERM。改用 Node ESM loader 能运行顶层构建，但原生 addon 子步骤仍调用 tsx CLI 后失败；其余依赖步骤 SKIPPED。不能将这个结果算作 Harness 构建通过。
2. 当前 Harness 为 DSH 0.2.2-rc.2 / Cordis 4.1.0；原型锁文件为 DSH 0.2.1-alpha.2 / Cordis 4.0.5-alpha.1。两份最新源码不能直接视为兼容组合。下一步优先选定并验证与原型相符的发布版或适配组合。
3. M0-04/05 尚未新增并经真实 profile 验证 Bridge/CognitiveMeshService。
4. 接着完成 M0-06/07 的受信身份与持久迁移，以及 M0-10/11/12 的受限 Session、OS 隔离和最终拒绝。当前 Sessions.ensure 仍含上游 danger-full-access，不能启用业务 Worker。
5. 原生 Effects 在途认领只在内存，崩溃可重复执行；M2 必须按设计增加业务效果键、一次性许可、结果对账与受控入队，不能把原生重新入队误当为一次性副作用。
6. M0-13 的 CI 与在线用例分类仍待完成；M0-14 未通过前不进入 M1 运行集成。
