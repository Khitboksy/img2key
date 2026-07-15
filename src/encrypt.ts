import { readFileSync, writeFileSync, mkdirSync, readSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { spawnSync } from "node:child_process";
import { consoleLog } from "./cli.ts";

export interface EncryptConfig {
  outDir: string;
  name: string;
}

export function setkey(pubkeyArg: string | undefined): void {
  const configDir = join(homedir(), ".config", "img2key");
  const pubkeyPath = join(configDir, "pubkey");

  if (pubkeyArg === undefined) {
    // Print current key
    try {
      const existing = readFileSync(pubkeyPath, "utf-8").trim();
      console.log("Current public key:");
      console.log(existing);
    } catch {
      console.log("No public key is set.");
      console.log("Use: img2key setkey <age1...>");
    }
    return;
  }

  // Resolve: raw key or file path
  let pubkey: string;
  if (pubkeyArg.startsWith("age1")) {
    pubkey = pubkeyArg.trim();
  } else {
    try {
      pubkey = readFileSync(pubkeyArg, "utf-8").trim();
    } catch {
      console.error(`Error: could not read key from "${pubkeyArg}"`);
      process.exit(1);
    }
  }

  // Validate
  if (!pubkey.startsWith("age1") || pubkey.length < 50) {
    console.error("Error: invalid Age X25519 public key format");
    process.exit(1);
  }

  // Check for existing key and prompt
  try {
    const existing = readFileSync(pubkeyPath, "utf-8").trim();
    if (existing === pubkey) {
      consoleLog("Public key is already set to this value.");
      return;
    }
    console.error("Warning: a public key is already set.");
    console.error("Overwrite? [y/N] ");
    const buf = Buffer.alloc(1);
    const bytes = readSync(0, buf, 0, 1, null);
    if (bytes === 0 || String.fromCharCode(buf[0]!).toLowerCase() !== "y") {
      consoleLog("Canceled.");
      return;
    }
  } catch {
    // No existing key - fine, proceed
  }

  mkdirSync(configDir, { recursive: true });
  writeFileSync(pubkeyPath, pubkey + "\n", { mode: 0o600 });
  consoleLog("Public key saved to", pubkeyPath);
}

export function getkey(outDir: string, name: string): void {
  // Verify age-keygen is available
  const check = spawnSync("age-keygen", ["--help"], {
    stdio: ["inherit", "ignore", "inherit"],
  });
  if (check.status !== 0) {
    console.error("Error: age-keygen not found in PATH");
    console.error("Install age via your package manager and try again.");
    process.exit(1);
  }

  consoleLog("Generating new X25519 keypair...");
  const result = spawnSync("age-keygen", [], {
    encoding: "utf-8",
    stdio: ["inherit", "pipe", "inherit"],
  });
  if (result.status !== 0 || !result.stdout) {
    console.error("Error: age-keygen failed");
    process.exit(1);
  }

  const output = result.stdout;
  const lines = output.split("\n");
  const privateKey = lines.find((l) => l.startsWith("AGE-SECRET-KEY-"))?.trim();
  const pubkeyLine = lines.find((l) => l.startsWith("# public key:"));
  const publicKey = pubkeyLine?.split(":")[1]?.trim();

  if (!privateKey || !publicKey) {
    console.error("Error: could not parse age-keygen output");
    process.exit(1);
  }

  mkdirSync(outDir, { recursive: true });

  const privPath = join(outDir, `${name}-private-key.txt`);
  writeFileSync(privPath, output, { mode: 0o600 });
  consoleLog("Private key saved to", privPath);

  const pubPath = join(outDir, `${name}-public-key.txt`);
  writeFileSync(pubPath, publicKey + "\n");
  consoleLog("Public key saved to", pubPath);

  console.log("");
  console.log("Your public key is:", publicKey);
  console.log('Share this with: img2key setkey "' + publicKey + '"');
  console.log("");
  consoleLog("IMPORTANT: Keep your private key safe! img2key never stores it.");
}

export function getStoredPubkey(): string {
  const pubkeyPath = join(homedir(), ".config", "img2key", "pubkey");
  try {
    const pubkey = readFileSync(pubkeyPath, "utf-8").trim();
    if (!pubkey || !pubkey.startsWith("age1")) {
      throw new Error("Invalid or empty public key");
    }
    return pubkey;
  } catch {
    console.error("Error: no public key registered.");
    console.error("Run 'img2key setkey <pubkey>' to register one.");
    process.exit(1);
  }
}

export function encryptPassword(password: string, pubkey: string): string {
  const result = spawnSync("age", ["-r", pubkey, "--armor"], {
    input: password,
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "inherit"],
  });
  if (result.status !== 0 || !result.stdout) {
    console.error("Error: age encryption failed");
    process.exit(1);
  }
  return result.stdout.trim();
}
