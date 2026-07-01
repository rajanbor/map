import { describe, it, expect } from "vitest";
import {
  parseCargoToml,
  parseGoMod,
  parsePackageJson,
  parsePyprojectToml,
  parseRequirementsTxt,
} from "../src/analyzer/index.ts";

describe("parsePackageJson", () => {
  it("collects names across dependency sections", () => {
    const contents = JSON.stringify({
      dependencies: { openai: "^4.0.0", langchain: "^0.2.0" },
      devDependencies: { vitest: "^2.0.0" },
      peerDependencies: { react: "^18.0.0" },
    });
    expect(parsePackageJson(contents)).toEqual([
      "openai",
      "langchain",
      "vitest",
      "react",
    ]);
  });

  it("returns an empty list for malformed JSON", () => {
    expect(parsePackageJson("{ not json")).toEqual([]);
    expect(parsePackageJson('"just a string"')).toEqual([]);
  });
});

describe("parseRequirementsTxt", () => {
  it("extracts names and ignores versions, comments, and options", () => {
    const contents = [
      "# core",
      "openai==1.30.0",
      "langchain>=0.2,<0.3",
      "chromadb[client] ; python_version >= '3.9'",
      "-r other.txt",
      "",
      "Sentence_Transformers",
    ].join("\n");
    expect(parseRequirementsTxt(contents)).toEqual([
      "openai",
      "langchain",
      "chromadb",
      "sentence-transformers",
    ]);
  });
});

describe("parsePyprojectToml", () => {
  it("reads PEP 621 dependency arrays", () => {
    const contents = [
      "[project]",
      'name = "openai-helper"',
      'description = "wraps anthropic"',
      "dependencies = [",
      '  "openai>=1.0",',
      "  'chromadb',",
      "]",
    ].join("\n");
    expect(parsePyprojectToml(contents)).toEqual(["openai", "chromadb"]);
  });

  it("does not treat prose strings outside dependency arrays as packages", () => {
    const contents = ['[project]', 'description = "openai client"'].join("\n");
    expect(parsePyprojectToml(contents)).toEqual([]);
  });

  it("reads poetry dependency tables and optional-dependency groups", () => {
    const contents = [
      "[tool.poetry.dependencies]",
      'python = "^3.11"',
      'langchain = "^0.2"',
      "",
      "[project.optional-dependencies]",
      'eval = ["ragas>=0.1"]',
    ].join("\n");
    expect(parsePyprojectToml(contents)).toContain("langchain");
    expect(parsePyprojectToml(contents)).toContain("ragas");
    expect(parsePyprojectToml(contents)).not.toContain("python");
  });
});

describe("parseGoMod", () => {
  it("reads block and single-line require directives", () => {
    const contents = [
      "module example.com/app",
      "",
      "go 1.22",
      "",
      "require github.com/tmc/langchaingo v0.1.12",
      "",
      "require (",
      "\tgithub.com/sashabaranov/go-openai v1.26.0",
      "\tgithub.com/qdrant/go-client v1.9.0 // indirect",
      ")",
    ].join("\n");
    expect(parseGoMod(contents)).toEqual([
      "github.com/tmc/langchaingo",
      "github.com/sashabaranov/go-openai",
      "github.com/qdrant/go-client",
    ]);
  });
});

describe("parseCargoToml", () => {
  it("reads dependency tables, including dotted headers", () => {
    const contents = [
      "[package]",
      'name = "app"',
      "",
      "[dependencies]",
      'async-openai = "0.23"',
      "tokio = { version = \"1\", features = [\"full\"] }",
      "",
      "[dependencies.qdrant-client]",
      'version = "1.9"',
      "",
      "[dev-dependencies]",
      'insta = "1"',
    ].join("\n");
    const names = parseCargoToml(contents);
    expect(names).toContain("async-openai");
    expect(names).toContain("tokio");
    expect(names).toContain("qdrant-client");
    expect(names).toContain("insta");
    expect(names).not.toContain("name");
  });
});
