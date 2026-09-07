import { useEffect, useRef, useState } from "react";
import {
  currentProfileMonthSelection,
  nextSiteEnergySetupStep,
  previousSiteEnergySetupStep,
  type SiteEnergyProfileV1,
  type SiteEnergySetupStep
} from "@solar-display/shared";
import { ApiRequestError, requestJson } from "../../services/api";

const STEP_LABELS: Record<SiteEnergySetupStep, string> = {
  site: "確認廠區",
  total: "總進線",
  departments: "部門歸屬",
  basis: "比較基準"
};

function emptyProfile(scope: "cl" | "kn"): SiteEnergyProfileV1 {
  return {
    departments: [],
    effectiveFrom: new Date().toISOString(),
    metricScope: scope,
    profileId: `${scope}-energy`,
    revision: 0,
    schemaVersion: 1,
    shareBasis: { kind: "site-main" },
    siteTimeZone: "Asia/Taipei",
    siteTotal: {
      coverageReview: "needs-review",
      kind: "meter-set",
      label: scope === "kn" ? "觀音總錶" : "中壢總錶",
      memberChannelIds: []
    },
    status: "incomplete"
  };
}

function MeterPicker({
  disabled = false,
  options,
  selected,
  onChange
}: {
  disabled?: boolean;
  onChange: (ids: string[]) => void;
  options: Array<{ channelId: string; label: string }>;
  selected: string[];
}) {
  const ids = options.length > 0 ? options : selected.map((channelId) => ({ channelId, label: channelId }));
  return (
    <ul className="space-y-1" data-meter-picker>
      {ids.map((option) => (
        <li key={option.channelId}>
          <label className="flex min-h-[40px] items-center gap-2 text-sm">
            <input
              checked={selected.includes(option.channelId)}
              data-meter-channel={option.channelId}
              disabled={disabled}
              onChange={(event) => {
                onChange(event.target.checked
                  ? [...selected, option.channelId]
                  : selected.filter((item) => item !== option.channelId));
              }}
              type="checkbox"
            />
            {option.label}
          </label>
        </li>
      ))}
    </ul>
  );
}

