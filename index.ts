import { statSync, openSync, readSync, closeSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";

// img2key - derive deterministic passwords from images

// Magic bytes for common image formats
const IMAGE_MAGIC_BYTES: Record<string, Uint8Array> = {
  PNG: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  JPEG: new Uint8Array([0xff, 0xd8, 0xff]),
  GIF: new Uint8Array([0x47, 0x49, 0x46, 0x38]), // "GIF8"
  WEBP: new Uint8Array([0x52, 0x49, 0x46, 0x46]), // "RIFF" — needs further check
  BMP: new Uint8Array([0x42, 0x4d]),               // "BM"
};

const VALID_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"];

function validateImagePath(path: string): void {
  // Check 1: file exists and is a file
  try {
    const stats = statSync(path);
    if (!stats.isFile()) {
      console.error(`Error: "${path}" is not a file`);
      process.exit(1);
    }
  } catch {
    console.error(`Error: "${path}" does not exist`);
    process.exit(1);
  }

  // Check 2: file extension
  const ext = path.toLowerCase().slice(path.lastIndexOf("."));
  if (!VALID_EXTENSIONS.includes(ext)) {
    console.error(`Error: "${path}" is not a supported image format`);
    console.error(`  Supported: ${VALID_EXTENSIONS.join(", ")}`);
    process.exit(1);
  }

  // Check 3: magic bytes (file header matches claimed format)
  const fd = openSync(path, "r");
  const buffer = Buffer.alloc(8);
  readSync(fd, buffer, 0, 8, 0);
  closeSync(fd);

  const isValidMagic = Object.entries(IMAGE_MAGIC_BYTES).some(
    ([, magic]) => buffer.subarray(0, magic.length).equals(magic),
  );

  if (!isValidMagic) {
    console.error(`Error: "${path}" has no valid image header`);
    process.exit(1);
  }
}

function hashImage(path: string): string {
  const buffer = readFileSync(path);
  const hash = createHash("sha256").update(buffer).digest("hex");
  return hash;
}

function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error("Usage: img2key <image-path> <site-name> [output-dir]");
    process.exit(1);
  }

  const imagePath = args[0]!;
  const siteName = args[1]!;
  const outputDir = args[2] ?? null;

  validateImagePath(imagePath);

  const shaKey = hashImage(imagePath);

  console.log("imagePath:", imagePath);
  console.log("siteName:", siteName);
  console.log("outputDir:", outputDir);
  console.log("sha256:", shaKey);
}

main();