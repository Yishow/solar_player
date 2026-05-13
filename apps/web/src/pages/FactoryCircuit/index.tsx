import type { CircuitConfig } from "@solar-display/shared";
import { useEffect, useState } from "react";
import { Sparkline } from "../../components/Sparkline";
import { StatusBadge } from "../../components/StatusBadge";
import { useLiveMetrics } from "../../hooks/useLiveMetrics";
import { trendSeries } from "../../mocks/metrics";
import { requestJson } from "../../services/api";
import { PageScaffold } from "../shared/PageScaffold";
import {
  buildFactoryCircuitRuntimes,
  buildFactoryCircuitViewModel,
  type FactoryCircuitLoadState,
  type FactoryCircuitRuntime
} from "./viewModel";

function mapConnectionStatus(status: "connected" | "connecting" | "disconnected") {
  return status;
}

export function FactoryCircuit() {
  const { connectionState, snapshot } = useLiveMetrics();
  const [circuits, setCircuits] = useState<FactoryCircuitRuntime[]>([]);
  const [loadState, setLoadState] = useState<FactoryCircuitLoadState>("loading");

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const data = await requestJson<{ success: boolean; data: CircuitConfig[] }>("/api/circuits");

        if (!active) {
          return;
        }

        setCircuits(buildFactoryCircuitRuntimes(data.data));
        setLoadState("ready");
      } catch {
        if (!active) {
          return;
        }

        setCircuits([]);
        setLoadState("error");
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const viewModel = buildFactoryCircuitViewModel({
    circuits,
    connectionState,
    loadState,
    snapshot
  });

  return (
    <PageScaffold
      path="/factory-circuit"
      description="太陽能發電轉換後的配電流向與廠區各迴路負載分配。"
    >
      <section className="relative grid min-h-[620px] grid-cols-12 gap-6 overflow-hidden">
        <div className="pointer-events-none absolute left-[3%] top-[44%] h-px w-[30%] bg-gradient-to-r from-brand-700 via-accent-sun-500/60 to-accent-sun-500/0" />
        <div className="pointer-events-none absolute left-[29%] top-[68%] h-28 w-64 rounded-full bg-brand-100/60 blur-3xl" />

        <div className="col-span-4 flex flex-col justify-between py-4">
          <div>
            <p className="font-en text-sm uppercase tracking-[0.28em] text-brand-700">
              {viewModel.hero.eyebrow}
            </p>
            <h2 className="mt-5 text-[60px] font-bold leading-[1.08] tracking-[0.08em] text-brand-900">
              {viewModel.hero.title}
            </h2>
            <p className="mt-4 font-en text-xl tracking-[0.14em] text-neutral-500">
              {viewModel.hero.subtitle}
            </p>
            <div className="mt-10 space-y-2 text-[22px] leading-[1.55] text-neutral-700">
              {viewModel.hero.copyZhLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
            <div className="mt-6 space-y-1 font-en text-lg leading-[1.45] text-neutral-500">
              {viewModel.hero.copyEnLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <StatusBadge
              density="playback"
              status={mapConnectionStatus(connectionState)}
              label={viewModel.summary.statusLabel}
            />
            {viewModel.emptyState ? (
              <div className="max-w-md rounded-[24px] border border-white/70 bg-white/78 px-5 py-4 text-neutral-600 shadow-card backdrop-blur">
                <p className="text-base font-semibold text-brand-900">{viewModel.emptyState.title}</p>
                <p className="mt-2 text-sm leading-6">{viewModel.emptyState.description}</p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="col-span-4 flex items-center justify-center">
          <div className="relative flex h-[380px] w-full max-w-[520px] items-center justify-center">
            <div className="flex items-center gap-5">
              {viewModel.flowNodes.map((node, index) => (
                <div key={node.label} className="flex items-center gap-5">
                  <article
                    className={[
                      "flex flex-col items-center justify-center rounded-[30px] border bg-white/86 text-center shadow-card backdrop-blur",
                      index === 2
                        ? "h-[290px] w-[180px] border-brand-300/80 bg-gradient-to-b from-brand-50 to-white/95"
                        : "h-[230px] w-[138px] border-white/75"
                    ].join(" ")}
                  >
                    <div className="flex h-20 w-20 items-center justify-center rounded-[26px] bg-brand-100 text-[42px] shadow-soft">
                      {node.icon}
                    </div>
                    <h3 className="mt-6 text-[24px] font-semibold tracking-[0.18em] text-brand-900">
                      {node.label}
                    </h3>
                    <p className="mt-2 font-en text-sm uppercase tracking-[0.22em] text-neutral-500">
                      {node.subtitle}
                    </p>
                  </article>

                  {index < viewModel.flowNodes.length - 1 ? (
                    <div className="relative h-3 w-16 rounded-full bg-brand-700/80">
                      <div className="absolute right-0 top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 border-r-[2px] border-t-[2px] border-brand-500" />
                      <div className="absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 border-r-[2px] border-t-[2px] border-brand-500" />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="pointer-events-none absolute left-[50%] top-[70%] h-40 -translate-x-1/2 border-l-2 border-dashed border-brand-700/60" />
            <div className="pointer-events-none absolute left-[50%] top-[88%] flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full border border-brand-700/70 bg-white/88 text-xl text-brand-700 shadow-soft">
              🌿
            </div>
          </div>
        </div>

        <div className="col-span-4">
          <div className="relative h-full rounded-[34px] border border-white/70 bg-white/48 p-5 shadow-panel backdrop-blur">
            <div className="pointer-events-none absolute bottom-10 left-6 top-10 w-px bg-brand-700/30" />
            <div className="relative space-y-3">
              {viewModel.loadRows.map((row, index) => (
                <article
                  key={row.labelZh}
                  className="relative flex min-h-[88px] items-center gap-4 rounded-[22px] border border-white/75 bg-white/92 px-5 py-4 shadow-card"
                >
                  <div className="pointer-events-none absolute -left-5 top-1/2 h-px w-5 -translate-y-1/2 bg-brand-700/35" />
                  <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-brand-100 text-[28px] shadow-soft">
                    {row.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[18px] font-semibold tracking-[0.04em] text-brand-900">
                          {row.labelZh}
                        </p>
                        <p className="mt-1 truncate font-en text-xs uppercase tracking-[0.18em] text-neutral-500">
                          {row.labelEn}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-en text-[30px] font-semibold leading-none text-brand-900">
                          {row.sharePercent}%
                        </p>
                        <p className={["mt-2 text-sm font-semibold", row.textClass].join(" ")}>
                          {row.statusLabel}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-neutral-100">
                      <div
                        className={["h-full rounded-full transition-[width] duration-500", row.progressClass].join(" ")}
                        style={{ width: `${Math.min(row.utilizationPercent, 100)}%` }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-neutral-500">
                      <span>{row.isEmpty ? "等待迴路資料" : `${row.livePowerKw} kW`}</span>
                      <span>{row.isEmpty ? "No circuit data" : `Utilization ${row.utilizationPercent}%`}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-5 gap-4">
        {viewModel.kpis.map((metric, index) => (
          <article
            key={metric.label}
            className="rounded-[28px] border border-white/75 bg-white/92 px-6 py-5 shadow-card backdrop-blur"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold tracking-[0.08em] text-neutral-600">
                  {metric.label}
                </p>
                <p className="mt-1 font-en text-xs uppercase tracking-[0.18em] text-brand-700">
                  Circuit KPI
                </p>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-2xl shadow-soft">
                {metric.icon}
              </div>
            </div>
            <div className="mt-8 flex items-end gap-3">
              <p className="text-[48px] font-bold leading-none text-brand-900">{metric.value}</p>
              <span className="pb-1 font-en text-lg font-semibold uppercase tracking-[0.14em] text-brand-700">
                {metric.unit}
              </span>
            </div>
            <Sparkline className="mt-4 h-14" values={trendSeries.map((value) => value - index * 2)} />
            <p className="mt-3 text-sm leading-6 text-neutral-600">{metric.helper}</p>
          </article>
        ))}
      </section>
    </PageScaffold>
  );
}
