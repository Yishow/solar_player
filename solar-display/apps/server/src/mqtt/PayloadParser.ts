export type ParsedPayload = {
  value: number;
  quality?: string;
  raw: string;
};

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function normalizePath(valuePath: string) {
  return valuePath.replace(/^\$\./u, "").trim();
}

function getValueAtPath(source: unknown, valuePath: string) {
  const normalizedPath = normalizePath(valuePath);

  if (!normalizedPath) {
    return source;
  }

  return normalizedPath.split(".").reduce<unknown>((current, segment) => {
    if (current && typeof current === "object" && segment in current) {
      return (current as Record<string, unknown>)[segment];
    }

    return undefined;
  }, source);
}

function parseFromUnknown(value: unknown, raw: string, valuePath?: string): ParsedPayload {
  const directNumber = toNumber(value);
  if (directNumber !== null) {
    return {
      raw,
      value: directNumber
    };
  }

  if (!value || typeof value !== "object") {
    throw new Error("Unsupported payload format");
  }

  const quality =
    "quality" in value && typeof value.quality === "string" ? value.quality : undefined;
  const resolvedValue =
    valuePath && valuePath.trim() !== ""
      ? getValueAtPath(value, valuePath)
      : "value" in value
        ? value.value
        : undefined;
  const numericValue = toNumber(resolvedValue);

  if (numericValue === null) {
    throw new Error("Unable to resolve numeric value from payload");
  }

  const parsedPayload: ParsedPayload = {
    raw,
    value: numericValue
  };

  if (quality) {
    parsedPayload.quality = quality;
  }

  return parsedPayload;
}

export function parse(rawPayload: string, valuePath?: string): ParsedPayload {
  const raw = rawPayload;
  const directNumber = toNumber(rawPayload.trim());

  if (directNumber !== null) {
    return {
      raw,
      value: directNumber
    };
  }

  try {
    const parsed = JSON.parse(rawPayload) as unknown;
    return parseFromUnknown(parsed, raw, valuePath);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("Payload is neither a number nor valid JSON");
    }

    throw error;
  }
}
