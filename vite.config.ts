import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import preact from "@preact/preset-vite";
import { defineConfig, type Plugin } from "vite";

const outDir = "dist";

/** Write the list of built files into the service worker, so one visit saves the whole app. */
function precache(): Plugin {
  return {
    name: "precache",
    apply: "build",
    closeBundle() {
      const files: string[] = [];
      const walk = (dir: string) => {
        for (const f of readdirSync(dir)) {
          const p = join(dir, f);
          if (statSync(p).isDirectory()) walk(p);
          else if (f !== "sw.js" && f !== ".nojekyll" && !f.endsWith(".woff")) files.push(relative(outDir, p).split("\\").join("/"));
        }
      };
      walk(outDir);
      files.sort();
      const hash = createHash("sha256");
      for (const f of files) hash.update(f).update(readFileSync(join(outDir, f)));
      const sw = join(outDir, "sw.js");
      writeFileSync(
        sw,
        readFileSync(sw, "utf8")
          .replace("__VERSION__", hash.digest("hex").slice(0, 12))
          .replace('["__FILES__"]', JSON.stringify(files.map(f => (f === "index.html" ? "./" : f)))),
      );
    },
  };
}

/** The published page may only ever talk to its own website: no other servers, no analytics, no outside scripts. */
function lockdown(): Plugin {
  const policy = [
    "default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline'", "font-src 'self'", "connect-src 'self'",
    "img-src 'self' blob: data:", "media-src 'self' blob:", "worker-src 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'none'",
  ].join("; ");
  return {
    name: "lockdown",
    apply: "build",
    transformIndexHtml: html => html.replace("<meta charset", `<meta http-equiv="Content-Security-Policy" content="${policy}" />\n    <meta charset`),
  };
}

export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  plugins: [preact({ devToolsEnabled: false, prefreshEnabled: false }), lockdown(), precache()],
  server: { port: Number(process.env.PORT ?? 5176), strictPort: true },
  preview: { port: Number(process.env.PORT ?? 5176), strictPort: true },
  build: { outDir, target: "safari16", assetsInlineLimit: 0, modulePreload: { polyfill: false } },
});
