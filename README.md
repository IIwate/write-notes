# write-notes

> 为 AI Coding Agent 与工程团队打造的架构决策留痕与编译级防撞护栏体系。

[![npm version](https://img.shields.io/npm/v/write-notes.svg)](https://www.npmjs.com/package/write-notes)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D22-brightgreen)](package.json)

---

## 为什么需要 write-notes？

在现代 AI 辅助研发中，工程团队往往面临两大核心困境：

1. **AI Agent 的“跨会话失忆”与“盲目重构”**  
   AI 在接手既有项目时，缺乏对历史技术决策的上下文感知。一些看似“冗余”的代码、防御性的时序处理或参数妥协，背后往往守护着极其隐蔽的 Corner Case 或被证伪的方案。没有护栏约束的 AI 极易开展盲目优化，将历史缺陷改翻盘。
2. **传统 ADR 与文档的“快速腐烂”**  
   文档随写随弃、文不对题、代码改了文档未同步；或者在文末追加大量日记式的“修改流水账”，最终沦为无人问津的“文档地质层”。

**write-notes 的答案：将架构决策定义为与代码共存亡的“现行法律（Living Law）”。**  
把常规文档和代码注释无法承载的技术动机、被否决方案与测试基线与代码原子提交，并由真实编译器与 AST 语法树提供不可逾越的物理防撞护栏。

---

## 核心设计与防撞机制

### 1. 真实编译器检查与 AST 契约镜像（Anti-Corruption）
- **类型安全代码块**：Note 中的 TypeScript 代码片段默认参与宿主项目的真实编译器类型检查（`tsc`），API 签名过时立刻红灯阻断，彻底杜绝示例代码腐烂；
- **AST 等价比对（`type-equiv`）**：架构核心数据结构、Schema 与持久化模型采用 AST 逐符号 1:1 镜像核对，源码接口变动而文档未同步时，门禁强行拦截；
- **防形式主义分层**：算法与行为流转直接使用普通代码块真实编译，严禁为迎合门禁而捏造伪类型。

### 2. 源码入口反向锚点与单一主宿主（Single Primary Host）
- 关键模块处保留唯一一行物理反向注释：
  ```ts
  // Note: 会话持久化采用文件句柄管理，避免并发写冲突 — 见 .agents/notes/implemented/architecture/2026-08-27-handle-based-session-persistence.md
  export interface SessionFileHandleConfig { ... }
  ```
- 门禁脚本静态扫描全库源码注释中的 Note 路径，目标一旦移动或删除，CI 当场报警，根除事实漂移；
- 遵循单一主宿主原则（数据结构优先，顶层门面次之），杜绝散弹式打标。

### 3. 双层指针宪法架构（Two-Tier Pointer Architecture）
- **根目录 `AGENTS.md`（高密系统宪法）**：*Keep root rules self-contained in one to three sentences and link their detailed owner.* 仅提炼 1~3 句自包含的不变量断言（Runtime Invariants），并在句末挂 Note 超链接指针；
- **`.agents/notes/`（立法依据库）**：沉淀深层动机、≥2 个被否决备选方案（Alternatives considered）的最强论据与测试靶场；
- 模块级局部决策与日常 Bugfix 严禁随意写入根目录，彻底防止全局上下文膨胀与注意力稀释。

### 4. 就地维护事实与严格时态隔离（In-place Fact Sync）
- 模块重构或参数调整时，在同一提交中**直接就地重写既有 Note 的正文陈述**，严禁在文末追加历史流水账；
- 已交付决策（`implemented/`）全篇强制使用现在时事实语态，严禁包含计划态或提案口吻；
- 彻底被取代的决策走 Supersession 协议归档封存（计算 SHA-256 哈希），禁止篡改历史。

### 5. 绝对免除边界（Negative Exemption Boundary）
- 纯文档修改（README、Wiki、使用指南）、注释微调、单测增补、常规依赖升级及非架构性日常日常修复，**严格免除建 Note**，直接提交代码，杜绝流程异味与泛化滥用。

### 6. 白盒自包含与零黑盒依赖（White-box Scaffolding）
- 拒绝引入第三方黑盒闭源运行时，门禁脚本（TypeScript）与填空模板透明注入宿主项目；
- 宿主项目拥有自身门禁脚本的完全控制权，脚手架更新时默认严格保护项目脚本，绝不越界覆写。

---

## 快速上手

### 1. 在项目中接入（零配置安装）

无需克隆本项目，在任何新项目根目录下直接运行：

```bash
npx write-notes init
```

脚手架将在 1 秒内自动完成：
- 部署全套透明门禁校验脚本到项目 `scripts/` 目录；
- 创建 `.agents/notes/{proposed,implemented,rejected,archived}` 标准分类目录树；
- 部署填空模板到 `.agents/notes/templates/`；
- 安装面向 AI Agent 的上下文技能规范到 `.agents/skills/write-notes/`；
- 在项目 `AGENTS.md`（或 `CLAUDE.md`）注入受管防撞提示词围栏；
- 在 `package.json` 注册原生 `npm run verify-notes` 门禁指令；
- 配置 GitHub Actions 自动化门禁流水线（`.github/workflows/verify-notes.yml`）。

### 2. 日常工作流

```text
遇到重大变更（技术选型 / 核心重构 / 架构补缺）
   │
   ├─► 既有模块演化 ────────► 在同一 commit 中就地更新持有该决定的既有 Note 事实
   │
   ├─► 单轮闭环交付/缺陷修复 ──► 直接在 .agents/notes/implemented/ 编写现在时事实与代码同批交付
   │
   ├─► 跨轮次复杂方案 ──────► 先在 .agents/notes/proposed/ 立项，评审通过后再落盘
   │
   └─► 纯文档/日常修复 ─────► 命中绝对免除边界，直接提交，严禁新建 Note！
```

### 3. 本地门禁校验

项目开发者与 CI 使用项目自身的原生指令，无需任何全局 CLI 依赖：

```bash
# 全量五重门禁校验（目录树 + 格式与时态 + 源码反向死链 + 代码块真实编译 + AST 契约等价）
npm run verify-notes

# 历史决策被完全取代时的一键安全归档与哈希封印
npm run archive-note .agents/notes/implemented/<class>/<filename>.md
```

### 4. 无损同步最新规范

当 `write-notes` 发布了新规范、新参考指南或模板时，在宿主项目执行：

```bash
npx write-notes update
```

- **严格无损**：自动同步最新 Skill、参考指南与模板，精准就地更新 `AGENTS.md` 围栏；
- **安全屏障**：已落地的所有 Note 业务记录 100% 只读保护；项目 `scripts/` 下的自有脚本默认完整保留不予触碰。

---

## 深入指南与技术参考

完整规范与技术细节请参阅项目内参考资产：

- [SKILL.md](SKILL.md) — 供 AI Agent 遵照执行的上下文工程规范
- [何时写、就地改与双层指针架构](references/when-to-write.md) — 决策流转矩阵、反向锚点规则与宪法指针分工
- [自动化门禁体系技术详解](references/verification.md) — AST 语法树符号对齐与文档类型检查实现
- [行文去思维链与去流水账清单](references/prose-checklist.md) — 现行法律事实叙述规范
- [决策归档机制与完全取代协议](references/archiving.md) — 决策演进闭环与不可变哈希封印
- [架构分类判定界限](references/classification.md) — 6 大封闭类别界定标准

---

## 许可证

MIT © [IIwate](https://github.com/IIwate)
