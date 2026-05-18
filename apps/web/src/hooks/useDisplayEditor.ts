import { useEffect } from "react";

type DisplayEditorToggleEvent = {
  altKey?: boolean;
  ctrlKey?: boolean;
  key: string;
  metaKey?: boolean;
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
