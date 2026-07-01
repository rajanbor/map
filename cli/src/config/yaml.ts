/**
 * Minimal YAML serializer for plain data (objects, arrays, and scalars).
 *
 * We hand-roll this to keep the CLI dependency-free for `map init`. It covers exactly
 * what our config and manifest need: nested maps, string arrays, and string/number/
 * boolean scalars. It is intentionally not a general-purpose YAML library.
 *
 * TODO: when a YAML *parser* is needed (reading config back), adopt a small
 * dependency rather than growing this by hand.
 */

/** The shape of values this serializer understands (for documentation). */
export type YamlValue =
  | string
  | number
  | boolean
  | readonly YamlValue[]
  | { readonly [key: string]: YamlValue };

export function stringifyYaml(value: unknown): string {
  return renderNode(value, 0).trimStart() + "\n";
}

function renderNode(value: unknown, indent: number): string {
  if (Array.isArray(value)) return renderArray(value, indent);
  if (isRecord(value)) return renderObject(value, indent);
  return " " + renderScalar(value);
}

function renderObject(obj: Record<string, unknown>, indent: number): string {
  const pad = "  ".repeat(indent);
  const entries = Object.entries(obj);
  if (entries.length === 0) return " {}";

  const lines = entries.map(([key, val]) => {
    if (isRecord(val)) {
      if (Object.keys(val).length === 0) return `${pad}${key}: {}`;
      return `${pad}${key}:\n${renderObject(val, indent + 1)}`;
    }
    if (Array.isArray(val)) {
      if (val.length === 0) return `${pad}${key}: []`;
      return `${pad}${key}:\n${renderArray(val, indent + 1)}`;
    }
    return `${pad}${key}: ${renderScalar(val)}`;
  });
  return lines.join("\n");
}

function renderArray(arr: readonly unknown[], indent: number): string {
  const pad = "  ".repeat(indent);
  const lines = arr.map((item) => {
    if (isRecord(item)) {
      const rendered = renderObject(item, indent + 1).trimStart();
      return `${pad}- ${rendered}`;
    }
    return `${pad}- ${renderScalar(item)}`;
  });
  return lines.join("\n");
}

function renderScalar(value: unknown): string {
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return needsQuoting(text) ? JSON.stringify(text) : text;
}

function needsQuoting(value: string): boolean {
  if (value === "") return true;
  if (value !== value.trim()) return true;
  return /[:#{}\[\],&*?|<>=!%@`"']/.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
