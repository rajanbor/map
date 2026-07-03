/**
 * Minimal reader for the top-level scalar fields of `patterns/<cat>/<slug>/pattern.yaml`.
 *
 * The CLI is dependency-free, so this is not a YAML parser. It reads exactly what
 * the catalog needs from the pattern contract — flat `key: value` scalars and
 * folded (`key: >`) blocks — and ignores lists and nested maps. If pattern.yaml
 * ever grows beyond that shape for these fields, replace this with a real parser.
 */

export interface PatternYamlHeader {
  readonly id?: string;
  readonly name?: string;
  readonly category?: string;
  readonly maturity?: string;
  readonly summary?: string;
}

const SCALAR_KEYS = ["id", "name", "category", "maturity", "summary"] as const;

export function parsePatternYamlHeader(text: string): PatternYamlHeader {
  const result: Record<string, string> = {};
  const lines = text.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i]!.match(/^([a-z_]+):\s*(.*?)\s*$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (!(SCALAR_KEYS as readonly string[]).includes(key!)) continue;

    if (rawValue === ">" || rawValue === ">-" || rawValue === "") {
      // Folded block: join the following more-indented lines with spaces.
      const block: string[] = [];
      while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1]!)) {
        block.push(lines[i + 1]!.trim());
        i++;
      }
      if (block.length > 0) result[key!] = block.join(" ");
    } else {
      result[key!] = unquote(rawValue!);
    }
  }
  return result;
}

function unquote(value: string): string {
  const quoted = value.match(/^"(.*)"$|^'(.*)'$/);
  return quoted ? (quoted[1] ?? quoted[2] ?? "") : value;
}
