import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { resolveImagesPlaybackOrder, type ResolvedImagePlaylistEntry } from "@solar-display/shared";

function clampImagesAutoplayIndex(index: number, entryCount: number) {
  if (entryCount <= 0) {
    return 0;
  }

  return Math.min(Math.max(index, 0), entryCount - 1);
}

function hasPlayableImagesAutoplayEntry(entries: ResolvedImagePlaylistEntry[]) {
  return entries.some((entry) => entry.isPlayable);
}

export function getImagesAutoplayDurationMs(activeEntry: ResolvedImagePlaylistEntry | null) {
  if (!activeEntry) {
    return null;
  }

  return Math.max(activeEntry.durationSeconds, 1) * 1000;
}

export function resolveImagesAutoplayActiveIndex(
  entries: ResolvedImagePlaylistEntry[],
  activeEntry: ResolvedImagePlaylistEntry | null,
  requestedIndex: number
) {
  if (entries.length === 0) {
    return 0;
  }

  const requestedResolvedIndex = clampImagesAutoplayIndex(requestedIndex, entries.length);
  if (entries[requestedResolvedIndex]?.isPlayable) {
    return requestedResolvedIndex;
  }

  if (activeEntry) {
    const resolvedIndex = entries.findIndex((entry) => entry.entryId === activeEntry.entryId);
    if (resolvedIndex !== -1) {
      return resolvedIndex;
    }
  }

  return requestedResolvedIndex;
}

export function resolveImagesAutoplayCycleStartIndex(
  entries: ResolvedImagePlaylistEntry[],
  options?: {
    seed?: string;
    shuffle?: boolean;
  }
) {
  if (entries.length === 0) {
    return 0;
  }

  const order = resolveImagesPlaybackOrder(entries, {
    seed: options?.seed ?? "",
    shuffle: options?.shuffle === true
  });

  if (order.length === 0) {
    return 0;
  }

  const nextIndex = entries.findIndex((entry) => entry.entryId === order[0]);
  return nextIndex === -1 ? 0 : nextIndex;
}

export function getNextImagesAutoplayIndex(
  entries: ResolvedImagePlaylistEntry[],
  currentIndex: number,
  direction: 1 | -1,
  options?: {
    seed?: string;
    shuffle?: boolean;
  }
) {
  if (entries.length === 0) {
    return 0;
  }

  const safeIndex = clampImagesAutoplayIndex(currentIndex, entries.length);
  const order = resolveImagesPlaybackOrder(entries, {
    seed: options?.seed ?? "",
    shuffle: options?.shuffle === true
  });

  if (order.length === 0) {
    return safeIndex;
  }

  const currentEntryId = entries[safeIndex]?.entryId ?? null;
  const currentOrderIndex = currentEntryId === null ? -1 : order.indexOf(currentEntryId);
  const nextOrderIndex =
    currentOrderIndex === -1
      ? direction === 1 ? 0 : order.length - 1
      : (currentOrderIndex + direction + order.length) % order.length;
  const nextEntryId = order[nextOrderIndex];
  const nextIndex = entries.findIndex((entry) => entry.entryId === nextEntryId);

  return nextIndex === -1 ? safeIndex : nextIndex;
}

function buildImagesAutoplayEntriesSignature(entries: ResolvedImagePlaylistEntry[]) {
  return entries
    .map((entry) => `${entry.entryId}:${entry.displayOrder}:${entry.enabled ? "1" : "0"}:${entry.isPlayable ? "1" : "0"}:${entry.durationSeconds}`)
    .join("|");
}

function applyImagesAutoplayTarget(args: {
  nextIndex: number;
  resolvedActiveIndex: number;
  restart: () => void;
  setRequestedIndex: Dispatch<SetStateAction<number>>;
}) {
  if (args.nextIndex === args.resolvedActiveIndex) {
    args.restart();
    return;
  }

  args.setRequestedIndex(args.nextIndex);
}

function resolveImagesAutoplayCycleTarget(args: {
  cycleVersion: number;
  direction: 1 | -1;
  entries: ResolvedImagePlaylistEntry[];
  entriesSignature: string;
  resolvedActiveIndex: number;
  shuffle: boolean;
}) {
  const seed = `${args.entriesSignature}:${args.cycleVersion}`;

  if (!args.shuffle) {
    return {
      advanceCycle: false,
      nextIndex: getNextImagesAutoplayIndex(args.entries, args.resolvedActiveIndex, args.direction, {
        seed,
        shuffle: false
      })
    };
  }

  const order = resolveImagesPlaybackOrder(args.entries, { seed, shuffle: true });
  if (order.length === 0) {
    return {
      advanceCycle: false,
      nextIndex: args.resolvedActiveIndex
    };
  }

  const currentEntryId = args.entries[args.resolvedActiveIndex]?.entryId ?? null;
  const currentOrderIndex = currentEntryId === null ? -1 : order.indexOf(currentEntryId);
  const nextOrderIndex =
    currentOrderIndex === -1
      ? args.direction === 1 ? 0 : order.length - 1
      : (currentOrderIndex + args.direction + order.length) % order.length;
  const wrapped =
    currentOrderIndex !== -1 &&
    ((args.direction === 1 && nextOrderIndex === 0) ||
      (args.direction === -1 && nextOrderIndex === order.length - 1));
  const targetOrder = wrapped
    ? resolveImagesPlaybackOrder(args.entries, {
        seed: `${args.entriesSignature}:${args.cycleVersion + 1}`,
        shuffle: true
      })
    : order;
  const targetEntryId = args.direction === 1
    ? targetOrder[nextOrderIndex === 0 && wrapped ? 0 : nextOrderIndex]
    : targetOrder[nextOrderIndex === order.length - 1 && wrapped ? targetOrder.length - 1 : nextOrderIndex];
  const nextIndex = args.entries.findIndex((entry) => entry.entryId === targetEntryId);

  return {
    advanceCycle: wrapped,
    nextIndex: nextIndex === -1 ? args.resolvedActiveIndex : nextIndex
  };
}

