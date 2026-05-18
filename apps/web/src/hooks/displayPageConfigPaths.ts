function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function deepClone<T>(value: T): T {
  return structuredClone(value);
}

export function setValueAtPath<T>(
  source: T,
  path: Array<number | string>,
  value: unknown
): T {
  if (path.length === 0) {
    return value as T;
  }

  const [head, ...tail] = path;

  if (Array.isArray(source)) {
    const nextArray = source.slice();
    const index = typeof head === "number" ? head : Number(head);
    nextArray[index] = setValueAtPath(nextArray[index], tail, value);
    return nextArray as T;
  }

  if (isPlainObject(source)) {
    const key = head as string | number;
    const sourceRecord = source as Record<string | number, unknown>;
    return {
      ...sourceRecord,
      [key]: setValueAtPath(sourceRecord[key], tail, value)
    } as T;
  }

  throw new Error(`Cannot set nested config path "${path.join(".")}" on a non-object value.`);
}

export function getValueAtPath<T>(source: T, path: Array<number | string>): unknown {
  let current: unknown = source;

  for (const segment of path) {
    if (Array.isArray(current)) {
      const index = typeof segment === "number" ? segment : Number(segment);
      current = current[index];
      continue;
    }

    if (isPlainObject(current)) {
      current = current[segment as string];
      continue;
    }

    return undefined;
  }

  return current;
}
