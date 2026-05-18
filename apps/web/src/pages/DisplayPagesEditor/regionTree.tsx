import type { ResolvedDisplayEditorRegion } from "./inspectorFields";

export function DisplayEditorLeftPanel({
  dirty,
  editMode,
  errorMessage,
  isLoading,
  isPublishing,
  isPublishBlocked,
  isSaving,
  message,
  onPublish,
  onReload,
  onSave,
  onSelectRegion,
  onToggleRegionLock,
  regions,
  lockedRegionIds,
  selectedRegionId
}: {
  dirty: boolean;
  editMode: boolean;
  errorMessage: string;
  isLoading: boolean;
  isPublishing: boolean;
  isPublishBlocked: boolean;
  isSaving: boolean;
  message: string;
  onPublish: () => void;
  onReload: () => void;
  onSave: () => void;
  onSelectRegion: (regionId: string) => void;
  onToggleRegionLock: (regionId: string) => void;
  regions: ResolvedDisplayEditorRegion[];
  selectedRegionId: string | null;
  lockedRegionIds: string[];
}) {
  return (
    <section className="flex h-full flex-col border-r border-[var(--shell-divider)] bg-white/70 backdrop-blur-sm">
      <div className="shrink-0 px-4 pt-4 pb-2">
        <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--shell-subtitle-ink)]">
          Region Tree
        </p>
        <p className="mt-1 text-[12px] text-[var(--shell-copy-ink)]">
          {editMode ? "從樹狀清單選取或鎖定 region。" : "開啟 Edit Mode 後可直接管理 region。"}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-2">
        <div className="grid gap-2">
          {regions.map((region) => {
            const isSelected = selectedRegionId === region.id;
            const isLocked = lockedRegionIds.includes(region.id);
            return (
              <div
                key={region.id}
                className={[
                  "rounded-[16px] border px-3 py-2",
                  isSelected
                    ? "border-[var(--shell-accent)] bg-[rgba(95,140,80,0.08)]"
                    : "border-[var(--shell-divider)] bg-white/80"
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    className="min-w-0 flex-1 text-left"
                    onClick={() => onSelectRegion(region.id)}
                  >
                    <div className="break-words text-[14px] font-semibold text-[var(--shell-title-ink)]">
                      {region.label}
                    </div>
                    <div className="mt-1 text-[11px] text-[var(--shell-subtitle-ink)]">{region.id}</div>
                  </button>
                  <button
                    type="button"
                    aria-label={`${region.label} ${isLocked ? "unlock" : "lock"}`}
                    className={[
                      "rounded-full px-3 py-1 text-[11px] font-semibold",
                      isLocked
                        ? "bg-[rgba(82,91,66,0.12)] text-[var(--shell-title-ink)]"
                        : "border border-[var(--shell-divider)] text-[var(--shell-copy-ink)]"
                    ].join(" ")}
                    onClick={() => onToggleRegionLock(region.id)}
                  >
                    {isLocked ? "已鎖定" : "可拖曳"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="shrink-0 border-t border-[var(--shell-divider)] px-4 py-3 space-y-3">
        <div
          className={[
            "rounded-[18px] border px-3 py-2 text-[12px] leading-5",
            errorMessage
              ? "border-[rgba(180,82,52,0.25)] bg-[rgba(180,82,52,0.08)] text-[#8f452d]"
              : dirty
                ? "border-[rgba(201,136,26,0.24)] bg-[rgba(201,136,26,0.08)] text-[#8e6410]"
                : "border-[var(--shell-divider)] bg-[rgba(82,91,66,0.05)] text-[var(--shell-copy-ink)]"
          ].join(" ")}
          role="status"
        >
          {errorMessage || message}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="flex-1 rounded-full border border-[var(--shell-divider)] px-3 py-2 text-[12px] font-semibold text-[var(--shell-copy-ink)] disabled:opacity-55"
            disabled={isLoading}
            onClick={onReload}
          >
            重新同步
          </button>
          <button
            type="button"
            className="flex-1 rounded-full bg-[var(--shell-accent)] px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-55"
            disabled={isLoading || isSaving || !dirty}
            onClick={onSave}
          >
            {isSaving ? "儲存中..." : "儲存設定"}
          </button>
          <button
            type="button"
            className="flex-1 rounded-full bg-[var(--shell-title-ink)] px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-55"
            disabled={isLoading || isSaving || isPublishing || isPublishBlocked}
            onClick={onPublish}
          >
            {isPublishing ? "發布中..." : "發布草稿"}
          </button>
        </div>
      </div>
    </section>
  );
}
