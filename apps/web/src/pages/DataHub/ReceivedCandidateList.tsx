import type { ObservationCandidate } from "@solar-display/shared";
import type { GenericMqttMapping } from "./SourcesModel";

export type ReceivedCandidateListProps = {
  candidates: ObservationCandidate[];
  configuredMappings: GenericMqttMapping[];
  isLoading?: boolean;
  onSelectCandidate: (candidate: ObservationCandidate) => void;
  searchQuery?: string;
  selectedCandidateId: string | null;
};

export function ReceivedCandidateList({
  candidates,
  configuredMappings,
  isLoading = false,
  onSelectCandidate,
  searchQuery = "",
  selectedCandidateId
}: ReceivedCandidateListProps) {
  const filteredCandidates = candidates.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.exactTopic.toLowerCase().includes(q) || (c.declaredTag && c.declaredTag.toLowerCase().includes(q));
  });

  const getMappingStatus = (candidate: ObservationCandidate) => {
    const match = configuredMappings.find((m) => m.topic === candidate.exactTopic);
    if (!match) return { isMapped: false, label: "未對應" };
    return { isMapped: true, label: `已對應 (${match.metricKey})` };
  };

  const getKindBadge = (candidate: ObservationCandidate) => {
    const kind = candidate.candidateKind ?? "generic";
    switch (kind) {
      case "solar-managed":
        return <span className="rounded bg-[#fef3c7] px-2 py-0.5 text-[11px] font-semibold text-[#92400e]">Solar 託管</span>;
      case "engineering":
        return <span className="rounded bg-[#d1fae5] px-2 py-0.5 text-[11px] font-semibold text-[#065f46]">工程成果</span>;
      case "physical-raw":
        return <span className="rounded bg-[#e0e7ff] px-2 py-0.5 text-[11px] font-semibold text-[#3730a3]">實體讀值</span>;
      case "diagnostic":
        return <span className="rounded bg-[#f3f4f6] px-2 py-0.5 text-[11px] font-semibold text-[#4b5563]">診斷訊息</span>;
      default:
        return <span className="rounded bg-[#e5e7eb] px-2 py-0.5 text-[11px] font-medium text-[#374151]">通用 MQTT</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="mgmt-card p-6 text-center text-sm text-[#687169]" data-candidate-loading>
        正在查詢接收清單與樣本...
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div className="mgmt-card p-6 text-center text-sm text-[#687169]" data-candidate-empty>
        目前時窗尚未觀測到任何匹配的 MQTT 訊息。若設備尚未發送或頻率較低，請稍候並點選「重新整理樣本」。
      </div>
    );
  }

  if (filteredCandidates.length === 0) {
    return (
      <div className="mgmt-card p-6 text-center text-sm text-[#687169]" data-candidate-no-match>
        搜尋條件「{searchQuery}」沒有符合的觀測項目。
      </div>
    );
  }

  return (
    <div className="space-y-2" data-received-candidate-list>
      <div className="flex items-center justify-between text-[13px] text-[#687169]">
        <span>共觀測到 {filteredCandidates.length} 筆資料項目</span>
        <span className="text-[12px]">點選項目可檢視樣本內容並進行接入轉換</span>
      </div>

      <div className="space-y-2">
        {filteredCandidates.map((candidate) => {
          const isSelected = candidate.candidateId === selectedCandidateId;
          const mapping = getMappingStatus(candidate);

          return (
            <button
              aria-pressed={isSelected}
              className={`w-full rounded-lg border p-3.5 text-left transition-all min-h-[44px] ${
                isSelected
                  ? "border-[#1b4332] bg-[#f0f9f4] shadow-sm ring-1 ring-[#1b4332]"
                  : "border-[#d0d7d1] bg-white hover:border-[#a3b1a7] hover:bg-[#fafcfb]"
              }`}
              data-candidate-row={candidate.candidateId}
              key={candidate.candidateId}
              onClick={() => onSelectCandidate(candidate)}
              type="button"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <code className="rounded bg-[#f0f3f1] px-1.5 py-0.5 font-mono text-[13px] font-semibold text-[#1e293b]">
                    {candidate.exactTopic}
                  </code>
                  {candidate.declaredTag ? (
                    <span className="rounded bg-[#dbeafe] px-1.5 py-0.5 font-mono text-[12px] font-medium text-[#1e40af]" data-declared-tag>
                      Tag: {candidate.declaredTag}
                    </span>
                  ) : null}
                  {getKindBadge(candidate)}
                </div>

                <div className="flex items-center gap-2 text-[12px]">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
                      mapping.isMapped
                        ? "bg-[#e6f4ea] text-[#137333]"
                        : "bg-[#fef7e0] text-[#b06000]"
                    }`}
                  >
                    {mapping.label}
                  </span>
                  <span className="text-[#687169]">
                    {candidate.sampleRefs.length} 個樣本
                  </span>
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between text-[11px] text-[#7b857d]">
                <span>最後出現時間：{new Date(candidate.lastSeenAt).toLocaleTimeString()}</span>
                <span className="text-[#1b4332] underline underline-offset-2">檢視樣本與對應 →</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
