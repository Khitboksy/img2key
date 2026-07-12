import { validateImagePath, parseArgs } from "./cli.ts";
import { clipboardHint } from "./clip.ts";
import {
  hashImage,
  generatePassword,
  resolveOutputDir,
  writePassword,
  updateBitwarden,
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
  if (args.bitwardenItem) {
    const ok = updateBitwarden(args.bitwardenItem, password);

    if (!ok) {
      // bw failed -- file is still on disk as a manual fallback
      console.error("Bitwarden update failed. Password saved to:", outPath);
      const clip = clipboardHint();
      if (clip) {
        console.error(`quick copy: cat ${outPath} | ${clip}`);
      }
    }

    return; // -vw mode: no "saved to:" message on success
  } else {
    console.log("saved to:", outPath);
  }
  if (clip) {
    const msg = `quick copy: cat ${outPath} | ${clip}`;
    if (args.stdout) {
      process.stderr.write(msg + "\n");
    } else {
      console.log(msg);
    }
  }
}

main();
