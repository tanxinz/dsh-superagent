# M0 CI 基线失败 RCA：LiveShare 固定未来时间过期（2026-11-14）

## 证据身份（不得与修复版混同）

- 原始 Run：[43544511314](https://github.com/tanxinz/dsh-superagent/actions/runs/43544511314)，PR #14 触发，原始 SuperAgent SHA：`aaa44d0e0531bb3cb7bf4c73a084bdba8ef43f3d`。
- **失败的原始 Harness baseline** SHA：`e8f7b93a344964de3dca1ace9e72b6e4d6de87cb`；`pnpm@11.28.5`；执行命令 `npm exec --yes --package=pnpm@11.28.5 -- pnpm test`；结果 `FAIL, exit_code=1`，非超时执行器/信号中断；耗时 1428.478 秒。
- 原始 GitHub Job：[132292652773](https://github.com/tanxinz/dsh-superagent/actions/runs/43544511314/job/132292652773)，工件：[m0-harness-baseline-43544511314-1](https://github.com/tanxinz/dsh-superagent/actions/runs/43544511314/artifacts/14093959815)。
- 原始 ZIP SHA-256：`99585d61af38f4e95344a055594485ab442e070378fdc8b760a04aaeb3ad964c`；原始 `harness-test/command.log` SHA-256：`6fa05aa4d9f92a6feed84b197969b1dba214fef7ba0a4d8cfd4bf58690ed9094`（均已在隔离检查环境重新计算，对应 result.json）。
- 完整原始结果：**2700 文件通过、1 文件失败、20 文件跳过；56660 测试通过、2 测试失败、1 预期失败、199 跳过**，不能宣称原始全量 PASS。
- 本 Job 的 install / bubblewrap / build / workflow regression / evidence audit 成功；失败仅发生于完整原始 unit test 命令；与其他候选版结果不可互借。

## 精确失败用例及源码解释

文件：`packages/experimental/liveshare/tests/owner-credential-horizon.host.spec.ts`，锁定上述 Harness baseline SHA。

1. 第 151 行：`adopts the horizon the Relay reports for a claim past the signed expiry` —— 等待 `verified`，最终 `Test timed out in 90000ms`。
2. 第 169 行：`adopts the horizon the capability probe reports when no share reaches a claim` —— 同样等待 `verified`，90 秒超时。

同一文件里的 `START=2026-10-15T00:00:00.000Z`、`LIVE=START+30 days`，使所谓未来时间固定为 **2026-11-14T00:00:00.000Z**；本次原始 `pnpm test` 从 **2026-11-14 02:11:40 UTC** 开始，所谓 `LIVE` 在测试运行前已过期超过两小时。

上游真实判断位于 `packages/experimental/liveshare/src/host/owner-credential-file.ts` 的 `ownerCredentialState()`：`expiresAt > now ? 'verified' : 'expired'`。因此即使本地 Relay 返回 `LIVE`，已经到期的状态依然不是 `verified`，`expect.poll()` 无法满足条件。运行日志中多个 `relay answered registration status=404` 警告是调查线索，但上述测试日期失效足以解释本次两项等待超时；**没有证据需要修改生产凭据校验逻辑**。

## 定向补丁（只改测试 fixture）

[最小补丁](../../patches/harness-baseline-liveshare-horizon-relative-dates.patch) 更改为模块加载时的相对时间：`PAST=now-30days`、`LIVE=now+30days`，使过期/未过期语义跨日期稳定。该补丁适用目标为**独立检出的 e8f7b93 baseline 工作树**；不修改 `upstream/harness` gitlink、不更新主仓包或锁文件、不修改上游生产实现。

本地仅做日期算术及摘要静态核验：用 CI 同一开始时刻模拟，得到过去 2026-10-15 02:11:40 UTC、未来 2026-12-14 02:11:40 UTC，且断言 `PAST<now<LIVE`。**这不代表 Vitest/集成/网络验证通过。**

## 专门的安全复测工作流

[fixture-patched 工作流](../../.github/workflows/m0-harness-baseline-fixture-patched.yml) 与原 `m0-offline.yml` **并行隔离**，遵循：

1. 固定 checkout `e8f7b93`，校验 SHA、pnpm 和补丁仅触及一份 LiveShare 测试源码；
2. 原始 frozen install、官方 sandbox setup、build；
3. 标注 `fixture-patched-targeted-test` 的定向真实 Vitest；
4. 标注 `fixture-patched-full-test` 的完整真实 `pnpm test`；
5. 保存全部命令输出、退出码、源码/lockfile SHA、失败及原始日志至单独 Artifact，不能覆盖或冒充原始 baseline。

当前此文件提交时，该新的 CI 仍待实际运行/核实结果；不能因为补丁修复了日期条件就写 `PASS`。若新工作流失败，应继续读取其原始日志，禁止直接重复修改时间超时阈值或跳过用例。

## 不改变的项目结论

- 历史 Run #43544511314 baseline 原始全量 **FAIL**，不得覆写。
- 新补丁版即使完整通过，也只能称为 **patched pinned baseline full PASS**，而非 unmodified pinned baseline PASS。
- PR #13 / PR #14 现有工作分工不动；新任务仅认领 `patches/...`、`.github/workflows/m0-harness-baseline-fixture-patched.yml` 与本文档。
- M0-01—13 `IN_PROGRESS`、M0-14 `BLOCKED`、0/14 整项准出；M1 不可运行。
