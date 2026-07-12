import { execSync } from "node:child_process";

const CLIPBOARD_CMDS: { cmd: string; hint: string }[] = [
  { cmd: "wl-copy", hint: "wl-copy" },
  { cmd: "xclip", hint: "xclip -sel clip" },
  { cmd: "xsel", hint: "xsel -ib" },
  { cmd: "pbcopy", hint: "pbcopy" },
  { cmd: "clip.exe", hint: "clip.exe" },
];

function commandExists(cmd: string): boolean {
  try {
    execSync(`command -v ${cmd}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export function clipboardHint(): string {
  const available = CLIPBOARD_CMDS.find(({ cmd }) => commandExists(cmd));
  return available?.hint ?? "";
}
