import { useState } from "react";

type RemoteSyncBannerProps = {
  onKeepEditing: () => void;
  onReloadNow: () => void | Promise<void>;
};

/**
 * 遠端資料同步提示橫幅組件
 * 
 * 當偵測到遠端（例如 MQTT 伺服器或其他展示端）有最新已儲存的配置，
 * 而本地仍有未儲存的 draft 變更時，顯示此警告橫幅。
 * 提供使用者選擇「稍後再說（保留本地 draft）」或「重新同步（載入遠端最新資料）」。
 * 
 * @param props.onKeepEditing 點擊「稍後再說」時的 callback 函數
 * @param props.onReloadNow 點擊「重新同步」時的 callback 函數
 */
export function RemoteSyncBanner({
  onKeepEditing,
  onReloadNow
}: RemoteSyncBannerProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleReload = async () => {
    setIsLoading(true);
    try {
      await onReloadNow();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mgmt-status is-warning mgmt-remote-sync-banner" role="status">
      <div className="mgmt-remote-sync-banner__copy">
        <strong>遠端已有新資料，尚未套用。</strong>
        <small>目前保留你的本地編輯，你可以稍後再說，或重新同步並放棄未儲存變更。</small>
      </div>
      <div className="mgmt-action-row">
        <button
          type="button"
          className="mgmt-action"
          disabled={isLoading}
          onClick={onKeepEditing}
        >
          稍後再說
          <small>Keep Editing</small>
        </button>
        <button
          type="button"
          className="mgmt-action primary"
          disabled={isLoading}
          onClick={() => {
            void handleReload();
          }}
        >
          {isLoading ? "同步中..." : "重新同步"}
          <small>{isLoading ? "Reloading..." : "Reload Latest"}</small>
        </button>
      </div>
    </div>
  );
}
