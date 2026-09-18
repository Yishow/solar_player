import type Database from "better-sqlite3";
import {
  DEFAULT_BOUNDARY_MAX_AGE_SECONDS,
  type AccountingMemberRef,
  type EngineeringSourceDefinition,
  type MeterSourceDefinition,
  type SiteEnergyProfile,
  type SiteEnergyProfileV2,
  type SiteEnergyProfileV1
} from "@solar-display/shared";
import { getMeterSource } from "./meterSourceCatalogService.js";
import { getEngineeringSourceByRef } from "./engineeringSourceService.js";

export type ProfileSourceSnapshot = Omit<MeterSourceDefinition, "displayNameZh" | "displayNameEn" | "boundaryMaxAgeSeconds"> & {
  boundaryMaxAgeSeconds: number;
};

export type EngineeringProfileSourceSnapshot = Pick<
  EngineeringSourceDefinition,
  | "sourceRef"
  | "engineeringId"
  | "mode"
  | "configurationRevision"
  | "definitionRevision"
  | "calendarRevision"
  | "approvedPublisherId"
  | "enabled"
  | "reviewStatus"
>;

export type ProfileProviderSnapshot =
  | {
    providerKind: "physical";
    sources: ProfileSourceSnapshot[];
  }
  | {
    providerKind: "engineering";
    members: EngineeringProfileSourceSnapshot[];
  };

type SourceReference = {
  channelId: string;
  field: string;
};

function sourceUnavailable(fields: string[]): never {
  throw Object.assign(new Error("PROFILE_SOURCE_UNAVAILABLE"), {
    code: "PROFILE_SOURCE_UNAVAILABLE",
    fields: fields.map((field) => ({ field, message: "選取的能源來源不存在、未啟用、尚未審核或不是能源量測。" })),
    statusCode: 422
  });
}

function engineeringSourceUnavailable(fields: string[]): never {
  throw Object.assign(new Error("PROFILE_ENGINEERING_SOURCE_UNAVAILABLE"), {
    code: "PROFILE_ENGINEERING_SOURCE_UNAVAILABLE",
    fields: fields.map((field) => ({ field, message: "選取的工程能源來源不存在、未啟用、尚未核准或 binding 不一致。" })),
    statusCode: 422
  });
}

function selectedReferences(profile: SiteEnergyProfileV1): SourceReference[] {
  const references: SourceReference[] = [];
  const add = (field: string, values: unknown) => {
    if (!Array.isArray(values)) {
      references.push({ channelId: "", field });
      return;
    }
    values.forEach((channelId, index) => references.push({
      channelId: typeof channelId === "string" ? channelId : "",
      field: `${field}[${index}]`
    }));
  };
  add("siteTotal.memberChannelIds", profile.siteTotal.memberChannelIds);
  profile.departments.forEach((department, index) => {
    add(`departments[${index}].memberChannelIds`, department.memberChannelIds);
  });
  if (profile.shareBasis.kind === "meter-set") {
    add("shareBasis.memberChannelIds", profile.shareBasis.memberChannelIds);
  }
  return references;
}

function snapshotSource(source: MeterSourceDefinition): ProfileSourceSnapshot {
  const { displayNameEn: _displayNameEn, displayNameZh: _displayNameZh, ...definition } = source;
  return {
    ...definition,
    boundaryMaxAgeSeconds: source.boundaryMaxAgeSeconds ?? DEFAULT_BOUNDARY_MAX_AGE_SECONDS
  };
}

type EngineeringReference = {
  engineeringId?: Extract<AccountingMemberRef, { kind: "engineering" }>["engineeringId"];
  field: string;
  mode?: Extract<AccountingMemberRef, { kind: "engineering" }>["mode"];
  sourceRef: string;
};

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function capturePhysicalSourceSnapshot(
  database: Database.Database,
  profile: SiteEnergyProfileV1 | SiteEnergyProfileV2,
  references: SourceReference[]
): ProfileSourceSnapshot[] {
  const unavailable = new Set<string>();
  const sourceByChannel = new Map<string, MeterSourceDefinition | null>();
  const snapshotByChannel = new Map<string, ProfileSourceSnapshot>();

  for (const reference of references) {
    if (!sourceByChannel.has(reference.channelId)) {
      sourceByChannel.set(reference.channelId, reference.channelId
        ? getMeterSource(database, profile.metricScope, reference.channelId)
        : null);
    }
    const source = sourceByChannel.get(reference.channelId);
    if (!source
      || !source.enabled
      || source.reviewStatus !== "reviewed"
      || (source.measurementKind !== "cumulative-energy" && source.measurementKind !== "interval-energy")) {
      unavailable.add(reference.field);
      continue;
    }
    snapshotByChannel.set(reference.channelId, snapshotSource(source));
  }
  if (unavailable.size > 0) sourceUnavailable([...unavailable]);
  return [...snapshotByChannel.values()].sort((left, right) => left.channelId.localeCompare(right.channelId));
}

