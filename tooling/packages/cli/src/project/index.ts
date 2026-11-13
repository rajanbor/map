export type { ProjectFacts } from "./detect.ts";
export { detectProject, factsFromProfile } from "./detect.ts";
export type {
  Certainty,
  Evidence,
  ProfileOptions,
  ProjectProfile,
  SignalCategory,
  SignalSummary,
  WorkspaceProfile,
} from "./profile.ts";
export { allSignals, profileProject } from "./profile.ts";
