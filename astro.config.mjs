import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://g0v.github.io",
  base: "/koktai",
  output: "static",
  server: { port: 4173 },
  build: { format: "directory" },
});
