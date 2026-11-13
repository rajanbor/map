import { describe, it, expect, afterEach } from "vitest";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { profileProject } from "../src/project/profile.ts";
import { detectProject } from "../src/project/detect.ts";
import { FileSystemStorage } from "../src/storage/file-system-storage.ts";

const storage = new FileSystemStorage();
const dirs: string[] = [];

async function project(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "map-profile-"));
  dirs.push(root);
  for (const [name, contents] of Object.entries(files)) {
    await mkdir(dirname(join(root, name)), { recursive: true });
    await writeFile(join(root, name), contents);
  }
  return root;
}

afterEach(async () => {
  while (dirs.length > 0) await rm(dirs.pop()!, { recursive: true, force: true });
});

const pkg = (deps: Record<string, string>, dev: Record<string, string> = {}): string =>
  JSON.stringify({ dependencies: deps, devDependencies: dev });

describe("profileProject", () => {
  it("profiles a Next.js application with tooling, infrastructure, and agents", async () => {
    const root = await project({
      "package.json": pkg({ next: "15", react: "19", "@prisma/client": "6", pg: "8" }, { typescript: "5", vitest: "4", eslint: "9", tailwindcss: "4" }),
      "tsconfig.json": "{}",
      "next.config.mjs": "export default {}",
      "prisma/schema.prisma": 'datasource db {\n  provider = "postgresql"\n}\n',
      Dockerfile: "FROM node:22",
      "compose.yaml": "services:\n  db:\n    image: postgres:16\n  cache:\n    image: redis:7\n",
      ".github/workflows/ci.yml": "on: push",
      "CLAUDE.md": "# Project\n",
      ".cursor/rules/x.mdc": "rule",
    });

    const profile = await profileProject(root, storage);

    expect(profile.schemaVersion).toBe(1);
    expect(profile.kind).toBe("map.project-profile");
    expect(profile.project.languages).toEqual(["typescript"]);
    expect(profile.project.frameworks).toEqual(["nextjs", "react", "tailwindcss"]);
    expect(profile.project.infrastructure).toEqual(["docker", "docker-compose", "github-actions", "prisma"]);
    expect(profile.project.tooling).toEqual(["vitest", "eslint"]);
    expect(profile.project.agents).toEqual(["claude", "cursor"]);
    // Database clients and compose images are probable, not confirmed.
    expect(profile.probable.infrastructure).toEqual(["postgresql", "redis"]);
    const pg = profile.evidence.filter((e) => e.signal === "postgresql");
    expect(pg.every((e) => e.certainty === "probable")).toBe(true);
    expect(pg.map((e) => e.file).sort()).toEqual(["compose.yaml", "package.json", "prisma/schema.prisma"]);
  });

  it("returns an empty, explicitly limited profile for an empty repository", async () => {
    const root = await project({});
    const profile = await profileProject(root, storage);
    expect(profile.project.languages).toEqual([]);
    expect(profile.evidence).toEqual([]);
    expect(profile.workspaces).toEqual([{ path: ".", manifests: [], languages: [], frameworks: [] }]);
    expect(profile.limitations.join(" ")).toContain("unknown, not absent");
  });

  it("discovers nested workspaces in a monorepo and skips excluded directories", async () => {
    const root = await project({
      "package.json": JSON.stringify({ workspaces: ["apps/*"] }),
      "pnpm-workspace.yaml": "packages: ['apps/*']",
      "apps/web/package.json": pkg({ react: "19", vue: "3" }),
      "apps/api/pyproject.toml": '[project]\ndependencies = ["fastapi>=0.1", "pytest"]\n[tool.ruff]\n',
      "services/engine/Cargo.toml": "[package]\nname = \"engine\"\n",
      "node_modules/next/package.json": pkg({ next: "15" }),
      "dist/app/Cargo.toml": "[package]",
      "ignored/go.mod": "module x",
      ".gitignore": "ignored/\n# comment\n",
    });

    const profile = await profileProject(root, storage);

    expect(profile.workspaces.map((w) => w.path)).toEqual([".", "apps/api", "apps/web", "services/engine"]);
    expect(profile.project.languages).toEqual(["javascript", "python", "rust"]);
    // Conflicting UI frameworks are both reported with their evidence.
    expect(profile.project.frameworks).toEqual(["react", "vue", "fastapi"]);
    expect(profile.project.tooling).toEqual(expect.arrayContaining(["pytest", "ruff", "cargo", "monorepo"]));
    expect(profile.evidence.some((e) => e.file.startsWith("node_modules"))).toBe(false);
    expect(profile.evidence.some((e) => e.file.startsWith("dist/"))).toBe(false);
    expect(profile.project.languages).not.toContain("go");
  });

  it("honors explicit exclude globs, depth limits, and directory budgets", async () => {
    const root = await project({
      "a/b/c/d/go.mod": "module deep",
      "vendored/lib/Cargo.toml": "[package]",
      "x1/package.json": "{}",
      "x2/package.json": "{}",
    });
    const shallow = await profileProject(root, storage, { exclude: ["vendored/**"] });
    expect(shallow.project.languages).toEqual(["javascript"]);

    const deep = await profileProject(root, storage, { maxDepth: 4 });
    expect(deep.project.languages).toContain("go");

    const tiny = await profileProject(root, storage, { maxDirectories: 2 });
    expect(tiny.traversal.truncated).toBe(true);
    expect(tiny.limitations.join(" ")).toContain("Traversal stopped");
  });

  it("detects WordPress from core files and theme headers, PHP only as probable without composer", async () => {
    const root = await project({
      "wp-config-sample.php": "<?php",
      "wp-content/themes/acme/style.css": "/*\nTheme Name: Acme\n*/",
      "wp-content/themes/acme/functions.php": "<?php",
      "wp-content/plugins/hello/hello.php": "<?php\n/*\n * Plugin Name: Hello\n */",
    });
    const profile = await profileProject(root, storage);
    expect(profile.project.frameworks).toEqual(["wordpress"]);
    expect(profile.probable.languages).toEqual(["php"]);
    const files = profile.evidence.filter((e) => e.signal === "wordpress").map((e) => e.file);
    expect(files).toEqual(expect.arrayContaining(["wp-config-sample.php", "wp-content", "wp-content/themes/acme/style.css"]));
  });

  it("classifies agent markers by specificity and flags MAP-generated files", async () => {
    const root = await project({
      "AGENTS.md": "<!--\n  Generated by MAP. Do not edit directly.\n-->\n# x",
      "GEMINI.md": "# mine",
      ".github/copilot-instructions.md": "be nice",
      ".codex/config.toml": "",
    });
    const profile = await profileProject(root, storage);
    expect(profile.project.agents).toEqual(["codex", "copilot", "gemini"]);
    const agentsMd = profile.evidence.find((e) => e.file === "AGENTS.md");
    expect(agentsMd?.certainty).toBe("probable");
    expect(agentsMd?.detail).toContain("generated by MAP");
  });

  it("detects Python, Rust, Go, Java, PHP, Django, NestJS, Angular, Express, Jest, Prettier", async () => {
    const root = await project({
      "py/requirements.txt": "Django==5\nredis\n",
      "py/manage.py": "",
      "rs/Cargo.toml": "[workspace]\nmembers = []\n",
      "go/go.mod": "module x",
      "jv/pom.xml": "<project/>",
      "ph/composer.json": JSON.stringify({ require: { "roots/wordpress": "^6" } }),
      "nest/package.json": pkg({ "@nestjs/core": "10", express: "4" }, { jest: "29", prettier: "3" }),
      "nest/nest-cli.json": "{}",
      "ng/angular.json": "{}",
      "ng/package.json": pkg({ "@angular/core": "19" }),
    });
    const profile = await profileProject(root, storage);
    expect(profile.project.languages).toEqual(["javascript", "python", "rust", "go", "java", "php"]);
    expect(profile.project.frameworks).toEqual(["angular", "express", "nestjs", "django", "wordpress"]);
    expect(profile.project.tooling).toEqual(expect.arrayContaining(["jest", "prettier", "cargo", "monorepo"]));
    expect(profile.probable.infrastructure).toEqual(["redis"]);
  });

  it("never follows symlinked directories", async () => {
    const outside = await project({ "package.json": pkg({ next: "15" }) });
    const root = await project({ "README.md": "x" });
    await symlink(outside, join(root, "linked"));
    const profile = await profileProject(root, storage);
    expect(profile.project.frameworks).toEqual([]);
  });

  it("is deterministic for identical inputs", async () => {
    const root = await project({ "package.json": pkg({ react: "19" }), "tsconfig.json": "{}" });
    expect(await profileProject(root, storage)).toEqual(await profileProject(root, storage));
  });
});

describe("detectProject (init facts)", () => {
  it("uses only root-level confirmed languages", async () => {
    const root = await project({ "tsconfig.json": "{}", "sub/go.mod": "module x" });
    expect((await detectProject(root, storage)).languages).toEqual(["typescript"]);
  });
});
