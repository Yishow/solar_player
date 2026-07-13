/**
 * Pure byte-level identification for PNG / JPEG / WebP upload content.
 * No native image dependency; does not fully decode pixel data.
 */

export type ImageContentFormat = "png" | "jpeg" | "webp";

export type ImageContentValidationCode =
  | "unsupported-signature"
  | "truncated-container"
  | "invalid-dimensions"
  | "dimension-limit";

export type ImageContentValidationSuccess = {
  ok: true;
  format: ImageContentFormat;
  mimeType: "image/png" | "image/jpeg" | "image/webp";
  width: number;
  height: number;
};

export type ImageContentValidationFailure = {
  ok: false;
  code: ImageContentValidationCode;
  message: string;
};

export type ImageContentValidationResult =
  | ImageContentValidationSuccess
  | ImageContentValidationFailure;

/** Per-side pixel limit (FHD × 4 / 8K-class upper bound). */
export const MAX_IMAGE_SIDE_PIXELS = 8192;
/** Total decoded pixel budget (width × height). */
export const MAX_IMAGE_TOTAL_PIXELS = 33_177_600;

const MIME_BY_FORMAT: Record<ImageContentFormat, ImageContentValidationSuccess["mimeType"]> = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp"
};

const EXT_TO_MIME: Record<string, ImageContentValidationSuccess["mimeType"]> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp"
};

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function fail(
  code: ImageContentValidationCode,
  message: string
): ImageContentValidationFailure {
  return { ok: false, code, message };
}

function success(
  format: ImageContentFormat,
  width: number,
  height: number
): ImageContentValidationResult {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0) {
    return fail("invalid-dimensions", "Image dimensions are invalid.");
  }
  if (width > MAX_IMAGE_SIDE_PIXELS || height > MAX_IMAGE_SIDE_PIXELS) {
    return fail(
      "dimension-limit",
      `Image dimensions exceed the ${MAX_IMAGE_SIDE_PIXELS}px per-side limit.`
    );
  }
  // Guard product overflow even though side limits make this safe for current constants.
  if (width > Number.MAX_SAFE_INTEGER / height) {
    return fail("dimension-limit", "Image total pixel count exceeds the playback budget.");
  }
  const total = width * height;
  if (total > MAX_IMAGE_TOTAL_PIXELS) {
    return fail("dimension-limit", "Image total pixel count exceeds the playback budget.");
  }
  return {
    ok: true,
    format,
    mimeType: MIME_BY_FORMAT[format],
    width,
    height
  };
}

function readUInt32BE(buffer: Buffer, offset: number): number | null {
  if (offset < 0 || offset + 4 > buffer.length) {
    return null;
  }
  return buffer.readUInt32BE(offset);
}

function readUInt32LE(buffer: Buffer, offset: number): number | null {
  if (offset < 0 || offset + 4 > buffer.length) {
    return null;
  }
  return buffer.readUInt32LE(offset);
}

function readUInt16BE(buffer: Buffer, offset: number): number | null {
  if (offset < 0 || offset + 2 > buffer.length) {
    return null;
  }
  return buffer.readUInt16BE(offset);
}

function readUInt24LE(buffer: Buffer, offset: number): number | null {
  if (offset < 0 || offset + 3 > buffer.length) {
    return null;
  }
  return buffer[offset]! | (buffer[offset + 1]! << 8) | (buffer[offset + 2]! << 16);
}

