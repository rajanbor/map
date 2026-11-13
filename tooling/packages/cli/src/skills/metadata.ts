/**
 * Agent Skills metadata: parse and validate the YAML frontmatter of a `SKILL.md`.
 *
 * MAP follows the published Agent Skills format instead of defining its own:
 *   name           required, 1–64 chars, lowercase letters/digits/hyphens, no leading,
 *                  trailing, or doubled hyphen, equal to the skill directory name;
 *   description    required, 1–1024 chars;
 *   license        optional string;
 *   compatibility  optional string, at most 500 chars;
 *   metadata       optional string→string map (MAP reads `version` and `category`);
 *   allowed-tools  optional, experimental space-separated tool list.
 *
 * Unknown top-level keys are reported as warnings, not errors, so newer skills still
 * list. Only the frontmatter is parsed; the instruction body is never interpreted.
 */

import { parseYaml } from "../compiler/yaml-parse.ts";
import type { YamlNode } from "../compiler/yaml-parse.ts";

export interface SkillMetadata {
  readonly name: string;
  readonly description: string;
  readonly license?: string;
  readonly compatibility?: string;
  readonly allowedTools?: string;
  readonly metadata: Readonly<Record<string, string>>;
}

export interface MetadataResult {
  readonly metadata?: SkillMetadata;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

const NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const KNOWN_KEYS = new Set(["name", "description", "license", "compatibility", "metadata", "allowed-tools"]);

/** Parse `SKILL.md` text. `directoryName` is the folder that contains it. */
export function parseSkillMetadata(text: string, directoryName: string): MetadataResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const source = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  const fence = /^---\n([\s\S]*?)\n---(?:\n|$)/.exec(source);
  if (fence === null) {
    return { errors: ["SKILL.md must start with YAML frontmatter between '---' lines"], warnings };
  }

  let data: YamlNode;
  try {
    data = parseYaml(fence[1]!);
  } catch (error) {
    return { errors: [`frontmatter is not valid YAML: ${message(error)}`], warnings };
  }
  if (!isRecord(data)) return { errors: ["frontmatter must be a YAML mapping"], warnings };

  for (const key of Object.keys(data)) {
    if (!KNOWN_KEYS.has(key)) warnings.push(`unknown frontmatter field '${key}'`);
  }

  const name = scalar(data["name"]);
  if (name === undefined || name === "") errors.push("'name' is required");
  else {
    if (name.length > 64) errors.push("'name' must be at most 64 characters");
    if (!NAME.test(name)) errors.push("'name' must use lowercase letters, digits, and single hyphens");
    if (name !== directoryName) errors.push(`'name' (${name}) must equal the directory name (${directoryName})`);
  }

  const description = scalar(data["description"]);
  if (description === undefined || description.trim() === "") errors.push("'description' is required");
  else if (description.length > 1024) errors.push("'description' must be at most 1024 characters");

  const optional = (key: string, max?: number): string | undefined => {
    const value = data[key];
    if (value === undefined || value === null) return undefined;
    const text = scalar(value);
    if (text === undefined) {
      errors.push(`'${key}' must be a string`);
      return undefined;
    }
    if (max !== undefined && text.length > max) errors.push(`'${key}' must be at most ${max} characters`);
    return text;
  };
  const license = optional("license");
  const compatibility = optional("compatibility", 500);
  const allowedTools = optional("allowed-tools");

  const metadata: Record<string, string> = {};
  const rawMetadata = data["metadata"];
  if (rawMetadata !== undefined && rawMetadata !== null) {
    if (!isRecord(rawMetadata)) errors.push("'metadata' must be a mapping of strings");
    else {
      for (const [key, value] of Object.entries(rawMetadata)) {
        const text = scalar(value);
        if (text === undefined) errors.push(`'metadata.${key}' must be a string`);
        else metadata[key] = text;
      }
    }
  }

  if (errors.length > 0 || name === undefined || description === undefined) return { errors, warnings };
  return {
    metadata: {
      name,
      description: description.trim(),
      ...(license !== undefined ? { license } : {}),
      ...(compatibility !== undefined ? { compatibility } : {}),
      ...(allowedTools !== undefined ? { allowedTools } : {}),
      metadata,
    },
    errors,
    warnings,
  };
}

/** First sentence of a description, for compact listings. */
export function purposeOf(description: string): string {
  const sentence = /^(.+?[.!?])(?:\s|$)/.exec(description)?.[1] ?? description;
  return sentence.length > 160 ? `${sentence.slice(0, 157)}…` : sentence;
}

function scalar(value: YamlNode | undefined): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return undefined;
}

function isRecord(value: YamlNode | undefined): value is { [key: string]: YamlNode } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
