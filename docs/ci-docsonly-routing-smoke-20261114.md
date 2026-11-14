# CI 文档分流真实触发测试

此文件仅用于验证 PR 全部改动均为 Markdown 时，`docs-review.yml` 自动执行，而 `m0-offline.yml` 不自动执行。

- 上游基线：PR #19 的头部提交 `fb581d97fdc3c6292206b896ceb63a14ccd560c0`
- 此测试不修改任何源码、CI 配置、依赖或 Harness 子模块
- 完成验证后该测试 PR 应关闭，不将本测试文档纳入业务代码
