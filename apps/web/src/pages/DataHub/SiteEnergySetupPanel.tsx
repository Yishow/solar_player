import { useEffect, useRef, useState } from "react";
import {
  currentProfileMonthSelection,
  nextSiteEnergySetupStep,
  previousSiteEnergySetupStep,
  type ProfileApplyResponse,
  type ProfilePreviewResponse,
  type SiteEnergyProfileV1,
  type SiteEnergySetupStep
} from "@solar-display/shared";
import { ApiRequestError, requestJson } from "../../services/api";
import { SiteEnergyPreviewReview, formatPreviewPeriod } from "./SiteEnergyPreviewReview";

const STEP_LABELS: Record<SiteEnergySetupStep, string> = {
  site: "確認廠區",
  total: "總進線",
  departments: "部門歸屬",
  basis: "比較基準"
};

type SiteEnergyProfileReadResponse = {
  meters?: Array<{ channelId: string; displayNameZh?: string | null; meterId: string }>;
  profile: SiteEnergyProfileV1 | null;
  receivedTags?: Array<{ tag: string | null; topic: string }>;
};

function readSiteEnergyProfile(scope: "cl" | "kn") {
  return requestJson<SiteEnergyProfileReadResponse>(`/api/data-hub/sites/${scope}/energy-profile`);
}

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

function stripApplyMetadata(response: ProfileApplyResponse): SiteEnergyProfileV1 {
  const {
    activationAsOf: _activationAsOf,
    readiness: _readiness,
    reviewAsOf: _reviewAsOf,
    ...profile
  } = response;
  return profile;
}

function isProfileReadinessStatus(value: unknown): value is SiteEnergyProfileV1["status"] {
  return value === "ready"
    || value === "configured-awaiting-data"
    || value === "incomplete"
    || value === "conflict";
}

function CoverageReview({
  checked,
  disabled,
  id,
  label,
  onChange
}: {
  checked: boolean;
  disabled: boolean;
  id: string;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-[40px] items-center gap-2 text-sm" data-site-energy-coverage-review={id}>
      <input
        checked={checked}
        data-site-energy-coverage={id}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      {label}
    </label>
  );
}