function v2MemberReferences(profile: SiteEnergyProfileV2): {
  engineering: EngineeringReference[];
  physical: SourceReference[];
} {
  const engineering: EngineeringReference[] = [];
  const physical: SourceReference[] = [];
  const add = (field: string, values: unknown) => {
    if (!Array.isArray(values)) {
      physical.push({ channelId: "", field });
      engineering.push({ field, sourceRef: "" });
      return;
    }
    values.forEach((value: unknown, index: number) => {
      const memberField = `${field}[${index}]`;
      if (!value || typeof value !== "object") {
        physical.push({ channelId: "", field: memberField });
        engineering.push({ field: memberField, sourceRef: "" });
        return;
      }
      const member = value as Partial<AccountingMemberRef>;
      if (member.kind === "physical-meter") {
        physical.push({
          channelId: typeof member.channelId === "string" ? member.channelId : "",
          field: `${memberField}.channelId`
        });
        return;
      }
      if (member.kind === "engineering") {
        engineering.push({
          engineeringId: member.engineeringId,
          field: memberField,
          mode: member.mode,
          sourceRef: typeof member.sourceRef === "string" ? member.sourceRef : ""
        });
        return;
      }
      physical.push({ channelId: "", field: `${memberField}.kind` });
      engineering.push({ field: `${memberField}.kind`, sourceRef: "" });
    });
  };

  add("siteTotal.members", profile.siteTotal?.members);
  profile.departments.forEach((department, index) => add(`departments[${index}].members`, department.members));
  if (profile.shareBasis.kind === "member-set") {
    add("shareBasis.members", profile.shareBasis.members);
  }
  return { engineering, physical };
}

function snapshotEngineeringSource(source: EngineeringSourceDefinition): EngineeringProfileSourceSnapshot {
  return {
    sourceRef: source.sourceRef,
    engineeringId: source.engineeringId,
    mode: source.mode,
    configurationRevision: source.configurationRevision,
    definitionRevision: source.definitionRevision,
    calendarRevision: source.calendarRevision,
    approvedPublisherId: source.approvedPublisherId,
    enabled: source.enabled,
    reviewStatus: source.reviewStatus
  };
}

function captureEngineeringSourceSnapshot(
  database: Database.Database,
  profile: SiteEnergyProfileV2,
  references: EngineeringReference[]
): EngineeringProfileSourceSnapshot[] {
  const unavailable = new Set<string>();
  const referenceBySource = new Map<string, EngineeringReference>();
  for (const reference of references) {
    if (!reference.sourceRef) {
      unavailable.add(reference.field);
      continue;
    }
    const previous = referenceBySource.get(reference.sourceRef);
    if (previous && (previous.engineeringId !== reference.engineeringId || previous.mode !== reference.mode)) {
      unavailable.add(previous.field);
      unavailable.add(reference.field);
      continue;
    }
    referenceBySource.set(reference.sourceRef, reference);
  }

  const snapshots: EngineeringProfileSourceSnapshot[] = [];
  for (const reference of referenceBySource.values()) {
    const source = getEngineeringSourceByRef(database, reference.sourceRef);
    const valid = source
      && source.site === "kn"
      && source.purpose === "energy"
      && source.engineeringId === reference.engineeringId
      && source.mode === reference.mode
      && (source.mode === "daily-report" || source.mode === "cumulative-energy")
      && source.enabled
      && source.reviewStatus === "approved"
      && typeof source.approvedPublisherId === "string"
      && source.approvedPublisherId.trim().length > 0;
    if (!valid) {
      unavailable.add(reference.field);
      continue;
    }
    snapshots.push(snapshotEngineeringSource(source));
  }
  if (unavailable.size > 0) engineeringSourceUnavailable([...unavailable]);
  return snapshots.sort((left, right) => compareText(
    `${left.engineeringId}|${left.sourceRef}|${left.mode}`,
    `${right.engineeringId}|${right.sourceRef}|${right.mode}`
  ));
}

function capturePhysicalProfileSnapshot(
  database: Database.Database,
  profile: SiteEnergyProfileV1 | SiteEnergyProfileV2
): ProfileSourceSnapshot[] {
  const references = profile.schemaVersion === 1
    ? selectedReferences(profile)
    : v2MemberReferences(profile).physical;
  return capturePhysicalSourceSnapshot(database, profile, references);
}

export function captureProfileSourceSnapshot(
  database: Database.Database,
  profile: SiteEnergyProfileV1
): ProfileSourceSnapshot[];
export function captureProfileSourceSnapshot(
  database: Database.Database,
  profile: SiteEnergyProfileV2
): ProfileProviderSnapshot;
export function captureProfileSourceSnapshot(
  database: Database.Database,
  profile: SiteEnergyProfile
): ProfileSourceSnapshot[] | ProfileProviderSnapshot {
  if (profile.schemaVersion === 1) {
    return capturePhysicalProfileSnapshot(database, profile);
  }
  return captureProfileProviderSnapshot(database, profile);
}

export function captureProfileProviderSnapshot(
  database: Database.Database,
  profile: SiteEnergyProfile
): ProfileProviderSnapshot {
  if (profile.schemaVersion === 1 || profile.providerKind === "physical") {
    if (profile.schemaVersion === 2) {
      const references = v2MemberReferences(profile);
      if (references.engineering.length > 0) {
        sourceUnavailable(references.engineering.map(({ field }) => field));
      }
    }
    return {
      providerKind: "physical",
      sources: capturePhysicalProfileSnapshot(database, profile)
    };
  }
  const references = v2MemberReferences(profile);
  if (references.physical.length > 0) {
    engineeringSourceUnavailable(references.physical.map(({ field }) => field));
  }
  return {
    providerKind: "engineering",
    members: captureEngineeringSourceSnapshot(database, profile, references.engineering)
  };
}
