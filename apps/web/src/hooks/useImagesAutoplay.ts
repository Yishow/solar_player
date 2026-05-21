import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import type { ResolvedImagePlaylistEntry } from "@solar-display/shared";

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

  if (activeEntry) {
    const resolvedIndex = entries.findIndex((entry) => entry.entryId === activeEntry.entryId);
    if (resolvedIndex !== -1) {
      return resolvedIndex;
    }
  }

  return clampImagesAutoplayIndex(requestedIndex, entries.length);
}

export function getNextImagesAutoplayIndex(
  entries: ResolvedImagePlaylistEntry[],
  currentIndex: number,
  direction: 1 | -1
) {
  if (entries.length === 0) {
    return 0;
  }

  const safeIndex = clampImagesAutoplayIndex(currentIndex, entries.length);

  for (let offset = 1; offset <= entries.length; offset += 1) {
    const candidateIndex = (safeIndex + direction * offset + entries.length) % entries.length;
    if (entries[candidateIndex]?.isPlayable) {
      return candidateIndex;
    }
  }

  return safeIndex;
}

function buildImagesAutoplayEntriesSignature(entries: ResolvedImagePlaylistEntry[]) {
  return entries
    .map((entry) => `${entry.entryId}:${entry.isPlayable ? "1" : "0"}:${entry.durationSeconds}`)
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

export function useImagesAutoplay(args: {
  activeEntry: ResolvedImagePlaylistEntry | null;
  entries: ResolvedImagePlaylistEntry[];
  requestedIndex: number;
  setRequestedIndex: Dispatch<SetStateAction<number>>;
}) {
  const { activeEntry, entries, requestedIndex, setRequestedIndex } = args;
  const [cycleVersion, setCycleVersion] = useState(0);
  const entriesSignature = useMemo(
    () => buildImagesAutoplayEntriesSignature(entries),
    [entries]
  );
  const resolvedActiveIndex = useMemo(
    () => resolveImagesAutoplayActiveIndex(entries, activeEntry, requestedIndex),
    [activeEntry, entries, requestedIndex]
  );

  useEffect(() => {
    if (requestedIndex === resolvedActiveIndex) {
      return;
    }

    setRequestedIndex(resolvedActiveIndex);
  }, [requestedIndex, resolvedActiveIndex, setRequestedIndex]);

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
    applyImagesAutoplayTarget({
      nextIndex: getNextImagesAutoplayIndex(entries, resolvedActiveIndex, 1),
      resolvedActiveIndex,
      restart,
      setRequestedIndex
    });
  };

  const prev = () => {
    applyImagesAutoplayTarget({
      nextIndex: getNextImagesAutoplayIndex(entries, resolvedActiveIndex, -1),
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
      applyImagesAutoplayTarget({
        nextIndex: getNextImagesAutoplayIndex(entries, resolvedActiveIndex, 1),
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
    resolvedActiveIndex
  ]);

  return {
    activeIndex: resolvedActiveIndex,
    next,
    prev,
    selectIndex
  };
}
