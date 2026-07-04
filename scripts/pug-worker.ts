/** Bun worker: compile + transform one pug volume, write the disk cache. */
import { writeVolumeCache } from "../lib/compile-pug.ts";

declare var self: Worker;

self.onmessage = (e: MessageEvent<{ root: string; base: string }>) => {
  const { root, base } = e.data;
  try {
    const data = writeVolumeCache(root, base);
    postMessage({ base, ok: true, entries: data.entries });
  } catch (err) {
    postMessage({ base, ok: false, error: String(err) });
  }
};