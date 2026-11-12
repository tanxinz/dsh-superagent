# 上游源码基线

记录日期：2026-11-12（北京时间）。

| 组件 | 仓库 | 固定 Commit | 本地改动 |
| --- | --- | --- | --- |
| SuperAgent 原型 | https://github.com/deepseek-ai/dsh-superagent-prototype | 8c32a9dc5d72c033816c6a8110b37f40cf94fba4 | 本次核验工作树干净，无业务源码改动 |
| DeepSeek Harness | https://github.com/deepseek-ai/deepseek-harness | e8f7b93a344964de3dca1ace9e72b6e4d6de87cb | 本次核验工作树干净，无业务源码改动 |

两份源码分别登记为 upstream/superagent 和 upstream/harness Git 子模块。主仓库保留设计和交接记录，不复制依赖安装目录或构建产物。

克隆后运行 git submodule update --init --recursive，并用 git submodule status 核对完整 SHA。本次登记固定版本不证明两仓库 API 或发布包相互兼容；该兼容性属于 M0 待验证项。

SuperAgent 的 package.json 指定 pnpm@11.7.0，Node ^22.19.0 或 >=24.0.0，开发依赖中 DSH 包为 0.2.1-alpha.2；Harness 源码版本必须另行核对，不能仅因下载成功就视为兼容。
