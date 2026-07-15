import { readFileSync } from "node:fs";
import { createHash, createHmac } from "node:crypto";
import { spawnSync } from "node:child_process";
import { consoleLog } from "./cli.ts";

const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWER = "abcdefghijklmnopqrstuvwxyz";
const DIGITS = "0123456789";
const SPECIALS = "!#$%&'()*+,-./:;<=>?@[]_{}";
const ALL = UPPER + LOWER + DIGITS + SPECIALS;

// Step One - Hash the image
export function hashImage(path: string, salt: string | null): Buffer {
  const imageBytes = readFileSync(path);
  if (salt != null) {
    return createHmac("sha512", "img2key-v2:" + salt)
      .update(imageBytes)
      .digest();
  }
  return createHash("sha512").update(imageBytes).digest();
}

// Step Two - Generate Password
export function generatePassword(hash: Buffer, length: number): string {
  const pw: string[] = new Array(length);
  const halfHash = hash.length / 2;

  let charByte = 0;
  let shuffleByte = 0;

  function nextCharByte(): number {
    return hash[charByte++ % halfHash]!;
  }

  function nextShuffleByte(): number {
    return hash[halfHash + (shuffleByte++ % halfHash)]!;
  }

  // 1. Reserve: guarantee one character from each class
  pw[0] = UPPER[nextCharByte() % UPPER.length]!;
  pw[1] = LOWER[nextCharByte() % LOWER.length]!;
  pw[2] = DIGITS[nextCharByte() % DIGITS.length]!;
  pw[3] = SPECIALS[nextCharByte() % SPECIALS.length]!;

  // 2. Fill: remaining positions from the combined pool
  for (let i = 4; i < length; i++) {
    pw[i] = ALL[nextCharByte() % ALL.length]!;
  }

  // 3. Shuffle: Fisher-Yates, deterministic from the SECOND half of the hash
  for (let i = length - 1; i > 0; i--) {
    const j = nextShuffleByte() % (i + 1);
    [pw[i], pw[j]] = [pw[j]!, pw[i]!];
  }

  return pw.join("");
}

// Optional Bitwarden Integration
export function updateBitwarden(itemName: string, password: string): boolean {
  consoleLog("Finding", itemName + ",");
  // 1. Get current item JSON from bitwarden
  const get = spawnSync("bw", ["get", "item", itemName], {
    encoding: "utf-8",
    stdio: ["inherit", "pipe", "inherit"],
  });

  if (get.status !== 0 || !get.stdout.trim()) {
    return false;
  }

  // 2. Modify the password in the JSON (no jq needed)
  let item: Record<string, unknown>;
  try {
    item = JSON.parse(get.stdout);
  } catch {
    console.error("Error: bitwarden returned invalid JSON");
    return false;
  }
  const itemId = item.id as string;
  if (!itemId) {
    console.error("Error: bitwarden item has no id");
    return false;
  }

  if (!item.login || typeof item.login !== "object") {
    item.login = {};
  }
  (item.login as Record<string, unknown>).password = password;

  // 3. Encode the modified JSON using bw's own encoder
  consoleLog("Encoding Password,");
  const encode = spawnSync("bw", ["encode"], {
    input: JSON.stringify(item),
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "inherit"],
  });

  if (encode.status !== 0) {
    console.error("Error: bw encode failed");
    return false;
  }

  const encoded = encode.stdout.trim();

  // 4. Send the update -- argument instead of stdin so master password prompt works
  consoleLog("Editing", itemName + ",");
  const edit = spawnSync("bw", ["edit", "item", itemId, encoded], {
    encoding: "utf-8",
    stdio: ["inherit", "pipe", "inherit"],
  });

  if (edit.status !== 0) {
    console.error("bw edit failed:", edit.stdout?.trim());
    return false;
  }
  consoleLog("Your Bitwarden password for", itemName, "has been updated!");
  return true;
}

// Optional secret-service Integration
export function updateKeyring(account: string, password: string): boolean {
  const store = spawnSync(
    "secret-tool",
    [
      "store",
      "--label",
      `img2key: ${account}`,
      "service",
      "img2key",
      "account",
      account,
    ],
    {
      input: password,
      encoding: "utf-8",
      stdio: ["pipe", "inherit", "inherit"],
    },
  );

  if (store.status !== 0) {
    console.error("Error: secret-tool failed");
    return false;
  }
  consoleLog("Your keyring password for", account, "has been saved!");
  return true;
}
