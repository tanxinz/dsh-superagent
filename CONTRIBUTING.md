# 协作开发

## 成员访问

仓库属于 GitHub 个人账户 tanxinz。当前为公开仓库，读取源码无须加入；直接推送需要仓库协作者权限。由仓库所有者在 Settings → Collaborators 添加具体 GitHub 账户，成员接受邀请后开始工作；也可通过个人 fork 提交 PR。

ChatGPT 项目成员名单不作为本仓库的授权名单。共享讨论上下文和授予 GitHub 写权限分别管理。

## 接力开发

1. 先阅读 docs/DEVELOPMENT_STATUS.md、设计基线和正文 V1.1 开发清单。
2. 在 Issue 中记录所选任务编号、范围、负责人和验收条件，确认没有重复认领。
3. 从最新 main 创建个人任务分支，例如 feat/m0-session-probe；一项任务对应一个 PR。
4. 在自己的会话或本地环境拉取相同 Commit 开发。把决定、改动、命令、测试结果和剩余问题记录到仓库。
5. PR 标注任务编号、实际验证结果和安全影响；由另一位成员复审后合并。
6. 合并后更新交接状态和任务清单，下一位成员重新拉取最新 main。

## 子模块与项目改动

upstream/superagent、upstream/harness 指向未修改的上游 Commit。上层仓库只跟踪子模块 Commit，不会自动包含子模块内未提交的代码。

- 新增本项目独立文件时，在本仓库的任务分支中提交，并在 PR 说明代码落点。
- 需要修改上游源码时，先在团队可推送的 GitHub fork 中提交并推送改动，再将 .gitmodules 的 URL 改为该 fork，更新对应子模块 Commit；在上层 PR 同时记录 fork 地址、基线与补丁 Commit。
- 不向 deepseek-ai 上游默认推送，不把本地未推送的子模块 Commit 作为交付物。
- 评审必须同时检查上层 PR 与子模块变更；不要执行 submodule update --remote 来替换固定基线。

## 验证

SuperAgent 上游提供以下检查；实际版本要求以子模块 package.json 为准：

```bash
cd upstream/superagent
pnpm install --frozen-lockfile
pnpm check
```

首次安装会执行依赖安装逻辑；在个人开发环境进行，不配置生产凭据。现有基线有一项已知失败，详情见交接状态；不要把该失败隐去或声称整个检查已通过。Harness 的完整基线构建与测试尚待安排。

上传前检查 diff，不提交 .env、Token、私钥、生产数据、node_modules、构建缓存或临时日志。测试通过不代表 Session 权限、事务与恢复语义验收通过。
