import { useEffect } from "react";

type DisplayEditorToggleEvent = {
  altKey?: boolean;
  ctrlKey?: boolean;
  key: string;
  metaKey?: boolean;
  shiftKey?: boolean;
  targetTagName?: string;
};

const ignoredTargetTags = new Set(["INPUT", "SELECT", "TEXTAREA"]);

export function isDisplayEditorToggleKey(event: DisplayEditorToggleEvent) {
  if (event.altKey || event.ctrlKey || event.metaKey) {
    return false;
  }

  if (ignoredTargetTags.has(event.targetTagName?.toUpperCase() ?? "")) {
    return false;
  }

  return event.key.toLowerCase() === "e";
}

export function isDisplayEditorNudgeKey(event: DisplayEditorToggleEvent) {
  if (event.altKey || event.ctrlKey || event.metaKey) {
    return false;
  }

  if (ignoredTargetTags.has(event.targetTagName?.toUpperCase() ?? "")) {
    return false;
  }

  return ["ArrowDown", "ArrowLeft", "ArrowRight", "ArrowUp"].includes(event.key);
}

export function isDisplayEditorHistoryKey(
  event: DisplayEditorToggleEvent
): "redo" | "undo" | null {
  if (!(event.ctrlKey || event.metaKey) || event.altKey) {
    return null;
  }

  if (ignoredTargetTags.has(event.targetTagName?.toUpperCase() ?? "")) {
    return null;
  }

  if (event.key.toLowerCase() !== "z") {
    return null;
  }

  return event.shiftKey ? "redo" : "undo";
}

export function useDisplayEditorKeybinding(onToggle: () => void) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null;

      if (
        !isDisplayEditorToggleKey({
          altKey: event.altKey,
          ctrlKey: event.ctrlKey,
          key: event.key,
          metaKey: event.metaKey,
          targetTagName: target?.tagName
        })
      ) {
        return;
      }

      event.preventDefault();
      onToggle();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onToggle]);
}