export function SiteEnergySetupPanel({ scope }: { scope: "cl" | "kn" }) {
  const [step, setStep] = useState<SiteEnergySetupStep>("site");
  const [draft, setDraft] = useState<SiteEnergyProfileV1>(() => emptyProfile(scope));
  const [message, setMessage] = useState("");
  const [expectedRevision, setExpectedRevision] = useState<number | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [meters, setMeters] = useState<Array<{ channelId: string; label: string }>>([]);
  const [previewSummary, setPreviewSummary] = useState("");
  const [previewResult, setPreviewResult] = useState<ProfilePreviewResponse | null>(null);
  const [previewToken, setPreviewToken] = useState("");
  const [previewExpectedRevision, setPreviewExpectedRevision] = useState<number | null>(null);
  const [basisConfirmed, setBasisConfirmed] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isRefreshingRevision, setIsRefreshingRevision] = useState(false);
  const [revisionRefreshBlocked, setRevisionRefreshBlocked] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const inputRevision = useRef(0);

  const clearPreview = () => {
    setPreviewToken("");
    setPreviewExpectedRevision(null);
    setPreviewSummary("");
    setPreviewResult(null);
  };

  const updateDraft = (next: SiteEnergyProfileV1, resetBasis = false) => {
    inputRevision.current += 1;
    setDraft(next);
    clearPreview();
    if (resetBasis) {
      setBasisConfirmed(false);
    }
  };

  const refreshExpectedRevision = async (successMessage: string) => {
    const requestRevision = inputRevision.current;
    setIsRefreshingRevision(true);
    try {
      const current = await readSiteEnergyProfile(scope);
      if (requestRevision !== inputRevision.current) {
        return false;
      }
      if (!Object.prototype.hasOwnProperty.call(current, "profile")) {
        throw new Error("PROFILE_REVISION_READ_INVALID");
      }
      setExpectedRevision(current.profile?.revision ?? 0);
      setProfileLoaded(true);
      setRevisionRefreshBlocked(false);
      setMessage(successMessage);
      return true;
    } catch {
      if (requestRevision !== inputRevision.current) {
        return false;
      }
      setExpectedRevision(null);
      setProfileLoaded(false);
      setRevisionRefreshBlocked(true);
      setMessage("目前設定版本讀取失敗，請重試讀取設定版本。");
      return false;
    } finally {
      if (requestRevision === inputRevision.current) {
        setIsRefreshingRevision(false);
      }
    }
  };

  useEffect(() => {
    let cancelled = false;
    inputRevision.current += 1;
    setStep("site");
    setDraft(emptyProfile(scope));
    setExpectedRevision(null);
    setProfileLoaded(false);
    setMeters([]);
    setMessage("");
    clearPreview();
    setBasisConfirmed(false);
    setIsPreviewing(false);
    setIsRefreshingRevision(false);
    setRevisionRefreshBlocked(false);
    setIsApplying(false);
    void readSiteEnergyProfile(scope)
      .then((payload) => {
        if (cancelled) {
          return;
        }
        if (payload.profile) {
          setDraft(payload.profile);
        }
        setExpectedRevision(payload.profile?.revision ?? 0);
        setRevisionRefreshBlocked(false);
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
          setExpectedRevision(null);
          setProfileLoaded(false);
          setMessage("廠區用電設定讀取失敗，請稍後重試。");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [scope]);

  const hasReviewedCoverage = draft.siteTotal.memberChannelIds.length > 0
    && draft.siteTotal.coverageReview === "reviewed"
    && draft.departments
      .filter((department) => department.memberChannelIds.length > 0)
      .every((department) => department.coverageReview === "reviewed");
  const controlsDisabled = isApplying || isPreviewing || isRefreshingRevision;
  const canPreview = profileLoaded && expectedRevision !== null && hasReviewedCoverage && basisConfirmed
    && !isPreviewing && !isApplying && !isRefreshingRevision;
  const previewReadiness = previewResult?.readiness?.status;
  const canApply = Boolean(previewToken && previewResult?.readiness)
    && basisConfirmed
    && previewExpectedRevision !== null
    && (previewReadiness === "ready" || previewReadiness === "configured-awaiting-data")
    && !isPreviewing
    && !isApplying
    && !isRefreshingRevision;

  const preview = async () => {
    if (!canPreview || expectedRevision === null) {
      return;
    }
    setMessage("");
    clearPreview();
    setIsPreviewing(true);
    const requestRevision = inputRevision.current;
    const requestDraft = draft;
    const requestExpectedRevision = expectedRevision;
    try {
      const periodSelection = currentProfileMonthSelection(requestDraft.siteTimeZone);
      const preview = await requestJson<ProfilePreviewResponse>(
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
      if (!preview.calculator || !preview.readiness || !preview.periodSelection
        || !isProfileReadinessStatus(preview.readiness.status)) {
        throw new Error("預覽回應缺少必要資料，請重試。");
      }
      setPreviewToken(preview.previewToken);
      setPreviewExpectedRevision(preview.expectedRevision);
      setPreviewResult(preview);
      setPreviewSummary(`期間 ${formatPreviewPeriod(preview.periodSelection)} 預覽完成，待確認。`);
    } catch (error) {
      if (requestRevision !== inputRevision.current) {
        return;
      }
      const code = error instanceof ApiRequestError ? error.body?.error : null;
      if (error instanceof ApiRequestError && error.statusCode === 409 && code === "PROFILE_REVISION_CONFLICT") {
        clearPreview();
        await refreshExpectedRevision("設定版本已更新，已保留目前草稿，請重新預覽。");
      } else {
        clearPreview();
        setMessage(code === "PROFILE_SOURCE_UNAVAILABLE"
          ? "所選來源目前不可用，請返回來源選擇確認電錶。"
          : code === "PROFILE_CALCULATOR_FAILED" || code === "CALCULATOR_FAILED"
            ? "預覽計算失敗，請重試。"
            : error instanceof Error ? error.message : "預覽失敗，請重試。");
      }
    } finally {
      if (requestRevision === inputRevision.current) {
        setIsPreviewing(false);
      }
    }
  };

  const apply = async () => {
    if (!canApply) {
      return;
    }
    const requestRevision = inputRevision.current;
    setIsApplying(true);
    setMessage("");
    try {
      const applied = await requestJson<ProfileApplyResponse>(
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
      const appliedProfile = stripApplyMetadata(applied);
      setExpectedRevision(appliedProfile.revision);
      setDraft(appliedProfile);
      setPreviewToken("");
      setPreviewExpectedRevision(null);
      setPreviewSummary("");
      setPreviewResult(null);
      setBasisConfirmed(false);
      setMessage(applied.readiness.status === "configured-awaiting-data"
        ? "廠區用電設定已套用，目前等待資料。"
        : "廠區用電設定已套用。");
    } catch (error) {
      if (requestRevision !== inputRevision.current) {
        return;
      }
      const code = error instanceof ApiRequestError ? error.body?.error : null;
      if (error instanceof ApiRequestError && error.statusCode === 409 && code === "PROFILE_REVISION_CONFLICT") {
        clearPreview();
        await refreshExpectedRevision("設定版本已更新，已保留目前草稿，請重新預覽。");
      } else if (error instanceof ApiRequestError && error.statusCode === 409
        && (code === "PROFILE_SOURCE_CONFLICT" || code === "PROFILE_SOURCE_REVIEW_REQUIRED")) {
        clearPreview();
        setMessage(code === "PROFILE_SOURCE_CONFLICT"
          ? "來源設定已變更，請重新預覽。"
          : "來源設定需要重新確認，請重新預覽。");
      } else if (error instanceof ApiRequestError && error.statusCode === 409
        && code === "PREVIEW_DRAFT_MISMATCH") {
        clearPreview();
        setMessage("草稿內容已變更，請重新預覽。");
      } else if (error instanceof ApiRequestError && error.statusCode === 409
        && code === "PROFILE_NOT_READY") {
        clearPreview();
        setMessage("目前資料尚未符合套用條件，請重新預覽確認。");
      } else if (error instanceof ApiRequestError && error.statusCode === 409
        && code === "PREVIEW_EXPIRED") {
        clearPreview();
        setMessage("預覽已過期，請重新預覽。");
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
        <div className="space-y-2">
          <MeterPicker
            disabled={controlsDisabled}
            onChange={(memberChannelIds) => updateDraft({
              ...draft,
              siteTotal: {
                ...draft.siteTotal,
                coverageReview: "needs-review",
                kind: "meter-set",
                memberChannelIds
              }
            })}
            options={meters}
            selected={draft.siteTotal.memberChannelIds}
          />
          {draft.siteTotal.memberChannelIds.length > 0 ? (
            <CoverageReview
              checked={draft.siteTotal.coverageReview === "reviewed"}
              disabled={controlsDisabled}
              id="site-total"
              label="我已確認總進線的來源覆蓋範圍與歸屬。"
              onChange={(checked) => updateDraft({
                ...draft,
                siteTotal: { ...draft.siteTotal, coverageReview: checked ? "reviewed" : "needs-review" }
              })}
            />
          ) : null}
        </div>
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
                  disabled={controlsDisabled}
                  onChange={(memberChannelIds) => {
                    const next = draft.departments.filter((entry) => entry.departmentId !== departmentId);
                    next.splice(index, 0, {
                      ...department,
                      coverageReview: "needs-review",
                      memberChannelIds
                    });
                    updateDraft({ ...draft, departments: next });
                  }}
                  options={meters}
                  selected={department.memberChannelIds}
                />
                {department.memberChannelIds.length > 0 ? (
                  <CoverageReview
                    checked={department.coverageReview === "reviewed"}
                    disabled={controlsDisabled}
                    id={departmentId}
                    label={`我已確認${department.nameZh}的來源覆蓋範圍與歸屬。`}
                    onChange={(checked) => {
                      const next = draft.departments.filter((entry) => entry.departmentId !== departmentId);
                      next.splice(index, 0, {
                        ...department,
                        coverageReview: checked ? "reviewed" : "needs-review"
                      });
                      updateDraft({ ...draft, departments: next });
                    }}
                  />
                ) : null}
              </fieldset>
            );
          })}
        </div>
      ) : null}
      {step === "basis" ? (
        <div className="space-y-2">
          <label className="block text-sm">
            占比分母
            <select
              className="mgmt-input mt-1 min-h-[40px]"
              disabled={controlsDisabled}
              onChange={(event) => {
                updateDraft({
                  ...draft,
                  shareBasis: { kind: event.target.value as SiteEnergyProfileV1["shareBasis"]["kind"] }
                }, true);
              }}
              value={draft.shareBasis.kind}
            >
              <option value="site-main">廠區總進線</option>
              <option value="department-sum">已管理部門合計</option>
            </select>
          </label>
          <label className="flex min-h-[40px] items-center gap-2 text-sm">
            <input
              checked={basisConfirmed}
              data-site-energy-basis-confirm
              disabled={controlsDisabled}
              onChange={(event) => setBasisConfirmed(event.target.checked)}
              type="checkbox"
            />
            我已確認目前比較基準：{draft.shareBasis.kind === "site-main" ? "廠區總進線" : "已管理部門合計"}
          </label>
        </div>
      ) : null}
      {previewSummary ? (
        <div className="space-y-2 text-sm" data-site-energy-preview>
          <p>{previewSummary}</p>
          {previewResult ? <SiteEnergyPreviewReview meters={meters} preview={previewResult} /> : null}
        </div>
      ) : null}
      {message ? <p className="text-sm text-[#8a4f18]" role="status">{message}</p> : null}
      {revisionRefreshBlocked ? (
        <button
          className="mgmt-action min-h-[40px]"
          disabled={controlsDisabled}
          onClick={() => void refreshExpectedRevision("目前設定版本已重新讀取，請重新預覽。")}
          type="button"
        >
          {isRefreshingRevision ? "讀取中…" : "重試讀取設定版本"}
        </button>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button className="mgmt-action min-h-[40px]" disabled={controlsDisabled} onClick={() => setStep(previousSiteEnergySetupStep(step))} type="button">
          上一步
        </button>
        {step !== "basis" ? (
          <button className="mgmt-action primary min-h-[40px]" disabled={controlsDisabled} onClick={() => setStep(nextSiteEnergySetupStep(step))} type="button">
            下一步
          </button>
        ) : null}
        {step === "basis" ? (
          previewToken ? (
            <button className="mgmt-action primary min-h-[40px]" disabled={!canApply} onClick={() => void apply()} type="button">
              確認套用
            </button>
          ) : (
            <button className="mgmt-action primary min-h-[40px]" disabled={!canPreview} onClick={() => void preview()} type="button">
              {isPreviewing ? "預覽中…" : "預覽變更"}
            </button>
          )
        ) : null}
      </div>
    </section>
  );
}
