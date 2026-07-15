import { validateImagePath, parseArgs, consoleLog } from "./cli.ts";
import {
  hashImage,
  generatePassword,
  updateBitwarden,
  updateKeyring,
} from "./logic.ts";
import { getStoredPubkey, encryptPassword, setkey, getkey } from "./encrypt.ts";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
function main() {
  const result = parseArgs(process.argv.slice(2));

  switch (result.command) {
    case "setkey":
      setkey(result.pubkey);
      return;

    case "getkey":
      getkey(result.outDir, result.name);
      return;

    case "generate": {
      validateImagePath(result.imagePath);
      const hashBytes = hashImage(result.imagePath, result.salt);
      const password = generatePassword(hashBytes, result.length);

      if (result.encrypt) {
        const pubkey = getStoredPubkey();
        const encrypted = encryptPassword(password, pubkey);

        if (result.bitwardenItem || result.keyringItem) {
          // With integrations: write encrypted file + plaintext to integration
          mkdirSync(result.encrypt.outDir, { recursive: true });
          const outPath = join(
            result.encrypt.outDir,
            result.encrypt.name + ".enc",
          );
          writeFileSync(outPath, encrypted + "\n");
          consoleLog("Encrypted password written to", outPath);
        } else {
          // Without integrations: encrypted blob to stdout only
          process.stdout.write(encrypted + "\n");
          return;
        }
      } else {
        process.stdout.write(password + "\n");
      }

      // Integrations (same as current logic)
      let ok = true;
      if (result.bitwardenItem) {
        ok = updateBitwarden(result.bitwardenItem, password) && ok;
      }
      if (result.keyringItem) {
        ok = updateKeyring(result.keyringItem, password) && ok;
      }
      if (result.bitwardenItem || result.keyringItem) {
        if (ok) {
          consoleLog("All integrations updated successfully.");
        } else {
          console.error("One or more integrations failed.");
          consoleLog("Password was still written to stdout");
        }
      }
      return;
    }
  }
}

main();
