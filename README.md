# dsh-superagent

SuperAgent × DeepSeek Harness 协作开发仓库。

当前处于 M0 基线核验阶段。已恢复设计和开发清单，并记录本会话取得的两份上游源码固定版本。源码通过 Git 子模块引用，克隆时须初始化；它们是未修改的上游基线，不能视为已实现本项目的 17 个模块。

## 开始协作

```bash
git clone --recurse-submodules https://github.com/tanxinz/dsh-superagent.git
cd dsh-superagent
git switch -c feat/your-task
```

已有克隆：

```bash
git pull --ff-only
git submodule update --init --recursive
```

- [协作流程](CONTRIBUTING.md)
- [当前交接状态](docs/DEVELOPMENT_STATUS.md)
- [固定源码版本](docs/UPSTREAM_BASELINE.md)
- [设计基线](docs/SuperAgent_Harness_Design_Final.md)
- [开发清单，正文 V1.1](docs/SuperAgent_Harness_Development_Checklist_V1.0_20261112.md)
- [验证版设计](docs/SuperAgent_Harness_Design_Validated_20261112.md)

## 验收状态

SuperAgent 上游基线的类型检查通过；测试 1197 项中 1196 项通过、1 项失败，因检查脚本短路，构建未执行。完整 M0 验收尚未完成，详见交接状态。

提交前排除凭据、生产数据、依赖目录和临时文件。上游许可证与声明保留在各子模块中。
