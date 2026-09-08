#!/usr/bin/env node

/**
 * write-notes CLI
 * Architecture Decision Records and Agent Guardrail Toolkit.
 * Designed after deepseek-ai/deepseek-harness engineering standards.
 *
 * Philosophy:
 *   - Transparent & White-box: Scaffolds all gate scripts directly into the host project.
 *   - No Blackbox Runtime: Project owns its verification scripts and CI pipelines.
 *   - One-command Ease: Zero manual copy-pasting.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, cpSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageRoot = resolve(__dirname, "..");

const args = process.argv.slice(2);
const command = args[0] || "help";

function handleInit(targetDirArg) {
  const targetDir = resolve(process.cwd(), targetDirArg || ".");
  console.log(`Scaffolding write-notes (white-box architecture) in: ${targetDir}\n`);

  // 1. Create .agents/notes directory tree
  const lifecycles = ["proposed", "implemented", "rejected", "archived"];
  const classes = ["feature", "bug-fix", "simplification", "architecture", "process", "testing"];

  for (const lc of lifecycles) {
    for (const cls of classes) {
      mkdirSync(join(targetDir, ".agents", "notes", lc, cls), { recursive: true });
    }
  }

  // 2. Deploy hierarchical AGENTS.md & README.md context files (DeepSeek pattern)
  const notesReadme = `# Agent Notes

本目录存放代码库的架构决策记录与技术提案（RFC）。用于固化代码与常规文档无法承载的决策动机、被否决方案与验证基线。

## 目录布局与生命周期

路径格式严格遵循：\`{lifecycle}/{class}/yyyy-mm-dd-topic.md\`

- \`proposed/\`：实施前的提案与权衡，待评审确认。
- \`implemented/\`：已落地的决策事实，与代码原子提交并随代码演进就地维护。
- \`rejected/\`：经讨论否决的方案，永久保留作为防翻案依据。
- \`archived/\`：已被后续新决策完全取代的历史记录，永久冻结。

## 6 大分类

- \`feature\`：面向用户或调用方的新能力及非显式产品选择。
- \`bug-fix\`：缺陷修复，或复盘事故补上的架构缺口。
- \`simplification\`：只删不增。清理冗余代码、收敛暴露面及无行为变更的重构。
- \`architecture\`：交付源码的结构性决策、包间关系与模块边界。
- \`process\`：工具链、门禁、构建发布规范（非运行时行为）。
- \`testing\`：测试基建、测试分层与验收策略。

## 核心规则

1. 无中心索引：禁止添加集中的 INDEX.md，跨 Note 引用纯靠相对 Markdown 链接。
2. 反稻草人备选：每篇 Note 必须包含 ## Alternatives considered 章节。
3. 门禁验证：提交前必须通过 npm run verify-notes。
`;
  writeFileSync(join(targetDir, ".agents", "notes", "README.md"), notesReadme, "utf8");

  const notesAgents = `# AGENTS.md — Agent Notes 治理契约

Agent Notes 是由 Agent 编写并维护的持久化架构决策记录（RFC）。

## 核心工作流与取代审计

1. 新增 Note 时的取代审计
每当新建一篇 Note 时，必须检索活跃树中是否已存在覆盖相同机制或决策的老 Note：
- 若完全取代老方案：将旧 Note 的有效价值吸收进新 Note，老 Note 移入 \`archived/\` 并在同一提交中修复所有入站相对链接。
- 若部分取代老方案：保持两篇 Note 处于活跃状态并在正文中添加双向相对链接。

2. 严禁改动归档文件
\`archived/\` 下的文件属于永久冻结的历史快照，绝对不要编辑它们，也不要将其视为当前系统的权威真理。
`;
  writeFileSync(join(targetDir, ".agents", "notes", "AGENTS.md"), notesAgents, "utf8");

  const implementedAgents = `# AGENTS.md — 已交付决策维护纪律（Living Law）

本目录下的 Note 记录了已落地的客观架构决策。

## 保持 Note 与实际交付的代码绝对同步

1. 就地重写事实，严禁追加流水账
当后续重构导致文件移动、包重命名、符号改变或默认参数调整时，必须在同一个变更中直接就地更新持有该决定的既有 Note。直接重写正文中陈述的事实，绝对不要在文末追加修改历史流水账。

2. 严禁借更新之名改写决策
就地更新仅限于事实落地形态的维护。若技术选型或架构原则被推翻，必须新建 Note 并互加双向链接；旧 Note 走归档或完全取代流程。

3. 严格现在时态
本目录下的文件必须全篇使用现在时陈述客观事实，严禁出现计划态标题（如 ## Proposal、## Plan、## Acceptance criteria）。
`;
  writeFileSync(join(targetDir, ".agents", "notes", "implemented", "AGENTS.md"), implementedAgents, "utf8");

  const archivedAgents = `# AGENTS.md — 归档记录不可篡改契约

本目录下的 Note 均为已封存的冻结历史快照，不再作为当前代码库的权威依据。

## 不可侵犯禁令

1. 严禁编辑、重写、翻译、重新排版、移动或删除任何已归档的 Note。
2. 严禁为了“修复死链”或“消除过时 API 报错”而修改已归档的文件。
3. 归档文件已被计算 SHA-256 哈希值并封印于 manifest.json 中，任何未经授权的修改都会直接导致门禁报错。
`;
  writeFileSync(join(targetDir, ".agents", "notes", "archived", "AGENTS.md"), archivedAgents, "utf8");
  console.log("Deployed hierarchical context rules: .agents/notes/{AGENTS.md, implemented/AGENTS.md, archived/AGENTS.md}");

  // 3. Deploy templates
  const templatesSrc = join(packageRoot, "templates");
  const templatesDest = join(targetDir, ".agents", "notes", "templates");
  mkdirSync(templatesDest, { recursive: true });
  cpSync(templatesSrc, templatesDest, { recursive: true });
  console.log("Deployed templates: .agents/notes/templates/");

  // 4. Deploy skill & references
  const skillDestDir = join(targetDir, ".agents", "skills", "write-notes");
  mkdirSync(skillDestDir, { recursive: true });
  cpSync(join(packageRoot, "SKILL.md"), join(skillDestDir, "SKILL.md"));

  const refsSrc = join(packageRoot, "references");
  const refsDest = join(skillDestDir, "references");
  cpSync(refsSrc, refsDest, { recursive: true });
  console.log("Deployed Agent Skill: .agents/skills/write-notes/");

  // 5. Deploy white-box verification scripts directly into project
  const scriptsSrc = join(packageRoot, "scripts");
  const scriptsDest = join(targetDir, "scripts");
  mkdirSync(scriptsDest, { recursive: true });
  cpSync(scriptsSrc, scriptsDest, { recursive: true });
  console.log("Deployed verification scripts: scripts/ (fully transparent, white-box)");

  // 6. Update or create AGENTS.md / CLAUDE.md in project root
  const ruleContent = `
## 架构决策留痕与防撞规范

在进行任何非平凡变更（技术选型、架构重构、接口约定变更、缺陷复盘、特性裁撤）前：
1. 遵循 [.agents/skills/write-notes/SKILL.md](.agents/skills/write-notes/SKILL.md)。
2. 既有模块重构优先就地更新对应 Note 的事实部分，严禁只改代码不改 Note，严禁追加流水账。
3. 新路线先在 \`.agents/notes/proposed/\` 编写提案；交付时随同次代码提交移入 \`implemented/\` 并改写为现在时。
4. 必须包含 \`## Alternatives considered\` 章节，且必须包含维持现状选项与对手方案的最强论据。
5. 核心代码入口保留反向追溯注释：\`// Note: 见 .agents/notes/...\`。
6. Note 中的代码片段与核心类型声明必须通过 \`npm run verify-notes\` 门禁检查。
`;

  const agentsPath = join(targetDir, "AGENTS.md");
  const claudePath = join(targetDir, "CLAUDE.md");
  const targetRuleFile = existsSync(claudePath) && !existsSync(agentsPath) ? claudePath : agentsPath;

  if (existsSync(targetRuleFile)) {
    const existing = readFileSync(targetRuleFile, "utf8");
    if (!existing.includes("write-notes")) {
      writeFileSync(targetRuleFile, existing.trimEnd() + "\n" + ruleContent, "utf8");
      console.log(`Appended guardrail rules: ${targetRuleFile}`);
    } else {
      console.log(`Rules already present: ${targetRuleFile}`);
    }
  } else {
    writeFileSync(targetRuleFile, ruleContent.trimStart(), "utf8");
    console.log(`Created: ${targetRuleFile}`);
  }

  // 7. Update package.json (transparent scripts, no blackbox CLI dependencies)
  const pkgPath = join(targetDir, "package.json");
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
      pkg.scripts = pkg.scripts || {};
      pkg.devDependencies = pkg.devDependencies || {};

      pkg.scripts["verify-notes"] = "npx tsx scripts/verify-agent-note-tree.ts && npx tsx scripts/verify-agent-note-format.ts && npx tsx scripts/verify-doc-refs.ts && npx tsx scripts/verify-doc-typecheck.ts && npx tsx scripts/verify-type-equiv.ts";
      pkg.scripts["verify-tree"] = "npx tsx scripts/verify-agent-note-tree.ts";
      pkg.scripts["verify-format"] = "npx tsx scripts/verify-agent-note-format.ts";
      pkg.scripts["verify-doc-refs"] = "npx tsx scripts/verify-doc-refs.ts";
      pkg.scripts["verify-typecheck"] = "npx tsx scripts/verify-doc-typecheck.ts";
      pkg.scripts["verify-type-equiv"] = "npx tsx scripts/verify-type-equiv.ts";
      pkg.scripts["archive-note"] = "npx tsx scripts/archive-agent-note.ts";

      if (!pkg.devDependencies["tsx"]) {
        pkg.devDependencies["tsx"] = "^4.19.0";
      }
      if (!pkg.devDependencies["typescript"]) {
        pkg.devDependencies["typescript"] = "^5.8.2";
      }

      writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
      console.log("Configured transparent scripts and dependencies: package.json");
    } catch (e) {
      console.warn("Notice: could not update package.json automatically");
    }
  }

  // 8. Create GitHub Actions CI workflow (directly runs npm run verify-notes)
  const workflowDir = join(targetDir, ".github", "workflows");
  mkdirSync(workflowDir, { recursive: true });
  const workflowPath = join(workflowDir, "verify-notes.yml");

  if (!existsSync(workflowPath)) {
    const workflowContent = `name: Verify Notes

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci || npm install

      - name: Run verification gates
        run: npm run verify-notes
`;
    writeFileSync(workflowPath, workflowContent, "utf8");
    console.log(`Created CI workflow: ${workflowPath}`);
  }

  console.log("\nInitialization complete. All gates and context rules are transparently embedded in your project.");
  console.log("To verify: npm run verify-notes");
  console.log("To archive: npm run archive-note <path-to-note>");
}

function showHelp() {
  console.log(`Usage: write-notes <command> [options]

Commands:
  init [dir]      Scaffold transparent, white-box write-notes into project (default: .)
  help, -h        Show this help manual

Examples:
  write-notes init
  write-notes init ./my-project
`);
}

switch (command) {
  case "init":
    handleInit(args[1]);
    break;
  case "-h":
  case "--help":
  case "help":
    showHelp();
    break;
  default:
    console.error(`Unknown command: ${command}\n`);
    showHelp();
    process.exit(1);
}
