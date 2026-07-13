import { validateImagePath, parseArgs } from "./cli.ts";
import { clipboardHint } from "./clip.ts";
import {
  hashImage,
  generatePassword,
  resolveOutputDir,
  writePassword,
  deletePassword,
  updateBitwarden,
  updateKeyring,
} from "./logic.ts";

function main() {
  const args = parseArgs(process.argv.slice(2));

  validateImagePath(args.imagePath);

  const hashBytes = hashImage(args.imagePath, args.salt);
  const password = generatePassword(hashBytes, args.length);
  const outDir = resolveOutputDir(args.outputDir);
  const outPath = writePassword(password, args.siteName, outDir);

  const clip = clipboardHint();

  if (args.stdout) {
    process.stdout.write(password + "\n");
    process.stderr.write("saved to: " + outPath + "\n");
  }

  let ok = true;

  if (args.bitwardenItem) {
    ok = updateBitwarden(args.bitwardenItem, password) && ok;
  }

  if (args.keyringItem) {
    ok = updateKeyring(args.keyringItem, password) && ok;
  }

  if (args.bitwardenItem || args.keyringItem) {
    if (ok) {
      if (args.cleanup) {
        deletePassword(outPath);
      }
    } else {
      console.error("Update failed. Password saved to:", outPath);
      if (clip) {
        console.error(`quick copy: cat ${outPath} | ${clip}`);
      }
    }
    return;
  }

  // Default: no -bw, no -kr, no --stdout
  if (!args.stdout) {
    console.log("saved to:", outPath);
    console.log(`quick copy: cat ${outPath} | ${clip}`);
  }
}

main();
