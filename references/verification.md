# 按需阅读：校验与辅助脚本

> SKILL §5 的展开。接入 CI 时对照；本地轻量使用时跳过。第一指导源自 DeepSeek Harness 原生门禁。

## 检查脚本（均为 tsx，零新增重型依赖）

1. **`verify-agent-note-tree`**（`scripts/agent-note-tree.ts` + `scripts/verify-agent-note-tree.ts`）
   - 校验 lifecycle 封闭集 `proposed/implemented/rejected` + `archived`、class 封闭集 6 个、路径深度 `{lifecycle}/{class}/file.md`、文件名 `yyyy-mm-dd-topic.md`、**禁止集中式 `INDEX.md`** 以及 Note 间相对 Markdown 链接有效性。

2. **`verify-agent-note-format`**（`scripts/verify-agent-note-format.ts`）
   - 校验头三行 `# Agent Note:` / 空行 / `Status:` 与所在 lifecycle 一致；
   - `## Problem` 必须为首个章节；
   - `implemented/` 下**绝对禁止**出现 `Proposal`、`Plan`、`Acceptance criteria` 等将来时口吻；
   - 强制必须包含 `## Alternatives considered`。

3. **`verify-doc-refs`**（`scripts/verify-doc-refs.ts`，移植自 DeepSeek Harness）
   - 静态扫描全库源码（`.ts`, `.py`, `.go`, `.rs`, `.java` 等）中的注释与字符串引用；
   - 确保 `// Note: ... 见 .agents/notes/...` 形式的反向追溯注释全部指向真实存在的 Note；
   - 一旦 Note 被重命名、移动或删除而代码注释未同步更新，CI 强行拦截报错，从物理机制上终结事实漂移。

4. **`archive-agent-note`**（`scripts/archive-agent-note.ts`）
   - 方案被新决策完全取代时的一键归档命令：插入归档日期行、移动到 `archived/<class>/`、写入 `manifest.json` sha256 校验和并提示修复活跃 Note 中的入站相对引用。

5. **`query-pitfalls`**（`scripts/query-pitfalls.ts`）
   - 命令行避坑检索：快速扫描全量 `rejected/` 提案以及 `implemented/` 中的放弃备选方案，支持关键词检索并在终端中直接输出。

## CI 接入建议

在项目 CI 流水线（如 GitHub Actions）中直接配置：

```bash
npm run verify-notes
```
（依次执行 `verify-tree` -> `verify-format` -> `verify-doc-refs`，任何一项失败即红灯打挂）。
