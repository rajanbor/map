/**
 * The minimal Git plumbing MAP needs to read untrusted skill repositories safely.
 *
 * MAP never checks out a working tree. It fetches into a private bare repository
 * and reads objects with `ls-tree`/`cat-file`, so repository content is never
 * materialized as files, symlinks are seen as tree entries (and rejected) instead of
 * being created, checkout filters and hooks cannot run, and submodules are not
 * followed. Git is invoked without a shell and with a sanitized environment.
 */

import { execFile } from "node:child_process";

export class GitError extends Error {
  readonly stderr: string;

  constructor(message: string, stderr: string) {
    super(message);
    this.stderr = stderr;
  }
}

export interface GitTreeEntry {
  readonly mode: string;
  readonly type: "blob" | "tree" | "commit";
  readonly object: string;
  readonly size: number;
  readonly path: string;
}

const SAFE_URL = /^(?:https:\/\/[^\s]+|ssh:\/\/[^\s]+|git@[\w.-]+:[^\s]+|file:\/\/\/[^\s]+|\/[^\s]*)$/;
const SAFE_REF = /^(?!-)(?!.*\.\.)[A-Za-z0-9._/-]{1,200}$/;
export const COMMIT_SHA = /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/;

/** Throws unless `url` is an https/ssh/file URL or an absolute local path. */
export function assertSafeRemote(url: string): void {
  if (url.startsWith("-") || !SAFE_URL.test(url)) {
    throw new Error(`unsupported skill source URL '${url}' (use https://, ssh://, git@host:path, or an absolute path)`);
  }
}

export function assertSafeRef(ref: string): void {
  if (!SAFE_REF.test(ref)) throw new Error(`unsafe Git ref '${ref}'`);
}

export async function git(args: readonly string[], gitDir?: string): Promise<string> {
  return (await gitBuffer(args, gitDir)).toString("utf8");
}

export function gitBuffer(args: readonly string[], gitDir?: string): Promise<Buffer> {
  const fullArgs = [
    "-c", "core.hooksPath=/dev/null",
    "-c", "core.fsmonitor=false",
    "-c", "protocol.ext.allow=never",
    "-c", "credential.interactive=false",
    ...(gitDir !== undefined ? ["--git-dir", gitDir] : []),
    ...args,
  ];
  return new Promise((resolvePromise, reject) => {
    execFile(
      "git",
      fullArgs,
      {
        encoding: "buffer",
        maxBuffer: 64 * 1024 * 1024,
        timeout: 120_000,
        env: sanitizedEnv(),
      },
      (error, stdout, stderr) => {
        if (error !== null) {
          const detail = stderr.toString("utf8").trim();
          const missing = (error as NodeJS.ErrnoException).code === "ENOENT";
          reject(
            new GitError(
              missing ? "git is not installed or not on PATH" : `git ${args[0] ?? ""} failed${detail ? `: ${detail}` : ""}`,
              detail,
            ),
          );
          return;
        }
        resolvePromise(stdout);
      },
    );
  });
}

/** Recursive tree listing of `revision`, parsed from NUL-delimited output. */
export async function listTree(gitDir: string, revision: string): Promise<GitTreeEntry[]> {
  const output = await git(["ls-tree", "-r", "-l", "-z", "--full-tree", revision], gitDir);
  const entries: GitTreeEntry[] = [];
  for (const record of output.split("\0")) {
    if (record === "") continue;
    const tab = record.indexOf("\t");
    const [mode, type, object, size] = record.slice(0, tab).split(/\s+/);
    if (mode === undefined || type === undefined || object === undefined) continue;
    entries.push({
      mode,
      type: type as GitTreeEntry["type"],
      object,
      size: size === undefined || size === "-" ? 0 : Number(size),
      path: record.slice(tab + 1),
    });
  }
  return entries;
}

function sanitizedEnv(): NodeJS.ProcessEnv {
  const keep = ["PATH", "HOME", "USER", "LANG", "LC_ALL", "TMPDIR", "SSH_AUTH_SOCK", "SYSTEMROOT", "HTTPS_PROXY", "HTTP_PROXY", "NO_PROXY", "https_proxy", "http_proxy", "no_proxy"];
  const env: NodeJS.ProcessEnv = {};
  for (const key of keep) if (process.env[key] !== undefined) env[key] = process.env[key];
  env["GIT_TERMINAL_PROMPT"] = "0";
  env["GIT_CONFIG_NOSYSTEM"] = "1";
  env["GIT_ASKPASS"] = "";
  env["SSH_ASKPASS"] = "";
  env["GIT_LFS_SKIP_SMUDGE"] = "1";
  return env;
}
