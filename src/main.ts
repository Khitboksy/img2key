import { validateImagePath, parseArgs, consoleLog } from "./cli.ts";
import {
  hashImage,
  generatePassword,
  updateBitwarden,
  updateKeyring,
} from "./logic.ts";

function main() {
  const args = parseArgs(process.argv.slice(2));

  validateImagePath(args.imagePath);

  const hashBytes = hashImage(args.imagePath, args.salt);
  const password = generatePassword(hashBytes, args.length);

  process.stdout.write(password + "\n");

  let ok = true;

  if (args.bitwardenItem) {
    ok = updateBitwarden(args.bitwardenItem, password) && ok;
  }

  if (args.keyringItem) {
    ok = updateKeyring(args.keyringItem, password) && ok;
  }

  if (args.bitwardenItem || args.keyringItem) {
    if (ok) {
      consoleLog("All integrations updated successfully.");
    } else {
      console.error("One or more integrations failed.");
      consoleLog("Password was still written to stdout");
    }
  }
}

main();
