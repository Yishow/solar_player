import { useState } from "react";
import {
  checkCumulativeBaseline,
  type GuidedMappingBatchApplyResult,
  type GuidedMappingBatchPreviewResult,
  type GuidedMappingApplyResult,
  type MappingPreviewDraft
} from "@solar-display/shared";
import { requestJson } from "../../services/api";

function describeApplyResult(result: Partial<GuidedMappingApplyResult>) {
  const saved = "對應已保存。";
  if (!result.activation) {
    return saved;
  }
  const reception = result.reception?.observed ? "已收到資料。" : "尚未收到資料。";
  if (result.activation.state === "active") {
    return `${saved}訂閱已生效（${result.activation.topic}）。${reception}`;
  }
  if (result.activation.state === "inactive") {
    return `${saved}來源目前為停用，未建立自身訂閱。`;
  }
  const retry = result.activation.retryable ? "可重試套用，不需重新新增來源。" : "";
  return `${saved}訂閱尚未生效：${result.activation.reason ?? result.activation.state}。${retry}${reception}`;
}

function describeBatchApplyResult(result: Partial<GuidedMappingBatchApplyResult>) {
  const items = result.items ?? [];
  const active = items.filter((item) => item.activation?.state === "active").length;
  const pending = items.length - active;
  return `已保存 ${items.length} 筆對應。${active} 筆訂閱已生效，${pending} 筆仍待 runtime 確認。`;
}

type ApplyResult = Partial<GuidedMappingApplyResult> | Partial<GuidedMappingBatchApplyResult>;

function describeResult(result: ApplyResult) {
  return "items" in result ? describeBatchApplyResult(result) : describeApplyResult(result);
}

