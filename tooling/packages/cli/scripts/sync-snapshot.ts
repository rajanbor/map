#!/usr/bin/env node
/**
 * Refreshes registry-snapshot/registry.json — the offline registry bundled
 * with the published package. Run before a release.
 *
 * Sources:
 *   - MAP_REPO=<path to a local map checkout>: builds the registry from source
 *     (node $MAP_REPO/scripts/build-registry.ts), useful while developing.
 *   - otherwise: downloads the latest published registry from the map
 *     repository's releases.
 */

import { execFileSync } from "node:child_process";
import { writeFile, readFile, mkdtemp, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const packageDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const snapshotPath = join(packageDir, "registry-snapshot", "registry.json");
const DEFAULT_REGISTRY_URL =
  "https://github.com/rajanbor/map/releases/latest/download/registry.json";

const mapRepo = process.env["MAP_REPO"];
const check = process.argv.includes("--check");
let generatedPath = snapshotPath;
let temporaryDirectory: string | undefined;

if (mapRepo !== undefined && mapRepo !== "") {
  const libraryRoot = existsSync(join(mapRepo, "library", "scripts", "build-registry.ts"))
    ? join(mapRepo, "library")
    : mapRepo;
  if (check) {
    temporaryDirectory = await mkdtemp(join(tmpdir(), "map-registry-check-"));
    generatedPath = join(temporaryDirectory, "registry.json");
  }
  execFileSync(
    "node",
    [join(libraryRoot, "scripts", "build-registry.ts"), "--out", generatedPath],
    { stdio: "inherit" },
  );
} else {
  const url = process.env["MAP_REGISTRY"]?.startsWith("http")
    ? process.env["MAP_REGISTRY"]
    : DEFAULT_REGISTRY_URL;
  process.stdout.write(`fetching ${url}\n`);
  const response = await fetch(url);
  if (!response.ok) {
    process.stderr.write(`download failed: HTTP ${response.status}\n`);
    process.exit(1);
  }
  const body = await response.text();
  JSON.parse(body); // fail fast on a corrupt download
  if (check) {
    generatedPath = snapshotPath;
  } else {
    await writeFile(snapshotPath, body);
  }
}

if (check) {
  const expected = normalized(JSON.parse(await readFile(generatedPath, "utf8")));
  const actual = normalized(JSON.parse(await readFile(snapshotPath, "utf8")));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    process.stderr.write("snapshot is stale; run with MAP_REPO=<repo-root> without --check\n");
    if (temporaryDirectory !== undefined) await rm(temporaryDirectory, { recursive: true, force: true });
    process.exit(1);
  }
}

const { patterns } = JSON.parse(await readFile(snapshotPath, "utf8")) as {
  patterns: unknown[];
};
process.stdout.write(`snapshot ${check ? "current" : "updated"}: ${patterns.length} patterns.\n`);
if (temporaryDirectory !== undefined) await rm(temporaryDirectory, { recursive: true, force: true });

function normalized(value: Record<string, unknown>): Record<string, unknown> {
  const { generatedAt: _generatedAt, ...rest } = value;
  return rest;
}
