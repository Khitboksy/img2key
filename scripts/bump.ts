import { writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const newVersion = process.argv[2];
if (!newVersion || !newVersion.startsWith("v")) {
  console.error("Usage: bun run bump v1.x.x");
  process.exit(1);
}

// Update version.ts
const path = "src/version.ts";
const content = `export const VERSION = "${newVersion}";\n`;
writeFileSync(path, content);

// Commit and tag
execSync(`git add ${path}`, { stdio: "inherit" });
execSync(`git commit -m "bump to ${newVersion}"`, { stdio: "inherit" });
execSync(`git tag ${newVersion}`, { stdio: "inherit" });

console.log(
  `Bumped to ${newVersion}. Run 'git push origin main && git push origin --tags' to publish.`,
);
