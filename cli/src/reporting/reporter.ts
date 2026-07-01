/**
 * Reporting abstraction.
 *
 * Commands report progress and results through a `Reporter` instead of calling
 * `console.log` directly. That keeps output testable and lets us add other renderers
 * later (JSON, files, a TUI) without touching command logic.
 */

export interface Reporter {
  info(message: string): void;
  success(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

/** Default reporter that writes to stdout/stderr with light symbols. */
export class ConsoleReporter implements Reporter {
  info(message: string): void {
    process.stdout.write(`  ${message}\n`);
  }

  success(message: string): void {
    process.stdout.write(`✓ ${message}\n`);
  }

  warn(message: string): void {
    process.stderr.write(`! ${message}\n`);
  }

  error(message: string): void {
    process.stderr.write(`✗ ${message}\n`);
  }
}
