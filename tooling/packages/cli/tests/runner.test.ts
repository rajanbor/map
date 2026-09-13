import { describe, it, expect } from "vitest";
import { runCli } from "../src/cli/runner.ts";
import { CommandRegistry } from "../src/cli/command-registry.ts";
import type { Command, CommandContext } from "../src/cli/command.ts";
import { OK } from "../src/cli/command.ts";
import { capture } from "./helpers.ts";

describe("runCli", () => {
  it("prints help and returns 0 when no command is given", async () => {
    const reporter = capture();
    const code = await runCli([], { reporter });
    expect(code).toBe(0);
    expect(reporter.lines.join("\n")).toContain("Usage: map");
  });

  it("returns 0 and prints a semver for --version", async () => {
    const reporter = capture();
    const code = await runCli(["--version"], { reporter });
    expect(code).toBe(0);
    expect(reporter.lines.join("\n")).toMatch(/\d+\.\d+\.\d+/);
  });

  it("returns 1 for an unknown command", async () => {
    const reporter = capture();
    expect(await runCli(["does-not-exist"], { reporter })).toBe(1);
    expect(reporter.lines.join("\n")).toContain("unknown command");
  });

  it("dispatches to a command and passes positional args and flags", async () => {
    const reporter = capture();
    let received: CommandContext | undefined;
    const registry = new CommandRegistry();
    const cmd: Command = {
      name: "echo",
      summary: "test command",
      args: "[value]",
      options: [
        { flags: "--flag", description: "a boolean flag" },
        { flags: "--key <value>", description: "a value flag" },
      ],
      async run(ctx) {
        received = ctx;
        return OK;
      },
    };
    registry.register(cmd);

    const code = await runCli(["echo", "pos1", "--flag", "--key=value"], {
      reporter,
      registry,
    });
    expect(code).toBe(0);
    expect(received?.args).toEqual(["pos1"]);
    expect(received?.flags["flag"]).toBe(true);
    expect(received?.flags["key"]).toBe("value");
  });

  it("returns 1 when a command throws", async () => {
    const reporter = capture();
    const registry = new CommandRegistry();
    registry.register({
      name: "boom",
      summary: "throws",
      async run() {
        throw new Error("kaboom");
      },
    });
    expect(await runCli(["boom"], { reporter, registry })).toBe(1);
    expect(reporter.lines.join("\n")).toContain("kaboom");
  });

  it("shows command help with --help", async () => {
    const reporter = capture();
    const registry = new CommandRegistry();
    registry.register({
      name: "thing",
      summary: "does a thing",
      usage: "map thing",
      async run() {
        return OK;
      },
    });
    const code = await runCli(["thing", "--help"], { reporter, registry });
    expect(code).toBe(0);
    expect(reporter.lines.join("\n")).toContain("does a thing");
  });

  it("runs the built-in graph command", async () => {
    const reporter = capture();
    const code = await runCli(["graph"], { reporter });
    expect(code).toBe(0);
    expect(reporter.lines.join("\n")).toContain("96 node(s)");
  });
});
