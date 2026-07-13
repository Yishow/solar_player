import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import test from "node:test";
import {
  MAX_IMAGE_SIDE_PIXELS,
  MAX_IMAGE_TOTAL_PIXELS,
  mimeTypeForContentValidatedExtension,
  validateImageContent,
  validateImageTypeAgreement,
  type ImageContentValidationSuccess
} from "./imageContentValidation.js";

/** Minimal valid 1×1 PNG (IHDR + IDAT + IEND). */
export function createMinimalPng(width = 1, height = 1): Buffer {
  const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 2;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  // CRC values below are correct only for 1×1; dimension-only checks ignore CRC.
  const ihdrCrc = Buffer.from([0x90, 0x77, 0x53, 0xde]);
  const ihdr = Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, 0x0d]),
    Buffer.from("IHDR"),
    ihdrData,
    width === 1 && height === 1 ? ihdrCrc : Buffer.alloc(4)
  ]);
  const idatData = Buffer.from([0x78, 0x9c, 0x62, 0x60, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01]);
  const idat = Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, 0x0a]),
    Buffer.from("IDAT"),
    idatData,
    Buffer.from([0xe8, 0x03, 0x8e, 0x15])
  ]);
  const iend = Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, 0x00]),
    Buffer.from("IEND"),
    Buffer.from([0xae, 0x42, 0x60, 0x82])
  ]);
  return Buffer.concat([pngHeader, ihdr, idat, iend]);
}

/** Minimal valid 1×1 JPEG with SOF0 + EOI. */
export function createMinimalJpeg(): Buffer {
  return Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
    0x00, 0x01, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
    0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
    0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20,
    0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29, 0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27,
    0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
    0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
    0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0xff, 0xc4, 0x00, 0xb5, 0x10, 0x00, 0x02, 0x01, 0x03,
    0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7d, 0x01, 0x02, 0x03, 0x00,
    0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06, 0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32,
    0x81, 0x91, 0xa1, 0x08, 0x23, 0x42, 0xb1, 0xc1, 0x15, 0x52, 0xd1, 0xf0, 0x24, 0x33, 0x62, 0x72,
    0x82, 0x09, 0x0a, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x25, 0x26, 0x27, 0x28, 0x29, 0x2a, 0x34, 0x35,
    0x36, 0x37, 0x38, 0x39, 0x3a, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4a, 0x53, 0x54, 0x55,
    0x56, 0x57, 0x58, 0x59, 0x5a, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6a, 0x73, 0x74, 0x75,
    0x76, 0x77, 0x78, 0x79, 0x7a, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8a, 0x92, 0x93, 0x94,
    0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0xa2, 0xa3, 0xa4, 0xa5, 0xa6, 0xa7, 0xa8, 0xa9, 0xaa, 0xb2,
    0xb3, 0xb4, 0xb5, 0xb6, 0xb7, 0xb8, 0xb9, 0xba, 0xc2, 0xc3, 0xc4, 0xc5, 0xc6, 0xc7, 0xc8, 0xc9,
    0xca, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda, 0xe1, 0xe2, 0xe3, 0xe4, 0xe5, 0xe6,
    0xe7, 0xe8, 0xe9, 0xea, 0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa, 0xff, 0xda,
    0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0x7b, 0x40, 0x0f, 0xf2, 0x5f, 0xff, 0xd9
  ]);
}

/** Minimal VP8X WebP declaring explicit canvas dimensions. */
export function createMinimalWebp(width = 1, height = 1): Buffer {
  const wMinus1 = width - 1;
  const hMinus1 = height - 1;
  const vp8xPayload = Buffer.alloc(10);
  vp8xPayload[0] = 0x00; // flags
  vp8xPayload[1] = 0x00;
  vp8xPayload[2] = 0x00;
  vp8xPayload[3] = 0x00;
  vp8xPayload[4] = wMinus1 & 0xff;
  vp8xPayload[5] = (wMinus1 >> 8) & 0xff;
  vp8xPayload[6] = (wMinus1 >> 16) & 0xff;
  vp8xPayload[7] = hMinus1 & 0xff;
  vp8xPayload[8] = (hMinus1 >> 8) & 0xff;
  vp8xPayload[9] = (hMinus1 >> 16) & 0xff;

  const chunkSize = Buffer.alloc(4);
  chunkSize.writeUInt32LE(10, 0);
  const riffBody = Buffer.concat([Buffer.from("WEBP"), Buffer.from("VP8X"), chunkSize, vp8xPayload]);
  const riffSize = Buffer.alloc(4);
  riffSize.writeUInt32LE(riffBody.length, 0);
  return Buffer.concat([Buffer.from("RIFF"), riffSize, riffBody]);
}

