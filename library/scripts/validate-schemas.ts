#!/usr/bin/env node
/** Validate MAP schema fixtures and repository manifests without network access. */

import { readFile, readdir } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parseYaml } from "../../tooling/packages/cli/src/compiler/yaml-parse.ts";

type JsonSchema = boolean | Record<string, unknown>;

const WORKSPACE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const SCHEMA_ROOT = join(WORKSPACE_ROOT, "library/schemas");
const DRAFT = "https://json-schema.org/draft/2020-12/schema";

interface Contract {
  readonly name: string;
  readonly schema: string;
  readonly fixtures: string;
}

const CONTRACTS: readonly Contract[] = [
  { name: "document", schema: "document.schema.json", fixtures: "document" },
  { name: "project", schema: "project.schema.json", fixtures: "project" },
  { name: "decision", schema: "decision.schema.json", fixtures: "decision" },
  { name: "pattern", schema: "pattern.schema.json", fixtures: "pattern" },
  { name: "scan-result", schema: "scan-result.schema.json", fixtures: "scan-result" },
  { name: "recommendation-result", schema: "recommendation-result.schema.json", fixtures: "recommendation-result" },
];

const failures: string[] = [];
const schemaRegistry = new Map<string, JsonSchema>();

for (const contract of CONTRACTS) {
  const schema = await readJson(join(SCHEMA_ROOT, contract.schema)) as Record<string, unknown>;
  schemaRegistry.set(contract.schema, schema);
  if (typeof schema.$id === "string") schemaRegistry.set(schema.$id, schema);
}

for (const contract of CONTRACTS) {
  const schemaPath = join(SCHEMA_ROOT, contract.schema);
  const schema = schemaRegistry.get(contract.schema) as Record<string, unknown>;
  if (schema.$schema !== DRAFT) {
    failures.push(`${display(schemaPath)}: $schema must be ${DRAFT}`);
    continue;
  }

  const fixtureRoot = join(SCHEMA_ROOT, "fixtures", contract.fixtures);
  const validPaths = await jsonFiles(join(fixtureRoot, "valid"));
  const invalidPaths = await jsonFiles(join(fixtureRoot, "invalid"));
  if (validPaths.length === 0 || invalidPaths.length < 3) {
    failures.push(`${display(fixtureRoot)}: requires valid and at least three invalid fixtures`);
  }

  for (const fixturePath of validPaths) {
    const errors = validate(await readJson(fixturePath), schema, schema);
    if (errors.length > 0) {
      failures.push(`${display(fixturePath)}: expected valid; ${withRemediation(errors[0]!)}`);
    }
  }
  for (const fixturePath of invalidPaths) {
    const errors = validate(await readJson(fixturePath), schema, schema);
    if (errors.length === 0) {
      failures.push(`${display(fixturePath)}: expected invalid; add a failing field`);
    }
  }
}

const projectSchema = await readJson(join(SCHEMA_ROOT, "project.schema.json")) as Record<string, unknown>;
for (const [name, value] of [
  [".map/map.config.json", await readJson(join(WORKSPACE_ROOT, ".map/map.config.json"))],
  ["tooling/packages/cli/templates/workspace/map.config.json", await renderedInitConfig()],
] as const) {
  const errors = validate(value, projectSchema, projectSchema);
  if (errors.length > 0) failures.push(`${name}: ${withRemediation(errors[0]!)}`);
}

await validateDecisionDocuments();
await validatePatternDocuments();

if (failures.length > 0) {
  failures.forEach((failure) => process.stderr.write(`error: ${failure}\n`));
  process.stderr.write(`schema validation failed with ${failures.length} error(s).\n`);
  process.exit(1);
}

process.stdout.write(`schemas OK: ${CONTRACTS.length} contracts, repository and init manifests valid.\n`);

