# M0 原生 Bundle Bridge 与真实未配置 profile 验证

日期：2026-11-12（北京时间）。任务 M0-01/02/03/04/13 的接续实证；阶段仍 BLOCKED。负责人为当前获授权 Codex 开发会话；个人分支 `feat/m0-bundle-profile-verification-20261112`，基于 PR #5 的 `5f8aba71847651926b1432c7bd15c4294c5bb05f`。核对时现有分支无新提交，未修改 #5，以保留其在途 CI。

## 实现与边界

`src/index.ts` 在原生 Runtime ready 后调用 `src/extensions/mesh/index.ts` 的 installMeshM0。每个原生 Cordis fiber 至多安装一次，清理由 ctx.effect 管理；重复调用、重启、独立插件生命周期、销毁后拒绝均有真实 Cordis 测试。沿用原生 Bundle 入口和 patch，没有添加不存在的 dsh-superagent/mesh 导出或第二个服务端。

本批 Bridge 仅是生命周期接线，没有注册 CognitiveMeshService 或业务命令。M0-04 改为 IN_PROGRESS，M0-01/02/03 前置未整项闭合，所有清单复选框仍未完成。M0-05、受信身份/持久迁移、受限 Session、隔离与最终拒绝仍缺实现或验收；M1 不可宣称可运行。

## 实际验证

本地 Node 24.22.1 / Linux x64；SuperAgent 使用声明的 pnpm 11.7.0。所有本地工作树测试的 source_commit 字段为当时的基线 HEAD，不冒称后续提交已经在 CI 测过；最终脚本、产品源码、lockfile 与构建入口 SHA-256 另存 inputs.json。

| 检查 | 实际结果 | 证据包内位置 |
| --- | --- | --- |
| SuperAgent 冻结安装 | PASS / 0 | superagent-install/ |
| 最终完整 pnpm check（自动复审后） | PASS / 0：类型检查、61 文件/1213 测试、构建 | superagent-check-reviewed/ |
| 其中 Bridge 生命周期 | 4 项 PASS；不是 Harness 全量结果 | tests/mesh-bridge.spec.ts；完整检查日志 |
| 独立全新目录 npm ci | PASS / 0，固定 package-lock，安装脚本关闭 | profile-runtime-frozen-install/ |
| 精确参考版本 | 全部 23 个 peer 与原型 devDependencies 锁版参考一致 | fresh-profile/peers.json；reviewed-profile/peers.json |
| 真实 dsh 配置树 | PASS，原生 dsh-superagent 条目恰好一个，Bundle 未跳过 | reviewed-profile/config-dump.stdout.log |
| 真实未配置 profile 两次启停 | PASS；共享临时状态目录，每次 installed/disposed 各 1；优雅退出 0、无强杀 | profile-reviewed-build/；reviewed-profile/boot-1.json、boot-2.json 及完整脱敏日志 |
| 仅配置树模式 | PASS，boot / 真实 Session / 业务 Worker 保持 NOT_RUN | profile-dump-only/；dump-only-profile/ |
| 漂移版本负例 | 退出 1，启动前拒绝；config_tree / boot 均 NOT_RUN | drift-profile-refusal/；drift-profile/ |
| 根目录自动审查回归 | 22 项 PASS | offline-review/ |
| 清单整阶段门禁 | 退出 2，预期阻断，0/14 完成 | checklist-stage/ |

完整命令、退出码、失败和通过日志、配置树、两次健康状态、输入摘要保存在 `../evidence/m0-bundle-profile-20261112/local-evidence.zip`；包内所有文件 SHA-256 与外层归档摘要在 index.json。evidence_audit.py 可直接审核 ZIP：失败尝试的完整性 PASS 与命令 FAIL 同时保留，只有所要求的最终检查通过时 required_commands_pass 才为 true。

## 版本解析与失败修正

