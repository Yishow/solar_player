import type {
  DisplayClientContextErrorCode,
  UnpairedDisplayAccessSummary
} from "@solar-display/shared";

const ERROR_CODES: DisplayClientContextErrorCode[] = [
  "credential_expired",
  "credential_revoked",
  "device_disabled",
  "device_unpaired",
  "group_disabled",
  "group_missing",
  "profile_missing",
  "site_scope_mismatch"
];

function createCounts(): Record<DisplayClientContextErrorCode, number> {
  return Object.fromEntries(ERROR_CODES.map((code) => [code, 0])) as Record<
    DisplayClientContextErrorCode,
    number
  >;
}

export type UnpairedDisplayAccessRegistry = {
  record: (code: string, route: string) => void;
  getSummary: () => UnpairedDisplayAccessSummary;
};

export function createUnpairedDisplayAccessRegistry(): UnpairedDisplayAccessRegistry {
  const counts = createCounts();
  let totalCount = 0;
  let firstSeenAt: string | null = null;
  let lastSeenAt: string | null = null;
  let lastDeniedRoute: string | null = null;

  return {
    record(code, route) {
      const now = new Date().toISOString();
      if (Object.prototype.hasOwnProperty.call(counts, code)) {
        counts[code as DisplayClientContextErrorCode] += 1;
      }
      totalCount += 1;
      firstSeenAt ??= now;
      lastSeenAt = now;
      lastDeniedRoute = route;
    },
    getSummary() {
      return {
        counts: { ...counts },
        totalCount,
        firstSeenAt,
        lastSeenAt,
        lastDeniedRoute
      };
    }
  };
}
