import type { PeriodConsumptionResult, ProfilePreviewResponse, SiteEnergyProfileV1 } from "@solar-display/shared";

function formatRatio(ratio: number | null) {
  if (ratio === null) {
    return "—";
  }
  const percent = ratio * 100;
  return `${Number.isInteger(percent) ? percent : percent.toFixed(2)}%`;
}

export function formatPreviewPeriod(period: ProfilePreviewResponse["periodSelection"]) {
  if (period.kind === "year") {
    return String(period.year);
  }
  if (period.kind === "day") {
    return `${period.year}-${String(period.month ?? 1).padStart(2, "0")}-${String(period.day ?? 1).padStart(2, "0")}`;
  }
  return `${period.year}-${String(period.month ?? 1).padStart(2, "0")}`;
}

function qualityLabel(quality: PeriodConsumptionResult["quality"]) {
  switch (quality) {
    case "exact":
      return "完整";
    case "estimated-boundary":
      return "邊界估算";
    case "partial":
      return "部分覆蓋";
    case "unavailable":
      return "資料不足";
    case "invalid":
      return "資料無效";
  }
}

function resultValue(result: PeriodConsumptionResult | undefined) {
  return result?.valueKwh ?? "—";
}

function coverageLabel(result: PeriodConsumptionResult | undefined) {
  const coverage = result?.dailyCoverage;
  if (!coverage) {
    return "未提供覆蓋證據";
  }
  return `${coverage.coveredDays}/${coverage.totalDays} 日${coverage.isComplete ? "完整" : "不足"}`;
}

function isMissingBaseline(result: PeriodConsumptionResult | undefined) {
  return result?.issues?.some((issue) => issue.includes("MISSING_BASELINE")) ?? false;
}

function readinessLabel(status: SiteEnergyProfileV1["status"] | undefined) {
  switch (status) {
    case "ready":
      return "已就緒";
    case "configured-awaiting-data":
      return "設定已確認，等待資料";
    case "conflict":
      return "來源或設定衝突，需重新預覽";
    case "incomplete":
      return "設定尚未完整";
    default:
      return "尚未取得資料狀態";
  }
}

type MeterLabel = { channelId: string; label: string };

function channelLabel(meters: MeterLabel[], channelId: string) {
  return meters.find((meter) => meter.channelId === channelId)?.label ?? channelId;
}

function departmentLabel(preview: ProfilePreviewResponse, departmentId: string) {
  return preview.calculator.departments.find((entry) => entry.departmentId === departmentId)?.nameZh ?? departmentId;
}

function reasonLabel(preview: ProfilePreviewResponse, reason: string, meters: MeterLabel[]) {
  if (reason === "SITE_TOTAL_REQUIRED") {
    return "尚未選擇總進線來源";
  }
  if (reason === "SITE_TOTAL_COVERAGE_REVIEW_REQUIRED") {
    return "總進線來源覆蓋尚未確認";
  }
  if (reason === "SITE_TOTAL_WAITING_FOR_DATA") {
    return "總進線等待期間資料";
  }
  if (reason === "SHARE_BASIS_REQUIRED") {
    return "比較基準尚未完整";
  }
  if (reason === "SHARE_BASIS_ZERO") {
    return "比較基準期間值為零，無法計算占比";
  }
  if (reason === "PROFILE_REVISION_BOUNDARY") {
    return "草稿期間跨越正式設定生效邊界，需等待完整期間資料";
  }
  if (reason.startsWith("MISSING_BASELINE:") || reason.includes(":MISSING_BASELINE:")) {
    const channelId = reason.split(":").at(-1) ?? "";
    return `缺少${channelLabel(meters, channelId)}的期間基準資料`;
  }
  if (reason.includes("STALE_BOUNDARY:")) {
    return `${channelLabel(meters, reason.split(":").at(-1) ?? "")}的期間端點已過舊，請確認電錶持續回傳資料`;
  }
  if (reason.startsWith("DEPARTMENT_COVERAGE_REVIEW_REQUIRED:")) {
    return `${departmentLabel(preview, reason.slice(reason.indexOf(":") + 1))} 部門的來源覆蓋尚未確認`;
  }
  if (reason.startsWith("DEPARTMENT_SOURCES_REQUIRED:")) {
    return `${departmentLabel(preview, reason.slice(reason.indexOf(":") + 1))} 部門尚未選擇來源`;
  }
  if (reason.startsWith("DEPARTMENT_RATIO_UNAVAILABLE:")) {
    return `${departmentLabel(preview, reason.slice(reason.indexOf(":") + 1))} 部門占比尚不可用`;
  }
  if (reason.startsWith("SITE_TOTAL:")) {
    return `總進線資料需要檢查（${reason.slice("SITE_TOTAL:".length)}）`;
  }
  if (reason.startsWith("SHARE_BASIS:")) {
    return `比較基準資料需要檢查（${reason.slice("SHARE_BASIS:".length)}）`;
  }
  return "部分資料需要檢查";
}

