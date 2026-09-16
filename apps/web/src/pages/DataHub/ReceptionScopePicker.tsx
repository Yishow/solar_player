import { useMemo } from "react";
import type { ReceptionProfile } from "@solar-display/shared";

export type ReceptionScopePickerProps = {
  disabled?: boolean;
  onSelectProfile: (profile: ReceptionProfile) => void;
  profiles: ReceptionProfile[];
  selectedProfileId: string | null;
  siteScope: "cl" | "kn" | null;
};

export function ReceptionScopePicker({
  disabled = false,
  onSelectProfile,
  profiles,
  selectedProfileId,
  siteScope
}: ReceptionScopePickerProps) {
  const matchingProfiles = useMemo(() => {
    if (!siteScope) return [];
    return profiles.filter((profile) => profile.siteScope === siteScope);
  }, [profiles, siteScope]);

  if (!siteScope) {
    return (
      <div className="rounded-lg border border-[#ead7aa] bg-[#fff8e8] p-4 text-[13px] text-[#6b5524]" data-reception-no-scope>
        請先在上方選擇具體廠區（CL 或 KN），才能檢視已批准的接收範圍。全域範圍無法直接啟動接收。
      </div>
    );
  }

  if (matchingProfiles.length === 0) {
    return (
      <div className="rounded-lg border border-[#f0c2c2] bg-[#fcf0f0] p-4 text-[13px] text-[#8a1f1f]" data-reception-no-profiles>
        目前廠區（{siteScope.toUpperCase()}）尚未設定任何已批准的接收範圍。請聯繫系統管理員完成接收範圍授權。
      </div>
    );
  }

  return (
    <div className="space-y-3" data-reception-scope-picker>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-[13px] font-semibold text-[#4d554f]">
          選擇已批准的接收範圍 ({siteScope.toUpperCase()})
        </label>
        <span className="text-[12px] text-[#7b857d]">
          {matchingProfiles.length > 1 ? "存在多個授權範圍，請明確選擇" : "單一可用授權範圍"}
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {matchingProfiles.map((profile) => {
          const isSelected = profile.id === selectedProfileId;
          return (
            <button
              aria-pressed={isSelected}
              className={`flex flex-col items-start rounded-lg border p-3 text-left transition-colors min-h-[40px] ${
                isSelected
                  ? "border-[#1b4332] bg-[#eef8f2] text-[#1b4332] shadow-sm ring-1 ring-[#1b4332]"
                  : "border-[#d0d7d1] bg-white text-[#2d3730] hover:bg-[#f7faf8]"
              } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
              data-reception-profile-id={profile.id}
              disabled={disabled}
              key={profile.id}
              onClick={() => onSelectProfile(profile)}
              type="button"
            >
              <div className="flex w-full items-center justify-between gap-2">
                <span className="font-medium text-[14px]">{profile.name}</span>
                {profile.kind ? (
                  <span className="rounded bg-[#e2e8e3] px-1.5 py-0.5 text-[11px] font-semibold text-[#4d554f]">
                    {profile.kind === "engineering" ? "工程成果" : profile.kind === "solar" ? "Solar" : profile.kind === "physical" ? "實體" : "電力"}
                  </span>
                ) : null}
              </div>
              {profile.description ? (
                <p className="mt-1 text-[12px] text-[#687169] line-clamp-2">{profile.description}</p>
              ) : null}
              <div className="mt-2 text-[11px] text-[#7b857d]">
                授權過濾：<code className="rounded bg-[#f0f3f1] px-1 py-0.5">{profile.allowedFilters.join(", ")}</code>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