export function useImagesAutoplay(args: {
  activeEntry: ResolvedImagePlaylistEntry | null;
  entries: ResolvedImagePlaylistEntry[];
  requestedIndex: number;
  setRequestedIndex: Dispatch<SetStateAction<number>>;
  shuffle?: boolean;
}) {
  const { activeEntry, entries, requestedIndex, setRequestedIndex } = args;
  const shuffle = args.shuffle === true;
  const [cycleVersion, setCycleVersion] = useState(0);
  const shuffleAlignmentKeyRef = useRef<string | null>(null);
  const entriesSignature = useMemo(
    () => buildImagesAutoplayEntriesSignature(entries),
    [entries]
  );
  const resolvedActiveIndex = useMemo(
    () => resolveImagesAutoplayActiveIndex(entries, activeEntry, requestedIndex),
    [activeEntry, entries, requestedIndex]
  );

  useEffect(() => {
    shuffleAlignmentKeyRef.current = null;
    setCycleVersion(0);
  }, [entriesSignature, shuffle]);

  useEffect(() => {
    if (!shuffle) {
      return;
    }

    const alignmentKey = `${entriesSignature}:0`;
    if (shuffleAlignmentKeyRef.current === alignmentKey) {
      return;
    }

    shuffleAlignmentKeyRef.current = alignmentKey;
    const nextIndex = resolveImagesAutoplayCycleStartIndex(entries, {
      seed: alignmentKey,
      shuffle: true
    });

    if (nextIndex === requestedIndex) {
      return;
    }

    setRequestedIndex(nextIndex);
  }, [entries, entriesSignature, requestedIndex, setRequestedIndex, shuffle]);

  const restart = () => {
    setCycleVersion((current) => current + 1);
  };

  const selectIndex = (nextIndex: number) => {
    applyImagesAutoplayTarget({
      nextIndex: clampImagesAutoplayIndex(nextIndex, entries.length),
      resolvedActiveIndex,
      restart,
      setRequestedIndex
    });
  };

  const next = () => {
    const target = resolveImagesAutoplayCycleTarget({
      cycleVersion,
      direction: 1,
      entries,
      entriesSignature,
      resolvedActiveIndex,
      shuffle
    });
    if (target.advanceCycle) {
      setCycleVersion((current) => current + 1);
    }
    applyImagesAutoplayTarget({
      nextIndex: target.nextIndex,
      resolvedActiveIndex,
      restart,
      setRequestedIndex
    });
  };

  const prev = () => {
    const target = resolveImagesAutoplayCycleTarget({
      cycleVersion,
      direction: -1,
      entries,
      entriesSignature,
      resolvedActiveIndex,
      shuffle
    });
    if (target.advanceCycle) {
      setCycleVersion((current) => current + 1);
    }
    applyImagesAutoplayTarget({
      nextIndex: target.nextIndex,
      resolvedActiveIndex,
      restart,
      setRequestedIndex
    });
  };

  useEffect(() => {
    const durationMs = getImagesAutoplayDurationMs(activeEntry);

    if (durationMs === null || !hasPlayableImagesAutoplayEntry(entries)) {
      return;
    }

    const timerId = window.setTimeout(() => {
      const target = resolveImagesAutoplayCycleTarget({
        cycleVersion,
        direction: 1,
        entries,
        entriesSignature,
        resolvedActiveIndex,
        shuffle
      });
      if (target.advanceCycle) {
        setCycleVersion((current) => current + 1);
      }
      applyImagesAutoplayTarget({
        nextIndex: target.nextIndex,
        resolvedActiveIndex,
        restart,
        setRequestedIndex
      });
    }, durationMs);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [
    activeEntry?.durationSeconds,
    activeEntry?.entryId,
    cycleVersion,
    entriesSignature,
    resolvedActiveIndex,
    shuffle
  ]);

  return {
    activeIndex: resolvedActiveIndex,
    next,
    prev,
    selectIndex
  };
}
