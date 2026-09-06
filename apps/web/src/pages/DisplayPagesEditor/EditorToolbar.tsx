export function EditorToolbar({
  canRedo,
  canUndo,
  dirty,
  errorMessage,
  isPublishing,
  isSaving,
  onPreview,
  onPublishCheck,
  onRedo,
  onSave,
  onUndo,
  pageLabel,
  publishBlocked
}: {
  canRedo: boolean;
  canUndo: boolean;
  dirty: boolean;
  errorMessage: string;
  isPublishing: boolean;
  isSaving: boolean;
  onPreview: () => void;
  onPublishCheck: () => void;
  onRedo: () => void;
  onSave: () => void;
  onUndo: () => void;
  pageLabel: string;
  publishBlocked: boolean;
}) {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--shell-divider)] bg-white/80 px-4 py-2"
      data-editor-toolbar
    >
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--shell-subtitle-ink)]">目前頁面</p>
        <strong className="block truncate text-[14px] text-[var(--shell-title-ink)]" data-editor-toolbar-page>
          {pageLabel}
        </strong>
        <p
          className="text-[12px]"
          data-editor-toolbar-dirty={dirty}
          role="status"
        >
          {errorMessage || (dirty ? "有未儲存的草稿" : "草稿已同步")}
        </p>
      </div>
      <div className="flex flex-wrap gap-2" data-editor-toolbar-actions>
        <button className="mgmt-action min-h-[40px]" disabled={!canUndo} onClick={onUndo} type="button">復原</button>
        <button className="mgmt-action min-h-[40px]" disabled={!canRedo} onClick={onRedo} type="button">重做</button>
        <button className="mgmt-action min-h-[40px]" disabled={isSaving || !dirty} onClick={onSave} type="button" data-editor-toolbar-save>
          {isSaving ? "儲存中..." : "儲存草稿"}
        </button>
        <button className="mgmt-action min-h-[40px]" onClick={onPreview} type="button">預覽</button>
        <button
          className="mgmt-action primary min-h-[40px]"
          data-editor-toolbar-publish
          disabled={isPublishing || publishBlocked || dirty}
          onClick={onPublishCheck}
          type="button"
        >
          檢查並發布
        </button>
      </div>
    </div>
  );
}
