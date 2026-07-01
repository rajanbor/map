import { describe, it, expect } from "vitest";
import { stringifyYaml } from "../src/config/yaml.ts";
import { defaultConfig, renderConfig } from "../src/config/config.ts";

describe("stringifyYaml", () => {
  it("renders nested maps and string arrays", () => {
    const yaml = stringifyYaml({
      version: 1,
      analysis: { include: ["src/**"], analyzers: [] },
      enabled: true,
    });
    expect(yaml).toBe(
      [
        "version: 1",
        "analysis:",
        "  include:",
        '    - "src/**"',
        "  analyzers: []",
        "enabled: true",
        "",
      ].join("\n"),
    );
  });

  it("quotes strings that need it", () => {
    expect(stringifyYaml("a: b")).toBe('"a: b"\n');
  });
});

describe("renderConfig", () => {
  it("includes a header comment and the schema version", () => {
    const rendered = renderConfig(defaultConfig());
    expect(rendered.startsWith("# MAP configuration")).toBe(true);
    expect(rendered).toContain("version: 1");
  });
});
