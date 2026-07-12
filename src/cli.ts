import { statSync, openSync, closeSync, readSync } from "node:fs";

const IMAGE_MAGIC_BYTES: Record<string, Uint8Array> = {
  PNG: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  JPEG: new Uint8Array([0xff, 0xd8, 0xff]),
  GIF: new Uint8Array([0x47, 0x49, 0x46, 0x38]), // "GIF8"
  WEBP: new Uint8Array([0x52, 0x49, 0x46, 0x46]), // "RIFF" — needs further check
  BMP: new Uint8Array([0x42, 0x4d]), // "BM"
};

const VALID_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"];

export function validateImagePath(path: string): void {
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

usage: img2key <image> -n <name> [-l <len>] [-o <dir>] [-s <phrase>] [--stdout | wlcopy] [-bw <bw-item>]

arguments:
  <image>                   path to the image file (png, jpg, gif, webp, bmp)

options:
  -n,       --name <name>         site name (used as the output filename)
  -l,       --length <num>        password length (8-32, default: 32)
  -o,       --out <dir>           output directory (default: ~/.local/share/img2key/)
  -s,       --salt <phrase>       input your own phrase that gets added to the image data
  --stdout,                       pushes generated password to stdout
  -bw       --bitwarden           uses --stdout to pipe the generated password into bitwarden-cli
  -h,       --help                show this help text

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
  salt: string | null;
  stdout: boolean;
  bitwardenItem: string | null;
  cleanup: boolean;
}

export function parseArgs(raw: string[]): CliArgs {
  let imagePath: string | null = null;
  let siteName: string | null = null;
  let length = 32;
  let outputDir: string | null = null;
  let salt: string | null = null;
  let stdout = false;
  let bitwardenItem: string | null = null;
  let cleanup = false;

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
    } else if (arg === "--salt" || arg === "-s") {
      salt = raw[++i] ?? null;
    } else if (arg === "--stdout") {
      stdout = true;
    } else if (arg === "--bitwarden" || arg === "-bw") {
      bitwardenItem = raw[++i] ?? null;
    } else if (arg === "--cleanup") {
      cleanup = true;
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

  return {
    imagePath,
    siteName,
    length,
    outputDir,
    salt,
    stdout,
    bitwardenItem,
    cleanup,
  };
}
