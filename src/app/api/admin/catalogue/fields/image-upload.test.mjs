import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) => {
  const { readFileSync } = require("node:fs");
  const output = ts.transpile(readFileSync(filename, "utf8"), {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  });
  module._compile(output, filename);
};

const {
  FieldImageTooLargeError,
  InvalidFieldImageError,
  validateFieldImage,
} = require("./image-upload.ts");

test("validates JPEG, PNG and WebP signatures against their declared media types", async () => {
  const fixtures = [
    ["image/jpeg", [0xff, 0xd8, 0xff, 0x00]],
    ["image/png", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
    ["image/webp", [...Buffer.from("RIFF"), 0x00, 0x00, 0x00, 0x00, ...Buffer.from("WEBP")]],
  ];

  for (const [contentType, signature] of fixtures) {
    const file = new File([Uint8Array.from(signature)], "field-image", { type: contentType });
    const validated = await validateFieldImage(file);
    assert.equal(validated.imageContentType, contentType);
    assert.deepEqual([...validated.imageData], signature);
  }
});

test("rejects a supported MIME type with mismatched file bytes", async () => {
  const file = new File(["not an image"], "field-image.png", { type: "image/png" });
  await assert.rejects(validateFieldImage(file), InvalidFieldImageError);
});

test("rejects empty images", async () => {
  const file = new File([], "empty.png", { type: "image/png" });
  await assert.rejects(validateFieldImage(file), InvalidFieldImageError);
});

test("rejects images larger than the storage limit before reading them", async () => {
  const oversized = {
    size: 5 * 1024 * 1024 + 1,
    arrayBuffer: () => {
      throw new Error("Oversized files must not be read.");
    },
  };
  await assert.rejects(validateFieldImage(oversized), FieldImageTooLargeError);
});
