# M0 接续：长异步管理命令的最终授权

M0-01—13 保持 IN_PROGRESS，M0-14 BLOCKED，0/14整项完成，M1未准出。本批在个人分支 `feat/m0-local-20261113-mac`、PR #13 的 `e1bd28add66e95784feaa2b66fa81ddd75a5184a` 后继续，不改他人分支，不自动合并。重新读取了全部13个PR的head/base和实时CI，未发现其他成员更新；快照位于 `../evidence/m0-final-authorization-20261113/`。

## 既有完整 CI 归档

PR #13 的 [run43373058223](https://github.com/tanxinz/dsh-superagent/actions/runs/43373058223) 已5个job全部success，准确head为e1bd28a、实际合并快照为 `1b219e15752691334c76b6bb68cc6c0b6eab3b75`。七份原ZIP及28份完整命令日志摘要均已复算一致，原件存于本批证据目录的 `ci13/<artifact-id>/artifact.zip`，逐命令/退出码/源码/哈希索引为 `ci13-archive-index.json`。基线Harness56662通过/199跳过/1 expected fail；候选41652通过/185跳过/1 expected fail。该旧CI不能冒充本批未提交代码的新CI。

没有取得或公开上传待逐文件批准的13992801388.zip、13990600501.zip。不使用AgentDock117，不提供生产凭据，不运行模型或业务Worker。

## 问题及实现

原管理入口虽保留原请求上下文，但 Settings 在模型/账户校验结束后、Source CLI分页/标签落库及延迟重启处仍可能不复核该上下文。手动策略同步失败后还可能进入不携带原身份的系统重试路径。本批补齐这些真实执行点：

- HTTP 将原授权闭包传到设置、暂停、同步、标签刷新、Prompt提交和Setup检查；异步成功与失败响应发送前再次核验，撤权请求不获得迟到的目录或错误详情。闭包不来自请求JSON，不会新签身份。
- Settings 在每次外部校验前后、同步Store事务前/内、后续文件应用和调度前检查身份及Runtime lifetime。Source回调获取绑定原检查的上下文，保留引用后的KV/线程/Ticket/Outbox操作和Commands的实际subprocess分发继续复核；withSignal/withAuthorization不能移除已有检查。
- 手动同步失败不转交自动系统重试；原Runtime自行发起的同步保留原退避行为，既有自动重试测试仍通过。已经外发或在撤权前提交的操作不伪称被撤回。
- Setup账户探针在每个CLI分发前复查；环境文件在创建、写临时文件、rename发布及删除前复查。临时文件使用独立UUID并在拒绝时清理，未知文件归属读取错误默认失败。
- 环境写入在既有Setup内互斥，executor修订变化使旧写入拒绝；Runtime关闭前等待已派发环境I/O结束，再关闭Store/释放目录锁。此为单进程文件临界区，不是第二个业务队列、Engine或主库。
- 撤权可能发生在设置已经提交、文件或重启尚未应用的阶段。新的管理授权executor保存，无论同值还是同时改其他字段，都会重新应用当前命令屏蔽；普通工具/后台保存不能借机恢复被撤权请求留下的配置。重启区分当前Runtime加载的配置、被撤权取消的请求和已派发请求；取消后可由新授权重试，正常同值/普通字段保存仍保留原来的不重复重启行为。派发不等于已成功重启，仍以真实生命周期/健康状态为准。

## 验证、失败及修复

最终源码对应 `source-management-only-recovery/`：父提交、binary工作树补丁、新文件副本及全部相关文件SHA-256均保存；不能只用record_command中的父提交字段认定未提交代码。日志/结果不可覆盖，每次尝试另目录。

`final-auth-full-check-management-only` 原始完整 **pnpm check PASS/0：68文件、1278测试、类型检查及构建通过**。没有筛选或跳过服务脚本测试。新增测试使用真实Store/HTTP/Mesh身份实现及明确的CLI/Agent夹具，验证实际落库、owned文件未发布、原子入口拒绝审计、并发旧写入拒绝、两类新授权重试和不转系统重试；夹具不计作真实Worker隔离或在线账户能力。

三个原生临时profile模式在修复前后各另目录运行，最终 `management-only-profile-*` 均通过，每个模式两次进程退出0。配置模式仍是FIXTURE_CLI_NOT_REAL_GITHUB，无模型请求、无业务Worker，实际原生主Session绑定投放/依赖重载后原样恢复/持久撤权通过，持久Effect仅保留，自动处理仍BLOCKED_ISOLATION。

保留的失败：首轮定向测试3失败（旧Commands.run mock覆盖真实分发、模型目录夹具缺方法），修正夹具后54项定向通过。首次完整1274项通过后，Codex复审指出“提交后撤权造成命令屏蔽未应用、同值重试不修复”的P2。第一次修复的完整检查又暴露2个旧重启行为回归；第二次复审补充了“变更其他字段的重试也不修复”。已补齐所有executor保存的应用、取消/已派发重启的区别、并发修订与写入互斥，并新增相应回归，最终1278项完整通过。没有修改旧断言来掩盖失败。

复审记录器的退出0只表示review命令执行成功，不能把含P2/P1的前三份输出记作“无问题”。第三轮 `final-auth-codex-review-recovered` 进一步实际复现了无关工具/后台保存复活已撤权重启的P1；已把待应用配置恢复限定为新的panel管理授权闭包，并补齐工具/后台不可恢复的反例。第四轮 `final-auth-codex-review-management-only` 最终未发现可操作回归，只独立执行了类型/空白检查，没有声称它重新执行运行测试。完整日志与每轮源码均保留。

## 分工、边界与下一步

本批认领 app/{http,prompts,runtime,settings,setup,source-context}、infra/{commands,environment}、SourceHost类型和对应测试/架构登记、本批文档及证据。其他成员修改共享文件需协调。Harness gitlink、.gitmodules、原package/锁文件不变，没有包外深层import。

本批关闭的是管理请求派生的上述延迟执行路径；不授予M0-06/12整项完成。来源认证、模型工具的全部长异步延续、非Tool Gateway全清单、规范化资源目标和M2一次性外发许可尚未全覆盖。授权检查约束本地分发边界，不能追回已提交的SQLite修改或已经派发的OS/远端操作；不同文件也不是一个可回滚事务。失败/撤权后的应用需要新的受信请求或经过门禁的重启，不在后台借用系统权限继续。

真实Worker/子会话投放、OS/网络/密钥隔离与失效停止分配，以及在线/持久工作实际恢复仍待实现/验收。executionReady仍固定false。专用非生产账户/模型配置尚未提供，在线验收保持BLOCKED；这些外部条件不掩盖仍待实现的代码。下一步为模型工具/其他Gateway的授权清单与实际隔离执行适配，不进入M1运行。
