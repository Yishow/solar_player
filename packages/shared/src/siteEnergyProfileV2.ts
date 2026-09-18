import {
  KN_ENGINEERING_MODES,
  isKnEngineeringId,
  type KnEngineeringId,
  type KnEngineeringMode
} from "./engineeringSources.js";
import {
  isRecord,
  addValidationError,
  validateCommonProfileFields,
  type SiteEnergyScope,
  type SiteEnergyProfileValidationError,
  type SiteEnergyProfileValidationResult
} from "./siteEnergyProfile.js";

export type AccountingMemberRef =
  | { kind: "physical-meter"; channelId: string }
  | { kind: "engineering"; sourceRef: string; engineeringId: KnEngineeringId; mode: KnEngineeringMode };

export type SiteEnergyProfileV2 = {
  departments: Array<{
    accountingIncluded: boolean;
    coverageReview: "reviewed" | "needs-review";
    departmentId: string;
    members: AccountingMemberRef[];
    nameZh: string;
  }>;
  effectiveFrom: string;
  metricScope: SiteEnergyScope;
  profileId: string;
  providerKind: "physical" | "engineering";
  revision: number;
  schemaVersion: 2;
  shareBasis: {
    kind: "site-main" | "department-sum" | "member-set";
    departmentIds?: string[];
    label?: string;
    members?: AccountingMemberRef[];
  };
  siteTimeZone: string;
  siteTotal: {
    coverageReview: "reviewed" | "needs-review";
    kind: "unconfigured" | "member-set";
    label: string;
    members: AccountingMemberRef[];
  };
  status: "incomplete" | "configured-awaiting-data" | "ready" | "conflict";
};

export function isSiteEnergyProfileV2(profile: unknown): profile is SiteEnergyProfileV2 {
  return isRecord(profile) && profile.schemaVersion === 2;
}

type ValidatedMember = {
  field: string;
  identity: string;
  provider: "engineering" | "physical";
  departmentIndex?: number;
};

function validateV2Member(
  value: unknown,
  field: string,
  providerKind: unknown,
  errors: SiteEnergyProfileValidationError[]
): ValidatedMember | null {
  if (!isRecord(value)) {
    addValidationError(errors, "PROFILE_PROVIDER_INVALID", field, "accounting member reference 必須是物件。");
    return null;
  }

  const kind = value.kind;
  if (kind === "physical-meter") {
    const channelId = value.channelId;
    if (typeof channelId !== "string" || channelId.trim().length === 0) {
      addValidationError(errors, "PROFILE_PROVIDER_INVALID", `${field}.channelId`, "physical-meter 必須有非空 channelId。");
      return null;
    }
    if (providerKind !== "physical") {
      addValidationError(
        errors,
        "PROFILE_PROVIDER_INVALID",
        `${field}.kind`,
        "providerKind 與 accounting member kind 不一致。"
      );
    }
    return { field, identity: `physical:${channelId}`, provider: "physical" };
  }

  if (kind === "engineering") {
    const engineeringId = value.engineeringId;
    const modeValue = value.mode;
    const sourceRef = value.sourceRef;
    const validEngineeringId = isKnEngineeringId(engineeringId);
    const validMode = typeof modeValue === "string"
      && (KN_ENGINEERING_MODES as readonly string[]).includes(modeValue)
      && (providerKind !== "engineering" || modeValue === "daily-report");

    if (!validEngineeringId) {
      addValidationError(
        errors,
        "PROFILE_PROVIDER_INVALID",
        `${field}.engineeringId`,
        "engineeringId 必須是已註冊的 KN 工程 identity。"
      );
    }
    if (!validMode) {
      addValidationError(
        errors,
        "PROFILE_PROVIDER_INVALID",
        `${field}.mode`,
        "engineering accounting member 的 mode 目前只支援 daily-report。"
      );
    }
    if (typeof sourceRef !== "string" || sourceRef.trim().length === 0) {
      addValidationError(
        errors,
        "PROFILE_PROVIDER_INVALID",
        `${field}.sourceRef`,
        "engineering member 必須有非空 sourceRef。"
      );
    }
    if (providerKind !== "engineering") {
      addValidationError(
        errors,
        "PROFILE_PROVIDER_INVALID",
        `${field}.kind`,
        "providerKind 與 accounting member kind 不一致。"
      );
    }
    if (!validEngineeringId || !validMode || typeof sourceRef !== "string" || sourceRef.trim().length === 0) {
      return null;
    }
    return { field, identity: `engineering:${engineeringId}`, provider: "engineering" };
  }

  addValidationError(
    errors,
    "PROFILE_PROVIDER_INVALID",
    `${field}.kind`,
    "accounting member kind 必須是 physical-meter 或 engineering。"
  );
  return null;
}

function addDuplicateMemberErrors(
  members: ValidatedMember[],
  set: string,
  errors: SiteEnergyProfileValidationError[]
) {
  const seen = new Map<string, string>();
  for (const member of members) {
    const previousField = seen.get(member.identity);
    if (previousField) {
      addValidationError(
        errors,
        "PROFILE_OVERLAP_CONFLICT",
        member.field,
        `accounting identity ${member.identity} 在 ${set} 重複（已在 ${previousField} 選取）。`
      );
    } else {
      seen.set(member.identity, member.field);
    }
  }
}

