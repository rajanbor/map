/**
 * Minimal indentation-based YAML *parser* for the compiler.
 *
 * The repo ships a dependency-free YAML serializer (config/yaml.ts); this is its
 * read-side counterpart. It covers exactly what MAP needs to read back: nested
 * maps, block sequences (of scalars or maps), scalar values, and the folded/literal
 * block strings used by MAP metadata. It is deliberately not a general-purpose YAML
 * implementation — no anchors, complex keys, or tags.
 */

export type YamlNode =
  | string
  | number
  | boolean
  | null
  | YamlNode[]
  | { [key: string]: YamlNode };

interface Line {
  readonly indent: number;
  readonly text: string;
}

export function parseYaml(source: string): YamlNode {
  const lines = tokenize(source);
  if (lines.length === 0) return {};
  const [node] = parseBlock(lines, 0, lines[0]!.indent);
  return node;
}

function tokenize(source: string): Line[] {
  const out: Line[] = [];
  for (const raw of source.split("\n")) {
    const withoutComment = stripComment(raw);
    if (withoutComment.trim() === "") continue;
    const indent = withoutComment.length - withoutComment.trimStart().length;
    out.push({ indent, text: withoutComment.trim() });
  }
  return out;
}

/** Strip a whole-line `#` comment or a trailing ` # ...` comment (outside quotes). */
function stripComment(line: string): string {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (ch === "#" && !inSingle && !inDouble && (i === 0 || line[i - 1] === " ")) {
      return line.slice(0, i);
    }
  }
  return line;
}

/** Parse the block of lines starting at `start` whose indent is `indent`. */
function parseBlock(lines: Line[], start: number, indent: number): [YamlNode, number] {
  if (lines[start]!.text.startsWith("- ") || lines[start]!.text === "-") {
    return parseSequence(lines, start, indent);
  }
  return parseMapping(lines, start, indent);
}

function parseMapping(lines: Line[], start: number, indent: number): [YamlNode, number] {
  const obj: { [key: string]: YamlNode } = {};
  let i = start;
  while (i < lines.length && lines[i]!.indent === indent) {
    const line = lines[i]!;
    const colon = findColon(line.text);
    if (colon === -1) break;
    const key = unquote(line.text.slice(0, colon).trim());
    const rest = line.text.slice(colon + 1).trim();
    i += 1;
    if ([">", ">-", "|", "|-"].includes(rest)) {
      const block: string[] = [];
      while (i < lines.length && lines[i]!.indent > indent) {
        block.push(lines[i]!.text);
        i += 1;
      }
      const folded = rest.startsWith(">");
      const keepTrailingNewline = !rest.endsWith("-");
      obj[key] = block.join(folded ? " " : "\n") + (keepTrailingNewline ? "\n" : "");
    } else if (rest !== "") {
      obj[key] = parseScalar(rest);
    } else if (i < lines.length && lines[i]!.indent > indent) {
      const [child, next] = parseBlock(lines, i, lines[i]!.indent);
      obj[key] = child;
      i = next;
    } else {
      obj[key] = null;
    }
  }
  return [obj, i];
}

function parseSequence(lines: Line[], start: number, indent: number): [YamlNode, number] {
  const arr: YamlNode[] = [];
  let i = start;
  while (i < lines.length && lines[i]!.indent === indent && lines[i]!.text.startsWith("-")) {
    const item = lines[i]!.text.slice(1).trim();
    i += 1;
    if (item === "") {
      // Nested block belonging to this item.
      if (i < lines.length && lines[i]!.indent > indent) {
        const [child, next] = parseBlock(lines, i, lines[i]!.indent);
        arr.push(child);
        i = next;
      } else {
        arr.push(null);
      }
    } else if (findColon(item) !== -1) {
      // Inline `- key: value` starts a mapping; re-parse as a virtual block.
      const virtualIndent = indent + 2;
      const block: Line[] = [{ indent: virtualIndent, text: item }];
      while (i < lines.length && lines[i]!.indent > indent) {
        block.push({ indent: lines[i]!.indent, text: lines[i]!.text });
        i += 1;
      }
      const [child] = parseMapping(block, 0, virtualIndent);
      arr.push(child);
    } else {
      arr.push(parseScalar(item));
    }
  }
  return [arr, i];
}

/** Index of the key/value colon (a `:` followed by space or end), ignoring quotes. */
function findColon(text: string): number {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (ch === ":" && !inSingle && !inDouble && (i + 1 === text.length || text[i + 1] === " ")) {
      return i;
    }
  }
  return -1;
}

function parseScalar(text: string): YamlNode {
  if (text.startsWith("[") && text.endsWith("]")) {
    const inner = text.slice(1, -1).trim();
    if (inner === "") return [];
    return inner.split(",").map((part) => parseScalar(part.trim()));
  }
  if (text.startsWith('"') || text.startsWith("'")) return unquote(text);
  if (text === "true") return true;
  if (text === "false") return false;
  if (text === "null" || text === "~") return null;
  if (/^-?\d+$/.test(text)) return Number.parseInt(text, 10);
  if (/^-?\d*\.\d+$/.test(text)) return Number.parseFloat(text);
  return text;
}

function unquote(text: string): string {
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    return text.slice(1, -1);
  }
  return text;
}
