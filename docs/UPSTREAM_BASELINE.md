# 上游源码基线

日期：2026-11-12（北京时间）。

| 组件 | 仓库 | 基线 Commit | 当前存放方式 |
| --- | --- | --- | --- |
| SuperAgent | https://github.com/deepseek-ai/dsh-superagent-prototype | 8c32a9dc5d72c033816c6a8110b37f40cf94fba4 | upstream/superagent 普通可编辑源码目录，包含本次补丁 |
| Harness | https://github.com/deepseek-ai/deepseek-harness | e8f7b93a344964de3dca1ace9e72b6e4d6de87cb | upstream/harness 固定 gitlink，未修改 |

SuperAgent 导入 218 个源码、测试、配置与文档文件；没有复制 .git、node_modules、构建产物或本地配置。许可证和原说明保留。本次源码子树 Git SHA 为 3ecda4a7ff8487a840df907ec3f9883f2e548df1，对应已测试的源文件快照。

SuperAgent lockfile SHA-256：ba6b997c448984a04b28eeb5b620c14c7cfeff5eb170e1abd6e0734007405c39。
Harness lockfile SHA-256：c42783bd9f1c61f18867e0b41b60f7514d1447c09f993673cc02dbe90fab21c0。

两者组合尚未验证兼容。版本声明与实测见 compatibility-matrix.md 和 runtime-baseline.json。真实 DSH profile、Session 及 OS 隔离尚未验收。
