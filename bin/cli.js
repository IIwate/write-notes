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

  // 2. Deploy templates
  const templatesSrc = join(packageRoot, "templates");
  const templatesDest = join(targetDir, ".agents", "notes", "templates");
  mkdirSync(templatesDest, { recursive: true });
  cpSync(templatesSrc, templatesDest, { recursive: true });
  console.log("Deployed templates: .agents/notes/templates/");

  // 3. Deploy skill & references
  const skillDestDir = join(targetDir, ".agents", "skills", "write-notes");
  mkdirSync(skillDestDir, { recursive: true });
  cpSync(join(packageRoot, "SKILL.md"), join(skillDestDir, "SKILL.md"));

  const refsSrc = join(packageRoot, "references");
  const refsDest = join(skillDestDir, "references");
  cpSync(refsSrc, refsDest, { recursive: true });
  console.log("Deployed Agent Skill: .agents/skills/write-notes/");

  // 4. Deploy white-box verification scripts directly into project
  const scriptsSrc = join(packageRoot, "scripts");
  const scriptsDest = join(targetDir, "scripts");
  mkdirSync(scriptsDest, { recursive: true });
  cpSync(scriptsSrc, scriptsDest, { recursive: true });
  console.log("Deployed verification scripts: scripts/ (fully transparent, white-box)");

  // 5. Update or create AGENTS.md / CLAUDE.md
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

  // 6. Update package.json (transparent scripts, no blackbox CLI dependencies)
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
      pkg.scripts["pitfalls"] = "npx tsx scripts/query-pitfalls.ts";
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

  // 7. Create GitHub Actions CI workflow (directly runs npm run verify-notes)
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

  console.log("\nInitialization complete. All gates are transparently embedded in your project.");
  console.log("To verify: npm run verify-notes");
  console.log("To query pitfalls: npm run pitfalls [keyword]");
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
