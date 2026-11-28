import { Buffer } from "node:buffer";

export const maxFieldImageBytes = 5 * 1024 * 1024;

export class FieldImageTooLargeError extends Error {}
export class InvalidFieldImageError extends Error {}

const signatures = [
  {
    contentType: "image/jpeg",
    matches: (bytes: Uint8Array) =>
      bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  },
  {
    contentType: "image/png",
    matches: (bytes: Uint8Array) =>
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a,
  },
  {
    contentType: "image/webp",
    matches: (bytes: Uint8Array) =>
      bytes.length >= 12 &&
      Buffer.from(bytes.subarray(0, 4)).toString("ascii") === "RIFF" &&
      Buffer.from(bytes.subarray(8, 12)).toString("ascii") === "WEBP",
  },
] as const;

export async function validateFieldImage(file: File) {
  if (file.size > maxFieldImageBytes) throw new FieldImageTooLargeError();
  if (!file.size) throw new InvalidFieldImageError("Choose a non-empty image file.");

  const imageData = Buffer.from(await file.arrayBuffer());
  const detected = signatures.find(({ matches }) => matches(imageData))?.contentType;
  if (!detected || detected !== file.type) {
    throw new InvalidFieldImageError("Use a valid JPEG, PNG or WebP image.");
  }
  return { imageData, imageContentType: detected };
}
