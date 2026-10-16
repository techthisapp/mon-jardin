/* Épreuve du lanceur face à un navigateur qui disparaît.
   Joue une suite par le lanceur, tue en cours de route le Chromium qu'il a
   ouvert, et vérifie la réponse : la suite est rejouée après un arrêt du
   navigateur, elle échoue après deux, et un plantage du moteur de rendu compte
   comme un échec sans reprise.

   Emploi : node outils/essais/epreuve-arret.mjs [suite]
   La suite par défaut est `photos`, une minute environ. L'épreuve sert sur le
   port 8098 pour ne pas gêner une série en cours sur le 8099. */
import { spawn, execSync } from "node:child_process";
import { join } from "node:path";
import { ICI } from "./commun.mjs";

const SUITE = process.argv[2] || "photos";
const attendre = ms => new Promise(r => setTimeout(r, ms));

/* Les descendants du lanceur : le processus principal du navigateur est son
   enfant direct, les moteurs de rendu portent --type=renderer. */
function navigateurDe(pid) {
  const lignes = execSync("ps -A -o pid=,ppid=,command=").toString().split("\n")
    .map(l => l.trim().match(/^(\d+)\s+(\d+)\s+(.*)$/)).filter(Boolean);
  const famille = new Set([String(pid)]);
  for (let ajout = true; ajout;) {
    ajout = false;
    for (const [, p, pp] of lignes) if (famille.has(pp) && !famille.has(p)) { famille.add(p); ajout = true; }
  }
  const siens = lignes.filter(([, p]) => famille.has(p) && p !== String(pid));
  return {
    principal: siens.filter(([, , pp, c]) => pp === String(pid) && !/--type=/.test(c)).map(([, p]) => p),
    rendus: siens.filter(([, , , c]) => /--type=renderer/.test(c)).map(([, p]) => p),
  };
}

/* `coups` dit à quels instants, en secondes après le départ, tuer quoi. */
async function jouer(coups) {
  const lanceur = spawn(process.execPath, [join(ICI, "tous.mjs"), SUITE],
    { env: { ...process.env, PORT_ESSAIS: "8098" }, stdio: ["ignore", "pipe", "pipe"] });
  let sortie = "";
  lanceur.stdout.on("data", d => sortie += d);
  lanceur.stderr.on("data", d => sortie += d);
  const fin = new Promise(r => lanceur.on("close", code => r(code)));
  for (const [t, cible] of coups) {
    await attendre(t * 1000);
    const n = navigateurDe(lanceur.pid);
    const pids = cible === "rendu" ? n.rendus : n.principal;
    if (pids.length) execSync(`kill -TERM ${pids.join(" ")}`);
  }
  return { code: await fin, sortie };
}

let echecs = 0;
const controle = (nom, vrai, detail) => {
  if (!vrai) echecs++;
  console.log((vrai ? "  ok     " : "  ECHEC  ") + nom + (detail ? "  " + detail : ""));
};

console.log(`Épreuve du lanceur sur la suite ${SUITE}`);
const un = await jouer([[15, "principal"]]);
controle("un arrêt du navigateur : la suite est rejouée et passe",
  un.code === 0 && /Suite rejouée sur un navigateur neuf/.test(un.sortie) && /1 suite rejouée/.test(un.sortie),
  "code " + un.code);
controle("la cause nomme l'arrêt par un autre processus",
  /arrêté par un autre processus/.test(un.sortie));

const deux = await jouer([[15, "principal"], [20, "principal"]]);
controle("deux arrêts : la suite échoue",
  deux.code === 1 && /suite interrompue deux fois/.test(deux.sortie), "code " + deux.code);

const rendu = await jouer([[15, "rendu"]]);
controle("un plantage du moteur de rendu : échec sans reprise",
  rendu.code === 1 && /plantage du moteur de rendu/.test(rendu.sortie)
  && !/Suite rejouée/.test(rendu.sortie), "code " + rendu.code);

console.log(echecs ? `${echecs} en échec.` : "Aucun échec.");
if (echecs) console.log("\n--- sorties ---\n" + [un, deux, rendu].map(x => x.sortie).join("\n---\n"));
process.exit(echecs ? 1 : 0);
