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

**The write-notes approach: Architectural decisions as "Living Law".**  
Motivations, rejected alternatives, and verification baselines that code comments cannot carry are committed atomically alongside code changes—enforced by real compiler typechecks, AST equivalence, and static link validation.

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
- **Single Primary Host**: Anchors attach to the core type definition first, or the top-level facade entrypoint second. Scatter-gun commenting across entire PRs is prohibited.

### 3. Two-Tier Pointer Architecture
- **Root `AGENTS.md` (High-density System Constitution)**: *Keep root rules self-contained in one to three sentences and link their detailed owner.* Only system-wide runtime invariants are declared here, with hyperlinks to their respective notes;
- **`.agents/notes/` (Legislative Rationale & Rejected Archives)**: Houses deep background, anti-strawman alternatives, trade-offs, and verification test harnesses;
- Routine bugfixes and module-internal decisions are kept out of root instructions, preventing global context bloat and prompt dilution.

### 4. In-place Fact Maintenance & Strict Tense Isolation
- When modules evolve, **directly rewrite existing active notes in-place** within the same commit. Appending chronological changelogs is strictly forbidden;
- Implemented notes use strictly present-tense facts (`implemented/`), banning proposal language (`## Proposal`, `## Plan`);
- Completely superseded decisions are permanently frozen in `archived/` with SHA-256 integrity hashes.

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

In under one second, the CLI automatically:
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
# Run 5-stage verification (directory tree + format + dead doc-refs + typecheck + AST equiv)
npm run verify-notes

# Safely archive and hash-seal a superseded decision
npm run archive-note .agents/notes/implemented/<class>/<filename>.md
```

### 4. Non-destructive Updates

When new guidelines, references, or templates are released:

```bash
npx write-notes update
```

- **Non-destructive**: Syncs skills, references, templates, and updates the sentinel block in `AGENTS.md`;
- **Safe boundary**: Existing note records are 100% untouched. Scripts in `scripts/` are preserved (use `--scripts` to overwrite).

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