function validatePng(buffer: Buffer): ImageContentValidationResult {
  if (buffer.length < 8 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return fail("unsupported-signature", "File is not a valid PNG image.");
  }

  let offset = 8;
  let width: number | null = null;
  let height: number | null = null;
  let sawIend = false;

  while (offset < buffer.length) {
    if (offset + 8 > buffer.length) {
      return fail("truncated-container", "PNG container is truncated.");
    }

    const length = readUInt32BE(buffer, offset);
    if (length === null) {
      return fail("truncated-container", "PNG container is truncated.");
    }
    // Chunk data length is a uint32; reject absurd values that cannot fit in buffer.
    if (length > buffer.length) {
      return fail("truncated-container", "PNG chunk length exceeds file bounds.");
    }

    const typeStart = offset + 4;
    const type = buffer.toString("ascii", typeStart, typeStart + 4);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const crcEnd = dataEnd + 4;

    if (!Number.isSafeInteger(crcEnd) || crcEnd > buffer.length) {
      return fail("truncated-container", "PNG container is truncated.");
    }

    if (type === "IHDR") {
      if (length !== 13) {
        return fail("truncated-container", "PNG IHDR chunk is invalid.");
      }
      width = readUInt32BE(buffer, dataStart);
      height = readUInt32BE(buffer, dataStart + 4);
      if (width === null || height === null) {
        return fail("truncated-container", "PNG container is truncated.");
      }
    }

    if (type === "IEND") {
      if (length !== 0) {
        return fail("truncated-container", "PNG IEND chunk is invalid.");
      }
      sawIend = true;
      offset = crcEnd;
      break;
    }

    offset = crcEnd;
  }

  if (!sawIend || width === null || height === null) {
    return fail("truncated-container", "PNG container is incomplete.");
  }

  return success("png", width, height);
}

/** SOF markers that carry frame dimensions (baseline / progressive / lossless / differential). */
const JPEG_SOF_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf
]);

function validateJpeg(buffer: Buffer): ImageContentValidationResult {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return fail("unsupported-signature", "File is not a valid JPEG image.");
  }

  let offset = 2;
  let width: number | null = null;
  let height: number | null = null;
  let sawEoi = false;

  while (offset < buffer.length) {
    // Skip fill bytes (0xFF padding).
    while (offset < buffer.length && buffer[offset] === 0xff) {
      offset += 1;
    }
    if (offset >= buffer.length) {
      return fail("truncated-container", "JPEG container is truncated.");
    }

    const marker = buffer[offset]!;
    offset += 1;

    // Standalone markers without length (TEM, RSTn, SOI, EOI).
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      continue;
    }
    if (marker === 0xd8) {
      // Nested SOI is unusual; treat as structure noise and continue.
      continue;
    }
    if (marker === 0xd9) {
      sawEoi = true;
      break;
    }

    // SOS starts entropy-coded scan; scan until EOI while respecting 0xFF00 byte stuffing
    // and restart markers (no length fields inside entropy data).
    if (marker === 0xda) {
      if (offset + 2 > buffer.length) {
        return fail("truncated-container", "JPEG SOS segment is truncated.");
      }
      const sosLength = readUInt16BE(buffer, offset);
      if (sosLength === null || sosLength < 2) {
        return fail("truncated-container", "JPEG SOS segment length is invalid.");
      }
      const sosEnd = offset + sosLength;
      if (sosEnd > buffer.length) {
        return fail("truncated-container", "JPEG SOS segment is truncated.");
      }
      offset = sosEnd;

      while (offset < buffer.length) {
        if (buffer[offset] !== 0xff) {
          offset += 1;
          continue;
        }
        // Collapse padded 0xFF runs.
        while (offset < buffer.length && buffer[offset] === 0xff) {
          offset += 1;
        }
        if (offset >= buffer.length) {
          return fail("truncated-container", "JPEG scan data is truncated.");
        }
        const scanMarker = buffer[offset]!;
        if (scanMarker === 0x00) {
          // Byte-stuffed 0xFF00 in entropy data.
          offset += 1;
          continue;
        }
        if (scanMarker >= 0xd0 && scanMarker <= 0xd7) {
          offset += 1;
          continue;
        }
        if (scanMarker === 0xd9) {
          sawEoi = true;
          offset += 1;
          break;
        }
        // Unexpected marker inside scan — still require a valid lengthed segment or fail.
        offset += 1;
        if (offset + 2 > buffer.length) {
          return fail("truncated-container", "JPEG container is truncated.");
        }
        const segLen = readUInt16BE(buffer, offset);
        if (segLen === null || segLen < 2 || offset + segLen > buffer.length) {
          return fail("truncated-container", "JPEG segment is truncated.");
        }
        offset += segLen;
      }
      break;
    }

    if (offset + 2 > buffer.length) {
      return fail("truncated-container", "JPEG segment is truncated.");
    }
    const length = readUInt16BE(buffer, offset);
    if (length === null || length < 2) {
      return fail("truncated-container", "JPEG segment length is invalid.");
    }
    const segmentEnd = offset + length;
    if (segmentEnd > buffer.length) {
      return fail("truncated-container", "JPEG segment is truncated.");
    }

    if (JPEG_SOF_MARKERS.has(marker)) {
      // SOF: [len:2][precision:1][height:2][width:2]...
      if (length < 7) {
        return fail("truncated-container", "JPEG SOF segment is invalid.");
      }
      height = readUInt16BE(buffer, offset + 3);
      width = readUInt16BE(buffer, offset + 5);
      if (width === null || height === null) {
        return fail("truncated-container", "JPEG SOF segment is truncated.");
      }
    }

    offset = segmentEnd;
  }

  if (!sawEoi) {
    return fail("truncated-container", "JPEG end marker is missing.");
  }
  if (width === null || height === null) {
    return fail("truncated-container", "JPEG frame dimensions are missing.");
  }

  return success("jpeg", width, height);
}

