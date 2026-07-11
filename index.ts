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

interface CliArgs {
  imagePath: string;
  siteName: string;
  length: number;
  outputDir: string | null;
}

function parseArgs(raw: string[]): CliArgs {
  let imagePath: string | null = null;
  let siteName: string | null = null;
  let length = 32;
  let outputDir: string | null = null;

  for (let i = 0; i < raw.length; i++) {
    const arg = raw[i]!;

    if (arg === "--name" || arg === "-n") {
      siteName = raw[++i] ?? null;
    } else if (arg === "--length" || arg === "-l") {
      const val = raw[++i];
      if (val === undefined) break;
      length = Number.parseInt(val, 10);
      if (Number.isNaN(length) || length < 8 || length > 32) {
        console.error("Error: --length must be a number between 8 and 32");
        process.exit(1);
      }
    } else if (arg === "--out" || arg === "-o") {
      outputDir = raw[++i] ?? null;
    } else if (arg.startsWith("-")) {
      console.error(`Error: unknown flag "${arg}"`);
      process.exit(1);
    } else if (imagePath === null) {
      imagePath = arg;
    } else {
      console.error(`Error: unexpected argument "${arg}"`);
      process.exit(1);
    }
  }

  if (imagePath === null || siteName === null) {
    console.error("Usage: img2key <image-path> -n <site-name> [-l <length>] [-o <output-dir>]");
    process.exit(1);
  }

  return { imagePath, siteName, length, outputDir };
}

function hashImage(path: string): Buffer {
  return createHash("sha256").update(readFileSync(path)).digest();
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  validateImagePath(args.imagePath);

  const hashBytes = hashImage(args.imagePath);

  console.log("imagePath:", args.imagePath);
  console.log("siteName:", args.siteName);
  console.log("length:", args.length);
  console.log("outputDir:", args.outputDir);
  console.log("sha256:", hashBytes.toString("hex"));
}

main();