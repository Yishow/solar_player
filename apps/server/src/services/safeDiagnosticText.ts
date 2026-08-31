const sensitiveFragment = /(^|[?&#\s])([^?&#=\s]*(?:password|pass|token|secret|key|authorization)[^?&#=\s]*\s*=\s*)([^&#\s]*)/giu;
const urlLikeValue = /^([a-z][a-z\d+.-]*):\/\/\S*/iu;

export const SAFE_DIAGNOSTIC_TEXT_MAX_LENGTH = 256;

function safeUrlIdentity(value: string) {
  const match = urlLikeValue.exec(value);
  return match ? `${(match[1] ?? "url").toLowerCase()}://[REDACTED]` : null;
}

/**
 * Keep management diagnostics bounded without returning operator-configured
 * credentials, query values, or URL host/path details.
 */
export function safeDiagnosticText(
  value: unknown,
  maxLength = SAFE_DIAGNOSTIC_TEXT_MAX_LENGTH
): string | null {
  if (typeof value !== "string") return null;
  const boundedInput = value.trim().slice(0, maxLength * 4);
  if (boundedInput.length === 0) return null;

  const urlIdentity = safeUrlIdentity(boundedInput);
  if (urlIdentity) return urlIdentity.slice(0, maxLength);

  return boundedInput
    .replace(
      sensitiveFragment,
      (_match, prefix: string, key: string) => `${prefix}${key}[REDACTED]`
    )
    .slice(0, maxLength);
}
