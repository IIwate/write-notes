# write-notes

面向 AI Agent 与工程团队的架构决策治理与防撞护栏体系。设计规范源自 DeepSeek Harness 原生工程实践。

将代码与常规文档无法承载的技术动机、被否决方案与验证基线同代码原子提交，终结跨会话失忆与破坏性重构。

---

## 设计哲学：白盒自包含与零黑盒依赖

与 DeepSeek Harness 的设计完全对齐：
- **拒绝全局黑盒运行时**：所有门禁校验逻辑（目录树、格式与时态、源码反向死链、代码编译检查、AST 契约等价）均为透明的 TypeScript 脚本，直接归宿主项目自身所有；
- **掌控权归项目**：项目维护者和 Agent 可以随时查看、审计并按需微调门禁逻辑，不依赖任何第三方不可见二进制；
- **一键脚手架分发**：彻底免去手动复制目录与修改配置的繁琐操作，一行命令 `write-notes init` 自动完成全套白盒脚本、模板与 CI 的就绪。

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

4. 强制代码块真实编译与 AST 契约等价
Note 中的 TypeScript 代码片段默认通过真实编译器检查，杜绝示例代码过时腐烂；核心接口声明通过 AST 语法树与源码导出逐符号镜像比对，确保架构契约与代码实现 100% 同步。

5. 强制反稻草人备选（Anti-Strawman）
每篇决策记录必须包含对真实替代方案的对比，必须包含维持现状或不做的选项，并陈述对手方案的最强论据。

6. 路径即状态与无中心索引
依靠扁平分类目录与相对 Markdown 链接建立引用关系，禁止集中式 `INDEX.md`，消除多分支并发合并冲突。

7. 严格时态隔离
已实施记录（`implemented/`）强制采用现在时描述客观交付事实，禁止包含计划性或提案性词汇。

---

## 一键脚手架（在新项目中接入）

在新项目根目录下一行命令初始化，自动分发全套白盒资产：

```bash
write-notes init
```

该命令将在 1 秒内自动完成：
- 自动部署门禁脚本到项目自身的 `scripts/` 目录（完全白盒透明，可直接审查与定制）；
- 自动创建 `.agents/notes/{proposed,implemented,rejected,archived}` 目录树与 6 大封闭分类；
- 自动部署标准化填空模板到 `.agents/notes/templates/`；
- 自动安装 Skill 规范到 `.agents/skills/write-notes/`（支持 Pi、Cursor、Claude Code）；
- 自动在项目的 `AGENTS.md`（或 `CLAUDE.md`）追加防撞护栏约束规则；
- 自动在项目的 `package.json`（若存在）中注册透明的 `npm run verify-notes` 等原生指令；
- 自动创建 GitHub Actions 自动化门禁流水线（`.github/workflows/verify-notes.yml`）。

---

## 宿主项目原生命令（无全局依赖）

初始化后，项目的所有成员和 CI 环境只需使用项目原生的 npm 指令，无需任何全局 CLI 依赖：

```bash
# 1. 运行五重全量门禁（目录树 + 格式与时态 + 源码反向死链 + 代码编译检查 + AST 契约等价）
npm run verify-notes

# 2. 单项门禁校验
npm run verify-tree
npm run verify-format
npm run verify-doc-refs
npm run verify-typecheck
npm run verify-type-equiv

# 3. 方案被完全取代时的一键安全归档与哈希封印
npm run archive-note .agents/notes/implemented/<class>/<filename>.md
```

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

```ts type-equiv: StorageConfig from src/types/storage.ts
export interface StorageConfig {
  engine: 'sqlite' | 'memory';
  wal: boolean;
  busyTimeoutMs: number;
}
```

## Alternatives considered

- **维持 JSONL + 内存倒排索引**：改动成本最低。但异常断电与进程被杀时存在索引与数据文件撕裂风险，且跨进程共享内存机制过于脆弱。
- **引入外部 PostgreSQL**：查询生态成熟。但本系统为本地 CLI 工具，强制用户安装外部守护进程严重破坏了零配置开箱体验。
- **不做任何优化（维持现状）**：无法解决并发锁死问题，且破坏了长会话追溯的核心需求。

## Consequences

- **收益**：多进程读写不再争抢，历史记录定位延迟降至 10ms 以内（实测 P99 < 15ms）。
- **代价与上限**：引入了原生 C 绑定，发布包体积增加约 15MB；单库并发写上限受限于 SQLite 串行写入锁，若未来单节点写 QPS > 500 需重访。
```

---

## 资产说明

- `bin/cli.js`：轻量脚手架分发器（`write-notes init`）。
- `SKILL.md`：供 AI Agent 遵照执行的上下文工作流规范。
- `templates/`：标准化 Markdown 填空模板（`proposed.md`、`implemented.md`、`rejected.md`）。
- `scripts/`：分发至宿主项目的全套白盒门禁与归档脚本源码。
- `references/`：分类界限、行文约束、质量自检、归档机制与门禁技术参考。

## 许可证

MIT
