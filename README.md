# dsh-superagent

SuperAgent × DeepSeek Harness 项目资料恢复仓库。

> 状态：目前仅恢复 ChatGPT Library 中的设计文档和开发清单。**原 Work 云端工程源码尚未恢复，也没有完成工程构建或验收。**

## 资料

- `docs/SuperAgent_Harness_Design_Final.md`：最终设计基线。
- `docs/SuperAgent_Harness_Design_Validated_20261112.md`：验证版设计。
- `docs/SuperAgent_Harness_Development_Checklist_V1.0_20261112.md`：开发清单（正文修订号 V1.1）。

## 接力开发

1. 按开发清单 M0→M5 的依赖顺序推进；任务默认 TODO。
2. 开发前确认上游 DeepSeek Harness 与 SuperAgent 的 Commit、依赖锁文件、扩展点及权限隔离。
3. 每项任务必须附真实测试和运行证据；不能以设计审核代替代码验收。
4. 若恢复原 Work 的 TypeScript 源码，先在独立分支核验再合并。

## 安全说明

上述三份文档已进行常见密钥、Token、私钥标记及凭据赋值模式静态扫描，未发现匹配。扫描不能保证无全部敏感信息。请勿上传 `.env`、私钥或生产数据。