export function MappingPreviewAndApply({
  batch,
  draft,
  onApplied,
  onMessage,
  previewToken,
  sampleCount = 1
}: {
  batch?: GuidedMappingBatchPreviewResult;
  draft?: MappingPreviewDraft;
  onApplied?: (result: ApplyResult) => void;
  onMessage?: (msg: string) => void;
  previewToken: string;
  sampleCount?: number;
}) {
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<ApplyResult | null>(null);
  const [localMessage, setLocalMessage] = useState("");

  const updateMessage = (msg: string) => {
    setLocalMessage(msg);
    onMessage?.(msg);
  };

  const previewDraft = draft ?? batch?.items[0]?.canonicalDraft;
  const baselineCheck = previewDraft
    ? checkCumulativeBaseline(previewDraft.measurementKind, sampleCount)
    : { baselineAvailable: false, message: "預覽資料不完整。" };

  const handleApply = () => {
    if (batch) {
      if (!batch.batchToken || batch.items.length === 0) return;
      setApplying(true);
      updateMessage("");
      const idempotencyKey = `m2-batch-${batch.batchToken}`;
      void requestJson<Partial<GuidedMappingBatchApplyResult>>("/api/data-hub/mqtt-mappings/batch-apply", {
        body: JSON.stringify({
          batchToken: batch.batchToken,
          idempotencyKey,
          items: batch.items.map(({ canonicalDraft, previewToken, rowId }) => ({
            canonicalDraft,
            meterId: canonicalDraft.source?.meterId ?? "",
            previewToken,
            rowId,
            source: canonicalDraft.source,
            topic: canonicalDraft.topic
          }))
        }),
        method: "POST"
      })
        .then((result) => {
          setApplyResult(result);
          updateMessage(describeBatchApplyResult(result));
          onApplied?.(result);
        })
        .catch((error: unknown) => {
          const err = error as { message?: string; status?: number };
          updateMessage(err.status === 409
            ? "設定發生衝突 (409 Conflict)，請重新檢閱並產生最新預覽。"
            : err.message ?? "套用批次對應失敗，請重試。");
        })
        .finally(() => setApplying(false));
      return;
    }
    if (!draft?.source || !draft.topic || !previewToken) return;
    setApplying(true);
    updateMessage("");

    // Use deterministic idempotencyKey tied to this previewToken
    const idempotencyKey = `m2-${previewToken}`;

    void requestJson<Partial<GuidedMappingApplyResult>>("/api/data-hub/mqtt-mappings/apply", {
      body: JSON.stringify({
        canonicalDraft: draft,
        idempotencyKey,
        meterId: draft.source?.meterId ?? "",
        previewToken,
        source: draft.source,
        topic: draft.topic
      }),
      method: "POST"
    })
      .then((result) => {
        setApplyResult(result);
        const resultMsg = describeApplyResult(result);
        updateMessage(resultMsg);
        onApplied?.(result);
      })
      .catch((error: unknown) => {
        const err = error as { message?: string; status?: number };
        if (err.status === 409) {
          updateMessage("設定發生衝突 (409 Conflict)，請重新檢閱並產生最新預覽。");
        } else {
          updateMessage(err.message ?? "套用對應失敗，請重試。");
        }
      })
      .finally(() => {
        setApplying(false);
      });
  };

  if (!previewDraft) {
    return null;
  }

  return (
    <div className="space-y-3 rounded-lg border border-[#e2e8e3] bg-[#fbfdfb] p-4" data-mapping-preview-apply>
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-[#1e2821]">預覽與套用審查</h4>
        <span className="font-mono text-xs text-[#526055]" data-mapping-preview-token={previewToken}>
          {batch ? `批次 Token: ${batch.batchToken}` : `Token: ${previewToken}`}
        </span>
      </div>

      {batch ? (
        <ul className="space-y-1 text-xs text-[#526055]" data-mapping-batch-preview-tokens>
          {batch.items.map(({ previewToken, rowId }) => <li key={rowId}>{rowId}: {previewToken}</li>)}
        </ul>
      ) : null}

      <p className="text-sm text-[#4d554f]">預覽已完成，尚未套用。請核對以下 Canonical 解析設定：</p>

      <div className="grid gap-2 rounded border border-[#d3ded4] bg-white p-3 text-xs md:grid-cols-2">
        <div>
          <span className="font-semibold text-[#526055]">目標電錶／來源：</span>
          {batch ? (
            <ul className="space-y-1 font-mono">
              {batch.items.map(({ canonicalDraft, rowId, reused }) => (
                <li key={rowId}>{canonicalDraft.source?.channelId ?? canonicalDraft.channelId}{reused ? "（既有對應）" : ""}</li>
              ))}
            </ul>
          ) : (
            <p className="font-mono">{draft?.source?.channelId ?? draft?.channelId}</p>
          )}
        </div>
        <div>
          <span className="font-semibold text-[#526055]">Topic：</span>
          {batch ? (
            <ul className="space-y-1 font-mono">
              {batch.items.map(({ canonicalDraft, rowId }) => <li key={rowId}>{canonicalDraft.topic}</li>)}
            </ul>
          ) : <p className="font-mono">{draft?.topic}</p>}
        </div>
        <div>
          <span className="font-semibold text-[#526055]">計量類型 / 角色：</span>
          <p>{previewDraft.measurementKind} ({previewDraft.energyFlowRole})</p>
        </div>
        <div>
          <span className="font-semibold text-[#526055]">欄位選取路徑：</span>
          <p className="font-mono">
            {previewDraft.selector.path.join(".")}
            {previewDraft.selector.tagEquals ? ` (tag=${previewDraft.selector.tagEquals})` : ""}
          </p>
        </div>
        <div>
          <span className="font-semibold text-[#526055]">時間戳政策：</span>
          <p>{previewDraft.timestampPolicy}</p>
        </div>
        <div>
          <span className="font-semibold text-[#526055]">單位與乘數：</span>
          <p>{previewDraft.source?.inputUnit ?? "kWh"} (scale: {previewDraft.source?.scaleDecimal ?? "1"})</p>
        </div>
      </div>

      {!baselineCheck.baselineAvailable && baselineCheck.message ? (
        <div className="rounded border border-[#ead7aa] bg-[#fff8e8] p-2.5 text-xs text-[#8a4f18]">
          {baselineCheck.message}
        </div>
      ) : null}

      {applyResult ? (
        <div className="rounded border border-[#c4e3c9] bg-[#eef7f0] p-3 text-sm text-[#2d5f35]">
          <p className="font-semibold">✓ {describeResult(applyResult)}</p>
        </div>
      ) : null}

      {localMessage && !applyResult ? (
        <p className="text-sm text-[#8a4f18]" role="status">
          {localMessage}
        </p>
      ) : null}

      {(!previewDraft.source || !previewDraft.topic || (batch && batch.items.length === 0)) ? (
        <p className="text-sm text-[#b53a25]" data-mapping-apply-blocked>
          目前來源資料不完整，已停用套用。
        </p>
      ) : (
        <button
          className="mgmt-action primary min-h-[40px]"
          disabled={applying || (!batch && (!draft?.source || !draft.topic))}
          onClick={handleApply}
          type="button"
        >
          {applying ? "套用中..." : "套用對應"}
        </button>
      )}
    </div>
  );
}
