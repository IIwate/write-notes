import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test, type TestContext } from "node:test";
import { fileURLToPath } from "node:url";

const repository = fileURLToPath(new URL("../", import.meta.url));
const loader = import.meta.resolve("tsx");
const prefix = "# Project rules\n\nKeep the existing project workflow.\n";

function fixture(t: TestContext): string {
  const root = mkdtempSync(join(tmpdir(), "write-notes-cli-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "fixture", type: "module", scripts: { build: "node build.js" } }));
  writeFileSync(join(root, "AGENTS.md"), prefix);
  return root;
}

function cli(root: string, command: string, ...args: string[]): void {
  const result = spawnSync(process.execPath, [join(repository, "bin/cli.js"), command, root, ...args], { cwd: root, encoding: "utf8", timeout: 20_000 });
  assert.equal(result.status, 0, result.stdout + result.stderr);
}

test("initialization deploys callable archive tools and templates accepted by the format gate", t => {
  const root = fixture(t);
  cli(root, "init");
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  assert.equal(pkg.scripts.build, "node build.js");
  assert.ok(pkg.scripts["verify-notes"].includes("verify-archived-notes.ts"));
  for (const file of ["archive-agent-note.ts", "note-references.ts", "verify-archived-notes.ts"]) {
    assert.ok(existsSync(join(root, "scripts", file)));
  }
  for (const lifecycle of ["implemented", "proposed", "rejected"]) {
    const template = readFileSync(join(root, ".agents/notes/templates", lifecycle + ".md"), "utf8");
    writeFileSync(join(root, ".agents/notes", lifecycle, "architecture/2026-09-12-template.md"), template.replace("<标题>", "Template contract"));
  }
  const checked = spawnSync(process.execPath, ["--import", loader, join(root, "scripts/verify-agent-note-format.ts")], { cwd: root, encoding: "utf8", timeout: 20_000,
    env: { ...process.env, AGENT_NOTE_ROOT: join(root, ".agents", "notes") } });
  assert.equal(checked.status, 0, checked.stdout + checked.stderr);
  const queried = spawnSync(process.execPath, ["--import", loader, join(root, "scripts/note-references.ts"), "AGENTS.md"], { cwd: root, encoding: "utf8", timeout: 20_000,
    env: { ...process.env, AGENT_NOTE_ROOT: join(root, ".agents", "notes") } });
  assert.equal(queried.status, 0, queried.stdout + queried.stderr);
  assert.ok(JSON.parse(queried.stdout).outgoing.length > 0);
});

test("updates preserve project commands and records unless script replacement is explicitly selected", t => {
  const root = fixture(t);
  cli(root, "init");
  const rules = join(root, "AGENTS.md");
  const suffix = "\nUser-owned trailing instructions.\n";
  writeFileSync(rules, readFileSync(rules, "utf8") + suffix);
  const notesDirectory = join(root, ".agents", "notes");
  const record = join(notesDirectory, "implemented/architecture/2026-09-12-owned.md");
  const archived = join(notesDirectory, "archived/architecture/2026-09-12-owned.md");
  const manifest = join(root, ".agents/notes/archived/manifest.json");
  mkdirSync(dirname(record), { recursive: true });
  writeFileSync(record, "Project-owned decision bytes\n");
  writeFileSync(archived, "Historical decision bytes\n");
  writeFileSync(manifest, "{\n  \"version\": 1, \"files\": {}\n}\n");
  const retained = new Map([record, archived, manifest].map(file => [file, readFileSync(file, "utf8")]));
  const script = join(root, "scripts/verify-agent-note-tree.ts");
  writeFileSync(script, "Project-owned checker\n");
  unlinkSync(join(root, "scripts/verify-archived-notes.ts"));
  unlinkSync(join(root, "scripts/note-references.ts"));
  const packagePath = join(root, "package.json");
  const pkg = JSON.parse(readFileSync(packagePath, "utf8"));
  pkg.scripts["verify-notes"] = "node project-check.js";
  pkg.scripts["archive-note"] = "node project-archive.js";
  delete pkg.scripts["verify-archives"];
  delete pkg.scripts["note-refs"];
  writeFileSync(packagePath, JSON.stringify(pkg));

  cli(root, "update");
  let updated = JSON.parse(readFileSync(packagePath, "utf8"));
  assert.equal(updated.scripts["verify-notes"], "node project-check.js");
  assert.equal(updated.scripts["archive-note"], "node project-archive.js");
  assert.equal(updated.scripts["verify-archives"], undefined);
  assert.equal(updated.scripts["note-refs"], undefined);
  assert.equal(readFileSync(script, "utf8"), "Project-owned checker\n");

  cli(root, "update", "--scripts");
  updated = JSON.parse(readFileSync(packagePath, "utf8"));
  assert.ok(updated.scripts["verify-notes"].includes("verify-archived-notes.ts"));
  assert.ok(updated.scripts["note-refs"].includes("note-references.ts"));
  assert.equal(readFileSync(script, "utf8"), readFileSync(join(repository, "scripts/verify-agent-note-tree.ts"), "utf8"));
  for (const [file, content] of retained) assert.equal(readFileSync(file, "utf8"), content);
  const text = readFileSync(rules, "utf8");
  assert.ok(text.startsWith(prefix));
  assert.ok(text.endsWith(suffix));
});
