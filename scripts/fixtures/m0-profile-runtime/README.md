# M0 隔离 profile 验证运行时

只供 `scripts/m0-profile-probe.mjs` 验证原生 Bundle 配置树和未配置账号时的启动/关闭。它不是产品依赖锁或 Harness 子模块换版。

固定 npm 发布包 `@deepseek-ai/dsh@0.2.1-alpha.2`。该包对 Cordis、Schemastery 的宽范围会解析到稳定版，与 SuperAgent 精确 peer 声明不同；本 fixture 通过 overrides 锁定原型要求的 `4.0.5-alpha.1`、`3.18.5-alpha.1`，其余解析结果及完整性摘要由 package-lock.json 固定。验证前逐项比较全部 23 个 peer 与原型 devDependencies 的锁版参考值；不通过忽略 peer 校验或放宽声明消除冲突。

CI 把 package.json 与 package-lock.json 复制到全新临时目录，使用 `npm ci --ignore-scripts --no-audit --no-fund`；不执行第三方安装脚本。这个限制仅属于本 fixture，未替换两版 Harness 的原始 native 构建或完整测试。发布包与源码 commit 的逐字节对应未核验，不把 npm 包冒称 d743267 的源码构建产物。

探针用临时 DSH_HOME，启动命令只有真实 dsh CLI。未配置仓库、账号、模型或业务输入，GitHub/飞书来源关闭；预期 Runtime 为 setupPending、运行及排队 Worker 数均为 0。两次启动共享该临时状态目录，每次必须优雅退出 0，Bridge 安装与清理各一次。测试日志观察器只是 fixture，不是新领域插件或服务。未脱敏启动日志只写到临时 home，发布到证据目录前删除 URL 中生成的访问 token；异常中断时不把原始临时日志上传为工件。

先构建 SuperAgent，再运行（输出目录必须不存在）：

```bash
node scripts/m0-profile-probe.mjs <临时运行时>/node_modules/@deepseek-ai/dsh/lib/bin.js upstream/superagent <新证据目录> --boot-unconfigured
```

仅检查配置树可使用 `--dump-only`；该模式保持 boot、真实 Session、业务 Worker 为 NOT_RUN。无论哪种模式都不授予 M0 准出。
