/**
 * Pins the registry source for the whole suite: tests must not depend on the
 * developer's user cache (~/.map/registry.json) or the network, so they always
 * read the snapshot bundled with the package.
 */

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env["MAP_REGISTRY"] = join(
  import.meta.dirname,
  "..",
  "registry-snapshot",
  "registry.json",
);

// Skill sources: never touch the network or the developer's ~/.map cache.
process.env["MAP_OFFLINE"] = "1";
process.env["MAP_HOME"] = mkdtempSync(join(tmpdir(), "map-home-"));
