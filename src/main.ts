// Remote Deps
import {} from "node:fs";

// Local Imports
import { validateImagePath, parseArgs } from "./cli.ts";
import { clipboardHint } from "./clip.ts";
import {
  hashImage,
  generatePassword,
  resolveOutputDir,
  writePassword,
} from "./logic.ts";

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
