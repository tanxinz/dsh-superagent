# ADR-001：首期 fork 边界与本批补丁

状态：实现记录已建立；M0 前置任务尚未闭合，最终边界冻结待 M0-14。日期：2026-11-12（北京时间）。

继续使用单 Runtime、单 Engine、单 SQLite、原生 Effects/Outbox。首期新增能力落在 upstream/superagent/src/extensions/mesh 内，按需要逐项加入；本批尚未创建空扩展包或服务占位实现。

| 本批上游改动 | 原因 | 原生回归 |
| --- | --- | --- |
| src/app/store.ts | 原生 atomic 会把 async/Promise 当普通返回并提前提交；必须在提交前拒绝异步结果 | store.spec；mesh-m0.spec；完整 pnpm check |
| src/sources/feishu-loops.ts | stdout 与 stderr 没有全局顺序，迟到 ready 覆盖事件解析错误；此项为基线修复例外，不扩展来源权限 | sources.spec 的原有失败复现与修复；完整 pnpm check |
| tests/store.spec.ts；tests/mesh-m0.spec.ts；tests/fixtures/mesh-crash.ts | 验证拒绝、联合事务、真实杀进程恢复与重复执行边界 | 1209 项测试全部通过 |
| docs/007-architecture.md | 原生文档测试要求登记新增测试文件 | docs.spec 通过 |
| src/index.ts；src/extensions/mesh/index.ts | 在原生 Runtime ready 后安装最小 M0 Bridge，生命周期由原生 fiber 管理，避免重复安装；不增加领域写入或第二个服务端 | 真实 Cordis 重启/卸载回归；61 文件/1213 测试、类型检查、构建；真实未配置 profile 两次启动/关闭 |

Store 的运行时检查只能保证拒绝 async 回调及返回的异步结果，不可能撤销同步回调在返回前擅自启动的网络或其他副作用；这些调用仍必须放在事务外，并由后续 M0-13 静态检查约束。

本批没有修改 Harness、Agent Loop、业务 Engine、Session 权限或命令授权。Sessions.ensure 的宽权限尚待 M0-10；该问题未关闭前不运行业务 Worker。

## 源码协作方式

SuperAgent 原先以 gitlink 引用只读上游；本批将固定版本快照导入同一路径成为本仓库普通源码，便于获授权成员直接提交。保留上游许可证、基线 Commit 和原始说明，未导入其 .git 或依赖目录。Harness 保留固定 gitlink。这样无需新增外部仓库，也不会出现引用本地未推送补丁的问题。
