import { describe, it, expect, vi } from "vitest";
import { ConsoleReporter } from "../src/reporting/reporter.ts";
import { createDefaultServices } from "../src/services.ts";
import { FileSystemStorage } from "../src/storage/index.ts";

describe("createDefaultServices", () => {
  it("wires defaults and honors overrides", () => {
    const services = createDefaultServices();
    expect(services.storage).toBeDefined();
    expect(services.graph).toBeDefined();

    const storage = new FileSystemStorage();
    expect(createDefaultServices({ storage }).storage).toBe(storage);
  });
});

describe("ConsoleReporter", () => {
  it("writes to stdout/stderr without throwing", () => {
    const out = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const err = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const reporter = new ConsoleReporter();
    reporter.info("i");
    reporter.success("s");
    reporter.warn("w");
    reporter.error("e");
    expect(out).toHaveBeenCalled();
    expect(err).toHaveBeenCalled();
    out.mockRestore();
    err.mockRestore();
  });
});
