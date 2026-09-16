import { useEffect, useState } from "react";
import { requestJson } from "../../services/api";

export type SourceUsageImpact = {
  canMutate: boolean;
  consumers: Array<{ kind: string; metricKey: string; pageId?: string }>;
  unknown: boolean;
};

export function SourceInspectorUsagePanel({
  metricKey,
  metricScope
}: {
  metricKey: string;
  metricScope: string;
}) {
  const [impact, setImpact] = useState<SourceUsageImpact | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadUsage = () => {
    setIsLoading(true);
    setErrorMessage("");
    requestJson<SourceUsageImpact>(
      `/api/data-hub/source-impact?metricKey=${encodeURIComponent(metricKey)}&metricScope=${encodeURIComponent(metricScope)}`
    )
      .then((data) => {
        setImpact(data);
      })
      .catch((err: unknown) => {
        setErrorMessage(err instanceof Error ? err.message : "查詢使用情況失敗");
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadUsage();
  }, [metricKey, metricScope]);

  if (isLoading) {
    return (
      <div className="mgmt-card p-5 text-center text-sm text-[#687169]" data-usage-loading>
        正在查詢系統引用狀況...
      </div>
    );
  }

  if (errorMessage || impact?.unknown) {
    return (
      <div className="mgmt-card space-y-3 p-4" data-usage-unknown>
        <div className="rounded border border-[#ead7aa] bg-[#fff8e8] p-3 text-[13px] text-[#6b5524]" role="alert">
          <strong>引用情況未知</strong>
          <p className="mt-1 text-[12px]">
            {errorMessage || "無法完整確認是否有展示頁面或指標正在使用此來源。未知影響不能當成沒有引用。"}
          </p>
        </div>
        <button className="mgmt-action min-h-[40px]" onClick={loadUsage} type="button">
          重試查詢
        </button>
      </div>
    );
  }

  if (!impact || impact.consumers.length === 0) {
    return (
      <div className="mgmt-card space-y-2 p-5 text-center" data-usage-none>
        <span className="inline-block rounded-full bg-[#e6f4ea] px-3 py-1 text-[12px] font-semibold text-[#137333]">
          尚無頁面直接引用
        </span>
        <p className="text-[13px] text-[#687169]">目前沒有任何播放頁面或下游指標直接依賴此來源指標代碼。</p>
      </div>
    );
  }

  return (
    <div className="mgmt-card space-y-3 p-4" data-usage-active>
      <div className="flex items-center justify-between">
        <h4 className="text-[13px] font-semibold text-[#4d554f]">
          目前有 {impact.consumers.length} 個系統組件正在使用此資料來源
        </h4>
        <span className="rounded bg-[#fef7e0] px-2 py-0.5 text-[11px] font-semibold text-[#b06000]">
          使用中（修改或刪除需謹慎）
        </span>
      </div>

      <ul className="divide-y divide-[#edf2ee] border-t border-[#edf2ee] text-[13px]">
        {impact.consumers.map((consumer, idx) => (
          <li className="flex items-center justify-between py-2.5" key={idx}>
            <div className="space-y-0.5">
              <span className="font-medium text-[#1e2821]">
                {consumer.kind === "page" ? "播放展示頁面" : "衍生指標計算"}
              </span>
              {consumer.pageId ? (
                <div className="text-[12px] text-[#687169]">頁面識別碼：{consumer.pageId}</div>
              ) : null}
            </div>
            <code className="rounded bg-[#f0f3f1] px-1.5 py-0.5 font-mono text-[12px] text-[#475569]">
              {consumer.metricKey}
            </code>
          </li>
        ))}
      </ul>
    </div>
  );
}
