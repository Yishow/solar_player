import type Database from "better-sqlite3";
import {
  DEFAULT_BOUNDARY_MAX_AGE_SECONDS,
  type MeterSourceDefinition,
  type SiteEnergyProfileV1
} from "@solar-display/shared";
import { getMeterSource } from "./meterSourceCatalogService.js";

export type ProfileSourceSnapshot = Omit<MeterSourceDefinition, "displayNameZh" | "displayNameEn" | "boundaryMaxAgeSeconds"> & {
  boundaryMaxAgeSeconds: number;
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

export function captureProfileSourceSnapshot(
  database: Database.Database,
  profile: SiteEnergyProfileV1
): ProfileSourceSnapshot[] {
  const references = selectedReferences(profile);
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
