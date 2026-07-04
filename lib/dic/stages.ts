/** Mode for a single pipeline stage. */
export type StageMode = "legacy" | "shadow" | "ts";

/** Which mode each stage runs in. Production default: legacy recode/unescape, TS analyse. */
export interface PipelineMode {
  recode: StageMode;
  analyse: StageMode;
  unescape: StageMode;
}

export const STAGE_NAMES = ["recode", "analyse", "unescape"] as const;
export type StageName = (typeof STAGE_NAMES)[number];

export const defaultPipelineMode: PipelineMode = {
  recode: "legacy",
  analyse: "ts",
  unescape: "legacy",
};