function assertOk(
  result: ReturnType<typeof validateImageContent>,
  expected: Partial<ImageContentValidationSuccess>
) {
  assert.equal(result.ok, true, `expected ok, got ${JSON.stringify(result)}`);
  if (!result.ok) {
    return;
  }
  if (expected.format !== undefined) {
    assert.equal(result.format, expected.format);
  }
  if (expected.mimeType !== undefined) {
    assert.equal(result.mimeType, expected.mimeType);
  }
  if (expected.width !== undefined) {
    assert.equal(result.width, expected.width);
  }
  if (expected.height !== undefined) {
    assert.equal(result.height, expected.height);
  }
}

test("validateImageContent accepts minimal PNG/JPEG/WebP fixtures", () => {
  assertOk(validateImageContent(createMinimalPng()), {
    format: "png",
    mimeType: "image/png",
    width: 1,
    height: 1
  });
  assertOk(validateImageContent(createMinimalJpeg()), {
    format: "jpeg",
    mimeType: "image/jpeg",
    width: 1,
    height: 1
  });
  assertOk(validateImageContent(createMinimalWebp(8, 4)), {
    format: "webp",
    mimeType: "image/webp",
    width: 8,
    height: 4
  });
});

test("validateImageContent rejects renamed text and unsupported signatures", () => {
  const textAsPng = Buffer.from("this is not a png file at all");
  const result = validateImageContent(textAsPng);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "unsupported-signature");
  }

  const empty = validateImageContent(Buffer.alloc(0));
  assert.equal(empty.ok, false);

  const short = validateImageContent(Buffer.from([0x89, 0x50]));
  assert.equal(short.ok, false);
});

test("validateImageContent rejects truncated PNG/JPEG/WebP containers", () => {
  const fullPng = createMinimalPng();
  const truncatedPng = fullPng.subarray(0, 20); // signature + partial IHDR, no IEND
  const pngResult = validateImageContent(truncatedPng);
  assert.equal(pngResult.ok, false);
  if (!pngResult.ok) {
    assert.equal(pngResult.code, "truncated-container");
  }

  const fullJpeg = createMinimalJpeg();
  // Drop EOI (last two bytes 0xFF 0xD9).
  const truncatedJpeg = fullJpeg.subarray(0, fullJpeg.length - 2);
  const jpegResult = validateImageContent(truncatedJpeg);
  assert.equal(jpegResult.ok, false);
  if (!jpegResult.ok) {
    assert.equal(jpegResult.code, "truncated-container");
  }

  const fullWebp = createMinimalWebp();
  const truncatedWebp = fullWebp.subarray(0, 12); // RIFF/WEBP only
  const webpResult = validateImageContent(truncatedWebp);
  assert.equal(webpResult.ok, false);
  if (!webpResult.ok) {
    assert.ok(
      webpResult.code === "truncated-container" || webpResult.code === "unsupported-signature"
    );
  }

  // WebP with RIFF size larger than buffer.
  const oversizedRiff = Buffer.from(fullWebp);
  oversizedRiff.writeUInt32LE(0xffff, 4);
  const riffResult = validateImageContent(oversizedRiff);
  assert.equal(riffResult.ok, false);
});

