import type { DisplayPageFreeformObject, ValidationResult } from "@solar-display/shared";
import { validateDisplayPageFreeformObjects } from "@solar-display/shared";

export function validateDisplayPageObjectDraft(
  freeformObjects: DisplayPageFreeformObject[]
): ValidationResult {
  return validateDisplayPageFreeformObjects(freeformObjects);
}
