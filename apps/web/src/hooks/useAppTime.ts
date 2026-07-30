import { useEffect, useRef, useState } from "react";
import {
  SERVER_TIME_ZONE,
  type AppTimeSnapshot
} from "@solar-display/shared";
import {
  getAppTimeSnapshot,
  subscribeAppTime
} from "../services/appTime";

const STATE_LABELS: Record<AppTimeSnapshot["state"], string> = {
  stale: "訊號延遲",
  synced: "已同步",
  "time-untrusted": "時間不可信",
  waiting: "等待同步"
};

const TAIPEI_CLOCK_FORMATTER = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
  minute: "2-digit",
  month: "2-digit",
  timeZone: SERVER_TIME_ZONE,
  weekday: "short",
  year: "numeric"
});

const WEEKDAY_LABELS = {
  Fri: "星期五  Fri.",
  Mon: "星期一  Mon.",
  Sat: "星期六  Sat.",
  Sun: "星期日  Sun.",
  Thu: "星期四  Thu.",
  Tue: "星期二  Tue.",
  Wed: "星期三  Wed."
} as const;

function part(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes
) {
  return parts.find((candidate) => candidate.type === type)?.value ?? "";
}

export function buildAppTimeHeaderView(snapshot: AppTimeSnapshot) {
  if (snapshot.nowEpochMs === null) {
    return {
      date: "伺服器時間",
      state: snapshot.state,
      stateLabel: STATE_LABELS[snapshot.state],
      time: "--:--",
      weekday: "--"
    };
  }

  const parts = TAIPEI_CLOCK_FORMATTER.formatToParts(
    new Date(snapshot.nowEpochMs)
  );
  const weekday = part(parts, "weekday") as keyof typeof WEEKDAY_LABELS;

  return {
    date: `${part(parts, "year")} / ${part(parts, "month")} / ${part(parts, "day")}`,
    state: snapshot.state,
    stateLabel: STATE_LABELS[snapshot.state],
    time: `${part(parts, "hour")}:${part(parts, "minute")}`,
    weekday: WEEKDAY_LABELS[weekday]
  };
}

export function useAppTime() {
  const [snapshot, setSnapshot] = useState(getAppTimeSnapshot);

  useEffect(() => {
    const refresh = () => {
      setSnapshot(getAppTimeSnapshot());
    };
    const unsubscribe = subscribeAppTime(refresh);
    refresh();
    const timer = window.setInterval(refresh, 1_000);

    return () => {
      unsubscribe();
      window.clearInterval(timer);
    };
  }, []);

  return snapshot;
}

export function resolveAbsoluteAppTimeEpoch(
  snapshot: AppTimeSnapshot,
  lastTrustedEpochMs: number | null
) {
  if (
    (snapshot.state === "synced" || snapshot.state === "stale")
    && snapshot.nowEpochMs !== null
  ) {
    return snapshot.nowEpochMs;
  }

  return lastTrustedEpochMs;
}

export function useAbsoluteAppTimeEpoch() {
  const snapshot = useAppTime();
  const lastTrustedEpochRef = useRef<number | null>(null);
  lastTrustedEpochRef.current = resolveAbsoluteAppTimeEpoch(
    snapshot,
    lastTrustedEpochRef.current
  );
  return lastTrustedEpochRef.current;
}
