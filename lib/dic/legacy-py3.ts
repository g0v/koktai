import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { recodeDicFile } from "./cp950.ts";

/** Pre-unescape Pug body from already-recoded dictionary text via py3 dic2jade.py. */
export function py3PreFromDicText(root: string, recodedDicText: string): string {
  const pyDir = join(root, "archive/legacy-py3-parity");
  const dic2 = spawnSync("python3", [join(pyDir, "dic2jade.py")], {
    cwd: root,
    input: recodedDicText,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    env: { ...process.env, PYTHONPATH: pyDir },
  });
  if (dic2.status !== 0) {
    throw new Error(`dic2jade.py failed: ${dic2.stderr?.slice(0, 400)}`);
  }
  return dic2.stdout ?? "";
}

/** Legacy: recode + analyse in one call (kept for parity scripts). */
export function py3PreFromDicFile(root: string, dicPath: string): string {
  return py3PreFromDicText(root, recodeDicFile(dicPath));
}