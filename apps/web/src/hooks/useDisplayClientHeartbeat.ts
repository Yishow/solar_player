import { useEffect, useRef, useState } from "react";
import {
  DISPLAY_CLIENT_HEARTBEAT_INTERVAL_MS,
  type DisplayClientHeartbeat,
  type TimeSyncState
} from "@solar-display/shared";
export { DISPLAY_CLIENT_HEARTBEAT_INTERVAL_MS } from "@solar-display/shared";
import {
  emitClientHeartbeat,
  getSocketClient,
  getSocketConnectionState,
  subscribeConnectionState,
  type SocketConnectionState
} from "../services/socket";
import { getAppTimeSnapshot } from "../services/appTime";

export type DisplayClientHeartbeatLoopOptions = {
  connected: boolean;
  enabled?: boolean;
  emitHeartbeat: (payload: DisplayClientHeartbeat) => void;
  emitImmediately: boolean;
  intervalMs?: number;
  payloadFactory: () => DisplayClientHeartbeat;
  clearScheduledInterval?: (timer: unknown) => void;
  scheduleInterval?: (callback: () => void, intervalMs: number) => unknown;
};

export function buildDisplayClientHeartbeatPayload(args: {
  appliedVersion: number | null;
  desiredVersion: number | null;
  isIdle: boolean;
  isPlaying: boolean;
  pageKey: string | null;
  route: string;
  timeSyncState: TimeSyncState;
  updateError: string | null;
  updateState: DisplayClientHeartbeat["updateState"];
}): DisplayClientHeartbeat {
  return {
    appliedVersion: args.appliedVersion,
    desiredVersion: args.desiredVersion,
    isPlaying: args.isPlaying,
    pageKey: args.pageKey,
    route: args.route,
    timeSyncState: args.timeSyncState,
    updateError: args.updateError,
    updateState: args.updateState
  };
}

export function startDisplayClientHeartbeatLoop(options: DisplayClientHeartbeatLoopOptions) {
  if (!options.connected || options.enabled === false) {
    return () => {};
  }

  if (options.emitImmediately) {
    options.emitHeartbeat(options.payloadFactory());
  }

  const scheduleInterval = options.scheduleInterval ?? setInterval;
  const clearScheduledInterval =
    options.clearScheduledInterval
    ?? ((timer: unknown) => {
      clearInterval(timer as ReturnType<typeof setInterval>);
    });
  const timer = scheduleInterval(() => {
    options.emitHeartbeat(options.payloadFactory());
  }, options.intervalMs ?? DISPLAY_CLIENT_HEARTBEAT_INTERVAL_MS);

  return () => {
    clearScheduledInterval(timer);
  };
}

export function useDisplayClientHeartbeat(args: {
  appliedVersion: number | null;
  desiredVersion: number | null;
  isIdle: boolean;
  isPlaying: boolean;
  pageKey: string | null;
  rolloutReady: boolean;
  route: string;
  updateError: string | null;
  updateState: DisplayClientHeartbeat["updateState"];
}) {
  const [connectionState, setConnectionState] = useState<SocketConnectionState>(
    getSocketConnectionState()
  );
  const previousHeartbeatKeyRef = useRef<string | null>(null);
  const previousConnectionStatusRef = useRef<SocketConnectionState["status"]>(connectionState.status);

  useEffect(() => {
    const unsubscribe = subscribeConnectionState((nextState) => {
      setConnectionState(nextState);
    });

    getSocketClient();
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!args.rolloutReady) {
      previousHeartbeatKeyRef.current = null;
      return;
    }
    const heartbeatKey = [
      args.route,
      args.pageKey ?? "",
      args.desiredVersion ?? "",
      args.appliedVersion ?? "",
      args.updateState,
      args.updateError ?? ""
    ].join("::");
    const becameConnected =
      previousConnectionStatusRef.current !== "connected" && connectionState.status === "connected";
    const emitImmediately =
      previousHeartbeatKeyRef.current !== heartbeatKey || becameConnected;

    previousHeartbeatKeyRef.current = heartbeatKey;
    previousConnectionStatusRef.current = connectionState.status;

    return startDisplayClientHeartbeatLoop({
      connected: connectionState.status === "connected",
      enabled: args.rolloutReady,
      emitHeartbeat: emitClientHeartbeat,
      emitImmediately,
      payloadFactory: () => buildDisplayClientHeartbeatPayload({
        ...args,
        timeSyncState: getAppTimeSnapshot().state
      })
    });
  }, [
    args.appliedVersion,
    args.desiredVersion,
    args.isPlaying,
    args.pageKey,
    args.rolloutReady,
    args.route,
    args.updateError,
    args.updateState,
    connectionState.status
  ]);
}
