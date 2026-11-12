# M0 兼容矩阵

记录日期：2026-11-12（北京时间）。本次运行 Node 24.22.1，Linux x64。

| 对象 | 声明 / 实际版本 | 安装 | 类型检查 / 测试 / 构建 | 组合结论 |
| --- | --- | --- | --- | --- |
| SuperAgent 原型及本次补丁 | 基线 8c32a9d；pnpm 11.7.0；DSH 包 0.2.1-alpha.2；Cordis 4.0.5-alpha.1 | 按声明 pnpm 和 frozen-lockfile 成功 | tsc 通过；1209/1209 测试通过；tsdown 通过 | CANDIDATE，尚缺真实 profile 与 Session 等验收 |
| Harness 固定源码 | e8f7b93；版本 0.2.2-rc.2；pnpm 11.28.5；Cordis 4.1.0 | 按声明 pnpm 和 frozen-lockfile 成功 | 完整构建 BLOCKED：IPC EPERM；完整测试 NOT_RUN | CANDIDATE，未完成独立构建验收 |
| 两仓库直接组合 | DSH 和 Cordis 版本不同 | 未建立集成安装 | 配置树 / Session / 受限执行 NOT_RUN | UNTESTED，不标 VERIFIED |
| Jev SDK | 候选包 @typesafe-ai/sdk | 未锁定精确版 | 在线请求 NOT_RUN | UNTESTED，留待 M1-06 前完成锁版 |

Node 同时满足两仓库引擎要求只是候选条件，不能证明插件兼容。最初环境默认 pnpm 实为 11.25.0，已改用 npm exec --package=pnpm@<精确版本> 重做冻结安装；该差异保留在证据中。

已通过项不覆盖干净容器重建、真实 DSH profile、可信身份、受限主/Worker/子 Session、OS 资源与网络隔离。全部出口条件完成前不将组合改为 VERIFIED。