function validateWebp(buffer: Buffer): ImageContentValidationResult {
  if (buffer.length < 12) {
    return fail("unsupported-signature", "File is not a valid WebP image.");
  }
  if (buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WEBP") {
    return fail("unsupported-signature", "File is not a valid WebP image.");
  }

  const riffSize = readUInt32LE(buffer, 4);
  if (riffSize === null) {
    return fail("truncated-container", "WebP RIFF header is truncated.");
  }
  // RIFF size is bytes after the size field; total file size should be riffSize + 8.
  const declaredTotal = riffSize + 8;
  if (!Number.isSafeInteger(declaredTotal) || declaredTotal > buffer.length) {
    return fail("truncated-container", "WebP RIFF declared size exceeds buffer.");
  }
  if (riffSize < 4) {
    return fail("truncated-container", "WebP RIFF size is invalid.");
  }

  let offset = 12;
  let width: number | null = null;
  let height: number | null = null;
  const end = declaredTotal;

  while (offset + 8 <= end) {
    const fourcc = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = readUInt32LE(buffer, offset + 4);
    if (chunkSize === null) {
      return fail("truncated-container", "WebP chunk header is truncated.");
    }
    const dataStart = offset + 8;
    const dataEnd = dataStart + chunkSize;
    // Chunks are padded to even size.
    const paddedEnd = dataEnd + (chunkSize & 1);
    if (!Number.isSafeInteger(paddedEnd) || dataEnd > end) {
      return fail("truncated-container", "WebP chunk exceeds container bounds.");
    }

    if (fourcc === "VP8X") {
      if (chunkSize < 10) {
        return fail("truncated-container", "WebP VP8X chunk is invalid.");
      }
      const wMinus1 = readUInt24LE(buffer, dataStart + 4);
      const hMinus1 = readUInt24LE(buffer, dataStart + 7);
      if (wMinus1 === null || hMinus1 === null) {
        return fail("truncated-container", "WebP VP8X chunk is truncated.");
      }
      width = wMinus1 + 1;
      height = hMinus1 + 1;
    } else if (fourcc === "VP8 " && width === null) {
      // Lossy bitstream: need start code at payload+3.
      if (chunkSize < 10) {
        return fail("truncated-container", "WebP VP8 chunk is truncated.");
      }
      if (
        buffer[dataStart + 3] !== 0x9d ||
        buffer[dataStart + 4] !== 0x01 ||
        buffer[dataStart + 5] !== 0x2a
      ) {
        return fail("truncated-container", "WebP VP8 frame start code is missing.");
      }
      const rawW = readUInt16LESafe(buffer, dataStart + 6);
      const rawH = readUInt16LESafe(buffer, dataStart + 8);
      if (rawW === null || rawH === null) {
        return fail("truncated-container", "WebP VP8 dimensions are truncated.");
      }
      width = rawW & 0x3fff;
      height = rawH & 0x3fff;
    } else if (fourcc === "VP8L" && width === null) {
      if (chunkSize < 5) {
        return fail("truncated-container", "WebP VP8L chunk is truncated.");
      }
      if (buffer[dataStart] !== 0x2f) {
        return fail("truncated-container", "WebP VP8L signature is invalid.");
      }
      // 14-bit width-1, 14-bit height-1 packed little-endian after signature.
      const b1 = buffer[dataStart + 1]!;
      const b2 = buffer[dataStart + 2]!;
      const b3 = buffer[dataStart + 3]!;
      const b4 = buffer[dataStart + 4]!;
      width = 1 + (b1 | ((b2 & 0x3f) << 8));
      height = 1 + (((b2 & 0xc0) >> 6) | (b3 << 2) | ((b4 & 0x0f) << 10));
    }

    offset = paddedEnd;
  }

  if (offset !== end && offset > end) {
    return fail("truncated-container", "WebP container bounds are invalid.");
  }
  if (width === null || height === null) {
    return fail("truncated-container", "WebP dimensions are missing.");
  }

  return success("webp", width, height);
}

