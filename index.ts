import {
  statSync,
  openSync,
  readSync,
  closeSync,
  readFileSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { join as joinPath } from "node:path";
import { execSync } from "node:child_process";

// img2key - derive deterministic passwords from images

// Magic bytes for common image formats
const IMAGE_MAGIC_BYTES: Record<string, Uint8Array> = {
  PNG: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  JPEG: new Uint8Array([0xff, 0xd8, 0xff]),
  GIF: new Uint8Array([0x47, 0x49, 0x46, 0x38]), // "GIF8"
  WEBP: new Uint8Array([0x52, 0x49, 0x46, 0x46]), // "RIFF" — needs further check
  BMP: new Uint8Array([0x42, 0x4d]), // "BM"
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

  const isValidMagic = Object.entries(IMAGE_MAGIC_BYTES).some(([, magic]) =>
    buffer.subarray(0, magic.length).equals(magic),
  );

  if (!isValidMagic) {
    console.error(`Error: "${path}" has no valid image header`);
    process.exit(1);
  }
}

function printHelp(): never {
  console.log(`
img2key - derive deterministic passwords from images

usage: img2key <image> -n <name> [-l <len>] [-o <dir>]

arguments:
  <image>                   path to the image file (png, jpg, gif, webp, bmp)

options:
  -n, --name <name>         site name (used as the output filename)
  -l, --length <num>        password length (8-32, default: 32)
  -o, --out <dir>           output directory (default: ~/.local/share/img2key/)
  -h, --help                show this help text

the password is written to a file with 600 permissions and printed only there,
not in the terminal. a clipboard hint is shown when a compatible tool is found.
`);
  process.exit(0);
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
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
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
    console.error("Usage: img2key <image> -n <name> [-l <len>] [-o <dir>]");
    console.error("Run 'img2key --help' for details.");
    process.exit(1);
  }

  return { imagePath, siteName, length, outputDir };
}

function hashImage(path: string): Buffer {
  return createHash("sha256").update(readFileSync(path)).digest();
}

const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWER = "abcdefghijklmnopqrstuvwxyz";
const DIGITS = "0123456789";
const SPECIALS = "!@#$%^&";
const ALL = UPPER + LOWER + DIGITS + SPECIALS;

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function resolveOutputDir(specified: string | null): string {
  if (specified !== null) return specified;
  return joinPath(homedir(), ".local", "share", "img2key");
}

function writePassword(
  password: string,
  siteName: string,
  outputDir: string,
): string {
  const sanitized = sanitizeName(siteName);
  const outPath = joinPath(outputDir, `${sanitized}.txt`);

  mkdirSync(outputDir, { recursive: true });
  writeFileSync(outPath, password + "\n", { mode: 0o600 });

  return outPath;
}

const CLIPBOARD_CMDS: { cmd: string; hint: string }[] = [
  { cmd: "wl-copy", hint: "wl-copy" },
  { cmd: "xclip", hint: "xclip -sel clip" },
  { cmd: "xsel", hint: "xsel -ib" },
  { cmd: "pbcopy", hint: "pbcopy" },
  { cmd: "clip.exe", hint: "clip.exe" },
];

function commandExists(cmd: string): boolean {
  try {
    execSync(`command -v ${cmd}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function clipboardHint(): string {
  const available = CLIPBOARD_CMDS.find(({ cmd }) => commandExists(cmd));
  return available?.hint ?? "";
}
function generatePassword(hash: Buffer, length: number): string {
  const pw: string[] = new Array(length);
  let byteIdx = 0;

  // Wraps around if we run out of bytes (can't happen at max length of 32)
  // but handles it cleanly anyway.
  function nextByte(): number {
    return hash[byteIdx++ % hash.length]!;
  }

  // 1. Reserve: guarantee one character from each class
  pw[0] = UPPER[nextByte() % UPPER.length]!;
  pw[1] = LOWER[nextByte() % LOWER.length]!;
  pw[2] = DIGITS[nextByte() % DIGITS.length]!;
  pw[3] = SPECIALS[nextByte() % SPECIALS.length]!;

  // 2. Fill: remaining positions from the combined pool
  for (let i = 4; i < length; i++) {
    pw[i] = ALL[nextByte() % ALL.length]!;
  }

  // 3. Shuffle: Fisher-Yates, deterministic from the hash
  for (let i = length - 1; i > 0; i--) {
    const j = nextByte() % (i + 1);
    [pw[i], pw[j]] = [pw[j]!, pw[i]!];
  }

  return pw.join("");
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  validateImagePath(args.imagePath);

  const hashBytes = hashImage(args.imagePath);
  const password = generatePassword(hashBytes, args.length);
  const outDir = resolveOutputDir(args.outputDir);
  const outPath = writePassword(password, args.siteName, outDir);

  const clip = clipboardHint();

  console.log("saved to:", outPath);
  if (clip) {
    console.log(`quick copy: cat ${outPath} | ${clip}`);
  }
}

main();