function collectV2Members(
  value: unknown,
  path: string,
  providerKind: unknown,
  errors: SiteEnergyProfileValidationError[],
  departmentIndex?: number
) {
  if (!Array.isArray(value)) {
    addValidationError(errors, "PROFILE_PROVIDER_INVALID", path, `${path} 必須是陣列。`);
    return [];
  }
  return value.flatMap((member, index) => {
    const validated = validateV2Member(member, `${path}[${index}]`, providerKind, errors);
    if (validated && departmentIndex !== undefined) validated.departmentIndex = departmentIndex;
    return validated ? [validated] : [];
  });
}

export function validateSiteEnergyProfileV2(profile: unknown): SiteEnergyProfileValidationResult {
  const errors: SiteEnergyProfileValidationError[] = [];
  if (!isRecord(profile)) {
    addValidationError(errors, "PROFILE_INVALID", "profile", "profile 必須是物件。");
    return { errors, ok: false };
  }

  validateCommonProfileFields(profile, errors);

  const providerKind = profile.providerKind;
  if (providerKind !== "physical" && providerKind !== "engineering") {
    addValidationError(
      errors,
      "PROFILE_PROVIDER_INVALID",
      "providerKind",
      "providerKind 必須是 physical 或 engineering。"
    );
  } else if (providerKind === "engineering" && profile.metricScope !== "kn") {
    addValidationError(
      errors,
      "PROFILE_PROVIDER_INVALID",
      "metricScope",
      "engineering provider 只能用於 KN profile。"
    );
  }

  const siteTotal = isRecord(profile.siteTotal) ? profile.siteTotal : null;
  if (!siteTotal) addValidationError(errors, "PROFILE_PROVIDER_INVALID", "siteTotal", "siteTotal 必須是物件。");
  else if (siteTotal.kind !== "unconfigured" && siteTotal.kind !== "member-set") {
    addValidationError(errors, "PROFILE_PROVIDER_INVALID", "siteTotal.kind", "siteTotal.kind 不受支援。");
  }
  const siteTotalMembers = collectV2Members(siteTotal?.members, "siteTotal.members", providerKind, errors);
  if (siteTotal?.kind === "member-set" && siteTotalMembers.length === 0) {
    addValidationError(errors, "PROFILE_PROVIDER_INVALID", "siteTotal.members", "member-set 必須至少包含一個 accounting member。");
  }
  addDuplicateMemberErrors(siteTotalMembers, "siteTotal.members", errors);

  const allMembers: ValidatedMember[] = [...siteTotalMembers];
  const departmentOwners = new Map<string, { departmentIndex: number; field: string }>();
  const departments = profile.departments;
  if (!Array.isArray(departments)) {
    addValidationError(errors, "PROFILE_PROVIDER_INVALID", "departments", "departments 必須是陣列。");
  } else {
    departments.forEach((department, departmentIndex) => {
      if (!isRecord(department)) {
        addValidationError(errors, "PROFILE_PROVIDER_INVALID", `departments[${departmentIndex}]`, "department 必須是物件。");
        return;
      }
      const members = collectV2Members(
        department.members,
        `departments[${departmentIndex}].members`,
        providerKind,
        errors,
        departmentIndex
      );
      allMembers.push(...members);
      addDuplicateMemberErrors(members, `departments[${departmentIndex}].members`, errors);

      if (department.accountingIncluded !== false) {
        for (const member of members) {
          const previous = departmentOwners.get(member.identity);
          if (previous && previous.departmentIndex !== departmentIndex) {
            addValidationError(
              errors,
              "PROFILE_OVERLAP_CONFLICT",
              member.field,
              `accounting identity ${member.identity} 同時出現在 departments[${previous.departmentIndex}] 與 departments[${departmentIndex}]。`
            );
          } else if (!previous) {
            departmentOwners.set(member.identity, { departmentIndex, field: member.field });
          }
        }
      }
    });
  }

  const shareBasis = isRecord(profile.shareBasis) ? profile.shareBasis : null;
  const shareBasisMembers: ValidatedMember[] = [];
  if (!shareBasis) addValidationError(errors, "PROFILE_PROVIDER_INVALID", "shareBasis", "shareBasis 必須是物件。");
  else {
    const shareBasisKind = shareBasis.kind;
    if (shareBasisKind !== "site-main" && shareBasisKind !== "department-sum" && shareBasisKind !== "member-set") {
      addValidationError(errors, "PROFILE_PROVIDER_INVALID", "shareBasis.kind", "分母來源類型不受支援。");
    }
    if (shareBasisKind === "member-set") {
      const members = collectV2Members(shareBasis.members, "shareBasis.members", providerKind, errors);
      shareBasisMembers.push(...members);
      if (members.length === 0) {
        addValidationError(errors, "PROFILE_PROVIDER_INVALID", "shareBasis.members", "member-set 必須至少包含一個 accounting member。");
      }
      addDuplicateMemberErrors(members, "shareBasis.members", errors);
    }
  }

  allMembers.push(...shareBasisMembers);
  const providers = new Set(allMembers.map((member) => member.provider));
  if (providers.size > 1) {
    addValidationError(
      errors,
      "PROFILE_PROVIDER_INVALID",
      "members",
      "Overlapping accounting inputs forbidden: cannot mix physical-meter and engineering in the same profile."
    );
  }

  return { errors, ok: errors.length === 0 };
}