function reasonDetail(preview: ProfilePreviewResponse, reason: string, meters: MeterLabel[]) {
  return reasonLabel(preview, reason, meters) === "部分資料需要檢查" ? reason : null;
}

export function SiteEnergyPreviewReview({ preview, meters = [] }: { preview: ProfilePreviewResponse; meters?: MeterLabel[] }) {
  const periodResult = preview.calculator.period;
  const basisLabel = preview.profile.shareBasis.kind === "site-main" ? "廠區總進線"
    : preview.profile.shareBasis.kind === "department-sum" ? "已管理部門合計" : "指定電錶";
  return (
    <div className="space-y-2 rounded border border-[#d9e0da] p-3" data-site-energy-review>
      <p>以下是目前草稿的預覽結果，尚未成為正式設定。</p>
      <p>
        評估期間 {formatPreviewPeriod(preview.periodSelection)} · 資料時間 {preview.asOf} · 廠區時區 {preview.siteTimeZone}
      </p>
      <p>設定生效時間 {preview.profile.effectiveFrom} · 比較基準 {basisLabel}</p>
      <p>預覽來源：{preview.sources.map((source) => `${channelLabel(meters, source.channelId)}（${source.channelId}）`).join("、") || "—"}</p>
      <p data-site-energy-readiness>
        資料狀態：{readinessLabel(preview.readiness.status)}
        {preview.readiness.reasons.length > 0 ? (
          <span>（{[...new Set(preview.readiness.reasons.map((reason) => reasonLabel(preview, reason, meters)))].join("、")}）</span>
        ) : null}
      </p>
      <div className="space-y-1" data-site-energy-calculator>
        <p>
          總量：{resultValue(periodResult)} kWh（品質 {qualityLabel(periodResult.quality)}，期間覆蓋證據 {coverageLabel(periodResult)}）
        </p>
        <p>
          比較基準：{preview.calculator.basis.memberChannelIds.map((id) => channelLabel(meters, id)).join("、") || "—"}
          ，{resultValue(preview.calculator.basis.result)} kWh（品質 {qualityLabel(preview.calculator.basis.result.quality)}）
        </p>
        {preview.calculator.departments.map((department) => (
          <p key={department.departmentId}>
            {department.nameZh}：{resultValue(department.result)} kWh · 占比 {formatRatio(department.ratio)} · 品質 {qualityLabel(department.result.quality)} · 期間覆蓋證據 {coverageLabel(department.result)}
          </p>
        ))}
      </div>
      {isMissingBaseline(periodResult) ? (
        <p data-site-energy-missing-baseline>
          缺少期間基準：{periodResult.issues?.map((issue) => reasonLabel(preview, issue, meters)).join("、")}。請確認電錶已提供期間開始前的累積讀值。
        </p>
      ) : null}
      {preview.readiness.status === "configured-awaiting-data" ? (
        <p>目前資料不足，套用後會保存設定並等待資料。</p>
      ) : null}
      {preview.readiness.reasons.some((reason) => reasonDetail(preview, reason, meters) !== null) ? (
        <details>
          <summary>查看技術診斷代碼</summary>
          <p>{preview.readiness.reasons.filter((reason) => reasonDetail(preview, reason, meters) !== null).join("、")}</p>
        </details>
      ) : null}
    </div>
  );
}
