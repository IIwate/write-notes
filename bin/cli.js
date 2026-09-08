#!/usr/bin/env node

/**
 * write-notes CLI
 * Architecture Decision Records and Agent Guardrail Toolkit.
 * Designed after deepseek-ai/deepseek-harness engineering standards.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, cpSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageRoot = resolve(__dirname, "..");

const args = process.argv.slice(2);
const command = args[0] || "help";

function getRunner() {
  // Check if bun exists
  const bunCheck = spawnSync("which", ["bun"], { encoding: "utf8" });
  if (bunCheck.status === 0 && bunCheck.stdout.trim()) {
    return { cmd: bunCheck.stdout.trim(), prefix: [] };
  }

  // Check local or global tsx
  const tsxCheck = spawnSync("which", ["tsx"], { encoding: "utf8" });
  if (tsxCheck.status === 0 && tsxCheck.stdout.trim()) {
    return { cmd: tsxCheck.stdout.trim(), prefix: [] };
  }

  // Fallback to npx tsx
  return { cmd: "npx", prefix: ["tsx"] };
}

function runScript(scriptRelativePath, extraArgs = []) {
  const scriptPath = join(packageRoot, scriptRelativePath);
  const runner = getRunner();
  const fullArgs = [...runner.prefix, scriptPath, ...extraArgs];

  const res = spawnSync(runner.cmd, fullArgs, {
    stdio: "inherit",
    cwd: process.cwd(),
    env: {
      ...process.env,
      AGENT_NOTE_ROOT: resolve(process.cwd(), ".agents", "notes"),
    },
  });

  if (res.status !== 0) {
    process.exit(res.status ?? 1);
  }
}

function handleInit(targetDirArg) {
  const targetDir = resolve(process.cwd(), targetDirArg || ".");
  console.log(`Initializing write-notes in: ${targetDir}`);

  // 1. Create .agents/notes directory tree
  const lifecycles = ["proposed", "implemented", "rejected", "archived"];
  const classes = ["feature", "bug-fix", "simplification", "architecture", "process", "testing"];

  for (const lc of lifecycles) {
    for (const cls of classes) {
      mkdirSync(join(targetDir, ".agents", "notes", lc, cls), { recursive: true });
    }
  }

  // 2. Copy templates
  const templatesSrc = join(packageRoot, "templates");
  const templatesDest = join(targetDir, ".agents", "notes", "templates");
  mkdirSync(templatesDest, { recursive: true });
  cpSync(templatesSrc, templatesDest, { recursive: true });

  // 3. Copy skill & references
  const skillDestDir = join(targetDir, ".agents", "skills", "write-notes");
  mkdirSync(skillDestDir, { recursive: true });
  cpSync(join(packageRoot, "SKILL.md"), join(skillDestDir, "SKILL.md"));

  const refsSrc = join(packageRoot, "references");
  const refsDest = join(skillDestDir, "references");
  cpSync(refsSrc, refsDest, { recursive: true });

  // 4. Update or create AGENTS.md
  const ruleContent = `
## 架构决策留痕与防撞规范

在进行任何非平凡变更（技术选型、架构重构、接口约定变更、缺陷复盘、特性裁撤）前：
1. 遵循 [.agents/skills/write-notes/SKILL.md](.agents/skills/write-notes/SKILL.md)。
2. 既有模块重构优先就地更新对应 Note 的事实部分，严禁只改代码不改 Note，严禁追加流水账。
3. 新路线先在 \`.agents/notes/proposed/\` 编写提案；交付时随同次代码提交移入 \`implemented/\` 并改写为现在时。
4. 必须包含 \`## Alternatives considered\` 章节，且必须包含维持现状选项与对手方案的最强论据。
5. 核心代码入口保留反向追溯注释：\`// Note: 见 .agents/notes/...\`。
6. Note 中的代码片段与核心类型声明必须通过 \`write-notes verify\` 门禁检查。
`;

  const agentsPath = join(targetDir, "AGENTS.md");
  const claudePath = join(targetDir, "CLAUDE.md");

  const targetRuleFile = existsSync(claudePath) && !existsSync(agentsPath) ? claudePath : agentsPath;

  if (existsSync(targetRuleFile)) {
    const existing = readFileSync(targetRuleFile, "utf8");
    if (!existing.includes("write-notes")) {
      writeFileSync(targetRuleFile, existing.trimEnd() + "\n" + ruleContent, "utf8");
      console.log(`Appended guardrail rules to: ${targetRuleFile}`);
    } else {
      console.log(`Rules already present in: ${targetRuleFile}`);
    }
  } else {
    writeFileSync(targetRuleFile, ruleContent.trimStart(), "utf8");
    console.log(`Created: ${targetRuleFile}`);
  }

  // 5. Update package.json if exists
  const pkgPath = join(targetDir, "package.json");
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
      pkg.scripts = pkg.scripts || {};
      let updated = false;

      if (!pkg.scripts["verify-notes"]) {
        pkg.scripts["verify-notes"] = "write-notes verify";
        updated = true;
      }
      if (!pkg.scripts["pitfalls"]) {
        pkg.scripts["pitfalls"] = "write-notes pitfalls";
        updated = true;
      }
      if (!pkg.scripts["archive-note"]) {
        pkg.scripts["archive-note"] = "write-notes archive";
        updated = true;
      }

      if (updated) {
        writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
        console.log("Configured scripts in: package.json");
      }
    } catch (e) {
      console.warn("Notice: could not update package.json automatically");
    }
  }

  // 6. Create GitHub Actions workflow
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

      - name: Install write-notes CLI
        run: npm install -g write-notes

      - name: Run verification gates
        run: write-notes verify
`;
    writeFileSync(workflowPath, workflowContent, "utf8");
    console.log(`Created CI workflow: ${workflowPath}`);
  }

  console.log("\nInitialization complete. Project is ready for Agent Notes governance.");
}

function handleVerify() {
  console.log("Running write-notes verification gates...\n");
  console.log("Gate 1/5: verify-agent-note-tree");
  runScript("scripts/verify-agent-note-tree.ts");

  console.log("\nGate 2/5: verify-agent-note-format");
  runScript("scripts/verify-agent-note-format.ts");

  console.log("\nGate 3/5: verify-doc-refs");
  runScript("scripts/verify-doc-refs.ts");

  console.log("\nGate 4/5: verify-doc-typecheck");
  runScript("scripts/verify-doc-typecheck.ts");

  console.log("\nGate 5/5: verify-type-equiv");
  runScript("scripts/verify-type-equiv.ts");

  console.log("\nAll 5 verification gates passed.");
}

function handlePitfalls(keyword) {
  runScript("scripts/query-pitfalls.ts", keyword ? [keyword] : []);
}

function handleArchive(notePath) {
  if (!notePath) {
    console.error("Error: please specify note path to archive. Example:\n  write-notes archive .agents/notes/implemented/feature/2026-08-23-xxx.md");
    process.exit(1);
  }
  runScript("scripts/archive-agent-note.ts", [notePath]);
}

function showHelp() {
  console.log(`Usage: write-notes <command> [options]

Commands:
  init [dir]          Scaffold write-notes in target project directory (default: .)
  verify              Run all 5 verification gates (tree, format, doc-refs, typecheck, type-equiv)
  pitfalls [keyword]  Search rejected proposals and dropped alternatives
  archive <path>      Archive a superseded implemented note with SHA-256 seal
  help, -h            Show this help manual

Examples:
  write-notes init
  write-notes verify
  write-notes pitfalls sqlite
  write-notes archive .agents/notes/implemented/architecture/2026-08-23-storage.md
`);
}

switch (command) {
  case "init":
    handleInit(args[1]);
    break;
  case "verify":
    handleVerify();
    break;
  case "pitfalls":
    handlePitfalls(args[1]);
    break;
  case "archive":
    handleArchive(args[1]);
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