function validate(
  value: unknown,
  schema: JsonSchema,
  root: Record<string, unknown>,
  path = "$",
): string[] {
  if (schema === true) return [];
  if (schema === false) return [`${path} is not allowed`];

  const reference = schema.$ref;
  if (typeof reference === "string") {
    return validate(value, resolveReference(reference, root), root, path);
  }

  const errors: string[] = [];
  if (Array.isArray(schema.allOf)) {
    schema.allOf.forEach((candidate) => errors.push(...validate(value, candidate as JsonSchema, root, path)));
  }
  if (schema.if !== undefined) {
    const conditionMatches = validate(value, schema.if as JsonSchema, root, path).length === 0;
    const branch = conditionMatches ? schema.then : schema.else;
    if (branch !== undefined) errors.push(...validate(value, branch as JsonSchema, root, path));
  }
  for (const keyword of ["anyOf", "oneOf"] as const) {
    const candidates = schema[keyword];
    if (!Array.isArray(candidates)) continue;
    const matches = candidates.filter(
      (candidate) => validate(value, candidate as JsonSchema, root, path).length === 0,
    ).length;
    if ((keyword === "anyOf" && matches === 0) || (keyword === "oneOf" && matches !== 1)) {
      errors.push(`${path} must match ${keyword === "anyOf" ? "at least" : "exactly"} one allowed shape`);
    }
  }

  if (schema.const !== undefined && !deepEqual(value, schema.const)) {
    errors.push(`${path} must equal ${JSON.stringify(schema.const)}`);
  }
  if (Array.isArray(schema.enum) && !schema.enum.some((item) => deepEqual(value, item))) {
    errors.push(`${path} must be one of ${schema.enum.map(String).join(", ")}`);
  }

  const expectedType = schema.type;
  if (typeof expectedType === "string" && !matchesType(value, expectedType)) {
    errors.push(`${path} must be ${expectedType}`);
    return errors;
  }

  if (typeof value === "string") validateString(value, schema, path, errors);
  if (typeof value === "number") validateNumber(value, schema, path, errors);
  if (Array.isArray(value)) validateArray(value, schema, root, path, errors);
  if (isRecord(value)) validateObject(value, schema, root, path, errors);
  return errors;
}

function validateString(
  value: string,
  schema: Record<string, unknown>,
  path: string,
  errors: string[],
): void {
  if (typeof schema.minLength === "number" && value.length < schema.minLength) {
    errors.push(`${path} must contain at least ${schema.minLength} character(s)`);
  }
  if (typeof schema.pattern === "string" && !new RegExp(schema.pattern, "u").test(value)) {
    errors.push(`${path} must match ${schema.pattern}`);
  }
  if (schema.format === "date-time" && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value)) {
    errors.push(`${path} must be an RFC 3339 UTC timestamp`);
  }
}

function validateNumber(
  value: number,
  schema: Record<string, unknown>,
  path: string,
  errors: string[],
): void {
  if (typeof schema.minimum === "number" && value < schema.minimum) {
    errors.push(`${path} must be >= ${schema.minimum}`);
  }
  if (typeof schema.maximum === "number" && value > schema.maximum) {
    errors.push(`${path} must be <= ${schema.maximum}`);
  }
}

function validateArray(
  value: unknown[],
  schema: Record<string, unknown>,
  root: Record<string, unknown>,
  path: string,
  errors: string[],
): void {
  if (typeof schema.minItems === "number" && value.length < schema.minItems) {
    errors.push(`${path} must contain at least ${schema.minItems} item(s)`);
  }
  if (schema.uniqueItems === true && new Set(value.map((item) => JSON.stringify(item))).size !== value.length) {
    errors.push(`${path} must contain unique items`);
  }
  if (schema.items !== undefined) {
    value.forEach((item, index) => {
      errors.push(...validate(item, schema.items as JsonSchema, root, `${path}[${index}]`));
    });
  }
}

function validateObject(
  value: Record<string, unknown>,
  schema: Record<string, unknown>,
  root: Record<string, unknown>,
  path: string,
  errors: string[],
): void {
  if (typeof schema.minProperties === "number" && Object.keys(value).length < schema.minProperties) {
    errors.push(`${path} must contain at least ${schema.minProperties} field(s)`);
  }

  const required = Array.isArray(schema.required) ? schema.required : [];
  required.forEach((key) => {
    if (typeof key === "string" && !(key in value)) errors.push(`${path}.${key} is required`);
  });

  const properties = isRecord(schema.properties) ? schema.properties : {};
  const patterns = isRecord(schema.patternProperties) ? schema.patternProperties : {};
  for (const [key, item] of Object.entries(value)) {
    if (key in properties) {
      errors.push(...validate(item, properties[key] as JsonSchema, root, `${path}.${key}`));
      continue;
    }
    const matching = Object.entries(patterns).filter(([pattern]) => new RegExp(pattern, "u").test(key));
    if (matching.length > 0) {
      matching.forEach(([, candidate]) => {
        errors.push(...validate(item, candidate as JsonSchema, root, `${path}.${key}`));
      });
      continue;
    }
    if (schema.additionalProperties === false) errors.push(`${path}.${key} is not allowed`);
  }
}

