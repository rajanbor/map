/**
 * Development profiles: named, composable bundles of recommendations.
 *
 * A profile is data that points at things MAP already manages — skill names from the
 * skill catalog, pattern ids from the pattern registry — plus a few short project
 * conventions. Profiles never embed skill instructions and never install tools;
 * `map plan` shows what a profile would change and `map init --profile` applies the
 * reviewed result. Combining profiles unions their lists in declaration order.
 */

export interface Profile {
  readonly id: string;
  readonly name: string;
  readonly summary: string;
  /** Signals (from the Project Profiler) that make this profile a sensible default. */
  readonly suggestWhen: readonly string[];
  /** Skill names to recommend; only those present in a configured source are offered. */
  readonly skills: readonly string[];
  /** Pattern ids from the MAP registry. */
  readonly patterns: readonly string[];
  /** Short durable conventions compiled into agent instructions. */
  readonly conventions: readonly string[];
  /** Validation tools to consider; MAP does not install them. */
  readonly validation: readonly string[];
  readonly security: readonly string[];
}

export const PROFILES: readonly Profile[] = [
  {
    id: "webapp",
    name: "Web application",
    summary: "Browser UI with a component framework and a design system.",
    suggestWhen: ["nextjs", "react", "vue", "angular", "tailwindcss"],
    skills: ["design-guardrails"],
    patterns: [],
    conventions: [
      "Keep UI changes consistent with the project's design rules (DESIGN.md when present).",
      "Add or update tests with every behavior change; run the project's lint and type checks before finishing.",
      "Never commit secrets; read configuration from environment variables documented in an example env file.",
    ],
    validation: ["type checker", "linter", "unit tests", "end-to-end tests for critical flows"],
    security: ["Validate and encode untrusted input at the boundary.", "Keep authentication and authorization checks on the server."],
  },
  {
    id: "api",
    name: "HTTP API",
    summary: "Backend service exposing an HTTP or RPC interface.",
    suggestWhen: ["express", "nestjs", "fastapi", "django"],
    skills: [],
    patterns: [],
    conventions: [
      "Validate request input with explicit schemas and return consistent error shapes.",
      "Keep handlers thin; put business logic in testable modules.",
      "Every endpoint change ships with tests for success, validation failure, and authorization failure.",
    ],
    validation: ["contract or integration tests", "linter", "type checker"],
    security: ["Require authentication by default and document every public endpoint.", "Never log credentials, tokens, or full request bodies with personal data."],
  },
  {
    id: "wordpress",
    name: "WordPress",
    summary: "WordPress theme, plugin, or site.",
    suggestWhen: ["wordpress"],
    skills: ["wordpress-tailwind-theme", "wordpress-security-audit"],
    patterns: [],
    conventions: [
      "Escape output (esc_html, esc_attr, esc_url) and sanitize input with WordPress APIs.",
      "Use nonces and capability checks for every state-changing request.",
      "Prefer hooks and template parts over editing core or third-party plugin files.",
    ],
    validation: ["PHP_CodeSniffer with WordPress Coding Standards", "a local WordPress environment such as wp-env"],
    security: ["Run security audits only against sites you are authorized to test."],
  },
  {
    id: "python",
    name: "Python",
    summary: "Python package, CLI, or service.",
    suggestWhen: ["python"],
    skills: ["python-project"],
    patterns: [],
    conventions: [
      "Type-annotate public functions and keep the type checker clean.",
      "Add pytest tests with every behavior change.",
      "Manage dependencies through the project's declared tool and lockfile.",
    ],
    validation: ["ruff", "mypy or pyright", "pytest"],
    security: ["Pin dependencies through the lockfile and review new packages before adding them."],
  },
  {
    id: "rust",
    name: "Rust",
    summary: "Rust crate, CLI, or workspace.",
    suggestWhen: ["rust"],
    skills: ["rust-project"],
    patterns: [],
    conventions: [
      "Keep `cargo fmt`, `cargo clippy`, and `cargo test` clean before finishing.",
      "Return typed errors from libraries; reserve panics for programmer errors.",
    ],
    validation: ["cargo fmt --check", "cargo clippy", "cargo test"],
    security: ["Justify every `unsafe` block with a comment and a test."],
  },
  {
    id: "ai-app",
    name: "AI application",
    summary: "Product that calls language models, retrieval, or agents.",
    suggestWhen: [],
    skills: [],
    patterns: ["security/prompt-injection-defense", "evaluation/golden-dataset", "evaluation/llm-as-judge", "observability/tracing"],
    conventions: [
      "Treat model output and retrieved content as untrusted input.",
      "Keep prompts in version control next to the code that uses them.",
      "Measure quality changes against a fixed evaluation set before shipping prompt or model changes.",
    ],
    validation: ["an evaluation suite with a golden dataset", "tracing of model calls in development"],
    security: ["Give tools the least privilege they need and confirm irreversible actions with a person."],
  },
  {
    id: "security-first",
    name: "Security first",
    summary: "Stricter defaults for projects handling sensitive data.",
    suggestWhen: [],
    skills: [],
    patterns: ["security/prompt-injection-defense", "security/least-privilege-tool-access"],
    conventions: [
      "Never add secrets, tokens, or credentials to the repository or to logs.",
      "Explain the security impact of changes to authentication, authorization, input handling, and dependencies.",
      "Ask before running commands that change systems outside the repository.",
    ],
    validation: ["secret scanning", "dependency audit", "static analysis in CI"],
    security: [
      "Skills and instructions guide an agent but do not enforce anything; enforce checks with CI or Git hooks.",
    ],
  },
];

export function profileById(id: string): Profile | undefined {
  return PROFILES.find((profile) => profile.id === id);
}

/** Parse `--profile a,b`; unknown ids are reported, not ignored. */
export function parseProfileList(value: string): { readonly profiles: readonly Profile[]; readonly unknown: readonly string[] } {
  const profiles: Profile[] = [];
  const unknown: string[] = [];
  for (const raw of value.split(",")) {
    const id = raw.trim().toLowerCase();
    if (id === "") continue;
    const profile = profileById(id);
    if (profile === undefined) unknown.push(id);
    else if (!profiles.includes(profile)) profiles.push(profile);
  }
  return { profiles, unknown };
}

/** Profiles whose `suggestWhen` signals appear in the project. */
export function suggestedProfiles(signals: ReadonlySet<string>): readonly Profile[] {
  return PROFILES.filter((profile) => profile.suggestWhen.some((signal) => signals.has(signal)));
}

/** The Markdown document `map init --profile` writes to `.map/profiles/<id>.md`. */
export function renderProfileDocument(profile: Profile): string {
  const list = (items: readonly string[]): string => items.map((item) => `- ${item}`).join("\n");
  const sections = [
    `# ${profile.name} conventions`,
    "",
    `${profile.summary} Added by \`map init --profile ${profile.id}\`; edit freely — MAP never overwrites this file.`,
    "",
    "## Conventions",
    "",
    list(profile.conventions),
    "",
    "## Security",
    "",
    list(profile.security),
    "",
    "## Suggested validation",
    "",
    list(profile.validation),
  ];
  if (profile.skills.length > 0) {
    sections.push("", "## Related skills", "", list(profile.skills.map((skill) => `\`${skill}\` — install with \`map skills add ${skill}\``)));
  }
  if (profile.patterns.length > 0) {
    sections.push("", "## Related patterns", "", list(profile.patterns.map((pattern) => `\`${pattern}\` — read with \`map show ${pattern}\``)));
  }
  return `${sections.join("\n")}\n`;
}
