import type { PlaybackTransitionType } from "@solar-display/shared";
import { getDatabase } from "../db/index.js";

export type PlaybackRuntimePolicyRow = {
  enforce_fresh_runtime_data: number;
  transition_speed: number;
  transition_type: PlaybackTransitionType;
  updated_at: string | null;
};

export type PlaybackRuntimePolicyWrite = Omit<PlaybackRuntimePolicyRow, "updated_at">;

export function readGlobalPlaybackRuntimePolicyRow(): PlaybackRuntimePolicyRow {
  const row = getDatabase()
    .prepare(
      `
        SELECT
          transition_type,
          transition_speed,
          enforce_fresh_runtime_data,
          updated_at
        FROM playback_runtime_policy
        WHERE id = 1
      `
    )
    .get() as PlaybackRuntimePolicyRow | undefined;

  if (!row) {
    throw new Error("Global Playback Runtime Policy is not initialized");
  }

  return row;
}

export function writeGlobalPlaybackRuntimePolicyRow(policy: PlaybackRuntimePolicyWrite) {
  const result = getDatabase()
    .prepare(
      `
        UPDATE playback_runtime_policy
        SET transition_type = ?,
            transition_speed = ?,
            enforce_fresh_runtime_data = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
      `
    )
    .run(
      policy.transition_type,
      policy.transition_speed,
      policy.enforce_fresh_runtime_data
    );

  if (result.changes !== 1) {
    throw new Error("Failed to update Global Playback Runtime Policy");
  }
}
