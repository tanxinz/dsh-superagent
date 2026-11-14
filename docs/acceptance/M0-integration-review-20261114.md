# M0—V1.2 集成审查（2026-11-14）

## 来源与不可变基准

- 正式分支 `main`：`cf3119c80cf1aa888b10ac7c81ec17184b2263f0`。
- 累积开发 PR #13：`7fcf51079135bbf2fe88401af9b94047df456606`，其历史已包含 PR #1—#12 全部当前 head；原始 PR 均不自动关闭。
- 本整合提交采用显式双父提交（父一为 main，父二为 PR #13），避免丢失开发历史；仅在独立集成分支上提交，**未合并至 main**。
- 正式主设计 `docs/SuperAgent_Harness_Design_Final.md` 在两端 Git Blob 相同；开发清单使用 PR #13 的较新内容，保留 100 个原任务及 V12、R18-A、R24-C 验收条款。
- `docs/compatibility-matrix.md`、`docs/upstream-capabilities.md` 与 V1.2 静态复审采用 main 的正式发布版本，保留其状态/证据说明。
- `docs/DEVELOPMENT_STATUS.md` 采用 PR #13 详细历史并加入此集成边界提示，避免与 main 静态索引形成误导性“已准出”结论。

## CI 与历史失败（不得互相替代）

- PR #13 SHA `7fcf51079135bbf2fe88401af9b94047df456606` 的 M0 CI：Run 43559227812，五个 Job 均 SUCCESS（其中 baseline 是**修补日期测试夹具**的完整测试）；文档 Run 43559227826 SUCCESS。
- PR #11 原始 Run 43328280921 中 `superagent` FAIL；#12 修改了 Provider 作用域检查，必须在本次新集成 head 重新验证真实依赖卸载/恢复。
- 未修补 baseline 的 Run 43544511314 FAIL 保留；修补后 PASS 不代表原始 baseline 在同一条件下 PASS。
- 合并树与父提交都发生变化，因此上述历史 CI **不能冒充本集成 SHA 的 CI**。需等待本分支新 PR 的实际 CI，逐项记录退出码与上传工件。

## 安全与未完成门禁

- PR #13 包含大量 `docs/evidence/` 原件及 ZIP。此前对仓库文本和 ZIP 成员进行了初步格式扫描，未命中若干常见密钥模式；但不能据此保证压缩包和历史 Git 对象中无秘密、隐私或对外发布风险。需要维护者完成敏感信息、凭据、权限、来源许可证及完整历史暴露面审核，异常先撤权、再制定历史清理方案。
- 禁止将原始错误日志覆盖、将补丁版 Harness 结果称作未修改版通过、或修改 Harness gitlink/依赖版本掩盖失败。
- `M0-14=BLOCKED`，M0 完成 0/14，M1 不可运行。真实业务 Worker/子会话隔离、OS/网络/密钥边界、最终 Gateway 授权和在线持久恢复尚未验收。V12、M2/M3 动态能力一律 NOT_RUN / DISABLED。

## 合并前强制复核

1. 新集成 head 的 `superagent`、`review`、`isolation-fixture`、两版 Harness 和文档 Job 取得可追溯最终结果；失败则保持 Draft。
2. 核对真实 profile 的依赖卸载与恢复步骤、所有测试文件完整结果；历史旧 Job 不替代当前 Job。
3. 审核 Git diff、归档 ZIP 成员、许可证与工作流访问权限，并确认设计版本和原 100 项任务完整。
4. 由维护者按当前 head 记录 `OWNER_REVIEW`；无独立 APPROVE 时不能假称获得他人批准。
5. 本集成 PR 合并且内容被最终 main 接收后，才可逐个关闭已被替代的 #1—#13，必须逐项给出替代提交与证据链接。

**本文件是集成修复与质量门禁说明，不是 M0 准出证明。**

## PR #23 文档校验失败复盘及受限修复（2026-11-14）

- 原始失败 [docs-review Run 43563629316](https://github.com/tanxinz/dsh-superagent/actions/runs/43563629316)：`docs-markdown-check` exit 1，随后的四项回归因为前置步骤失败而 SKIPPED，证据审计按设计 FAIL；原始 Job/Artifact 不删除。
- 独立复核改动 Markdown 时确认 `upstream/superagent/prompts/team/communication.md` 第 19、64 行的 Markdown 示例 `[PR #123](<actual link>)` 是无实际路径的占位符，旧校验器将它错误地解析为本地路径；不修改提示词原文。
- 修复仅在路径 `upstream/superagent/prompts/` 且链接目标恰好为 `<actual link>` 时跳过本地路径检查。普通 Markdown 和其他确实缺失的本地链接仍必须 FAIL；已添加正反单元测试。
- 本记录属于 PR #24 修复分支的审查说明，不能替代本修复提交的文档检查及 M0 两版 Harness 原始证据。本 PR 未修复 M0-14，仍为 BLOCKED。

## PR #24 第二次文档失败：行内代码误判与修复

- [Run 43564360113](https://github.com/tanxinz/dsh-superagent/actions/runs/43564360113) 在提交 `a91145b9` 上的 `docs-markdown-check` 再次退出 1；连锁证据审计 FAIL、后续未执行测试保持 NOT_RUN，历史失败工件必须保留。
- 实际原因：本验收记录第 38 行把示例链接写在 Markdown 行内代码中，旧校验器只跳过围栏代码，仍将行内代码里的链接格式当作真实链接。上游提示词目录的局部例外不能涵盖普通文档中的行内代码。
- 本次在校验器中按配对反引号长度忽略行内代码跨度，保留真正的相对链接与未匹配反引号后的检查，补充单/双反引号、真实坏链混排、未闭合及转义反引号回归。原有范围有限的上游示例豁免保留。
- 本次是否 PASS 以修复提交对应的新 GitHub CI 为准，不能以之前 5 个 M0 Job 成功推断文档检查成功；M0-14 仍 BLOCKED。
