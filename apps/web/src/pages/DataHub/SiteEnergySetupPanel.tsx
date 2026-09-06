import { useEffect, useState } from "react";
import {
  nextSiteEnergySetupStep,
  previousSiteEnergySetupStep,
  type SiteEnergyProfileV1,
  type SiteEnergySetupStep
} from "@solar-display/shared";
import { requestJson } from "../../services/api";

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

export function SiteEnergySetupPanel({ scope }: { scope: "cl" | "kn" }) {
  const [step, setStep] = useState<SiteEnergySetupStep>("site");
  const [draft, setDraft] = useState<SiteEnergyProfileV1>(() => emptyProfile(scope));
  const [message, setMessage] = useState("");
  const [expectedRevision, setExpectedRevision] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void requestJson<{ profile: SiteEnergyProfileV1 | null }>(`/api/data-hub/sites/${scope}/energy-profile`)
      .then((payload) => {
        if (cancelled || !payload.profile) {
          return;
        }
        setDraft(payload.profile);
        setExpectedRevision(payload.profile.revision);
      })
      .catch(() => {
        if (!cancelled) {
          setMessage("目前沒有已儲存的廠區用電設定，請從總進線開始。");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [scope]);

  const apply = async () => {
    setMessage("");
    try {
      const preview = await requestJson<{ previewToken: string }>(
        `/api/data-hub/sites/${scope}/energy-profile/preview`,
        {
          body: JSON.stringify({
            draft,
            expectedRevision,
            periodSelection: { kind: "month", month: 9, year: 2026 }
          }),
          method: "POST"
        }
      );
      const applied = await requestJson<SiteEnergyProfileV1>(
        `/api/data-hub/sites/${scope}/energy-profile/apply`,
        {
          body: JSON.stringify({
            draft,
            expectedRevision,
            idempotencyKey: `u6-${scope}-${Date.now()}`,
            previewToken: preview.previewToken
          }),
          method: "POST"
        }
      );
      setExpectedRevision(applied.revision);
      setDraft(applied);
      setMessage("廠區用電設定已套用。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "套用失敗。");
    }
  };

  return (
    <section className="mgmt-card space-y-4 p-4" data-site-energy-setup data-site-energy-step={step}>
      <h2 className="text-lg font-semibold text-[#1e2821]">{scope === "kn" ? "設定觀音用電" : "設定中壢用電"}</h2>
      <ol className="flex flex-wrap gap-2 text-sm">
        {(Object.keys(STEP_LABELS) as SiteEnergySetupStep[]).map((key) => (
          <li key={key} data-site-energy-step-label={key} className={key === step ? "font-semibold" : ""}>
            {STEP_LABELS[key]}
          </li>
        ))}
      </ol>
      {step === "site" ? (
        <p className="text-sm text-[#4d554f]">目前廠區是 {scope.toUpperCase()}。不會改成另一個廠區。</p>
      ) : null}
      {step === "total" ? (
        <label className="block text-sm">
          總進線 channel
          <input
            className="mgmt-input mt-1 min-h-[40px] w-full"
            onChange={(event) => setDraft({
              ...draft,
              siteTotal: {
                ...draft.siteTotal,
                kind: "meter-set",
                memberChannelIds: event.target.value.split(",").map((value) => value.trim()).filter(Boolean)
              }
            })}
            value={draft.siteTotal.memberChannelIds.join(",")}
          />
        </label>
      ) : null}
      {step === "departments" ? (
        <label className="block text-sm">
          部門（名稱:channel）
          <input
            className="mgmt-input mt-1 min-h-[40px] w-full"
            onChange={(event) => setDraft({
              ...draft,
              departments: event.target.value.split(";").filter(Boolean).map((row, index) => {
                const [nameZh, channelId] = row.split(":").map((part) => part.trim());
                return {
                  accountingIncluded: true,
                  coverageReview: "needs-review" as const,
                  departmentId: channelId || `dept-${index}`,
                  memberChannelIds: channelId ? [channelId] : [],
                  nameZh: nameZh || `部門 ${index + 1}`
                };
              })
            })}
            placeholder="沖壓:a;塗裝:b"
            value={draft.departments.map((department) => `${department.nameZh}:${department.memberChannelIds[0] ?? ""}`).join(";")}
          />
        </label>
      ) : null}
      {step === "basis" ? (
        <label className="block text-sm">
          占比分母
          <select
            className="mgmt-input mt-1 min-h-[40px]"
            onChange={(event) => setDraft({
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
      {message ? <p className="text-sm text-[#8a4f18]" role="status">{message}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button
          className="mgmt-action min-h-[40px]"
          onClick={() => setStep(previousSiteEnergySetupStep(step))}
          type="button"
        >
          上一步
        </button>
        {step === "basis" ? (
          <button className="mgmt-action primary min-h-[40px]" onClick={() => void apply()} type="button">
            檢查並套用
          </button>
        ) : (
          <button
            className="mgmt-action primary min-h-[40px]"
            onClick={() => setStep(nextSiteEnergySetupStep(step))}
            type="button"
          >
            下一步
          </button>
        )}
      </div>
    </section>
  );
}
