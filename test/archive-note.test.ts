import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test, type TestContext } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const repository = fileURLToPath(new URL("../", import.meta.url));
const loader = import.meta.resolve("tsx");
const notes = [".agents", "notes"].join("/");
const oldPath = `${notes}/implemented/architecture/2026-09-12-old.md`;
const newPath = `${notes}/implemented/architecture/2026-09-12-new (current).md`;
const archivedPath = oldPath.replace("/implemented/", "/archived/");
const manifestPath = `${notes}/archived/manifest.json`;

function write(root: string, path: string, content: string): void {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), content);
}

function note(body = "Current decision."): string {
  return `# Agent Note: Fixture\n\nStatus: implemented\n\n## Problem\n\nA concrete problem.\n\n## Decision\n\n${body}\n\n## Alternatives considered\n\n- Keep the current behavior.\n\n## Consequences\n\nExplicit ownership.\n`;
}

function fixture(t: TestContext): string {
  const root = mkdtempSync(join(tmpdir(), "write-notes-archive-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, ".git"));
  write(root, oldPath, note("[Current](<2026-09-12-new (current).md#decision>)\n\n```md\n[Example](example.md)\n```"));
  write(root, newPath, note(`[Previous](../../archived/architecture/2026-09-12-old.md)`));
  write(root, "README.md", `[Old decision](${oldPath}#decision)\n`);
  write(root, "ready.md", `[Already relocated](${archivedPath})\n`);
  write(root, "src/entry.ts", `// Note: see ${oldPath}\nexport const value = 1;\n`);
  return root;
}

function run(root: string, script: string, args: string[] = [], preload?: string) {
  return spawnSync(process.execPath, ["--import", loader, ...(preload ? ["--import", pathToFileURL(preload).href] : []),
    resolve(repository, "scripts", script), ...args], { cwd: root, encoding: "utf8", timeout: 20_000,
    env: { ...process.env, AGENT_NOTE_ROOT: join(root, ".agents", "notes") } });
}

function success(result: ReturnType<typeof run>): void {
  assert.equal(result.status, 0, result.stdout + result.stderr);
}

function snapshot(root: string): Record<string, string> {
  const files: Record<string, string> = {};
  function visit(path = ""): void {
    for (const entry of readdirSync(join(root, path), { withFileTypes: true })) {
      const file = join(path, entry.name);
      if (entry.isDirectory()) { files[file + "/"] = ""; visit(file); }
      else if (entry.isFile()) files[file] = readFileSync(join(root, file), "utf8");
    }
  }
  visit(); return files;
}

test("archive preview and reference queries leave all files and directories unchanged", t => {
  const root = fixture(t);
  const before = snapshot(root);
  const preview = run(root, "archive-agent-note.ts", [oldPath, "--replacement", newPath, "--dry-run"]);
  success(preview);
  assert.match(preview.stdout, /Update reference: README.md:1/);
  assert.doesNotMatch(preview.stdout, /Update reference: ready.md/);
  const queried = run(root, "note-references.ts", [oldPath]);
  success(queried);
  const refs = JSON.parse(queried.stdout);
  assert.deepEqual(refs.incoming.map((ref: { file: string }) => ref.file).sort(), ["README.md", join("src", "entry.ts")]);
  assert.equal(refs.outgoing.length, 1);
  assert.equal(refs.outgoing[0].exists, true);
  assert.deepEqual(snapshot(root), before);
});

test("archive preserves link destinations and examples, updates anchors, and seals the final content", t => {
  const root = fixture(t);
  const ready = readFileSync(join(root, "ready.md"), "utf8");
  success(run(root, "archive-agent-note.ts", [oldPath, "--replacement", newPath]));
  assert.equal(existsSync(join(root, oldPath)), false);
  const archived = readFileSync(join(root, archivedPath), "utf8");
  assert.match(archived, /^Archived: \d{4}-\d{2}-\d{2}$/m);
  assert.match(archived, /^Superseded-by:/m);
  assert.ok(archived.includes("```md\n[Example](example.md)\n```"));
  assert.match(readFileSync(join(root, newPath), "utf8"), /^Supersedes:/m);
  assert.equal(readFileSync(join(root, "ready.md"), "utf8"), ready);
  assert.equal(readFileSync(join(root, "README.md"), "utf8"), `[Old decision](${archivedPath}#decision)\n`);
  assert.ok(readFileSync(join(root, "src/entry.ts"), "utf8").includes(newPath));
  const queried = run(root, "note-references.ts", [archivedPath]);
  success(queried);
  assert.ok(JSON.parse(queried.stdout).outgoing.every((ref: { exists: boolean }) => ref.exists));
  success(run(root, "verify-agent-note-tree.ts"));
  success(run(root, "verify-agent-note-format.ts"));
  success(run(root, "verify-archived-notes.ts"));
  writeFileSync(join(root, archivedPath), archived + "Changed historical bytes.\n");
  const changed = run(root, "verify-archived-notes.ts");
  assert.notEqual(changed.status, 0);
  assert.match(changed.stderr, /Archive seal mismatch/);
});

for (const manifest of ["{", JSON.stringify({ version: 1, files: [] }), JSON.stringify({ version: 1, files: { "../outside.md": "sha256:" + "0".repeat(64) } })]) {
  test(`invalid manifest fails before archive writes: ${manifest}`, t => {
    const root = fixture(t);
    write(root, manifestPath, manifest);
    const before = snapshot(root);
    const result = run(root, "archive-agent-note.ts", [oldPath, "--replacement", newPath]);
    assert.notEqual(result.status, 0);
    assert.deepEqual(snapshot(root), before);
    assert.notEqual(run(root, "verify-archived-notes.ts").status, 0);
  });
}

test("a missing replacement and an existing archive fail without modifying files", t => {
  const root = fixture(t);
  let before = snapshot(root);
  assert.notEqual(run(root, "archive-agent-note.ts", [oldPath, "--replacement", `${notes}/implemented/architecture/2026-09-12-missing.md`]).status, 0);
  assert.deepEqual(snapshot(root), before);
  write(root, archivedPath, "Existing historical record");
  before = snapshot(root);
  assert.notEqual(run(root, "archive-agent-note.ts", [oldPath]).status, 0);
  assert.deepEqual(snapshot(root), before);
});

for (const operation of ["renameSync", "unlinkSync"]) {
  test(`a caught ${operation} failure restores references, source, and the previous manifest`, t => {
    const root = fixture(t);
    write(root, manifestPath, JSON.stringify({ version: 1, files: {} }) + "\n");
    mkdirSync(dirname(join(root, archivedPath)), { recursive: true });
    const failedPath = join(root, operation === "renameSync" ? "README.md" : oldPath);
    const preload = join(root, "failure.mjs");
    writeFileSync(preload, `import fs from "node:fs";
      import { syncBuiltinESMExports } from "node:module";
      const original = fs.${operation};
      let failed = false;
      fs.${operation} = (...args) => {
        if (!failed && args[${operation === "renameSync" ? 1 : 0}] === ${JSON.stringify(failedPath)}) {
          failed = true; throw new Error("Injected write failure");
        }
        return original(...args);
      };
      syncBuiltinESMExports();
    `);
    const before = snapshot(root);
    const result = run(root, "archive-agent-note.ts", [oldPath, "--replacement", newPath], preload);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Injected write failure/);
    assert.deepEqual(snapshot(root), before);
  });
}

test("historical TypeScript is excluded while active contracts still fail", t => {
  const root = fixture(t);
  write(root, archivedPath, note("```ts\nconst invalid: number = 'historical';\n```\n\n```ts type-equiv: Removed from src/removed.ts\nexport interface Removed {}\n```"));
  success(run(root, "verify-doc-typecheck.ts"));
  success(run(root, "verify-type-equiv.ts"));
  write(root, newPath, note("```ts type-equiv: Removed from src/removed.ts\nexport interface Removed {}\n```"));
  const active = run(root, "verify-type-equiv.ts");
  assert.notEqual(active.status, 0);
  assert.match(active.stderr, /source file not found/);
});
