type RemoteSyncBannerProps = {
  onKeepEditing: () => void;
  onReloadNow: () => void | Promise<void>;
};

export function RemoteSyncBanner({
  onKeepEditing,
  onReloadNow
}: RemoteSyncBannerProps) {
  return (
    <div className="mgmt-status is-warning" role="status">
      <strong>遠端已有新資料，尚未套用。</strong>
      <small style={{ display: "block", marginTop: 4, opacity: 0.82 }}>
        目前會保留你的本地編輯。你可以稍後再說，或重新同步並放棄未儲存變更。
      </small>
      <div className="mgmt-action-row" style={{ marginTop: 12 }}>
        <button type="button" className="mgmt-action" onClick={onKeepEditing}>
          稍後再說
          <small>Keep Editing</small>
        </button>
        <button type="button" className="mgmt-action primary" onClick={() => void onReloadNow()}>
          重新同步
          <small>Reload Latest</small>
        </button>
      </div>
    </div>
  );
}
