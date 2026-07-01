import { describe, it, expect } from "vitest";
import { runCli } from "../src/cli/runner.ts";
import { CommandRegistry } from "../src/cli/command-registry.ts";
import type { Command, CommandContext } from "../src/cli/command.ts";
import { OK } from "../src/cli/command.ts";
import type { Reporter } from "../src/reporting/index.ts";

function memoryReporter(): { reporter: Reporter; lines: string[] } {
  const lines: string[] = [];
  const reporter: Reporter = {
    info: (m) => void lines.push(m),
    success: (m) => void lines.push(m),
    warn: (m) => void lines.push(m),
    error: (m) => void lines.push(m),
  };
  return { reporter, lines };
}

describe("runCli", () => {
  it("prints help and returns 0 when no command is given", async () => {
    const { reporter, lines } = memoryReporter();
    const code = await runCli([], { reporter });
    expect(code).toBe(0);
    expect(lines.join("\n")).toContain("Usage: map <command>");
  });

  it("returns 0 and prints a semver for --version", async () => {
    const { reporter, lines } = memoryReporter();
    const code = await runCli(["--version"], { reporter });
    expect(code).toBe(0);
    expect(lines.join("\n")).toMatch(/map \d+\.\d+\.\d+/);
  });

  it("returns 1 for an unknown command", async () => {
    const { reporter, lines } = memoryReporter();
    expect(await runCli(["does-not-exist"], { reporter })).toBe(1);
    expect(lines.join("\n")).toContain("Unknown command");
  });

  it("dispatches to a command and passes positional args and flags", async () => {
    const { reporter } = memoryReporter();
    let received: CommandContext | undefined;
    const registry = new CommandRegistry();
    const cmd: Command = {
      name: "echo",
      summary: "test command",
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
    const { reporter, lines } = memoryReporter();
    const registry = new CommandRegistry();
    registry.register({
      name: "boom",
      summary: "throws",
      async run() {
        throw new Error("kaboom");
      },
    });
    expect(await runCli(["boom"], { reporter, registry })).toBe(1);
    expect(lines.join("\n")).toContain("kaboom");
  });

  it("shows command help with --help", async () => {
    const { reporter, lines } = memoryReporter();
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
    expect(lines.join("\n")).toContain("does a thing");
  });

  it("runs the built-in planned commands and warns", async () => {
    const { reporter, lines } = memoryReporter();
    const code = await runCli(["analyze"], { reporter });
    expect(code).toBe(0);
    expect(lines.join("\n")).toContain("planned");
  });
});
