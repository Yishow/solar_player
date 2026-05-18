type EditorHistorySnapshot<T> = {
  future: T[];
  past: T[];
};

function cloneValue<T>(value: T): T {
  return structuredClone(value);
}

export function createEditorHistory<T>(): EditorHistorySnapshot<T> {
  return {
    future: [],
    past: []
  };
}

export function pushEditorHistory<T>(
  history: EditorHistorySnapshot<T>,
  current: T,
  next: T
): EditorHistorySnapshot<T> {
  if (JSON.stringify(current) === JSON.stringify(next)) {
    return history;
  }

  return {
    future: [],
    past: [...history.past, cloneValue(current)]
  };
}

export function undoEditorHistory<T>(history: EditorHistorySnapshot<T>, current: T) {
  const previous = history.past.at(-1);
  if (previous === undefined) {
    return {
      current,
      history
    };
  }

  return {
    current: cloneValue(previous),
    history: {
      future: [cloneValue(current), ...history.future],
      past: history.past.slice(0, -1)
    }
  };
}

export function redoEditorHistory<T>(history: EditorHistorySnapshot<T>, current: T) {
  const [next, ...rest] = history.future;
  if (next === undefined) {
    return {
      current,
      history
    };
  }

  return {
    current: cloneValue(next),
    history: {
      future: rest,
      past: [...history.past, cloneValue(current)]
    }
  };
}