test("validateImageContent rejects invalid and over-budget dimensions", () => {
  const zeroDim = createMinimalPng(0, 10);
  const zeroResult = validateImageContent(zeroDim);
  assert.equal(zeroResult.ok, false);
  if (!zeroResult.ok) {
    assert.equal(zeroResult.code, "invalid-dimensions");
  }

  const overSide = createMinimalPng(MAX_IMAGE_SIDE_PIXELS + 1, 1);
  const sideResult = validateImageContent(overSide);
  assert.equal(sideResult.ok, false);
  if (!sideResult.ok) {
    assert.equal(sideResult.code, "dimension-limit");
  }

  // Structurally valid WebP whose product exceeds total pixel budget while each side <= 8192.
  // 8192 * 4054 = 33,178,368 > 33,177,600.
  const overTotal = createMinimalWebp(8192, 4054);
  assert.ok(8192 * 4054 > MAX_IMAGE_TOTAL_PIXELS);
  const totalResult = validateImageContent(overTotal);
  assert.equal(totalResult.ok, false);
  if (!totalResult.ok) {
    assert.equal(totalResult.code, "dimension-limit");
  }

  // Boundary: exactly at budget should pass.
  // 7680 * 4320 = 33,177,600.
  assert.equal(7680 * 4320, MAX_IMAGE_TOTAL_PIXELS);
  assertOk(validateImageContent(createMinimalWebp(7680, 4320)), {
    width: 7680,
    height: 4320
  });
});

test("validateImageContent never throws on fuzzed short buffers", () => {
  const samples: Buffer[] = [
    Buffer.alloc(0),
    Buffer.from([0xff]),
    Buffer.from([0xff, 0xd8]),
    Buffer.from([0xff, 0xd8, 0xff]),
    Buffer.from("RIFF"),
    Buffer.from("RIFF\x00\x00\x00\x00WEBP"),
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0xff]),
    Buffer.alloc(64, 0x00),
    Buffer.alloc(64, 0xff)
  ];
  for (const sample of samples) {
    assert.doesNotThrow(() => validateImageContent(sample));
    const result = validateImageContent(sample);
    assert.equal(typeof result.ok, "boolean");
    if (!result.ok) {
      assert.ok(result.code);
      assert.ok(typeof result.message === "string");
      // Failure must not embed raw payload bytes (only check non-trivial hex prefixes).
      const hexPrefix = sample.toString("hex").slice(0, 16);
      if (hexPrefix.length >= 8) {
        assert.equal(result.message.toLowerCase().includes(hexPrefix), false);
      }
    }
  }
});

test("validateImageTypeAgreement requires extension, MIME, and detected type to match", () => {
  const jpeg = validateImageContent(createMinimalJpeg());
  assert.equal(jpeg.ok, true);
  if (!jpeg.ok) {
    return;
  }

  assert.equal(
    validateImageTypeAgreement({
      extension: ".jpg",
      declaredMime: "image/jpeg",
      detected: jpeg
    }),
    null
  );

  const mismatchExt = validateImageTypeAgreement({
    extension: ".png",
    declaredMime: "image/png",
    detected: jpeg
  });
  assert.ok(mismatchExt);
  assert.equal(mismatchExt?.code, "unsupported-signature");

  const mismatchMime = validateImageTypeAgreement({
    extension: ".jpg",
    declaredMime: "image/png",
    detected: jpeg
  });
  assert.ok(mismatchMime);

  assert.equal(mimeTypeForContentValidatedExtension(".jpeg"), "image/jpeg");
  assert.equal(mimeTypeForContentValidatedExtension(".svg"), null);
});

test("production upload image corpus passes content validation", () => {
  const uploadsDir = resolve(process.cwd(), "../../uploads/images");
  let entries: string[] = [];
  try {
    entries = readdirSync(uploadsDir);
  } catch {
    // Corpus is optional when uploads are absent in the workspace.
    return;
  }

  const imageFiles = entries.filter((name) => {
    const ext = extname(name).toLowerCase();
    return ext === ".png" || ext === ".jpg" || ext === ".jpeg" || ext === ".webp";
  });

  assert.ok(imageFiles.length > 0, "expected production image assets under uploads/images");

  for (const name of imageFiles) {
    const fullPath = join(uploadsDir, name);
    if (!statSync(fullPath).isFile()) {
      continue;
    }
    const buffer = readFileSync(fullPath);
    const result = validateImageContent(buffer);
    assert.equal(result.ok, true, `${name} should validate: ${JSON.stringify(result)}`);
  }
});
