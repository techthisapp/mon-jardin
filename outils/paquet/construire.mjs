/* Construit vendor/supabase.js à partir de outils/paquet/supabase.src.js.
   Le client était chargé depuis esm.sh en dix-sept modules répartis sur quatre
   niveaux d'imports, ce qui retardait d'autant la première requête vers la base.
   Emploi : npm install --no-save esbuild @supabase/supabase-js puis
            node outils/paquet/construire.mjs */
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { readFileSync } from "node:fs";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const sortie = join(RACINE, "vendor", "supabase.js");
await build({
  entryPoints: [join(RACINE, "outils", "paquet", "supabase.src.js")],
  bundle: true, format: "esm", platform: "browser", minify: true,
  target: ["es2020"], legalComments: "none", outfile: sortie,
  define: { "process.env.NODE_ENV": '"production"' },
  banner: { js: "/* Client Supabase groupé. Ne pas modifier à la main : voir outils/paquet/construire.mjs */" },
});
const o = readFileSync(sortie);
console.log(`vendor/supabase.js : ${(statSync(sortie).size / 1024).toFixed(0)} Ko, `
  + `${(gzipSync(o, { level: 9 }).length / 1024).toFixed(0)} Ko compressé`);