直接安装固定的 npm CLI `@deepseek-ai/dsh@0.2.1-alpha.2`，其 `~4.0.5-alpha.1` / `~3.18.5-alpha.1` 仍会解析到 Cordis 4.0.5 / Schemastery 3.18.5，和原型精确 peer 不同。原始 npm 解析 lock 保留于证据包；该组合由探针在启动前拒绝。独立 fixture 明确 overrides 两个原型精确版本，并提交完整 npm lock；未忽略 peer 检查或放宽产品声明。它是新增的测试 fixture，未修改产品 pnpm-lock.yaml、.gitmodules 或 Harness gitlink。

发布 npm 产物与候选源码 d743267 的逐字节对应未核验，仍列 CANDIDATE。npm ci 使用 ignore-scripts 只属于这个隔离 profile fixture；两版 Harness 的原始 native 构建和 pnpm test 均未替换。

本地首次 Bridge 回归把根 Context 当成已失效插件 fiber，断言失败；改为销毁真实子插件后验证拒绝。首次完整检查发现原 index 测试夹具没有 assertActive 方法，补齐该真实 Cordis API 的模拟后完整通过。首次真实 profile 能启动，但 Web profile 默认不向 stdout 导出 info 日志，因未观察到 Bridge 日志而失败；新增仅捕获 Bridge 文本的测试观察器后复验通过。这些失败日志原样保留，不把观察器缺失误报成 Runtime 启动缺陷。

启动时生成的一次性 loopback token 在保存证据前脱敏；初次历史启动日志的原始/保存后摘要映射另列 redactions.json，不篡改旧报告的原摘要。最终探针的原始启动日志放在临时 home，只有脱敏内容进入上传目录。

## CI 与原始测试证据

本批 CI 在 SuperAgent 完整检查后，复制 fixture lock 到 runner 临时目录执行 npm ci，并运行两次真实未配置 profile；完整性门禁要求这两项证据，缺失即失败。详情、配置树及脱敏启动日志一起上传。两版 Harness 原始命令和 SHA 保持不变。

PR #5 的 [run 43241222611](https://github.com/tanxinz/dsh-superagent/actions/runs/43241222611) 已完成：自动审查、SuperAgent 完整检查、两版原始全量和证据审核均 PASS。基线 2701 文件/56662 测试通过、20 文件/199 测试跳过；候选 1975 文件/41652 测试通过、17 文件/185 测试跳过；各有 1 项预期失败。两版分别下载并核对原包摘要及每份完整日志摘要，均退出 0。该 run 测试的是 #5 的 5f8aba7 / 合并快照 5dd355b，**不包含本批 Bridge**。四份最终工件原 ZIP 和索引单独放在 `../evidence/m0-ci/run-43241222611/`。本分支新 CI 结果待取，不把本地通过写成新 CI 已通过。

## 文件分工与下一步

| 工作批次 | 本批分工 |
| --- | --- |
| 本次个人分支 | 认领 src/index.ts 的最小接线、新 src/extensions/mesh/index.ts、新生命周期测试；同步原 index 测试夹具、架构登记；根目录 profile 探针、fixture、CI 接线及本次证据 |
| PR #1 原生代码维护者 | Store/Effects/Engine/Session 其余源码不改；若另有成员修改入口，先协调本 PR 的两行接线 |
| PR #2 预检维护者 | scripts/m0-preflight*.mjs 保持原样 |
| PR #3—#5 CI/证据维护者 | 不覆盖原分支或原失败证据；共享 workflow 与交接文档以本 PR 的后续差异协调 |

尚未提供其他成员姓名，此表是按现有 PR 批次划分范围，不代表他人已认领。下一步为 CognitiveMeshService 注册/真实消费/卸载拒绝，以及在主 Session 和后台循环前验证关键依赖；不能仅在 Runtime ready 后提供健康日志就声称已阻断 Intake。具体源码路径已追加在 docs/upstream-capabilities.md。保留只读/离线范围，M0-14 未准出前不进入 M1 运行集成。
