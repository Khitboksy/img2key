import { statSync, openSync, closeSync, readSync, writeSync } from "node:fs";
import { VERSION } from "./version.ts";
import type { EncryptConfig } from "./encrypt.ts";

const IMAGE_MAGIC_BYTES: Record<string, Uint8Array> = {
  PNG: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  JPEG: new Uint8Array([0xff, 0xd8, 0xff]),
  GIF: new Uint8Array([0x47, 0x49, 0x46, 0x38]), // "GIF8"
  WEBP: new Uint8Array([0x52, 0x49, 0x46, 0x46]), // "RIFF" — needs further check
  BMP: new Uint8Array([0x42, 0x4d]), // "BM"
};

const VALID_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"];

export function consoleLog(...args: unknown[]): void {
  const message = args.map((a) => String(a)).join(" ") + "\n";
  writeSync(2, message);
}

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

usage: img2key <image> [encrypt <path> [<name>]] [options] 
       img2key setkey [<pubkey> | <path>]
       img2key getkey <dir> [<name>]

arguments:
  <image>                           path to the image file (png, jpg, gif, webp, bmp)

options:
  -l,       --length <num>          password length (8-32, default: 32)
  -s,       --salt <phrase>         input your own phrase that gets added to the image data
  -bw,      --bitwarden <item>      pipe the generated password into bitwarden-cli items
  -kr,      --keyring <item>        pipe the generated password into secret-service

sub-commands:
  setkey [<pubkey> | <path>]        register a public key for encryption
  getkey <dir> [<name>]             generate a new X25519 keypair
  encrypt <path> [<name>]           encrypt output with registered public key                                    (appears after <image>, not standalone)

other:
  -h,       --help                  show this help text
  -v,       --version               show version and exit

the password is always printed to stdout so you can pipe into something like wl-copy.
the program DOES NOT write ANY data to disk, only passing data along to integrated software
`);
  process.exit(0);
}

interface CliArgs {
  imagePath: string;
  length: number;
  salt: string | null;
  bitwardenItem: string | null;
  keyringItem: string | null;
}
type CliResult =
  | {
      command: "generate";
      imagePath: string;
      length: number;
      salt: string | null;
      bitwardenItem: string | null;
      keyringItem: string | null;
      encrypt: EncryptConfig | null;
    }
  | {
      command: "setkey";
      pubkey: string | undefined; // undefined = show current
    }
  | {
      command: "getkey";
      outDir: string;
      name: string;
    };

export function parseArgs(raw: string[]): CliResult {
  if (raw.length === 0) printHelp();

  // Sub Commands
  const first = raw[0]!;
  if (first === "setkey") {
    const rest = raw.slice(1);
    if (rest.length === 0) return { command: "setkey", pubkey: undefined };
    if (rest.length === 1) return { command: "setkey", pubkey: rest[0] };
    console.error("Error: 'setkey' takes at most one argument");
    process.exit(1);
  }

  if (first === "getkey") {
    const rest = raw.slice(1);
    if (rest.length < 1) {
      console.error("Usage: img2key getkey <dir> [name]");
      process.exit(1);
    }
    return {
      command: "getkey",
      outDir: rest[0]!,
      name: rest[1] ?? "img2key-key",
    };
  }

  let length = 32;
  let salt: string | null = null;
  let bitwardenItem: string | null = null;
  let keyringItem: string | null = null;
  const positional: string[] = [];

  // Options
  for (let i = 0; i < raw.length; i++) {
    const arg = raw[i]!;

    if (arg === "--length" || arg === "-l") {
      const val = raw[++i];
      if (val === undefined) break;
      length = Number.parseInt(val, 10);
      if (Number.isNaN(length) || length < 8 || length > 32) {
        console.error("Error: --length must be a number between 8 and 32");
        process.exit(1);
      }
    } else if (arg === "--salt" || arg === "-s") {
      salt = raw[++i] ?? null;
    } else if (arg === "--bitwarden" || arg === "-bw") {
      bitwardenItem = raw[++i] ?? null;
    } else if (arg === "--keyring" || arg === "-kr") {
      keyringItem = raw[++i] ?? null;
    } else if (arg === "--version" || arg === "-v") {
      console.log("img2key", VERSION);
      process.exit(0);
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
    } else if (arg.startsWith("-")) {
      console.error(`Error: unknown flag "${arg}"`);
      consoleLog("Run 'img2key --help' for details.");
      process.exit(1);
    } else {
      positional.push(arg); // <-- collect non-flags
    }
  }

  // Interpret positionals
  if (positional.length === 0) {
    console.error("Usage: img2key <image> [options]");
    consoleLog("Run 'img2key --help' for details.");
    process.exit(1);
  }

  const imagePath = positional[0]!;
  let encrypt: EncryptConfig | null = null;

  if (positional.length >= 2) {
    if (positional[1] !== "encrypt") {
      console.error(`Error: unexpected argument "${positional[1]}"`);
      consoleLog("Run 'img2key --help' for details.");
      process.exit(1);
    }
    const outDir = positional[2];
    if (!outDir) {
      console.error("Error: 'encrypt <path>' requires a directory path");
      process.exit(1);
    }
    encrypt = {
      outDir,
      name: positional[3] ?? "img2key-encrypted",
    };
    if (positional.length > 4) {
      console.error(`Error: unexpected argument "${positional[4]}"`);
      process.exit(1);
    }
  }

  return {
    command: "generate",
    imagePath,
    length,
    salt,
    bitwardenItem,
    keyringItem,
    encrypt,
  };
}
