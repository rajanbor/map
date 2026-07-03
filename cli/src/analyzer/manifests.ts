/**
 * Manifest parsers: extract declared dependency names from the manifest formats the
 * dependency analyzer understands. Pure functions — no I/O — so each format is
 * testable in isolation. Parsers are lenient by design: a malformed manifest yields
 * an empty list, never an error, because analysis must not fail on unknown input.
 *
 * The pyproject.toml parser is deliberately a heuristic (no TOML dependency): it
 * collects quoted requirement strings and poetry-style table keys. Over-collection is
 * harmless because names are only ever matched against the known-signal table.
 */

/** Dependency names from package.json (dependencies, devDependencies, peerDependencies). */
export function parsePackageJson(contents: string): readonly string[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch {
    return [];
  }
  if (typeof parsed !== "object" || parsed === null) return [];
  const record = parsed as Record<string, unknown>;
  const names: string[] = [];
  for (const section of ["dependencies", "devDependencies", "peerDependencies"]) {
    const deps = record[section];
    if (typeof deps === "object" && deps !== null) {
      names.push(...Object.keys(deps));
    }
  }
  return [...new Set(names)];
}

/** Dependency names from requirements.txt (one requirement per line). */
export function parseRequirementsTxt(contents: string): readonly string[] {
  const names: string[] = [];
  for (const rawLine of contents.split("\n")) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#") || line.startsWith("-")) continue;
    const name = requirementName(line);
    if (name !== "") names.push(name);
  }
  return [...new Set(names)];
}

/**
 * Dependency names from pyproject.toml. Heuristic: quoted strings that look like
 * requirements (PEP 508 `dependencies = [...]` arrays) plus bare `name = "version"`
 * keys from poetry dependency tables.
 */
export function parsePyprojectToml(contents: string): readonly string[] {
  const names: string[] = [];
  let inDependencyArray = false;
  let inDependencyTable = false;

  for (const rawLine of contents.split("\n")) {
    const line = rawLine.trim();

    if (line.startsWith("[")) {
      inDependencyTable = /^\[.*dependencies.*\]$/.test(line);
      inDependencyArray = false;
      continue;
    }

    // `dependencies = [...]` arrays, plus group arrays inside tables such as
    // `[project.optional-dependencies]` (e.g. `dev = ["ragas>=0.1"]`).
    const opensArray =
      /(^|\.)dependencies\s*=\s*\[/.test(line) ||
      (inDependencyTable && /=\s*\[/.test(line));
    if (opensArray || inDependencyArray) {
      for (const match of line.matchAll(/"([^"\n]+)"|'([^'\n]+)'/g)) {
        const name = requirementName(match[1] ?? match[2] ?? "");
        if (name !== "") names.push(name);
      }
      inDependencyArray = !line.includes("]");
      continue;
    }

    if (!inDependencyTable) continue;
    const key = line.match(/^([A-Za-z0-9._-]+)\s*=/)?.[1];
    if (key !== undefined && key !== "python") names.push(normalizePythonName(key));
  }

  return [...new Set(names)];
}

/** Module paths from go.mod require directives (block and single-line forms). */
export function parseGoMod(contents: string): readonly string[] {
  const names: string[] = [];
  let inRequireBlock = false;
  for (const rawLine of contents.split("\n")) {
    const line = rawLine.trim();
    if (line.startsWith("require (")) {
      inRequireBlock = true;
      continue;
    }
    if (inRequireBlock && line.startsWith(")")) {
      inRequireBlock = false;
      continue;
    }
    const requireLine = line.startsWith("require ") ? line.slice("require ".length) : line;
    if (!inRequireBlock && requireLine === line) continue;
    const path = requireLine.split(/\s+/)[0];
    if (path !== undefined && path.includes("/")) names.push(path);
  }
  return [...new Set(names)];
}

/** Crate names from Cargo.toml dependency tables. */
export function parseCargoToml(contents: string): readonly string[] {
  const names: string[] = [];
  let inDependencyTable = false;
  for (const rawLine of contents.split("\n")) {
    const line = rawLine.trim();
    if (line.startsWith("[")) {
      inDependencyTable = /^\[(.+\.)?(dev-|build-)?dependencies(\..+)?\]$/.test(line);
      // `[dependencies.serde]` names the crate in the header itself.
      const inline = line.match(/^\[(?:.+\.)?dependencies\.([A-Za-z0-9_-]+)\]$/);
      if (inline?.[1] !== undefined) names.push(inline[1]);
      continue;
    }
    if (!inDependencyTable) continue;
    const key = line.match(/^([A-Za-z0-9_-]+)\s*=/)?.[1];
    if (key !== undefined) names.push(key);
  }
  return [...new Set(names)];
}

/**
 * The distribution name of a PEP 508 requirement line, normalized to lowercase with
 * hyphens (PyPI treats `_`, `-`, and `.` as equivalent). Returns "" for strings that
 * do not start like a package name.
 */
function requirementName(requirement: string): string {
  const match = requirement.match(/^\s*([A-Za-z0-9][A-Za-z0-9._-]*)/);
  if (!match) return "";
  return normalizePythonName(match[1] ?? "");
}

function normalizePythonName(name: string): string {
  return name.toLowerCase().replace(/[._]/g, "-");
}