function readUInt16LESafe(buffer: Buffer, offset: number): number | null {
  if (offset < 0 || offset + 2 > buffer.length) {
    return null;
  }
  return buffer.readUInt16LE(offset);
}

/**
 * Identify PNG / JPEG / WebP from bytes and enforce dimension budgets.
 * Never throws; short / adversarial buffers become validation failures.
 */
export function validateImageContent(buffer: Buffer): ImageContentValidationResult {
  try {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      return fail("unsupported-signature", "Empty or invalid image payload.");
    }

    if (buffer.length >= 8 && buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
      return validatePng(buffer);
    }
    if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xd8) {
      return validateJpeg(buffer);
    }
    if (
      buffer.length >= 12 &&
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP"
    ) {
      return validateWebp(buffer);
    }

    return fail("unsupported-signature", "Unsupported or unrecognized image format.");
  } catch {
    // Bounds bugs must not leak raw buffers via thrown errors.
    return fail("truncated-container", "Image content could not be validated safely.");
  }
}

/**
 * Map a normalized filename extension to the expected image MIME for content-validated formats.
 * Returns null for extensions outside PNG/JPEG/WebP (e.g. .svg stays on the existing path).
 */
export function mimeTypeForContentValidatedExtension(
  ext: string
): ImageContentValidationSuccess["mimeType"] | null {
  return EXT_TO_MIME[ext.toLowerCase()] ?? null;
}

/**
 * Require extension, declared multipart MIME, and detected type to agree.
 */
export function validateImageTypeAgreement(input: {
  extension: string;
  declaredMime: string;
  detected: ImageContentValidationSuccess;
}): ImageContentValidationFailure | null {
  const expectedFromExt = mimeTypeForContentValidatedExtension(input.extension);
  if (!expectedFromExt) {
    return fail("unsupported-signature", "Filename extension is not a validated image type.");
  }
  const declared = input.declaredMime.trim().toLowerCase();
  if (declared !== expectedFromExt) {
    return fail(
      "unsupported-signature",
      "Declared MIME type does not match the filename extension."
    );
  }
  if (input.detected.mimeType !== expectedFromExt) {
    return fail(
      "unsupported-signature",
      "Image content does not match the filename extension and declared MIME type."
    );
  }
  return null;
}

/** Bounded client-facing message for validation failures (no path / buffer / stack). */
export function imageContentValidationErrorMessage(
  result: ImageContentValidationFailure
): string {
  switch (result.code) {
    case "unsupported-signature":
      return "Invalid image content. Only valid PNG, JPEG, and WebP files are accepted.";
    case "truncated-container":
      return "Image file is incomplete or truncated.";
    case "invalid-dimensions":
      return "Image dimensions are invalid.";
    case "dimension-limit":
      return "Image dimensions exceed the allowed playback budget.";
    default:
      return "Invalid image content.";
  }
}
