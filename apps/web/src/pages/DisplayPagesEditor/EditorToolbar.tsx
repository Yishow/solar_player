export function EditorToolbar({
  canEdit,
  canRedo,
  canUndo,
  dirty,
  errorMessage,
  isPublishing,
  isLoading,
  isSaving,
  isSavingAndChecking = false,
  onPreview,
  onPublishCheck,
  onRedo,
  onReload,
  onSave,
  onUndo,
  pageLabel,
  publishBlocked
}: {
  canEdit: boolean;
  canRedo: boolean;
  canUndo: boolean;
  dirty: boolean;
  errorMessage: string;
  isPublishing: boolean;
  isLoading: boolean;
  isSaving: boolean;
  isSavingAndChecking?: boolean;
  onPreview: () => void;
  onPublishCheck: () => void;
  onRedo: () => void;
  onReload: () => void;
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
          {errorMessage || (isLoading ? "正在載入草稿，暫停編輯。" : !canEdit ? "草稿尚未就緒，請重新同步。" : dirty ? "有未儲存的草稿" : "草稿已同步")}
        </p>
      </div>
      <div className="flex flex-wrap gap-2" data-editor-toolbar-actions>
        <button className="mgmt-action min-h-[40px]" disabled={!canEdit || !canUndo} onClick={onUndo} type="button">復原</button>
        <button className="mgmt-action min-h-[40px]" disabled={!canEdit || !canRedo} onClick={onRedo} type="button">重做</button>
        <button className="mgmt-action min-h-[40px]" disabled={!canEdit || isSaving || !dirty} onClick={onSave} type="button" data-editor-toolbar-save>
          {isSaving ? "儲存中..." : "儲存草稿"}
        </button>
        <button className="mgmt-action min-h-[40px]" disabled={isLoading || isSaving} onClick={onReload} type="button">重新同步</button>
        <button className="mgmt-action min-h-[40px]" onClick={onPreview} type="button">預覽</button>
        <button
          className="mgmt-action primary min-h-[40px]"
          data-editor-toolbar-publish
          disabled={!canEdit || isPublishing || isSaving || isSavingAndChecking || (publishBlocked && !dirty)}
          onClick={onPublishCheck}
          type="button"
        >
          {isPublishing
            ? "發布中..."
            : isSavingAndChecking
              ? "儲存並檢查中..."
              : isSaving
                ? "儲存中..."
                : "檢查並發布"}
        </button>
      </div>
    </div>
  );
}