function resolveReference(reference: string, root: Record<string, unknown>): JsonSchema {
  const [resource, fragment = ""] = reference.split("#", 2);
  let current: unknown = resource === "" ? root : schemaRegistry.get(resource!);
  if (current === undefined) throw new Error(`unresolved schema resource: ${resource}`);
  if (fragment === "") return current as JsonSchema;
  if (!fragment.startsWith("/")) throw new Error(`unsupported schema reference: ${reference}`);
  for (const encoded of fragment.slice(1).split("/")) {
    const key = encoded.replace(/~1/g, "/").replace(/~0/g, "~");
    if (!isRecord(current) || !(key in current)) throw new Error(`unresolved schema reference: ${reference}`);
    current = current[key];
  }
  if (typeof current !== "boolean" && !isRecord(current)) {
    throw new Error(`schema reference is not a schema: ${reference}`);
  }
  return current;
}

async function validateDecisionDocuments(): Promise<void> {
  const directory = join(WORKSPACE_ROOT, ".map/decisions");
  const paths = (await readdir(directory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && /^\d{4}-.+\.md$/.test(entry.name))
    .map((entry) => join(directory, entry.name))
    .sort();
  const schema = schemaRegistry.get("decision.schema.json") as Record<string, unknown>;
  const ids = new Set<string>();
  const documents: Array<{ path: string; metadata: Record<string, unknown> }> = [];

  for (const path of paths) {
    const source = await readFile(path, "utf8");
    const match = /^---\n([\s\S]*?)\n---\n/.exec(source);
    if (match === null) {
      failures.push(`${display(path)}: typed decision requires YAML frontmatter`);
      continue;
    }
    const parsed = parseYaml(match[1]!);
    if (!isRecord(parsed)) {
      failures.push(`${display(path)}: frontmatter must be a mapping`);
      continue;
    }
    const errors = validate(parsed, schema, schema);
    if (errors.length > 0) failures.push(`${display(path)}: ${withRemediation(errors[0]!)}`);
    if (typeof parsed.id === "string") ids.add(parsed.id);
    documents.push({ path, metadata: parsed });

    if (parsed.status === "accepted") {
      for (const heading of ["Context", "Decision", "Consequences", "Verification"]) {
        if (!hasNonEmptySection(source, heading)) {
          failures.push(`${display(path)}: accepted decision requires a non-empty '${heading}' section`);
        }
      }
    }
  }

  for (const document of documents) {
    const references = [
      ...(Array.isArray(document.metadata.supersedes) ? document.metadata.supersedes : []),
      ...(typeof document.metadata.supersededBy === "string" ? [document.metadata.supersededBy] : []),
    ];
    references.forEach((reference) => {
      if (typeof reference === "string" && !ids.has(reference)) {
        failures.push(`${display(document.path)}: decision reference '${reference}' does not exist`);
      }
    });
  }
}

async function validatePatternDocuments(): Promise<void> {
  const patternsRoot = join(WORKSPACE_ROOT, "library/patterns");
  const categoryEntries = await readdir(patternsRoot, { withFileTypes: true });
  const schema = schemaRegistry.get("pattern.schema.json") as Record<string, unknown>;
  const ids = new Set<string>();
  const records: Array<{ path: string; metadata: Record<string, unknown> }> = [];

  for (const categoryEntry of categoryEntries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!categoryEntry.isDirectory() || categoryEntry.name.startsWith("_")) continue;
    const categoryRoot = join(patternsRoot, categoryEntry.name);
    const patternEntries = await readdir(categoryRoot, { withFileTypes: true });
    for (const patternEntry of patternEntries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (!patternEntry.isDirectory() || patternEntry.name.startsWith("_")) continue;
      const patternRoot = join(categoryRoot, patternEntry.name);
      const path = join(patternRoot, "pattern.yaml");
      try {
        const parsed = parseYaml(await readFile(path, "utf8"));
        if (!isRecord(parsed)) {
          failures.push(`${display(path)}: pattern metadata must be a mapping`);
          continue;
        }
        const errors = validate(parsed, schema, schema);
        if (errors.length > 0) failures.push(`${display(path)}: ${withRemediation(errors[0]!)}`);

        const expectedId = `${categoryEntry.name}/${patternEntry.name}`;
        if (parsed.id !== expectedId) failures.push(`${display(path)}: $.id must equal directory id '${expectedId}'`);
        if (parsed.category !== categoryEntry.name) {
          failures.push(`${display(path)}: $.category must equal directory category '${categoryEntry.name}'`);
        }
        if (parsed.slug !== undefined && parsed.slug !== patternEntry.name) {
          failures.push(`${display(path)}: $.slug must equal directory slug '${patternEntry.name}'`);
        }
        if (typeof parsed.id === "string") {
          if (ids.has(parsed.id)) failures.push(`${display(path)}: duplicate pattern id '${parsed.id}'`);
          ids.add(parsed.id);
        }
        for (const requiredFile of ["README.md", "prompt.md", "acceptance.md", "diagram.mmd"]) {
          try {
            await readFile(join(patternRoot, requiredFile), "utf8");
          } catch {
            failures.push(`${display(patternRoot)}: published pattern requires ${requiredFile}`);
          }
        }
        records.push({ path, metadata: parsed });
      } catch (error) {
        failures.push(`${display(path)}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  const catalogIds = new Set<string>();
  // The bundled snapshot is tracked, unlike the generated library/dist artifact, and
  // contains the complete roadmap catalog needed for referential validation in CI.
  const registry = await readJson(
    join(WORKSPACE_ROOT, "tooling/packages/cli/registry-snapshot/registry.json"),
  );
  if (isRecord(registry) && Array.isArray(registry.patterns)) {
    for (const entry of registry.patterns.filter(isRecord)) {
      if (typeof entry.id === "string") catalogIds.add(entry.id);
    }
  }
  for (const record of records) {
    for (const target of relationTargets(record.metadata)) {
      if (!catalogIds.has(target) && !ids.has(target)) {
        failures.push(`${display(record.path)}: relationship target '${target}' does not exist in the catalog`);
      }
    }
  }
}

function relationTargets(metadata: Record<string, unknown>): string[] {
  const legacy = Array.isArray(metadata.related)
    ? metadata.related.filter((value): value is string => typeof value === "string")
    : [];
  const typed = Array.isArray(metadata.relations)
    ? metadata.relations
        .filter(isRecord)
        .map((relation) => relation.target)
        .filter((value): value is string => typeof value === "string")
    : [];
  return [...legacy, ...typed];
}

function hasNonEmptySection(source: string, heading: string): boolean {
  const match = new RegExp(`^## ${heading}\\s*$\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, "mu").exec(source);
  return match !== null && match[1]!.trim().length > 0;
}

function matchesType(value: unknown, type: string): boolean {
  if (type === "object") return isRecord(value);
  if (type === "array") return Array.isArray(value);
  if (type === "integer") return typeof value === "number" && Number.isInteger(value);
  if (type === "number") return typeof value === "number" && Number.isFinite(value);
  if (type === "null") return value === null;
  return typeof value === type;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8"));
}

async function jsonFiles(path: string): Promise<string[]> {
  return (await readdir(path, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => join(path, entry.name))
    .sort();
}

async function renderedInitConfig(): Promise<unknown> {
  const path = join(WORKSPACE_ROOT, "tooling/packages/cli/templates/workspace/map.config.json");
  const values: Readonly<Record<string, unknown>> = {
    schemaVersion: 3,
    projectName: "schema-fixture",
    createdAt: "2026-09-13T08:00:00.000Z",
    languages: ["typescript"],
    analyzers: ["typescript"],
    include: ["src/**"],
    exclude: ["**/node_modules/**"],
  };
  let source = await readFile(path, "utf8");
  for (const [key, value] of Object.entries(values)) {
    source = source.replaceAll(`{{${key}}}`, JSON.stringify(value));
  }
  return JSON.parse(source);
}

function display(path: string): string {
  return relative(WORKSPACE_ROOT, path);
}

function withRemediation(error: string): string {
  return `${error}; update that field to match the linked schema guide or prefix experimental metadata with 'x-'`;
}
