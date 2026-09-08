# write-notes

面向 AI Agent 与工程团队的架构决策治理与防撞护栏体系。设计规范源自 DeepSeek Harness 原生工程实践。

将代码与常规文档无法承载的技术动机、被否决方案与验证基线同代码原子提交，终结跨会话失忆与破坏性重构。

---

## 核心设计原则

1. 现行法律（Living Law）
已交付决策随代码共同演进。代码重命名、路径迁移或参数调整时，在同一提交中就地更新对应 Note 事实，不追加流水账式的演化记录。

2. 决策与代码原子提交
非平凡变更必须在同一提交或 Pull Request 中包含对 Note 的新增或就地更新。

3. 反向代码锚点与自动化互锁
核心模块与关键接口处以行内注释指回对应的 Note：
```ts
// Note: 见 .agents/notes/implemented/architecture/2026-08-23-sqlite-session-store.md
```
门禁工具通过静态分析确保所有反向引用均真实存在，防止事实漂移。

4. 强制反稻草人备选（Anti-Strawman）
每篇决策记录必须包含对真实替代方案的对比，必须包含维持现状或不做的选项，并陈述对手方案的最强论据。

5. 路径即状态与无中心索引
依靠扁平分类目录与相对 Markdown 链接建立引用关系，禁止集中式 `INDEX.md`，消除多分支并发合并冲突。

6. 严格时态隔离
已实施记录（`implemented/`）强制采用现在时描述客观交付事实，禁止包含计划性或提案性词汇。

---

## 目录结构与生命周期

路径格式：`.agents/notes/{lifecycle}/{class}/yyyy-mm-dd-topic.md`

```text
.agents/notes/
├── proposed/       # 实施前提案与权衡，待评审确认
├── implemented/    # 已落地决策事实，与代码原子提交
├── rejected/       # 经讨论否决的方案，保留作为防翻案依据
└── archived/       # 已被后续新决策完全取代的历史记录，永久冻结
```

### 6 大分类

- `feature`：面向用户或调用方的新能力及非显式产品选择。
- `bug-fix`：缺陷修复，或复盘事故补上的架构缺口。
- `simplification`：只删不增。清理冗余代码、收敛暴露面及无行为变更的重构。
- `architecture`：交付源码的结构性决策、包间关系与模块边界。
- `process`：工具链、门禁、构建发布规范（非运行时行为）。
- `testing`：测试基建、测试分层与验收策略。

---

## 标准 Note 形态

路径：`.agents/notes/implemented/feature/2026-08-23-sqlite-session-store.md`

```markdown
# Agent Note: 为什么用 SQLite 代替 JSONL 存储会话

Status: implemented

## Problem

现有 JSONL 存储在多进程并发写入时极易锁冲突，且按时间倒序扫描导致端到端延迟常态化突破 800ms。该问题无法通过应用层内存缓存彻底解决，崩溃时存在丢数据风险。

## Decision

会话存储改用 SQLite。启用 WAL 模式保证读写并发，核心表建立 `session_id + timestamp` 联合索引。关键入口由 `StorageEngine` 接口统一定义。

## Alternatives considered

- **维持 JSONL + 内存倒排索引**：改动成本最低。但异常断电与进程被杀时存在索引与数据文件撕裂风险，且跨进程共享内存机制过于脆弱。
- **引入外部 PostgreSQL**：查询生态成熟。但本系统为本地 CLI 工具，强制用户安装外部守护进程严重破坏了零配置开箱体验。
- **不做任何优化（维持现状）**：无法解决并发锁死问题，且破坏了长会话追溯的核心需求。

## Consequences

- **收益**：多进程读写不再争抢，历史记录定位延迟降至 10ms 以内（实测 P99 < 15ms）。
- **代价与上限**：引入了原生 C 绑定，发布包体积增加约 15MB；单库并发写上限受限于 SQLite 串行写入锁，若未来单节点写 QPS > 500 需重访。
```

---

## 门禁与命令

项目提供基于 TypeScript 的无额外重型依赖检查工具集，适配 CI 流水线及本地预提交校验：

```bash
# 执行完整门禁：目录树规范 + 格式与时态禁令 + 源码注释反向死链检查
npm run verify-notes

# 单项校验：目录树与相对链接
npm run verify-tree

# 单项校验：文件格式、必需章节与时态禁令
npm run verify-format

# 单项校验：源码注释反向死链扫描
npm run verify-doc-refs

# 归档已完全取代的 Note 并写入 manifest.json 校验和
npm run archive-note .agents/notes/implemented/<class>/<filename>.md

# 命令行避坑检索：提取所有被否决提案与已放弃备选方案
npm run pitfalls [关键词]
```

---

## 集成到宿主项目

将以下规范加入项目根目录的 `AGENTS.md`：

```markdown
## 架构决策留痕与防撞规范

在进行任何非平凡变更（技术选型、架构重构、接口约定变更、缺陷复盘、特性裁撤）前：
1. 遵循 .agents/skills/write-notes/SKILL.md。
2. 既有功能重构优先就地更新对应 Note 的事实部分，严禁只改代码不改 Note，严禁追加流水账。
3. 新路线先在 proposed/ 编写提案；落地时同提交移入 implemented/ 并改写为现在时。
4. 必须包含 Alternatives considered 章节，且必须包含维持现状选项与对手方案的最强论据。
5. 核心代码入口保留反向追溯注释：// Note: 见 .agents/notes/...。
```

---

## 资产说明

- `SKILL.md`：供 AI Agent 遵照执行的上下文工作流规范。
- `templates/`：标准化 Markdown 填空模板（`proposed.md`、`implemented.md`、`rejected.md`）。
- `scripts/`：门禁脚本与避坑检索 CLI。
- `references/`：分类界限、行文约束、质量自检与归档机制参考文档。

## 许可证

MIT
