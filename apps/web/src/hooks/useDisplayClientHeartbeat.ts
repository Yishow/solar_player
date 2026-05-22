import { useEffect, useRef, useState } from "react";
import {
  DISPLAY_CLIENT_HEARTBEAT_INTERVAL_MS,
  type DisplayClientHeartbeat
} from "@solar-display/shared";
export { DISPLAY_CLIENT_HEARTBEAT_INTERVAL_MS } from "@solar-display/shared";
import {
  emitClientHeartbeat,
  getSocketClient,
  getSocketConnectionState,
  resolveSocketSessionClass,
  subscribeConnectionState,
  type SocketConnectionState
} from "../services/socket";

export type DisplayClientHeartbeatLoopOptions = {
  connected: boolean;
  emitHeartbeat: (payload: DisplayClientHeartbeat) => void;
  emitImmediately: boolean;
  intervalMs?: number;
  payloadFactory: () => DisplayClientHeartbeat;
  clearScheduledInterval?: (timer: unknown) => void;
  scheduleInterval?: (callback: () => void, intervalMs: number) => unknown;
};

function resolveHeartbeatViewport() {
  if (typeof window === "undefined") {
    return {
      height: 0,
      width: 0
    };
  }

  return {
    height: window.innerHeight,
    width: window.innerWidth
  };
}

export function buildDisplayClientHeartbeatPayload(args: {
  isIdle: boolean;
  isPlaying: boolean;
  pageKey: string | null;
  route: string;
}): DisplayClientHeartbeat {
  return {
    clientTime: new Date().toISOString(),
    isIdle: args.isIdle,
    isPlaying: args.isPlaying,
    pageKey: args.pageKey,
    route: args.route,
    sessionClass: resolveSocketSessionClass(args.route),
    viewport: resolveHeartbeatViewport()
  };
}

export function startDisplayClientHeartbeatLoop(options: DisplayClientHeartbeatLoopOptions) {
  if (!options.connected) {
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
  isIdle: boolean;
  isPlaying: boolean;
  pageKey: string | null;
  route: string;
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
    const heartbeatKey = `${args.route}::${args.pageKey ?? ""}`;
    const becameConnected =
      previousConnectionStatusRef.current !== "connected" && connectionState.status === "connected";
    const emitImmediately =
      previousHeartbeatKeyRef.current !== heartbeatKey || becameConnected;

    previousHeartbeatKeyRef.current = heartbeatKey;
    previousConnectionStatusRef.current = connectionState.status;

    return startDisplayClientHeartbeatLoop({
      connected: connectionState.status === "connected",
      emitHeartbeat: emitClientHeartbeat,
      emitImmediately,
      payloadFactory: () => buildDisplayClientHeartbeatPayload(args)
    });
  }, [args.isIdle, args.isPlaying, args.pageKey, args.route, connectionState.status]);
}
