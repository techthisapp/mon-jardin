#!/usr/bin/env node
// Contrôle avant dépôt du projet Mon jardin.
// Sans dépendance. Usage : node outils/verification.mjs [--corriger]
// L'option --corriger réécrit les empreintes de version dans index.html.

import { readFileSync, writeFileSync, mkdtempSync, copyFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..");
const CORRIGER = process.argv.includes("--corriger");

const lire = f => readFileSync(join(RACINE, f), "utf8");
const empreinte = f => createHash("sha256").update(readFileSync(join(RACINE, f))).digest("hex").slice(0, 10);

const defauts = [];
const corrections = [];
const faute = (controle, message) => defauts.push({ controle, message });

const appJs = lire("app.js");
const indexHtml = lire("index.html");
const lignes = appJs.split("\n");

// Le fichier est indenté : une instruction de niveau module commence en colonne 0.
const NIVEAU_MODULE = n => /^\S/.test(lignes[n]);
const COMMENTAIRE = t => /^\s*(\/\/|\/\*|\*)/.test(t);

/* ------------------------------------------------------------------ */
/* Contrôle 0 : syntaxe du module                                      */
/* ------------------------------------------------------------------ */
// Une erreur de syntaxe ne se voit qu'au chargement de la page, et le module
// s'interrompt alors sans un mot dans l'interface.

try {
  const copie = join(mkdtempSync(join(tmpdir(), "monjardin-")), "app.mjs");
  copyFileSync(join(RACINE, "app.js"), copie);
  execFileSync(process.execPath, ["--check", copie], { stdio: "pipe" });
} catch (e) {
  const sortie = (e.stderr || "").toString().split("\n").filter(Boolean).slice(0, 4).join(" ");
  faute("syntaxe", `app.js : ${sortie || e.message}`);
}

/* ------------------------------------------------------------------ */
/* Contrôle 1 : identifiants HTML référencés par le script             */
/* ------------------------------------------------------------------ */

const declares = new Set();
for (const m of indexHtml.matchAll(/\bid="([A-Za-z0-9_-]+)"/g)) declares.add(m[1]);

// Éléments que le script construit lui-même dans ses gabarits.
const construits = new Set();
for (const m of appJs.matchAll(/\bid=["'`]([A-Za-z0-9_-]+)["'`]/g)) construits.add(m[1]);
for (const m of appJs.matchAll(/\.id\s*=\s*["'`]([A-Za-z0-9_-]+)["'`]/g)) construits.add(m[1]);

const motifs = [
  /\$\(\s*["']([A-Za-z0-9_-]+)["']\s*\)/g,
  /\bsur\(\s*["']([A-Za-z0-9_-]+)["']/g,
  /getElementById\(\s*["']([A-Za-z0-9_-]+)["']\s*\)/g,
  /querySelector(?:All)?\(\s*["']#([A-Za-z0-9_-]+)["']\s*\)/g,
];

const references = new Map();
for (const motif of motifs) {
  for (const m of appJs.matchAll(motif)) {
    if (!references.has(m[1])) references.set(m[1], appJs.slice(0, m.index).split("\n").length);
  }
}

for (const [nom, ligne] of references) {
  if (!declares.has(nom) && !construits.has(nom)) {
    faute("identifiants", `app.js ligne ${ligne} : « ${nom} » n'existe ni dans index.html ni dans un gabarit du script`);
  }
}

/* ------------------------------------------------------------------ */
/* Contrôle 2 : déclaration avant usage au niveau du module            */
/* ------------------------------------------------------------------ */
// Une déclaration const ou let n'est pas remontée en tête de module comme l'est
// une déclaration de fonction. Le rendu étant déclenché par un écouteur
// enregistré avant la fin de l'évaluation du module, toute valeur lue par le
// rendu doit être déclarée avant son premier usage dans le fichier.

const nomsDeclares = ligne => {
  const noms = [];
  const sansCommentaire = ligne.replace(/\/\/.*$/, "");
  const premier = sansCommentaire.match(/^(?:export\s+)?(?:const|let|var)\s+([\s\S]*?)=(?![=>])/);
  if (premier) {
    const cible = premier[1].replace(/\b[A-Za-z_$][\w$]*\s*:/g, " ");
    for (const m of cible.matchAll(/[A-Za-z_$][\w$]*/g)) noms.push(m[0]);
  } else {
    const seul = sansCommentaire.match(/^(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)/);
    if (seul) noms.push(seul[1]);
  }
  for (const m of sansCommentaire.matchAll(/,\s*([A-Za-z_$][\w$]*)\s*=(?![=>])/g)) noms.push(m[1]);
  return [...new Set(noms)].filter(n => n.length > 1);
};

// Source privée de ses commentaires et de ses chaînes, pour ne compter que de vrais usages.
const codeNu = appJs
  .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, " "))
  .replace(/\/\/[^\n]*/g, m => m.replace(/[^\n]/g, " "))
  .replace(/"(?:[^"\\\n]|\\.)*"/g, m => m.replace(/[^\n]/g, " "))
  .replace(/'(?:[^'\\\n]|\\.)*'/g, m => m.replace(/[^\n]/g, " "));
const lignesNues = codeNu.split("\n");

for (let n = 0; n < lignes.length; n++) {
  if (!NIVEAU_MODULE(n)) continue;
  const texte = lignes[n];
  if (!/^(?:export\s+)?(?:const|let|var)\s/.test(texte)) continue;
  for (const nom of nomsDeclares(texte)) {
    const avant = lignesNues.slice(0, n).findIndex(l => new RegExp(`\\b${nom}\\b`).test(l));
    if (avant !== -1) {
      faute("ordre", `app.js ligne ${n + 1} : « ${nom} » est déclaré après son premier usage, ligne ${avant + 1}. Remonter la déclaration dans le bloc de tête.`);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Contrôle 3 : cohérence des tâches                                   */
/* ------------------------------------------------------------------ */

const listeConstante = nom => {
  const m = appJs.match(new RegExp(`const\\s+${nom}\\s*=\\s*\\[([\\s\\S]*?)\\]`));
  return m ? [...m[1].matchAll(/["']([a-z_]+)["']/g)].map(x => x[1]) : null;
};

const ordre = listeConstante("ORDRE");
const ordreMoment = listeConstante("ORDRE_MAINTENANT");
if (!ordre || !ordreMoment) {
  faute("taches", "app.js : ORDRE ou ORDRE_MAINTENANT introuvable");
} else {
  for (const k of ordre) if (!ordreMoment.includes(k)) faute("taches", `« ${k} » figure dans ORDRE mais pas dans ORDRE_MAINTENANT`);
  for (const k of ordreMoment) if (!ordre.includes(k)) faute("taches", `« ${k} » figure dans ORDRE_MAINTENANT mais pas dans ORDRE`);
}

const picto = appJs.match(/const\s+PICTOS\s*=\s*\{([\s\S]*?)\n\};/);
if (picto && ordre) {
  const cles = [...picto[1].matchAll(/^\s*([a-z_]+)\s*:/gm)].map(x => x[1]);
  for (const k of ordre) if (!cles.includes(k)) faute("taches", `« ${k} » n'a pas de pictogramme dans PICTOS`);
}

/* ------------------------------------------------------------------ */
/* Contrôle 4 : empreintes de version des actifs                       */
/* ------------------------------------------------------------------ */

let html = indexHtml;
for (const actif of ["app.js", "styles.css"]) {
  const attendu = empreinte(actif);
  const motif = new RegExp(`(\\./${actif.replace(".", "\\.")}\\?v=)([A-Za-z0-9.]+)`, "g");
  const trouves = [...html.matchAll(motif)];
  if (!trouves.length) {
    faute("versions", `index.html : aucune balise ./${actif}?v=`);
    continue;
  }
  for (const t of trouves) {
    if (t[2] === attendu) continue;
    if (CORRIGER) corrections.push(`${actif} : ${t[2]} devient ${attendu}`);
    else faute("versions", `index.html : ./${actif}?v=${t[2]} ne correspond pas au contenu, attendu ${attendu}`);
  }
  if (CORRIGER) html = html.replace(motif, `$1${attendu}`);
}

if (CORRIGER && html !== indexHtml) writeFileSync(join(RACINE, "index.html"), html);

/* ------------------------------------------------------------------ */
/* Restitution                                                         */
/* ------------------------------------------------------------------ */

if (corrections.length) {
  console.log("Empreintes de version mises à jour dans index.html :");
  for (const c of corrections) console.log("  " + c);
  console.log("");
}

if (!defauts.length) {
  console.log("Contrôle avant dépôt : aucun défaut.");
  process.exit(0);
}

const parControle = {};
for (const d of defauts) (parControle[d.controle] ??= []).push(d.message);

console.log(`Contrôle avant dépôt : ${defauts.length} défaut(s).\n`);
for (const [controle, messages] of Object.entries(parControle)) {
  console.log(controle);
  for (const m of messages) console.log("  " + m);
  console.log("");
}
process.exit(1);
