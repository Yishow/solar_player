import { useState, type FormEvent } from "react";
import type { DeviceGroup } from "@solar-display/shared";
import type { DeviceEditInput } from "./DeviceFleetContent";
import type { DeviceFleetRow } from "./viewModel";

export type DeviceEditDialogProps = {
  device: DeviceFleetRow;
  groups: DeviceGroup[];
  mutationPending: boolean;
  onClose: () => void;
  onSubmit: (input: DeviceEditInput) => Promise<boolean | void>;
};

export function DeviceEditDialog({
  device,
  groups,
  mutationPending,
  onClose,
  onSubmit
}: DeviceEditDialogProps) {
  const [displayName, setDisplayName] = useState(device.displayName);
  const [enabled, setEnabled] = useState(device.enabled);
  const [groupId, setGroupId] = useState(
    device.groupId === null ? "" : String(device.groupId)
  );

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!displayName.trim()) return;

    const parsedGroupId = Number(groupId);
    const selectedGroup = groups.find((group) => group.id === parsedGroupId);
    if (!selectedGroup || !Number.isInteger(parsedGroupId) || parsedGroupId <= 0) {
      return;
    }
    if (enabled && !selectedGroup.enabled) {
      return;
    }

    const saved = await onSubmit({
      displayName: displayName.trim(),
      enabled,
      groupId: parsedGroupId
    });
    if (saved !== false) {
      onClose();
    }
  };

  const selectedGroup = groups.find((group) => String(group.id) === groupId);
  const isSubmitDisabled =
    mutationPending ||
    !groupId ||
    (enabled && !selectedGroup?.enabled);

  return (
    <div className="device-fleet-dialog-backdrop" role="presentation">
      <section
        aria-labelledby="device-fleet-device-edit-title"
        aria-modal="true"
        className="device-fleet-dialog"
        data-testid="device-edit-dialog"
        role="dialog"
      >
        <small>DEVICE MANAGEMENT</small>
        <h2 id="device-fleet-device-edit-title">編輯裝置</h2>
        <form onSubmit={handleSubmit}>
          <label>
            顯示名稱
            <input
              className="mgmt-input"
              data-field="device-display-name"
              disabled={mutationPending}
              onChange={(event) => setDisplayName(event.target.value)}
              value={displayName}
            />
          </label>
          <label>
            群組
            <select
              className="mgmt-select"
              data-field="device-group"
              disabled={mutationPending}
              onChange={(event) => setGroupId(event.target.value)}
              value={groupId}
            >
              <option value="">選擇群組</option>
              {groups
                .filter((group) => !enabled || group.enabled)
                .map((group) => (
                  <option
                    disabled={enabled && !group.enabled}
                    key={group.id}
                    value={group.id}
                  >
                    {group.name} · {group.siteScope.toUpperCase()} · {group.playbackProfile.name}
                    {!group.enabled ? " · 已停用" : ""}
                  </option>
                ))}
            </select>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input
              checked={enabled}
              data-field="device-enabled"
              disabled={mutationPending}
              onChange={(event) => setEnabled(event.target.checked)}
              style={{ width: 18, height: 18, accentColor: "var(--green)" }}
              type="checkbox"
            />
            啟用裝置
          </label>
          <div className="device-fleet-dialog__actions">
            <button
              data-action="save-device-edit"
              disabled={isSubmitDisabled}
              type="submit"
            >
              儲存裝置
            </button>
            <button
              data-action="cancel-device-edit"
              disabled={mutationPending}
              onClick={onClose}
              type="button"
            >
              取消
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
