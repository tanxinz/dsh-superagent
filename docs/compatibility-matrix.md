# M0 兼容矩阵

记录日期：2026-11-12（北京时间）。本次运行 Node 24.22.1，Linux x64。

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
