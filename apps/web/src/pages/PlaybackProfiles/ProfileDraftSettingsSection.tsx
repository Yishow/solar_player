import type { PlaybackProfileDraft } from "@solar-display/shared";
import { OpsSurface, OpsSurfaceTitle } from "../../components/management";

export type ProfileDraftSettingsSectionProps = {
  draft: PlaybackProfileDraft;
  onDraftChange: (nextDraft: PlaybackProfileDraft) => void;
};

const dayLabels = ["日", "一", "二", "三", "四", "五", "六"] as const;

export function ProfileDraftSettingsSection({
  draft,
  onDraftChange
}: ProfileDraftSettingsSectionProps) {
  const updateSettings = (
    partial: Partial<PlaybackProfileDraft["settings"]>
  ) => {
    onDraftChange({
      ...draft,
      settings: {
        ...draft.settings,
        ...partial
      }
    });
  };

  const enabledPages = draft.pages.filter((page) => page.enabled);

  return (
    <OpsSurface family="operations">
      <OpsSurfaceTitle
        caption="設定電視開機行為、螢幕亮度、夜間休眠排程與轉場效果"
        title="Draft 行為"
      />
      <div className="playback-profiles-settings">
        <label>
          起始頁面
          <select
            className="mgmt-select"
            onChange={(event) =>
              updateSettings({ startPage: Number(event.target.value) })
            }
            value={draft.settings.startPage}
          >
            {enabledPages.map((page) => (
              <option key={page.id} value={page.id}>
                {page.labelZh}
              </option>
            ))}
          </select>
        </label>

        <label>
          亮度 (%)
          <input
            className="mgmt-input"
            max="100"
            min="1"
            onChange={(event) =>
              updateSettings({ brightness: Number(event.target.value) })
            }
            type="number"
            value={draft.settings.brightness}
          />
        </label>

        <label>
          方向
          <select
            className="mgmt-select"
            onChange={(event) =>
              updateSettings({
                orientation: event.target
                  .value as PlaybackProfileDraft["settings"]["orientation"]
              })
            }
            value={draft.settings.orientation}
          >
            <option value="landscape">橫向 (Landscape)</option>
            <option value="portrait">直向 (Portrait)</option>
          </select>
        </label>

        <label className="profile-checkbox-label">
          <input
            checked={draft.settings.autoplay}
            onChange={(event) =>
              updateSettings({ autoplay: event.target.checked })
            }
            type="checkbox"
          />
          自動播放
        </label>

        <label className="profile-checkbox-label">
          <input
            checked={draft.settings.loop}
            onChange={(event) => updateSettings({ loop: event.target.checked })}
            type="checkbox"
          />
          循環播放
        </label>

        <label className="profile-checkbox-label">
          <input
            checked={draft.settings.scheduleEnabled}
            onChange={(event) =>
              updateSettings({ scheduleEnabled: event.target.checked })
            }
            type="checkbox"
          />
          啟用夜間排程
        </label>

        <label>
          開始時間
          <input
            className="mgmt-input"
            onChange={(event) =>
              updateSettings({ scheduleStart: event.target.value || null })
            }
            type="time"
            value={draft.settings.scheduleStart ?? ""}
          />
        </label>

        <label>
          結束時間
          <input
            className="mgmt-input"
            onChange={(event) =>
              updateSettings({ scheduleEnd: event.target.value || null })
            }
            type="time"
            value={draft.settings.scheduleEnd ?? ""}
          />
        </label>

        <label>
          轉場效果
          <select
            className="mgmt-select"
            onChange={(event) =>
              updateSettings({
                transitionType: event.target
                  .value as PlaybackProfileDraft["settings"]["transitionType"]
              })
            }
            value={draft.settings.transitionType}
          >
            <option value="fade">淡入淡出 (Fade)</option>
            <option value="slide">滑動 (Slide)</option>
            <option value="none">無轉場 (None)</option>
          </select>
        </label>

        <label>
          轉場毫秒
          <input
            className="mgmt-input"
            min="0"
            onChange={(event) =>
              updateSettings({ transitionSpeed: Number(event.target.value) })
            }
            type="number"
            value={draft.settings.transitionSpeed}
          />
        </label>

        <label>
          待機模式
          <select
            className="mgmt-select"
            onChange={(event) =>
              updateSettings({
                idleMode: event.target
                  .value as PlaybackProfileDraft["settings"]["idleMode"]
              })
            }
            value={draft.settings.idleMode}
          >
            <option value="disabled">停用</option>
            <option value="return-to-start">回到起始頁</option>
          </select>
        </label>

        <label>
          待機秒數
          <input
            className="mgmt-input"
            min="1"
            onChange={(event) =>
              updateSettings({ idleTimeout: Number(event.target.value) })
            }
            type="number"
            value={draft.settings.idleTimeout}
          />
        </label>

        <fieldset className="profile-repeat-days-fieldset">
          <legend>重複排程星期</legend>
          <div className="profile-repeat-days">
            {[0, 1, 2, 3, 4, 5, 6].map((day) => {
              const isChecked = draft.settings.repeatDays.includes(day);
              return (
                <label
                  className={`profile-day-pill ${isChecked ? "is-selected" : ""}`}
                  key={day}
                >
                  <input
                    checked={isChecked}
                    onChange={(event) =>
                      updateSettings({
                        repeatDays: event.target.checked
                          ? [...draft.settings.repeatDays, day].sort()
                          : draft.settings.repeatDays.filter(
                              (candidate) => candidate !== day
                            )
                      })
                    }
                    type="checkbox"
                  />
                  <span>{dayLabels[day]}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      </div>
    </OpsSurface>
  );
}
