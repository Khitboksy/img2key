import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join as joinPath } from "node:path";
import { createHash } from "node:crypto";
import { homedir } from "node:os";

const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWER = "abcdefghijklmnopqrstuvwxyz";
const DIGITS = "0123456789";
const SPECIALS = "!@#$%^&";
const ALL = UPPER + LOWER + DIGITS + SPECIALS;

// Step One - Hash the image
export function hashImage(path: string): Buffer {
  return createHash("sha256").update(readFileSync(path)).digest();
}

// Step Two - Generate Password
export function generatePassword(hash: Buffer, length: number): string {
  const pw: string[] = new Array(length);
  let byteIdx = 0;

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

// Step Three - Ensure clean file path names
function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

// Step Four - Ensure output path is real
export function resolveOutputDir(specified: string | null): string {
  if (specified !== null) return specified;
  return joinPath(homedir(), ".local", "share", "img2key");
}

// Step Five - Push the password to a chown600 permissions file
export function writePassword(
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
