import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type {
  CaptureSession,
  ObservationCandidate,
  ReceptionProfile
} from "@solar-display/shared";
import { requestJson } from "../../services/api";
import { ReceptionScopePicker } from "./ReceptionScopePicker";
import { CaptureStatusBar } from "./CaptureStatusBar";
import { ReceivedCandidateList } from "./ReceivedCandidateList";
import { ReceivedSampleDrawer } from "./ReceivedSampleDrawer";
import type { GenericMqttMapping } from "./SourcesModel";

export type ReceivedDataWorkspaceProps = {
  configuredMappings: GenericMqttMapping[];
  initialSearchQuery?: string;
  onAddFromReceived: (candidate: ObservationCandidate, samplePayload: unknown) => void;
  siteScope: "cl" | "kn" | null;
};

export function ReceivedDataWorkspace({
  configuredMappings,
  initialSearchQuery = "",
  onAddFromReceived,
  siteScope
}: ReceivedDataWorkspaceProps) {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<ReceptionProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [capture, setCapture] = useState<CaptureSession | null>(null);
  const [candidates, setCandidates] = useState<ObservationCandidate[]>([]);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [isStartingCapture, setIsStartingCapture] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<ObservationCandidate | null>(null);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [errorMessage, setErrorMessage] = useState("");

  const activeScopeRef = useRef(siteScope);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load reception profiles when siteScope changes
  useEffect(() => {
    activeScopeRef.current = siteScope;
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setProfiles([]);
    setSelectedProfileId(null);
    setCapture(null);
    setCandidates([]);
    setSelectedCandidate(null);
    setErrorMessage("");

    if (!siteScope) return;

    requestJson<{ profiles: ReceptionProfile[] }>("/api/settings/mqtt/reception-profiles")
      .then((data) => {
        if (activeScopeRef.current !== siteScope) return;
        const matching = data.profiles.filter((p) => p.siteScope === siteScope);
        setProfiles(matching);
        // If there's only one profile, preselect it. If multiple, require explicit choice.
        if (matching.length === 1 && matching[0]) {
          setSelectedProfileId(matching[0].id);
        }
      })
      .catch((err: unknown) => {
        if (activeScopeRef.current !== siteScope) return;
        setErrorMessage(err instanceof Error ? err.message : "無法載入接收範圍");
      });
  }, [siteScope]);

  const selectedProfile = profiles.find((p) => p.id === selectedProfileId) ?? null;

  const refreshCandidates = useCallback((captureId: string) => {
    setIsLoadingCandidates(true);
    requestJson<{ candidates: ObservationCandidate[] }>(`/api/settings/mqtt/captures/${captureId}/candidates`)
      .then((data) => {
        setCandidates(data.candidates);
        setErrorMessage("");
      })
      .catch((err: unknown) => {
        setErrorMessage(err instanceof Error ? err.message : "更新候選清單失敗");
      })
      .finally(() => setIsLoadingCandidates(false));
  }, []);

  const handleStartCapture = useCallback(() => {
    if (!siteScope || !selectedProfile) {
      setErrorMessage("請先選取已批准的接收範圍。");
      return;
    }
    setIsStartingCapture(true);
    setErrorMessage("");

    const filter = selectedProfile.allowedFilters[0] ?? "";
    const discoveryFilter = filter.endsWith("/") ? `${filter}#` : filter;

    requestJson<CaptureSession>("/api/settings/mqtt/captures", {
      body: JSON.stringify({
        connectionRef: "central",
        filter: discoveryFilter,
        mode: "active",
        receptionProfileId: selectedProfile.id,
        siteScope
      }),
      method: "POST"
    })
      .then((session) => {
        setCapture(session);
        setCandidates([]);
        setSelectedCandidate(null);
        refreshCandidates(session.captureId);
      })
      .catch((err: unknown) => {
        setErrorMessage(err instanceof Error ? err.message : "開始接收失敗");
      })
      .finally(() => setIsStartingCapture(false));
  }, [refreshCandidates, selectedProfile, siteScope]);

  const handleStopCapture = useCallback(() => {
    if (!capture) return;
    const captureId = capture.captureId;
    setCapture(null);
    requestJson(`/api/settings/mqtt/captures/${captureId}`, {
      method: "DELETE"
    }).catch(() => undefined);
  }, [capture]);

  // Clean up capture session on unmount
  useEffect(() => {
    return () => {
      if (capture) {
        requestJson(`/api/settings/mqtt/captures/${capture.captureId}`, {
          method: "DELETE"
        }).catch(() => undefined);
      }
    };
  }, [capture]);

  return (
    <div className="space-y-4" data-received-data-workspace>
      <ReceptionScopePicker
        disabled={isStartingCapture}
        onSelectProfile={(p) => {
          setSelectedProfileId(p.id);
          setCapture(null);
          setCandidates([]);
          setSelectedCandidate(null);
        }}
        profiles={profiles}
        selectedProfileId={selectedProfileId}
        siteScope={siteScope}
      />

      {selectedProfile ? (
        <CaptureStatusBar
          capture={capture}
          errorMessage={errorMessage}
          isStarting={isStartingCapture}
          onRefresh={capture ? () => refreshCandidates(capture.captureId) : undefined}
          onStart={handleStartCapture}
          onStop={handleStopCapture}
          selectedProfileName={selectedProfile.name}
        />
      ) : null}

      {capture ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="grid min-w-[16rem] flex-1 gap-1 text-[13px] text-[#4d554f]">
              搜尋接收到的 Topic 或 Tag
              <input
                aria-label="搜尋接收項目"
                className="mgmt-input min-h-[40px] text-[14px]"
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="例如：GCB, stamping, consumption..."
                value={searchQuery}
              />
            </label>
          </div>

          <ReceivedCandidateList
            candidates={candidates}
            configuredMappings={configuredMappings}
            isLoading={isLoadingCandidates}
            onSelectCandidate={setSelectedCandidate}
            searchQuery={searchQuery}
            selectedCandidateId={selectedCandidate?.candidateId ?? null}
          />
        </div>
      ) : null}

      {selectedCandidate && capture ? (
        <ReceivedSampleDrawer
          candidate={selectedCandidate}
          captureId={capture.captureId}
          onClose={() => setSelectedCandidate(null)}
          onCreateMapping={(candidate, samplePayload) => {
            onAddFromReceived(candidate, samplePayload);
            setSelectedCandidate(null);
          }}
          onNavigateToEngineering={() => {
            navigate(`/settings/data-hub/engineering-sources?scope=${siteScope ?? "kn"}`);
          }}
        />
      ) : null}
    </div>
  );
}
