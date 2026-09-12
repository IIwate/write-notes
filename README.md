# write-notes

> Architecture Decision Records (ADRs) and compiler-enforced guardrails built for AI coding agents and engineering teams.

[![npm version](https://img.shields.io/npm/v/write-notes.svg)](https://www.npmjs.com/package/write-notes)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D22-brightgreen)](package.json)

---

## Why write-notes?

Modern AI-assisted software engineering faces two critical failure modes:

1. **Agent Context Amnesia & "Blind Refactoring"**  
   When an AI agent takes over a mature codebase, it lacks awareness of historical architectural trade-offs. Defensive edge-case handlers, timing compromises, and rejected alternatives often look like "redundant code". Without guardrails, agents eagerly refactor these away, resurrecting previously solved bugs and regressions.
2. **Traditional ADR & Documentation Rot**  
   Documentation quickly drifts out of sync with code. Teams either abandon updating documentation altogether or append endless diary-like changelogs, leaving behind an untrusted "documentation graveyard".

**The write-notes approach: Decisions with explicit assumptions and evidence.**

Keep motivations, alternatives, and verification boundaries beside the code. Revisit a decision when requirements or evidence change its assumptions. Compiler checks, AST comparison, and link validation check mechanical consistency; architectural reasoning remains a maintenance responsibility.

---

## Core Architecture & Guardrail Mechanisms

### 1. Real TypeScript Compilation & AST Equivalence (`type-equiv`)
- **Type-safe code snippets**: TypeScript snippets inside notes are typechecked by the host project's compiler (`tsc`). Outdated API signatures immediately fail CI;
- **AST contract equivalence**: Canonical data structures, schemas, and persistence models use `type-equiv` to compare AST nodes against actual source files symbol-by-symbol;
- **No artificial types**: Pure control flow, algorithms, and bugfixes use standard code blocks without fabricating meaningless interfaces just to satisfy AST gates.

### 2. Reverse Code Anchors & Single Primary Host
- Critical entry points retain a single reverse comment pointing directly to the authoritative note:
  ```ts
  // Note: Handle-based session persistence prevents concurrent write hazards — see .agents/notes/implemented/architecture/2026-08-27-handle-based-session-persistence.md
  export interface SessionFileHandleConfig { ... }
  ```
- Static analysis scans all codebase comments for referenced note paths. Any renamed or deleted note immediately fails CI;
- **Single Primary Host**: Anchor a note at its core type or top-level entrypoint. Path validation does not enforce anchor uniqueness or prove that the note's prose is correct.

### 3. Two-Tier Pointer Architecture
- **Root `AGENTS.md` (High-density System Constitution)**: *Keep root rules self-contained in one to three sentences and link their detailed owner.* Only system-wide runtime invariants are declared here, with hyperlinks to their respective notes;
- **`.agents/notes/` (Legislative Rationale & Rejected Archives)**: Houses deep background, anti-strawman alternatives, trade-offs, and verification test harnesses;
- Routine bugfixes and module-internal decisions are kept out of root instructions, preventing global context bloat and prompt dilution.

### 4. In-place Fact Maintenance & Strict Tense Isolation
- When modules evolve, **directly rewrite existing active notes in-place** within the same commit. Appending chronological changelogs is strictly forbidden;
- Implemented notes use strictly present-tense facts (`implemented/`), banning proposal language (`## Proposal`, `## Plan`);
- Archive preview resolves references before moving a decision. Replacement metadata links old and new decisions in both directions;
- Archived files registered in the manifest are checked against their SHA-256 hashes. Historical links and APIs are excluded from current-contract checks.

### 5. Negative Exemption Boundaries
- Pure documentation edits (README, guides, API descriptions), comment tuning, test additions, routine dependency bumps, and non-architectural bugfixes are **explicitly exempt from creating notes**. Commit directly without ceremony.

### 6. Transparent, White-box Scaffolding
- Zero blackbox or proprietary binary runtime dependencies. Gate verification scripts (TypeScript) are transparently embedded directly into the host repository;
- Host projects retain full ownership of their verification scripts. Upgrades default to non-destructive updates that never overwrite project-owned scripts.

---

## Quick Start

### 1. Scaffold into Any Project (Zero-install)

Run directly in any project root without cloning this repository:

```bash
npx write-notes init
```

The CLI:
- Deploys transparent TypeScript verification scripts to `scripts/`;
- Scaffolds the `.agents/notes/{proposed,implemented,rejected,archived}` directory tree;
- Places fill-in templates in `.agents/notes/templates/`;
- Installs the AI Agent context skill in `.agents/skills/write-notes/`;
- Injects a protected guardrail block into `AGENTS.md` (or `CLAUDE.md`);
- Configures native `npm run verify-notes` scripts in `package.json`;
- Creates a GitHub Actions CI workflow (`.github/workflows/verify-notes.yml`).

### 2. Daily Workflow

```text
Significant Change (Architecture / Core Refactor / Defect Post-mortem)
   │
   ├─► Existing Module Evolution ──► Update existing note in-place in the same commit
   │
   ├─► Single-turn Feature/Fix ────► Write present-tense fact in implemented/ atomically with code
   │
   ├─► Complex Multi-stage RFC ────► Draft in proposed/, review, then move on completion
   │
   └─► Pure Docs / Routine Fix ────► Hit negative exemption boundary: commit directly, NO note!
```

### 3. Verification Gates

Run native project scripts without global CLI dependencies:

```bash
# Check tree, format, source references, snippets, AST contracts, and archive seals
npm run verify-notes

# Inspect incoming and outgoing references without creating an index
npm run note-refs -- <note-or-source-path>

# Preview a decision replacement without changing files
npm run archive-note -- <old-note> --replacement <new-note> --dry-run

# Apply the previewed operation, then verify it
npm run archive-note -- <old-note> --replacement <new-note>
npm run verify-notes
```

### 4. Non-destructive Updates

When new guidelines, references, or templates are released:

```bash
npx write-notes update
```

- **Non-destructive**: Syncs skills, references, templates, and updates the sentinel block in `AGENTS.md`;
- **Safe boundary**: Existing note records, root rules outside the managed block, project scripts, and existing package commands are preserved. Use `--scripts` to replace the bundled scripts and update their commands, including the archive seal gate.

Archive operations rebase Markdown links and update source Note paths. A caught write failure attempts rollback; process termination and concurrent editing are not covered by a cross-file transaction. See the [archiving guide](references/archiving.md) for the exact scope. Archive operations should run sequentially.

---

## Detailed Guidelines & Technical References

For exhaustive guidelines and self-inspection checklists, refer to the bundled assets:

- [SKILL.md](SKILL.md) — Canonical context specification for AI Agents
- [When to Write & Pointer Architecture](references/when-to-write.md) — Lifecycle decision matrix, anchor rules, and root pointer division
- [Verification Scripts & AST Equivalence](references/verification.md) — Technical details of AST symbol matching and compiler gates
- [Prose Standard & Chain-of-Thought Stripping](references/prose-checklist.md) — Guidelines for drafting timeless objective facts
- [Archiving & Supersession Protocol](references/archiving.md) — Decision lifecycle completion and hash-manifest sealing
- [Classification Taxonomy](references/classification.md) — Boundaries across the 6 closed categories

---

## License

MIT © [IIwate](https://github.com/IIwate)
