import { useState } from "react";
import type { PairingTokenIssue } from "@solar-display/shared";
import type { DeviceFleetRow } from "./viewModel";

export type PairingDialogProps = {
  device: DeviceFleetRow;
  issue: PairingTokenIssue | null;
  mutationError: string;
  mutationPending: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
};

function resolveContextMessage(device: DeviceFleetRow) {
  if (
    device.groupId === null
    || device.groupName === null
    || device.siteScope === null
    || device.playbackProfileId === null
    || device.playbackProfileName === null
  ) {
    return "此 Device 尚未指派可用的 Group、Site Scope 或 Playback Profile，請先分組後再配對。";
  }
  if (!device.enabled) {
    return "此 Device 已停用，無法簽發配對連結。";
  }
  if (device.groupEnabled !== true) {
    return "此 Device 的 Group 已停用，無法簽發配對連結。";
  }
  return null;
}

export function PairingDialog({
  device,
  issue,
  mutationError,
  mutationPending,
  onClose,
  onConfirm
}: PairingDialogProps) {
  const [copied, setCopied] = useState(false);
  const contextMessage = resolveContextMessage(device);

  const copyPairingPath = async () => {
    if (!issue || typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }
    try {
      await navigator.clipboard.writeText(issue.pairingPath);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="device-fleet-dialog-backdrop" role="presentation">
      <section
        aria-labelledby="device-fleet-pairing-title"
        aria-modal="true"
        className="device-fleet-dialog"
        data-testid="pairing-dialog"
        role="dialog"
      >
        <small>DEVICE PAIRING</small>
        <h2 id="device-fleet-pairing-title">
          {issue ? "一次性配對連結" : "準備裝置配對"}
        </h2>
        <dl>
          <div data-field="pairing-device">
            <dt>Device</dt>
            <dd>{device.displayName} · {device.clientId}</dd>
          </div>
          <div data-field="pairing-group">
            <dt>Group</dt>
            <dd>{device.groupName ?? "未指派"}</dd>
          </div>
          <div data-field="pairing-site-scope">
            <dt>Site Scope</dt>
            <dd>{device.siteScope?.toUpperCase() ?? "未解析"}</dd>
          </div>
          <div data-field="pairing-playback-profile">
            <dt>Playback Profile</dt>
            <dd>{device.playbackProfileName ?? "未解析"}</dd>
          </div>
        </dl>

        {device.paired ? (
          <p>重新配對後，新 Credential 交換成功時會撤銷舊 Credential。</p>
        ) : null}
        {contextMessage ? <p role="alert">{contextMessage}</p> : null}
        {mutationError ? <p role="alert">{mutationError}</p> : null}

        {issue ? (
          <>
            <p>此連結只在本次建立後顯示；關閉視窗即從畫面記憶體清除。</p>
            <code>{issue.pairingPath}</code>
            <small>到期：{issue.expiresAt}</small>
            <div className="device-fleet-dialog__actions">
              <a
                className="device-fleet-dialog__link-button"
                data-action="open-pairing"
                href={issue.pairingPath}
                rel="noopener noreferrer"
                target="_blank"
              >
                在新分頁開啟配對
              </a>
              <button
                type="button"
                data-action="copy-pairing"
                onClick={() => void copyPairingPath()}
              >
                {copied ? "已複製" : "複製連結"}
              </button>
              <button
                type="button"
                data-action="close-pairing"
                onClick={() => {
                  setCopied(false);
                  onClose();
                }}
              >
                關閉並清除
              </button>
            </div>
          </>
        ) : (
          <div className="device-fleet-dialog__actions">
            <button
              type="button"
              data-action="confirm-pairing"
              disabled={mutationPending || contextMessage !== null}
              onClick={() => void onConfirm()}
            >
              簽發一次性配對連結
            </button>
            <button
              type="button"
              data-action="cancel-pairing"
              disabled={mutationPending}
              onClick={onClose}
            >
              取消
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
