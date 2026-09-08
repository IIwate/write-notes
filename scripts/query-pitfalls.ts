/**
 * CLI Tool: Query rejected proposals and rejected alternatives across all Agent Notes.
 * Serves as the lightweight terminal-based "Pitfall Knowledge Base".
 *
 * Usage:
 *   npx tsx scripts/query-pitfalls.ts             # List all pitfalls & rejected options
 *   npx tsx scripts/query-pitfalls.ts <keyword>   # Search pitfalls by keyword
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { agentNoteRoot, walkAgentNoteTree } from "./agent-note-tree.ts";

const searchKeyword = process.argv[2]?.trim().toLowerCase();

interface RejectedItem {
  type: "rejected-proposal" | "rejected-alternative";
  title: string;
  sourceFile: string;
  reason: string;
  details?: string;
}

const items: RejectedItem[] = [];

// 1. Scan rejected/ proposals
const rejectedDir = join(agentNoteRoot, "rejected");
if (existsSync(rejectedDir)) {
  const { notes } = walkAgentNoteTree();
  const rejectedNotes = notes.filter((n) => n.lifecycle === "rejected");

  for (const n of rejectedNotes) {
    const fullPath = resolve(agentNoteRoot, n.rel);
    const content = readFileSync(fullPath, "utf8");
    const lines = content.split("\n");

    const titleLine = lines.find((l) => l.startsWith("# Agent Note: ")) || "";
    const title = titleLine.replace("# Agent Note: ", "").trim();
    const statusLine = lines.find((l) => l.startsWith("Status: rejected — ")) || "";
    const reason = statusLine.replace("Status: rejected — ", "").trim();

    // Grab Problem section as summary
    const problemIdx = lines.findIndex((l) => l.startsWith("## Problem") || l.startsWith("## 问题"));
    let problemSummary = "";
    if (problemIdx !== -1) {
      const nextH2 = lines.findIndex((l, idx) => idx > problemIdx && l.startsWith("## "));
      const sliceEnd = nextH2 !== -1 ? nextH2 : lines.length;
      problemSummary = lines.slice(problemIdx + 1, sliceEnd).join("\n").trim().slice(0, 200);
    }

    items.push({
      type: "rejected-proposal",
      title: title || basename(n.rel),
      sourceFile: `.agents/notes/${n.rel}`,
      reason,
      details: problemSummary,
    });
  }
}

// 2. Scan implemented/ notes for ## Alternatives considered
const { notes } = walkAgentNoteTree();
const implementedNotes = notes.filter((n) => n.lifecycle === "implemented");

for (const n of implementedNotes) {
  const fullPath = resolve(agentNoteRoot, n.rel);
  const content = readFileSync(fullPath, "utf8");
  const lines = content.split("\n");

  const titleLine = lines.find((l) => l.startsWith("# Agent Note: ")) || "";
  const title = titleLine.replace("# Agent Note: ", "").trim();

  const altIdx = lines.findIndex(
    (l) =>
      l.startsWith("## Alternatives considered") ||
      l.startsWith("## 考虑过的备选方案") ||
      l.startsWith("## 备选方案")
  );

  if (altIdx !== -1) {
    const nextH2 = lines.findIndex((l, idx) => idx > altIdx && l.startsWith("## "));
    const sliceEnd = nextH2 !== -1 ? nextH2 : lines.length;
    const altLines = lines.slice(altIdx + 1, sliceEnd);

    // Group bullet points or H3 subheadings as rejected alternatives
    let currentBullet = "";
    for (const line of altLines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || trimmed.startsWith("### ")) {
        if (currentBullet) {
          items.push({
            type: "rejected-alternative",
            title: `[In ${title}]`,
            sourceFile: `.agents/notes/${n.rel}`,
            reason: currentBullet,
          });
        }
        currentBullet = trimmed.replace(/^[-*]\s+/, "").replace(/^###\s+/, "");
      } else if (currentBullet && trimmed) {
        currentBullet += " " + trimmed;
      }
    }
    if (currentBullet) {
      items.push({
        type: "rejected-alternative",
        title: `[In ${title}]`,
        sourceFile: `.agents/notes/${n.rel}`,
        reason: currentBullet,
      });
    }
  }
}

// 3. Filter items if keyword is provided
const filtered = searchKeyword
  ? items.filter(
      (item) =>
        item.title.toLowerCase().includes(searchKeyword) ||
        item.reason.toLowerCase().includes(searchKeyword) ||
        (item.details && item.details.toLowerCase().includes(searchKeyword)) ||
        item.sourceFile.toLowerCase().includes(searchKeyword)
    )
  : items;

console.log(`\n=== Agent Notes 避坑检索 (Pitfall Knowledge Base) ===`);
if (searchKeyword) {
  console.log(`过滤关键词: "${searchKeyword}" | 匹配到: ${filtered.length} 条\n`);
} else {
  console.log(`收录总数: ${filtered.length} 条 (含被否决提案与被舍弃的备选方案)\n`);
}

if (filtered.length === 0) {
  console.log("未找到相关的避坑记录。");
  process.exit(0);
}

for (let i = 0; i < filtered.length; i++) {
  const item = filtered[i];
  const tag = item.type === "rejected-proposal" ? "[被否决提案]" : "[已放弃备选]";
  console.log(`${i + 1}. ${tag} ${item.title}`);
  console.log(`   出处: ${item.sourceFile}`);
  console.log(`   原因/结论: ${item.reason}`);
  if (item.details) {
    console.log(`   背景: ${item.details}`);
  }
  console.log("");
}