export function SiteEnergySetupPanel({ scope }: { scope: "cl" | "kn" }) {
  const [step, setStep] = useState<SiteEnergySetupStep>("site");
  const [draft, setDraft] = useState<SiteEnergyProfileV1>(() => emptyProfile(scope));
  const [message, setMessage] = useState("");
  const [expectedRevision, setExpectedRevision] = useState(0);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [meters, setMeters] = useState<Array<{ channelId: string; label: string }>>([]);
  const [previewSummary, setPreviewSummary] = useState("");
  const [previewToken, setPreviewToken] = useState("");
  const [previewExpectedRevision, setPreviewExpectedRevision] = useState<number | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const inputRevision = useRef(0);

  const updateDraft = (next: SiteEnergyProfileV1) => {
    inputRevision.current += 1;
    setDraft(next);
    setPreviewToken("");
    setPreviewExpectedRevision(null);
    setPreviewSummary("");
  };

  useEffect(() => {
    let cancelled = false;
    inputRevision.current += 1;
    setStep("site");
    setDraft(emptyProfile(scope));
    setExpectedRevision(0);
    setProfileLoaded(false);
    setMeters([]);
    setMessage("");
    setPreviewToken("");
    setPreviewExpectedRevision(null);
    setPreviewSummary("");
    setIsApplying(false);
    void requestJson<{
      meters?: Array<{ channelId: string; displayNameZh?: string | null; meterId: string }>;
      profile: SiteEnergyProfileV1 | null;
      receivedTags?: Array<{ tag: string | null; topic: string }>;
    }>(`/api/data-hub/sites/${scope}/energy-profile`)
      .then((payload) => {
        if (cancelled) {
          return;
        }
        if (payload.profile) {
          setDraft(payload.profile);
          setExpectedRevision(payload.profile.revision);
        }
        setMeters((payload.meters ?? []).map((meter) => ({
          channelId: meter.channelId,
          label: meter.displayNameZh || meter.channelId
        })));
        if ((payload.receivedTags ?? []).length > 0) {
          setMessage(`已接收 ${payload.receivedTags?.length} 個穩定 tag 來源，可直接選 channel，不必手填 mapping。`);
        }
        setProfileLoaded(true);
      })
      .catch(() => {
        if (!cancelled) {
          setMessage("廠區用電設定讀取失敗，請稍後重試。");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [scope]);

  const preview = async () => {
    if (!profileLoaded) {
      return;
    }
    setMessage("");
    const requestRevision = inputRevision.current;
    const requestDraft = draft;
    const requestExpectedRevision = expectedRevision;
    try {
      const periodSelection = currentProfileMonthSelection(requestDraft.siteTimeZone);
      const preview = await requestJson<{ calculator?: { period?: { valueKwh: string | null } }; previewToken: string }>(
        `/api/data-hub/sites/${scope}/energy-profile/preview`,
        {
          body: JSON.stringify({
            draft: requestDraft,
            expectedRevision: requestExpectedRevision,
            periodSelection
          }),
          method: "POST"
        }
      );
      if (requestRevision !== inputRevision.current) {
        return;
      }
      setPreviewToken(preview.previewToken);
      setPreviewExpectedRevision(requestExpectedRevision);
      setPreviewSummary(`期間 ${periodSelection.year}-${periodSelection.month} 預覽 ${preview.calculator?.period?.valueKwh ?? "尚無差值"}，待確認。`);
    } catch (error) {
      if (requestRevision !== inputRevision.current) {
        return;
      }
      setMessage(error instanceof ApiRequestError && error.body?.error === "PROFILE_SOURCE_UNAVAILABLE"
        ? "所選來源目前不可用，請返回來源選擇確認電錶。"
        : error instanceof Error ? error.message : "預覽失敗。");
    }
  };

  const apply = async () => {
    if (!previewToken || previewExpectedRevision === null) {
      return;
    }
    const requestRevision = inputRevision.current;
    setIsApplying(true);
    setMessage("");
    try {
      const applied = await requestJson<SiteEnergyProfileV1>(
        `/api/data-hub/sites/${scope}/energy-profile/apply`,
        {
          body: JSON.stringify({
            draft,
            expectedRevision: previewExpectedRevision,
            idempotencyKey: `u6-${scope}-${previewToken}`,
            previewToken
          }),
          method: "POST"
        }
      );
      if (requestRevision !== inputRevision.current) {
        return;
      }
      setExpectedRevision(applied.revision);
      setDraft(applied);
      setPreviewToken("");
      setPreviewExpectedRevision(null);
      setPreviewSummary("");
      setMessage("廠區用電設定已套用。");
    } catch (error) {
      if (requestRevision !== inputRevision.current) {
        return;
      }
      if (error instanceof ApiRequestError && error.statusCode === 409
        && (error.body?.error === "PROFILE_SOURCE_CONFLICT" || error.body?.error === "PROFILE_SOURCE_REVIEW_REQUIRED")) {
        setPreviewToken("");
        setPreviewExpectedRevision(null);
        setPreviewSummary("");
        setMessage(error.body.error === "PROFILE_SOURCE_CONFLICT"
          ? "來源設定已變更，請重新預覽。"
          : "來源設定需要重新確認，請重新預覽。");
      } else {
        setMessage(error instanceof Error ? error.message : "套用失敗。");
      }
    } finally {
      if (requestRevision === inputRevision.current) {
        setIsApplying(false);
      }
    }
  };

  return (
    <section className="mgmt-card space-y-4 p-4" data-site-energy-setup data-site-energy-step={step}>
      <h2 className="text-lg font-semibold text-[#1e2821]">{scope === "kn" ? "設定觀音用電" : "設定中壢用電"}</h2>
      <ol className="flex flex-wrap gap-2 text-sm">
        {(Object.keys(STEP_LABELS) as SiteEnergySetupStep[]).map((key) => (
          <li className={key === step ? "font-semibold" : ""} data-site-energy-step-label={key} key={key}>
            {STEP_LABELS[key]}
          </li>
        ))}
      </ol>
      {step === "site" ? (
        <p className="text-sm text-[#4d554f]">目前廠區是 {scope.toUpperCase()}。不會改成另一個廠區。</p>
      ) : null}
      {step === "total" ? (
        <MeterPicker
          disabled={isApplying}
          onChange={(memberChannelIds) => updateDraft({
            ...draft,
            siteTotal: { ...draft.siteTotal, kind: "meter-set", memberChannelIds }
          })}
          options={meters}
          selected={draft.siteTotal.memberChannelIds}
        />
      ) : null}
      {step === "departments" ? (
        <div className="space-y-3">
          {["stamping", "body", "painting"].map((departmentId, index) => {
            const department = draft.departments.find((entry) => entry.departmentId === departmentId) ?? {
              accountingIncluded: true,
              coverageReview: "needs-review" as const,
              departmentId,
              memberChannelIds: [] as string[],
              nameZh: departmentId === "stamping" ? "沖壓" : departmentId === "body" ? "車身" : "塗裝"
            };
            return (
              <fieldset className="space-y-1" key={departmentId}>
                <legend className="text-sm font-medium">{department.nameZh}</legend>
                <MeterPicker
                  disabled={isApplying}
                  onChange={(memberChannelIds) => {
                    const next = draft.departments.filter((entry) => entry.departmentId !== departmentId);
                    next.splice(index, 0, { ...department, memberChannelIds });
                    updateDraft({ ...draft, departments: next });
                  }}
                  options={meters}
                  selected={department.memberChannelIds}
                />
              </fieldset>
            );
          })}
        </div>
      ) : null}
      {step === "basis" ? (
        <label className="block text-sm">
          占比分母
          <select
            className="mgmt-input mt-1 min-h-[40px]"
            disabled={isApplying}
            onChange={(event) => updateDraft({
              ...draft,
              shareBasis: { kind: event.target.value as SiteEnergyProfileV1["shareBasis"]["kind"] },
              status: draft.siteTotal.memberChannelIds.length > 0 ? "ready" : "incomplete"
            })}
            value={draft.shareBasis.kind}
          >
            <option value="site-main">廠區總進線</option>
            <option value="department-sum">已管理部門合計</option>
          </select>
        </label>
      ) : null}
      {previewSummary ? <p className="text-sm" data-site-energy-preview>{previewSummary}</p> : null}
      {message ? <p className="text-sm text-[#8a4f18]" role="status">{message}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button className="mgmt-action min-h-[40px]" disabled={isApplying} onClick={() => setStep(previousSiteEnergySetupStep(step))} type="button">
          上一步
        </button>
        {step !== "basis" ? (
          <button className="mgmt-action primary min-h-[40px]" disabled={isApplying} onClick={() => setStep(nextSiteEnergySetupStep(step))} type="button">
            下一步
          </button>
        ) : null}
        {step === "basis" ? (
          previewToken ? (
            <button className="mgmt-action primary min-h-[40px]" disabled={isApplying} onClick={() => void apply()} type="button">
              確認套用
            </button>
          ) : (
            <button className="mgmt-action primary min-h-[40px]" disabled={!profileLoaded} onClick={() => void preview()} type="button">
              預覽變更
            </button>
          )
        ) : null}
      </div>
    </section>
  );
}
