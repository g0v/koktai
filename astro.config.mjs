import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
  server: { port: 4173 },
  build: { format: "file" },
});
