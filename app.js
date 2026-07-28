import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ORDRE = ["abri", "terre", "plant", "floraison", "recolte", "taille", "multiplication", "fertilisation", "protection_ete", "protection"];
// L'écran En ce moment suit l'ordre du geste au jardin : ce qu'on observe,
// puis ce qu'on taille, ce qu'on met en terre, ce qu'on reproduit, ce qu'on récolte.
// Classement par coût de l'oubli, du plus irréversible au plus tolérant.
// Récolte et floraison se constatent d'un coup d'oeil au jardin, elles ferment la liste.
const ORDRE_MAINTENANT = ["taille", "fertilisation", "multiplication", "protection_ete",
  "protection", "abri", "terre", "plant", "recolte", "floraison"];
const REPLIES_PAR_DEFAUT = ["recolte", "floraison"];
const ORDRE_TYPO = ["Légumes", "Fruits", "Aromatiques", "Ornement"];
const COUL_TYPO = { "Légumes":"#4C8C3F", "Fruits":"#A23E4E", "Aromatiques":"#3E7C6B", "Ornement":"#B0559A" };
// Ordre de lecture des catégories : par typologie, puis du plus courant au plus rare.
const ORDRE_CAT = [
  "Feuilles","Racines","Choux","Bulbes","Légumineuses","Fruits d'été","Légumes","Vivaces",
  "Arbres fruitiers","Petits fruits",
  "Aromatiques",
  "Fleurs annuelles","Fleurs bisannuelles","Fleurs vivaces","Bulbes à fleurs",
  "Grimpantes","Arbustes d'ornement","Graminées",
];
const MOIS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const ABR  = ["Jan","Fév","Mar","Avr","Mai","Jui","Jul","Aoû","Sep","Oct","Nov","Déc"];
const CHECK = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
const CACHE = "monjardin.catalogue.v3";

let phases = {};
let plantes = [];
let climats = {};
let shifts = {};
let jardins = [];
let espaces = [];
let aff = new Map();
let adapt = {};
let espaceChoisi = null;
let sourdines = new Map();
let voirSourdines = false;
let vueMoment = (() => {
  try { return localStorage.getItem("monjardin.vue") || "tache"; } catch (e) { return "tache"; }
})();
let categories = [];
let sel = new Set();
let jardinId = null;
let session = null;
let tri = "categorie";
let jardinSeul = true;   // le jardin de la personne prime sur le catalogue
let climatSeul = false;  // Mes plantes, restreint aux plantes adaptées au climat du jardin
let moisChoisi = null;

const etatPhase = {}, etatTypo = {}, etatCat = {};      // écran Mes plantes
const etatTypoP = {}, etatCatP = {};                     // écran Calendrier
const etatPhaseM = {};                                    // écran En ce moment
ORDRE.forEach(k => { etatPhase[k] = true; etatPhaseM[k] = true; });

const $ = id => document.getElementById(id);

const attendre = ms => new Promise(r => setTimeout(r, ms));
const TRANSITOIRE = /issued at future|clock|jwt expired|fetch|network|timeout/i;

async function avecReprise(faire, essais = 3) {
  let dernier = null;
  for (let i = 0; i < essais; i++) {
    const r = await faire();
    if (!r.error) return r;
    dernier = r;
    if (!TRANSITOIRE.test(r.error.message || "")) return r;
    await attendre(400 * (i + 1));
  }
  return dernier;
}

// Un élément absent ne doit jamais interrompre le chargement du module.
const sur = (id, ev, fn) => { const e = $(id); if (e) e.addEventListener(ev, fn); else console.warn("élément absent :", id); };

const NIVEAUX = {
  adapte:      { court: "adaptée",      crans: 4, long: "Adaptée à ce climat, aucune précaution particulière" },
  protection:  { court: "à protéger",   crans: 3, long: "Reste en place, moyennant une précaution : paillage, voile, ombrage ou arrosage selon le climat" },
  abri:        { court: "à hiverner",   crans: 2, long: "Ne passe pas l'hiver en pleine terre sous ce climat, à rentrer ou à traiter en annuelle" },
  deconseille: { court: "déconseillée", crans: 1, long: "Déconseillée sous ce climat" },
};

const auj = new Date();
const demi = auj.getMonth() * 2 + (auj.getDate() <= 15 ? 1 : 2);

/* Constantes partagées, déclarées avant tout rendu : une constante n'est pas
   remontée en tête de module comme l'est une déclaration de fonction. */
const OEIL_BARRE = '<svg viewBox="0 0 24 24" aria-hidden="true">'
  + '<path d="M2 12s3.6-6 10-6c2 0 3.7.6 5.1 1.4M22 12s-3.6 6-10 6c-2 0-3.7-.6-5.1-1.4"/>'
  + '<circle cx="12" cy="12" r="2.6"/><path d="M3 21 21 3"/></svg>';

// Une teinte très pâle de la couleur, posée sur le papier.
function teinte(hex, a) {
  const h = (hex || "#000000").replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

// Le fond de page suit la saison, à saturation très faible.
const SAISONS = [
  { fin: 4,  ton: "#EEF0F1" }, { fin: 10, ton: "#EFF4EA" },
  { fin: 16, ton: "#F5F3EA" }, { fin: 22, ton: "#F5EFE7" }, { fin: 24, ton: "#EEF0F1" },
];
function appliquerSaison() {
  const s = SAISONS.find(x => demi <= x.fin) || SAISONS[0];
  document.documentElement.style.setProperty("--papier", s.ton);
}

// Un pictogramme au trait par tâche, dessiné dans la couleur de la tâche.
const PICTOS = {
  abri:            '<path d="M4 19.5h16"/><path d="M6 19.5a6 6 0 0 1 12 0"/><path d="M12 14V9.5"/><circle cx="12" cy="7.6" r="1.7"/>',
  terre:           '<path d="M3 18.5h18"/><circle cx="8" cy="7" r="1.2"/><circle cx="12.6" cy="5.2" r="1.2"/><circle cx="16.6" cy="8" r="1.2"/><path d="M8 9.5v3.5M12.6 7.5v5.5M16.6 10.5v2.5"/>',
  plant:           '<path d="M6 12.5h12l-1.4 8H7.4z"/><path d="M12 12.5V8"/><path d="M12 9.2c2.4 0 3.9-1.5 3.9-3.9-2.4 0-3.9 1.5-3.9 3.9z"/>',
  floraison:       '<circle cx="12" cy="11" r="2"/><ellipse cx="12" cy="6.4" rx="1.8" ry="2.5"/><ellipse cx="12" cy="15.6" rx="1.8" ry="2.5"/><ellipse cx="7.4" cy="11" rx="2.5" ry="1.8"/><ellipse cx="16.6" cy="11" rx="2.5" ry="1.8"/>',
  recolte:         '<path d="M4 10.5h16l-2 9.5H6z"/><path d="M8 10.5a4 4 0 0 1 8 0"/>',
  taille:          '<path d="M7 3.5 14.5 13M17 3.5 9.5 13"/><circle cx="7.6" cy="17.4" r="2.6"/><circle cx="16.4" cy="17.4" r="2.6"/>',
  multiplication:  '<path d="M12 20.5v-6"/><path d="M12 14.5 7.6 9.4M12 14.5l4.4-5.1"/><circle cx="6.8" cy="7.8" r="2.2"/><circle cx="17.2" cy="7.8" r="2.2"/>',
  fertilisation:   '<path d="M3 18.5h18"/><path d="M6 18.5c0-3.2 2.6-5.4 6-5.4s6 2.2 6 5.4"/><circle cx="9" cy="8" r="1.1"/><circle cx="13" cy="5.6" r="1.1"/><circle cx="15.6" cy="9.4" r="1.1"/>',
  protection:      '<path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9"/>',
  protection_ete:  '<circle cx="12" cy="12" r="3.8"/><path d="M12 3.4v2M12 18.6v2M3.4 12h2M18.6 12h2M6 6l1.4 1.4M16.6 16.6 18 18M18 6l-1.4 1.4M7.4 16.6 6 18"/>',
};

const picto = k => PICTOS[k]
  ? `<span class="picto-tache" aria-hidden="true"><svg viewBox="0 0 24 24">${PICTOS[k]}</svg></span>`
  : `<span class="pastille"></span>`;

const cleSourdine = (p, k) => p.id + "|" + k;

const anneeCourante = () => new Date().getFullYear();

const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));

function info(msg, erreur = false) {
  const e = $("etat");
  if (!msg) { e.hidden = true; return; }
  e.textContent = msg;
  e.className = "etat" + (erreur ? " erreur" : "");
  e.hidden = false;
}

/* ================== Catalogue ================== */

async function chargerCatalogue() {
  try {
    const brut = localStorage.getItem(CACHE);
    if (brut) {
      const c = JSON.parse(brut);
      phases = c.phases; plantes = c.plantes; climats = c.climats || {}; shifts = c.shifts || {};
      apresCatalogue();
      verifierFraicheur(c.empreinte);
      return;
    }
  } catch (e) { /* cache indisponible */ }
  await lireCatalogue();
}

async function lireCatalogue() {
  const [rp, rl, rm, rc, rs] = await Promise.all([
    avecReprise(() => db.from("phases").select("*").order("position")),
    avecReprise(() => db.from("plants_full").select("*").eq("is_active", true)),
    avecReprise(() => db.from("catalog_meta").select("*").single()),
    avecReprise(() => db.from("climates").select("*").order("position")),
    avecReprise(() => db.from("climate_phase_shifts").select("*")),
  ]);
  climats = {}; shifts = {};
  (rc.data || []).forEach(c => climats[c.key] = c);
  (rs.data || []).forEach(r => {
    (shifts[r.climate_key] = shifts[r.climate_key] || {})[r.phase] = { s: r.shift_spring, a: r.shift_autumn };
  });
  if (rp.error || rl.error) { info("Catalogue indisponible. Vérifiez la connexion.", true); return; }
  phases = {};
  rp.data.forEach(p => phases[p.key] = { label: p.label, color: p.color });
  plantes = rl.data.map(p => ({
    id: p.id, slug: p.slug, nom: p.name, cat: p.category, typo: p.typology,
    espacement: p.spacing, prof: p.depth, assoc: p.companions, conseil: p.advice,
    attr: p.attributes || {}, phases: p.phases || {}, guide: p.guide || {},
    latin: p.latin || "", famille: p.family || "",
  })).sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  try {
    localStorage.setItem(CACHE, JSON.stringify({
      phases, plantes, climats, shifts, empreinte: rm.data ? `${rm.data.plant_count}|${rm.data.updated_at}` : "",
    }));
  } catch (e) { /* stockage indisponible */ }
  apresCatalogue();
}

async function verifierFraicheur(empreinte) {
  const { data } = await db.from("catalog_meta").select("*").single();
  if (data && `${data.plant_count}|${data.updated_at}` !== empreinte) await lireCatalogue();
}

function apresCatalogue() {
  categories = ORDRE_CAT.filter(c => plantes.some(p => p.cat === c))
    .concat([...new Set(plantes.map(p => p.cat))].filter(c => !ORDRE_CAT.includes(c)).sort());
  ORDRE_TYPO.forEach(t => { etatTypo[t] = true; etatTypoP[t] = true; });
  categories.forEach(c => { etatCat[c] = true; etatCatP[c] = true; });
  $("tete-total").textContent = `${plantes.length} plantes au catalogue`;
  construireChips();
  construireMois();
  construireRegle();
  rendreTout();
}

const typoDe = cat => (plantes.find(p => p.cat === cat) || {}).typo;
const compte = f => plantes.filter(f).length;

/* ================== Jardin ================== */

const COL_JARDIN = "id,name,climate_key,altitude,last_opened_at";
const jardinActif = () => jardins.find(g => g.id === jardinId) || null;
// iOS isole le stockage local de l'application ajoutée à l'écran d'accueil de celui
// de Safari. Le jardin actif est donc mémorisé en base, où il suit le compte.
function memoriserOuverture(id) {
  const g = jardins.find(x => x.id === id);
  if (g) g.last_opened_at = new Date().toISOString();
  db.from("gardens").update({ last_opened_at: new Date().toISOString() }).eq("id", id)
    .then(({ error }) => { if (error) console.warn("dernier jardin non mémorisé :", error.message); });
}

// Un décalage d'horloge de quelques secondes entre l'appareil et le serveur fait
// rejeter le jeton avec « JWT issued at future ». C'est transitoire, une seconde
// tentative après une courte attente suffit.
async function listerJardins() {
  const { data, error } = await avecReprise(() => db.from("gardens").select(COL_JARDIN)
    .order("last_opened_at", { ascending: false, nullsFirst: false })
    .order("created_at"));
  if (error) { info("Jardins inaccessibles : " + error.message, true); return false; }
  jardins = data || [];
  info("");
  return true;
}

async function chargerJardin() {
  if (!session) {
    jardins = []; jardinId = null; espaces = []; aff = new Map(); adapt = {};
    sel = new Set(); espaceChoisi = null;
    majCompte(); majJardinUI(); construireChips(); rendreTout(); return;
  }
  if (!await listerJardins()) return;
  if (!jardins.length) {
    const { error } = await db.rpc("ensure_garden");
    if (error) { info("Jardin inaccessible : " + error.message, true); return; }
    if (!await listerJardins()) return;
  }
  jardinId = jardins[0].id;
  await chargerContenuJardin();
}

async function chargerContenuJardin() {
  memoriserOuverture(jardinId);
  // Le climat est déjà connu, la table d'adaptation part donc dans le même lot
  // que le reste : quatre allers-retours au lieu de cinq en série.
  const cle = (jardinActif() || {}).climate_key || null;
  const [rp, rz, ra, rs, rc] = await Promise.all([
    avecReprise(() => db.from("garden_plants").select("plant_id").eq("garden_id", jardinId)),
    avecReprise(() => db.from("espaces").select("*").eq("garden_id", jardinId).order("position").order("name")),
    avecReprise(() => db.from("garden_plant_espaces").select("plant_id,espace_id,quantity,notes").eq("garden_id", jardinId)),
    avecReprise(() => db.from("sourdines").select("*").eq("garden_id", jardinId)),
    cle ? avecReprise(() => db.from("plant_climates").select("plant_id,level,note").eq("climate_key", cle))
        : Promise.resolve({ data: [] }),
  ]);
  adapt = {};
  (rc.data || []).forEach(r => adapt[r.plant_id] = r);
  sourdines = new Map();
  (rs.data || []).forEach(r => sourdines.set(r.plant_id + "|" + r.phase, r));
  if (rp.error) { info("Sélection illisible : " + rp.error.message, true); return; }
  info("");
  sel = new Set((rp.data || []).map(r => r.plant_id));
  espaces = rz.data || [];
  aff = new Map();
  (ra.data || []).forEach(r => {
    if (!aff.has(r.plant_id)) aff.set(r.plant_id, []);
    aff.get(r.plant_id).push(r);
  });
  if (espaceChoisi !== null && espaceChoisi !== "0" && !espaces.some(z => z.id === espaceChoisi)) espaceChoisi = null;
  majCompte(); majJardinUI(); construireChips(); rendreTout();
}

async function chargerAdaptations() {
  adapt = {};
  const g = jardinActif();
  if (!g || !g.climate_key) return;
  const { data } = await avecReprise(() =>
    db.from("plant_climates").select("plant_id,level,note").eq("climate_key", g.climate_key));
  (data || []).forEach(r => adapt[r.plant_id] = r);
}

async function basculer(plantId) {
  if (!session) { info("Connectez-vous pour enregistrer votre jardin."); $("email")?.focus(); return; }
  const present = sel.has(plantId);
  present ? sel.delete(plantId) : sel.add(plantId);
  majCompte(); rendreTout();
  const req = present
    ? db.from("garden_plants").delete().eq("garden_id", jardinId).eq("plant_id", plantId)
    : db.from("garden_plants").insert({ garden_id: jardinId, plant_id: plantId });
  const { error } = await req;
  if (error) {
    present ? sel.add(plantId) : sel.delete(plantId);
    majCompte(); rendreTout();
    info("Modification non enregistrée : " + error.message, true);
    return;
  }
  if (present) { aff.delete(plantId); construireChips(); rendreTout(); }
}

function majCompte() {
  const n = sel.size;
  const t = n ? (n > 1 ? `${n} plantes retenues` : "1 plante retenue") : "aucune plante retenue";
  $("compte").textContent = t;
}

/* ================== Filtres ================== */

function groupeChips(conteneur, cles, etat, opts) {
  conteneur.innerHTML = "";
  cles.forEach(k => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "chip";
    b.setAttribute("aria-pressed", String(etat[k]));
    const couleur = opts.couleur ? opts.couleur(k) : null;
    b.innerHTML = (couleur ? `<i class="pastille" style="background:${couleur}"></i>` : "")
      + esc(opts.libelle ? opts.libelle(k) : k)
      + (opts.nb ? `<span class="nb">${opts.nb(k)}</span>` : "");
    b.addEventListener("click", () => {
      if (etat[k]) cles.forEach(x => etat[x] = (x === k));   // valeur active : on l'isole
      else etat[k] = true;                                    // valeur inactive : on l'ajoute
      opts.apres();
    });
    conteneur.appendChild(b);
  });
  const r = document.createElement("button");
  r.type = "button"; r.className = "lien"; r.textContent = "Tout";
  r.disabled = cles.every(k => etat[k]);
  r.addEventListener("click", () => { cles.forEach(x => etat[x] = true); opts.apres(); });
  conteneur.appendChild(r);
}

function catsVisibles(etatT) { return categories.filter(c => etatT[typoDe(c)]); }

function construireChips() {
  // Écran Mes plantes
  groupeChips($("chipsTypo"), ORDRE_TYPO, etatTypo, {
    couleur: t => COUL_TYPO[t],
    nb: t => compte(p => p.typo === t),
    apres: () => { catsVisibles(etatTypo).forEach(c => etatCat[c] = true); construireChips(); rendreSelection(); },
  });
  groupeChips($("chipsCat"), catsVisibles(etatTypo), etatCat, {
    nb: c => compte(p => p.cat === c),
    apres: () => { construireChips(); rendreSelection(); },
  });
  // Écran Planning
  groupeChips($("chipsPhase"), ORDRE.filter(k => phases[k]), etatPhase, {
    couleur: k => phases[k].color,
    libelle: k => phases[k].label,
    apres: () => { construireChips(); rendrePlanning(); },
  });
  groupeChips($("chipsTypoP"), ORDRE_TYPO, etatTypoP, {
    couleur: t => COUL_TYPO[t],
    nb: t => compte(p => p.typo === t),
    apres: () => { catsVisibles(etatTypoP).forEach(c => etatCatP[c] = true); construireChips(); rendrePlanning(); },
  });
  groupeChips($("chipsCatP"), catsVisibles(etatTypoP), etatCatP, {
    nb: c => compte(p => p.cat === c),
    apres: () => { construireChips(); rendrePlanning(); },
  });
  groupeChips($("chipsPhaseM"), ORDRE_MAINTENANT.filter(k => phases[k]), etatPhaseM, {
    libelle: k => phases[k].label,
    couleur: k => phases[k].color,
    apres: () => { construireChips(); rendreMaintenant(); },
  });
  chipsEspaces($("chipsEspaceM"), $("ligneEspaceM"), rendreMaintenant);
  chipsEspaces($("chipsEspaceP"), $("ligneEspaceP"), rendrePlanning);
}

// Filtre d'espace : sélection unique, avec une valeur pour les plantes non classées.
function chipsEspaces(conteneur, ligne, apres) {
  if (!conteneur || !ligne) return;
  ligne.hidden = !espaces.length;
  conteneur.innerHTML = "";
  if (!espaces.length) return;
  const valeurs = [{ id: null, nom: "Tous" }]
    .concat(espaces.map(z => ({ id: z.id, nom: z.name, couleur: z.color })))
    .concat([{ id: "0", nom: "Non classées" }]);
  valeurs.forEach(v => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "chip";
    b.setAttribute("aria-pressed", String(espaceChoisi === v.id));
    const n = v.id === null ? sel.size
      : v.id === "0" ? [...sel].filter(id => !espacesDe(id).length).length
      : [...sel].filter(id => espacesDe(id).includes(v.id)).length;
    b.innerHTML = (v.couleur ? `<i class="pastille" style="background:${v.couleur}"></i>` : "")
      + esc(v.nom) + `<span class="nb">${n}</span>`;
    b.addEventListener("click", () => {
      espaceChoisi = espaceChoisi === v.id ? null : v.id;
      construireChips(); apres();
    });
    conteneur.appendChild(b);
  });
}

/* ================== Onglets ================== */

const ECRANS = ["maintenant", "planning", "selection", "jardin"];
const CONFIG = ["jardin", "selection"];
const onglets = [...document.querySelectorAll(".onglet")];
const sousOnglets = [...document.querySelectorAll(".sous-onglet")];
let ecranCourant = "maintenant";
let ecranConfig = "jardin";

function afficher(ecran) {
  ecranCourant = ecran;
  const enConfig = CONFIG.includes(ecran);
  if (enConfig) ecranConfig = ecran;
  ECRANS.forEach(n => { $("ec-" + n).hidden = (n !== ecran); });
  onglets.forEach(x => x.setAttribute("aria-selected", String(!enConfig && x.dataset.ecran === ecran)));
  sousOnglets.forEach(x => x.setAttribute("aria-selected", String(x.dataset.ecran === ecran)));
  $("sousOnglets").hidden = !enConfig;
  $("btnConfig").setAttribute("aria-expanded", String(enConfig));
  window.scrollTo(0, 0);
  if (ecran === "planning") placerMarqueur();
}

onglets.forEach(o => o.addEventListener("click", () => afficher(o.dataset.ecran)));
sousOnglets.forEach(o => o.addEventListener("click", () => afficher(o.dataset.ecran)));
sur("btnConfig", "click", () => afficher(CONFIG.includes(ecranCourant) ? "maintenant" : ecranConfig));
sur("fermerConfig", "click", () => afficher("maintenant"));

document.querySelectorAll(".segment").forEach(s => s.addEventListener("click", () => {
  tri = s.dataset.tri;
  document.querySelectorAll(".segment").forEach(x => x.setAttribute("aria-pressed", String(x === s)));
  rendreSelection();
}));

/* ================== Écran 1 : ma sélection ================== */

function filtrerSel() {
  const q = $("rech").value.trim().toLowerCase();
  return plantes.filter(p =>
    etatTypo[p.typo] && etatCat[p.cat]
    && (!climatSeul || (adapt[p.id] || {}).level === "adapte")
    && (!q || p.nom.toLowerCase().includes(q)
           || p.latin.toLowerCase().includes(q)
           || p.famille.toLowerCase().includes(q)));
}

function carteItem(p) {
  const bloc = document.createElement("div");
  bloc.className = "item-bloc";
  const b = document.createElement("button");
  b.type = "button"; b.className = "item";
  b.setAttribute("aria-pressed", String(sel.has(p.id)));
  const ad = adapt[p.id];
  const sousTitre = tri === "alpha" ? `<span class="cat-mini">${esc(p.cat)}</span>` : "";
  b.innerHTML = `<span class="rond">${CHECK}</span>`
    + `<span class="nom-item">${esc(p.nom)}${sousTitre}</span>`
    + (ad ? jaugeClim(ad.level, ad.note) : "");
  b.addEventListener("click", () => basculer(p.id));
  bloc.appendChild(b);
  const muettes = [...sourdines.keys()].filter(c => c.startsWith(p.id + "|")).length;
  if (sel.has(p.id) && muettes) {
    const r = document.createElement("div");
    r.className = "zones-item";
    const c = document.createElement("button");
    c.type = "button"; c.className = "mini-chip chip-sourdine";
    c.innerHTML = OEIL_BARRE + `<span>${muettes} tâche${muettes > 1 ? "s" : ""} masquée${muettes > 1 ? "s" : ""}, réafficher</span>`;
    c.addEventListener("click", () => leverToutesSourdines(p));
    r.appendChild(c);
    bloc.appendChild(r);
  }
  if (sel.has(p.id) && espaces.length) {
    const r = document.createElement("div");
    r.className = "espaces-item";
    const prises = espacesDe(p.id);
    espaces.forEach(z => {
      const c = document.createElement("button");
      c.type = "button"; c.className = "mini-chip";
      c.setAttribute("aria-pressed", String(prises.includes(z.id)));
      c.textContent = z.name;
      c.addEventListener("click", () => basculerEspace(p.id, z.id));
      r.appendChild(c);
    });
    bloc.appendChild(r);
  }
  return bloc;
}

async function basculerEspace(plantId, espaceId) {
  if (!session || !jardinId) return;
  const liste = aff.get(plantId) || [];
  const present = liste.some(r => r.espace_id === espaceId);
  const req = present
    ? db.from("garden_plant_espaces").delete()
        .eq("garden_id", jardinId).eq("plant_id", plantId).eq("espace_id", espaceId)
    : db.from("garden_plant_espaces").insert({ garden_id: jardinId, plant_id: plantId, espace_id: espaceId });
  const { error } = await req;
  if (error) { info("Espace non enregistré : " + error.message, true); return; }
  if (present) aff.set(plantId, liste.filter(r => r.espace_id !== espaceId));
  else aff.set(plantId, liste.concat([{ plant_id: plantId, espace_id: espaceId, quantity: null, notes: null }]));
  construireChips(); rendreTout();
}

function majLegendeClim() {
  const e = $("legendeClim");
  if (!e) return;
  const g = jardinActif();
  const c = g && g.climate_key ? climats[g.climate_key] : null;
  // Le filtre climatique n'a de sens que si un jardin déclare son climat.
  const b = $("filtreClimat");
  if (b) {
    if (!c) climatSeul = false;
    b.hidden = !c;
    b.setAttribute("aria-pressed", String(climatSeul));
  }
  if (!c) { e.hidden = true; return; }
  e.hidden = false;
  e.innerHTML = `<span class="leg-titre">Adaptation au climat ${esc(c.label.toLowerCase())}</span>`
    + ["adapte", "protection", "abri", "deconseille"]
        .map(n => `<span class="leg-item">${jaugeClim(n)}${esc(NIVEAUX[n].court)}</span>`).join("");
}

function rendreSelection() {
  majLegendeClim();
  const zone = $("listes");
  zone.innerHTML = "";
  const lot = filtrerSel();
  $("bilanSel").textContent = `${lot.length} sur ${plantes.length} affichées`;

  if (!lot.length) { $("videSel").hidden = false; return; }
  $("videSel").hidden = true;

  if (tri === "alpha") {
    const g = document.createElement("div");
    g.className = "liste";
    lot.forEach(p => g.appendChild(carteItem(p)));
    zone.appendChild(g);
    return;
  }
  // Deux niveaux : le type d'abord, ses catégories ensuite.
  ORDRE_TYPO.forEach(t => {
    const dansType = lot.filter(p => typoDe(p.cat) === t);
    if (!dansType.length) return;

    const tete = document.createElement("p");
    tete.className = "groupe-type";
    tete.innerHTML = `<i class="pastille" style="background:${COUL_TYPO[t]}"></i>`
      + `<b>${esc(t)}</b><span class="nb">${dansType.length}</span>`;
    zone.appendChild(tete);

    categories.filter(c => typoDe(c) === t).forEach(c => {
      const sous = dansType.filter(p => p.cat === c);
      if (!sous.length) return;
      const h = document.createElement("p");
      h.className = "groupe-titre";
      h.innerHTML = `<b>${esc(c)}</b><span class="nb">${sous.length}</span>`;
      zone.appendChild(h);
      const g = document.createElement("div");
      g.className = "liste";
      sous.forEach(p => g.appendChild(carteItem(p)));
      zone.appendChild(g);
    });
  });
}

sur("rech", "input", rendreSelection);
sur("filtreClimat", "click", () => { climatSeul = !climatSeul; rendreSelection(); });
sur("vider", "click", async () => {
  if (!sel.size || !session) return;
  const copie = new Set(sel), copieAff = new Map(aff);
  sel = new Set(); aff = new Map(); majCompte(); construireChips(); rendreTout();
  const { error } = await db.from("garden_plants").delete().eq("garden_id", jardinId);
  if (error) {
    sel = copie; aff = copieAff; majCompte(); construireChips(); rendreTout();
    info("Suppression refusée : " + error.message, true);
  }
});

/* ================== Écran 2 : en ce moment ================== */

if ($("dateJour")) $("dateJour").textContent =
  auj.toLocaleDateString("fr-FR", { weekday:"long", day:"numeric", month:"long", year:"numeric" }) +
  " · " + (auj.getDate() <= 15 ? "première" : "seconde") + " quinzaine";

function construireRegle() {
  const r = $("regleAnnee");
  if (r.childElementCount) return;
  MOIS.forEach((m, i) => {
    const d = document.createElement("div");
    d.className = "regle-mois" + (i === auj.getMonth() ? " en-cours" : "");
    d.textContent = ABR[i].toUpperCase();
    r.appendChild(d);
  });
  const c = document.createElement("div");
  c.className = "regle-curseur";
  const debut = new Date(auj.getFullYear(), 0, 1), fin = new Date(auj.getFullYear() + 1, 0, 1);
  c.style.left = ((auj - debut) / (fin - debut) * 100) + "%";
  r.appendChild(c);
}

function shiftPour(k) {
  const g = jardinActif();
  if (!g || !g.climate_key) return { s: 0, a: 0 };
  const f = (shifts[g.climate_key] || {})[k];
  if (f) return f;
  const c = climats[g.climate_key];
  return c ? { s: c.shift_spring, a: c.shift_autumn } : { s: 0, a: 0 };
}

const borne = v => Math.min(24, Math.max(1, v));

// Un segment ancré au premier semestre suit le décalage de printemps, sinon celui d'automne.
function segsDe(p, k) {
  const brut = p.phases[k];
  if (!brut) return null;
  const g = jardinActif();
  const cle = g && g.climate_key ? g.climate_key : null;
  // Une fenêtre sans liste de climats vaut partout. Une fenêtre restreinte ne
  // s'affiche que si le jardin est calé sur l'un des climats concernés.
  const base = brut.filter(v => !v[2] || (cle && v[2].indexOf(cle) !== -1));
  if (!base.length) return null;
  const sh = shiftPour(k);
  if (!sh.s && !sh.a) return base;
  return base.map(v => {
    const d = v[0] <= 12 ? sh.s : sh.a;
    return [borne(v[0] + d), borne(v[1] + d)];
  });
}


// Jauge à quatre crans, toujours à la même place pour être lisible en balayage.
function jaugeClim(niveau, titre) {
  const n = NIVEAUX[niveau];
  if (!n) return "";
  const crans = [1, 2, 3, 4].map(i =>
    `<i class="cran${i <= n.crans ? " plein" : ""}"></i>`).join("");
  return `<span class="jauge niv-${niveau}" title="${esc(titre || n.long)}" `
    + `role="img" aria-label="${esc(n.court)}">${crans}</span>`;
}

function espacesDe(id) { return (aff.get(id) || []).map(r => r.espace_id); }

function passeEspace(p) {
  if (espaceChoisi === null) return true;
  const z = espacesDe(p.id);
  return espaceChoisi === "0" ? z.length === 0 : z.includes(espaceChoisi);
}

const actif = (p, k) => (segsDe(p, k) || []).some(v => v[0] <= demi && v[1] >= demi);
const texteAction = (p, k) =>
  k === "taille" ? (p.guide.taille || p.attr.taille || "")
  : k === "multiplication" ? (p.guide.multiplication || p.attr.multiplication || "")
  : (p.guide[k] || "");

function rendreMaintenant() {
  appliquerSaison();
  const zone = $("maintenant");
  zone.innerHTML = "";
  if (!sel.size) {
    zone.innerHTML = '<p class="vide">Aucune plante retenue. Ouvrez Réglages puis Mes plantes pour indiquer ce que vous cultivez.</p>';
    return;
  }
  const mien = plantes.filter(p => sel.has(p.id) && passeEspace(p));

  const MOIS_LONGS = ["janvier","février","mars","avril","mai","juin",
    "juillet","août","septembre","octobre","novembre","décembre"];
  const bornePrint = h => (h % 2 ? "mi-" : "fin ") + MOIS_LONGS[Math.ceil(h / 2) - 1];

  const finFenetre = (p, k) => {
    const seg = (segsDe(p, k) || []).find(v => v[0] <= demi && v[1] >= demi);
    return seg ? seg[1] : 99;
  };
  const etatFenetre = (p, k) => {
    if (k === "floraison") return "";
    const seg = (segsDe(p, k) || []).find(v => v[0] <= demi && v[1] >= demi);
    if (!seg) return "";
    if (seg[1] === demi) return "derniere";
    if (seg[0] === demi) return "ouverture";
    return "";
  };
  const losange = p => (p.attr.toxicite && !/^non toxique/i.test(p.attr.toxicite))
    ? `<span class="losange-tox" title="${esc(p.attr.toxicite)}" aria-label="Plante toxique">&#9670;</span>` : "";
  const nomAvecMarque = p => `${esc(p.nom)}${losange(p)}`;

  const bouton = (classe, libelle, fn, picto) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "opt " + classe;
    b.innerHTML = (picto || "") + `<span>${esc(libelle)}</span>`;
    b.addEventListener("click", e => { e.stopPropagation(); fermerTiroirs(); fn(); });
    return b;
  };

  const poserRangee = (contenu, p, k, muet) => {
    const rangee = document.createElement("div");
    rangee.className = "rangee-tache" + (muet ? " en-sourdine" : "");
    const glissiere = document.createElement("div");
    glissiere.className = "glissiere";
    glissiere.appendChild(contenu);
    let gauche = null, droite = null;
    if (muet) {
      gauche = document.createElement("div");
      gauche.className = "tiroir tiroir-gauche";
      gauche.appendChild(bouton("opt-lever", "Réafficher", () => leverSourdine(p, k)));
    } else {
      gauche = document.createElement("div");
      gauche.className = "tiroir tiroir-gauche";
      gauche.appendChild(bouton("opt-quinzaine", "Cette quinzaine", () => mettreEnSourdine(p, k, "quinzaine"), OEIL_BARRE));
      gauche.appendChild(bouton("opt-periode", "Cette période", () => mettreEnSourdine(p, k, "periode", finFenetre(p, k)), OEIL_BARRE));
      droite = document.createElement("div");
      droite.className = "tiroir tiroir-droite";
      droite.appendChild(bouton("opt-toujours", "Ne plus afficher", () => mettreEnSourdine(p, k, "toujours"), OEIL_BARRE));
    }
    if (droite) rangee.appendChild(droite);
    rangee.appendChild(glissiere);
    rangee.appendChild(gauche);
    brancherGlissement(rangee, glissiere, gauche, droite);
    return rangee;
  };

  // Une ligne d'action, en tête soit le nom de la plante, soit le nom de la tâche.
  const ligneAction = (p, k, mode) => {
    const muet = Boolean(sourdineActive(p, k));
    const e = etatFenetre(p, k);
    const fin = finFenetre(p, k);
    const echeance = e === "derniere"
      ? '<span class="echeance urgente">dernière quinzaine</span>'
      : (fin <= 24 && !muet ? `<span class="echeance">jusqu'à ${esc(bornePrint(fin))}</span>` : "");
    const tete = mode === "espace"
      ? `<span class="pt" style="background:${phases[k].color}"></span>${esc(phases[k].label)}`
      : nomAvecMarque(p);
    const texte = texteAction(p, k);
    const d = document.createElement("button");
    d.type = "button";
    d.className = "action nom-action" + (e && !muet ? " a-" + e : "") + (texte ? "" : " sans-texte");
    d.innerHTML = `<span class="ligne-nom"><b>${tete}</b>${echeance}</span>`
      + (texte ? `<span class="dit-action">${esc(texte)}</span>` : "");
    d.addEventListener("click", ev => {
      if (ev.currentTarget.parentElement.dataset.glisse) return;
      ouvrirFeuille(p);
    });
    return poserRangee(d, p, k, muet);
  };

  // Toutes les actions du moment, filtrées des masquées.
  const paires = [];
  let muettes = 0;
  ORDRE_MAINTENANT.forEach(k => {
    if (!phases[k] || !etatPhaseM[k]) return;
    mien.filter(p => actif(p, k)).forEach(p => {
      const muet = Boolean(sourdineActive(p, k));
      if (muet) muettes++;
      if (!muet || voirSourdines) paires.push({ p, k, muet });
    });
  });

  if (!paires.length) {
    $("bilanMoment").innerHTML = "";
    $("basculeVue").innerHTML = "";
    $("zoneMasquees").innerHTML = "";
    majFiltresMoment();
    zone.innerHTML = '<div class="vide-soigne">'
      + '<svg viewBox="0 0 1024 1024" aria-hidden="true">'
      + '<path d="M 512 824 C 512 720 512 660 512 470" fill="none" stroke="currentColor" stroke-width="52" stroke-linecap="round"/>'
      + '<path d="M 512 620 C 466 522 372 448 268 452 C 300 560 386 632 512 620 Z" fill="currentColor" opacity=".55"/>'
      + '<path d="M 512 512 C 560 404 656 340 764 336 C 736 452 644 528 512 512 Z" fill="currentColor"/></svg>'
      + '<p><b>Rien à faire cette quinzaine</b>Le jardin travaille sans vous. Période de repos ou de simple surveillance.</p></div>';
    return;
  }

  const audibles = paires.filter(x => !x.muet);
  const urgentes = audibles.filter(x => etatFenetre(x.p, x.k) === "derniere").length;
  $("bilanMoment").innerHTML =
    `<span><b>${audibles.length}</b> action${audibles.length > 1 ? "s" : ""} sur `
    + `<b>${new Set(audibles.map(x => x.p.id)).size}</b> plantes</span>`
    + (urgentes ? `<span class="alerte-fin">${urgentes} en dernière quinzaine</span>` : "");

  const bascule = $("basculeVue");
  bascule.innerHTML = "";
  [["tache", "Tâche"], ["espace", "Espace"]].forEach(([v, lib]) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "vue" + (vueMoment === v ? " active" : "");
    b.textContent = lib;
    b.addEventListener("click", () => {
      vueMoment = v;
      try { localStorage.setItem("monjardin.vue", v); } catch (err) { /* stockage indisponible */ }
      rendreMaintenant();
    });
    bascule.appendChild(b);
  });

  const zm = $("zoneMasquees");
  zm.innerHTML = "";
  if (muettes || voirSourdines) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "bascule-sourdine" + (voirSourdines ? " active" : "");
    b.title = voirSourdines ? "Cacher les actions masquées" : "Afficher les actions masquées";
    b.innerHTML = OEIL_BARRE + (muettes ? `<span class="nb">${muettes}</span>` : "");
    b.addEventListener("click", () => { voirSourdines = !voirSourdines; rendreMaintenant(); });
    zm.appendChild(b);
  }
  majFiltresMoment();

  // Toute section se replie et se déploie au clic sur son en-tête, dans les deux vues.
  let rang = 0;
  const carte = (titre, compteur, replieDefaut, couleur) => {
    const ferme = Boolean(replieDefaut);
    const c = document.createElement("div");
    c.className = "carte-tache anime";
    c.style.animationDelay = Math.min(rang++, 8) * 45 + "ms";
    if (couleur) {
      c.style.boxShadow = `inset 3px 0 0 ${couleur}`;
      c.style.borderColor = teinte(couleur, .22);
      c.style.setProperty("--ton-tache", teinte(couleur, .10));
      c.style.setProperty("--couleur-tache", couleur);
    }
    c.innerHTML = `<h2 class="tete-section" role="button" tabindex="0" aria-expanded="${!ferme}">`
      + `${titre}<span class="nb">${compteur}</span>`
      + `<span class="chevron" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 9.5 12 15.5 18 9.5"/></svg></span>`
      + `</h2><div class="corps-tache${ferme ? " replie" : ""}"></div>`;
    const h = c.querySelector("h2"), corps = c.querySelector(".corps-tache");
    const basculer = () => h.setAttribute("aria-expanded", String(!corps.classList.toggle("replie")));
    h.addEventListener("click", basculer);
    h.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); basculer(); }
    });
    return c;
  };

  if (vueMoment === "espace") {
    // Un espace filtré ne doit afficher que lui, même si les plantes retenues
    // appartiennent par ailleurs à d'autres espaces.
    const tous = espaces.map(z => ({ cle: z.id, nom: z.name }))
      .concat([{ cle: "0", nom: "Non classées" }]);
    const groupes = espaceChoisi === null ? tous : tous.filter(g => g.cle === espaceChoisi);
    groupes.forEach(g => {
      const dedans = p => g.cle === "0" ? !espacesDe(p.id).length : espacesDe(p.id).indexOf(g.cle) !== -1;
      const ids = [...new Set(paires.filter(x => dedans(x.p)).map(x => x.p.id))];
      if (!ids.length) return;
      const lot = paires.filter(x => dedans(x.p));
      const c = carte(esc(g.nom), `${ids.length} plantes, ${lot.length} actions`, false,
        (espaces.find(z => z.id === g.cle) || {}).color || "#4C8C3F");
      c.classList.add("carte-espace");
      const corps = c.querySelector(".corps-tache");
      ids.map(id => plantes.find(p => p.id === id))
        .sort((a, b) => a.nom.localeCompare(b.nom, "fr"))
        .forEach(p => {
          const bloc = document.createElement("div");
          bloc.className = "plante-groupe";
          const t = document.createElement("button");
          t.type = "button"; t.className = "tete-plante";
          t.innerHTML = `<b>${nomAvecMarque(p)}</b>`
            + `<span class="voir-fiche" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></span>`;
          t.addEventListener("click", () => ouvrirFeuille(p));
          bloc.appendChild(t);
          lot.filter(x => x.p.id === p.id).forEach(x => bloc.appendChild(ligneAction(p, x.k, "espace")));
          corps.appendChild(bloc);
        });
      zone.appendChild(c);
    });
    return;
  }

  ORDRE_MAINTENANT.forEach(k => {
    const lot = paires.filter(x => x.k === k);
    if (!lot.length) return;
    const repliable = REPLIES_PAR_DEFAUT.indexOf(k) !== -1 || lot.length > 8;
    const urgence = lot.some(x => etatFenetre(x.p, k) === "derniere");
    const replie = repliable && !urgence;
    const c = carte(`${picto(k)}${esc(phases[k].label)}`, lot.length, replie, phases[k].color);
    const corps = c.querySelector(".corps-tache");
    if (k === "floraison") {
      corps.classList.add("bloc-puces");
      lot.forEach(x => {
        const d = document.createElement("div");
        d.className = "enveloppe-puce";
        d.innerHTML = `<button class="puce nom-action">${nomAvecMarque(x.p)}</button>`;
        d.querySelector(".nom-action").addEventListener("click", () => ouvrirFeuille(x.p));
        corps.appendChild(d);
      });
    } else {
      lot.slice()
        .sort((a, b) => finFenetre(a.p, k) - finFenetre(b.p, k) || a.p.nom.localeCompare(b.p.nom, "fr"))
        .forEach(x => corps.appendChild(ligneAction(x.p, k, "tache")));
    }
    zone.appendChild(c);
  });
}

/* ================== Écran 3 : planning ================== */

function construireMois() {
  const gm = $("grilleMois");
  if (gm.childElementCount) return;
  MOIS.forEach((m, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "mois-case" + (i === auj.getMonth() ? " en-cours" : "");
    b.dataset.court = m[0];
    b.textContent = ABR[i].toUpperCase();
    b.title = `N'afficher que les plantes ayant une tâche en ${m.toLowerCase()}`;
    b.setAttribute("aria-pressed", "false");
    b.addEventListener("click", () => {
      moisChoisi = (moisChoisi === i) ? null : i;   // second clic : on relâche le filtre
      majMois();
      rendrePlanning();
    });
    gm.appendChild(b);
  });
}

function majMois() {
  [...$("grilleMois").children].forEach((b, i) =>
    b.setAttribute("aria-pressed", String(i === moisChoisi)));
  const bande = $("bandeMois");
  if (moisChoisi === null) { bande.hidden = true; return; }
  const col = getComputedStyle(document.documentElement).getPropertyValue("--col-nom").trim();
  bande.style.left = `calc(${col} + (100% - ${col}) * ${moisChoisi / 12})`;
  bande.style.width = `calc((100% - ${col}) / 12)`;
  bande.hidden = false;
}

// Une plante entre dans le mois si l'une de ses tâches encore filtrées y tombe.
function dansMois(p) {
  if (moisChoisi === null) return true;
  const h1 = moisChoisi * 2 + 1, h2 = moisChoisi * 2 + 2;
  return ORDRE.some(k => etatPhase[k] && (segsDe(p, k) || []).some(v => v[0] <= h2 && v[1] >= h1));
}

function segs(p) {
  // Les périodes sont empilées sur le minimum de voies possible : une voie accueille
  // plusieurs tâches tant qu'elles ne se chevauchent pas. Une plante à dix tâches
  // tient ainsi sur deux ou trois lignes au lieu de dix.
  const h1 = moisChoisi === null ? 0 : moisChoisi * 2 + 1;
  const h2 = moisChoisi === null ? 0 : moisChoisi * 2 + 2;
  const items = [];
  ORDRE.forEach(k => {
    const seg = segsDe(p, k);
    if (!seg || !etatPhase[k] || !phases[k]) return;
    seg.forEach(v => {
      if (moisChoisi !== null && !(v[0] <= h2 && v[1] >= h1)) return;
      items.push({ k, s: v[0], e: v[1] });
    });
  });
  if (!items.length) return '<div class="voie"></div>';

  items.sort((a, b) => a.s - b.s || a.e - b.e);
  const voies = [];
  items.forEach(it => {
    let v = voies.find(L => L[L.length - 1].e < it.s);
    if (!v) { v = []; voies.push(v); }
    v.push(it);
  });

  return voies.map(L => `<div class="voie">` + L.map(it => {
    const g = (it.s - 1) / 24 * 100, w = (it.e - it.s + 1) / 24 * 100;
    return `<span class="seg" style="left:${g}%;width:${w}%;background:${phases[it.k].color}" title="${esc(phases[it.k].label)}"></span>`;
  }).join("") + `</div>`).join("");
}

function ficheHTML(p) {
  const a = p.attr || {};
  const MOIS_C = ["janv","févr","mars","avr","mai","juin","juil","août","sept","oct","nov","déc"];
  const borne = h => (h % 2 ? "mi-" : "fin ") + MOIS_C[Math.ceil(h / 2) - 1];
  const depart = h => (h % 2 ? "début " : "mi-") + MOIS_C[Math.ceil(h / 2) - 1];

  const actes = ORDRE.filter(k => p.phases[k] && phases[k]).map(k => {
    const t = texteAction(p, k);
    const seg = segsDe(p, k) || [];
    const quand = seg.map(v => depart(v[0]) + " à " + borne(v[1])).join(", ");
    return `<li>
      <span class="pt" style="background:${phases[k].color}"></span>
      <div>
        <p class="acte-tete"><b>${esc(phases[k].label)}</b>${quand ? `<span class="acte-quand">${esc(quand)}</span>` : ""}</p>
        ${t ? `<p class="acte-texte">${esc(t)}</p>` : ""}
      </div></li>`;
  }).join("");

  const tag = v => v ? `<span class="tag">${esc(v)}</span>` : "";
  const ad = adapt[p.id];
  const tox = a.toxicite && !/^non toxique/i.test(a.toxicite);
  const bloc = (t, v) => v ? `<div class="carac-bloc"><dt>${t}</dt><dd>${esc(v)}</dd></div>` : "";

  return `<div class="fiche">
    ${ad ? `<div class="bloc-clim niv-${ad.level}">
      ${jaugeClim(ad.level, ad.note)}
      <div><p class="clim-titre">${esc(NIVEAUX[ad.level].court)}<span>climat ${esc((climats[(jardinActif() || {}).climate_key] || {}).label || "")}</span></p>
      <p class="clim-note">${esc(ad.note || NIVEAUX[ad.level].long)}</p></div>
    </div>` : ""}
    <div class="tags">${tag(a.type || p.cat)}${tag(a.exposition)}${tag(a.rusticite)}</div>
    ${tox ? `<p class="avis-tox"><span class="losange-tox">&#9670;</span>${esc(a.toxicite)}</p>` : ""}
    ${p.conseil ? `<p class="cgen">${esc(p.conseil)}</p>` : ""}
    <dl class="carac">
      ${bloc("Hauteur", a.hauteur)}${bloc("Espacement", p.espacement)}
      ${bloc("Profondeur", p.prof)}${bloc("Arrosage", a.arrosage)}
      ${bloc("Sol", a.fertilisation)}${bloc("Couleur", a.couleur)}
      ${bloc("Parfum", a.parfum)}${bloc("Multiplication", a.multiplication)}
      ${p.phases.taille ? "" : bloc("Taille", a.taille)}
      ${bloc("Associations", p.assoc)}
    </dl>
    ${actes ? `<p class="titre-actes">Calendrier et conseils</p><ul class="actes">${actes}</ul>` : ""}
  </div>`;
}

function rendrePlanning() {
  const zone = $("rangees");
  zone.innerHTML = "";
  const lot = plantes.filter(p => {
    if (jardinSeul && !sel.has(p.id)) return false;
    if (espaceChoisi !== null && (!sel.has(p.id) || !passeEspace(p))) return false;
    if (!etatTypoP[p.typo] || !etatCatP[p.cat]) return false;
    if (!dansMois(p)) return false;
    return ORDRE.some(k => etatPhase[k] && p.phases[k]);
  });
  $("bilanPlan").textContent = `${lot.length} sur ${plantes.length} affichées`
    + (moisChoisi === null ? "" : ` · ${MOIS[moisChoisi].toLowerCase()}`);
  $("razMois").hidden = moisChoisi === null;
  majCompteurFiltres();

  lot.forEach(p => {
    const r = document.createElement("div");
    // Le liseré ne marque l'appartenance au jardin que si le catalogue entier est affiché.
    r.className = "rangee" + (sel.has(p.id) && !jardinSeul ? " retenue" : "");
    r.innerHTML =
      `<button class="nom-plante">${esc(p.nom)}`
      + `<small>${p.latin ? `<i>${esc(p.latin)}</i>` : esc(p.cat)}</small></button>`
      + `<div class="piste">${segs(p)}</div>`;
    r.querySelector(".nom-plante").addEventListener("click", () => ouvrirFeuille(p));
    zone.appendChild(r);
  });

  const v = $("videPlanning");
  v.hidden = lot.length > 0;
  v.textContent = (jardinSeul && !sel.size)
    ? "Aucune plante retenue. Ouvrez Réglages puis Mes plantes pour composer votre jardin."
    : (moisChoisi === null
        ? "Aucune plante ne correspond à ces filtres."
        : `Aucune tâche en ${MOIS[moisChoisi].toLowerCase()} parmi les plantes filtrées.`);
  placerMarqueur();
}

function placerMarqueur() {
  const m = $("marqueurJour");
  if (!$("rangees").childElementCount) { m.hidden = true; return; }
  const debut = new Date(auj.getFullYear(), 0, 1), fin = new Date(auj.getFullYear() + 1, 0, 1);
  const f = (auj - debut) / (fin - debut);
  const col = getComputedStyle(document.documentElement).getPropertyValue("--col-nom").trim();
  m.style.left = `calc(${col} + (100% - ${col}) * ${f})`;
  m.hidden = false;
}

function nbFiltresActifs() {
  let n = 0;
  const cles = ORDRE.filter(k => phases[k]);
  if (cles.length && cles.some(k => !etatPhase[k])) n++;
  if (ORDRE_TYPO.some(t => !etatTypoP[t])) n++;
  const cats = catsVisibles(etatTypoP);
  if (cats.length && cats.some(c => !etatCatP[c])) n++;
  if (espaceChoisi !== null) n++;
  if (moisChoisi !== null) n++;
  return n;
}

function majCompteurFiltres() {
  const n = nbFiltresActifs(), e = $("nbFiltres");
  if (!e) return;
  e.textContent = n;
  e.hidden = n === 0;
  $("basculeFiltres").setAttribute("aria-pressed", String(n > 0));
}

sur("basculeFiltres", "click", function () {
  const ouvert = $("corpsFiltres").hidden;
  $("corpsFiltres").hidden = !ouvert;
  this.setAttribute("aria-expanded", String(ouvert));
});

sur("razMois", "click", () => {
  moisChoisi = null; majMois(); rendrePlanning();
});

sur("filtreJardin", "click", function () {
  jardinSeul = !jardinSeul;
  this.setAttribute("aria-pressed", String(jardinSeul));
  rendrePlanning();
});

/* ================== Authentification ================== */

sur("form-connexion", "submit", async e => {
  e.preventDefault();
  const email = $("email").value.trim();
  if (!email) return;
  const { error } = await db.auth.signInWithOtp({
    email, options: { emailRedirectTo: window.location.href.split("#")[0] },
  });
  if (!error) { $("aide-code").hidden = false; $("code").focus(); }
  const note = $("note-connexion");
  note.hidden = false;
  note.classList.toggle("erreur", Boolean(error));
  note.textContent = error ? "Envoi impossible : " + error.message
                           : "Message envoyé. Ouvrez le lien depuis un navigateur, ou saisissez ici le code reçu.";
});

sur("deconnexion", "click", () => db.auth.signOut());

db.auth.onAuthStateChange((_e, s) => {
  session = s;
  const connecte = Boolean(s);
  $("zone-connexion").hidden = connecte;
  $("videSelection").hidden = connecte;
  if (connecte) { $("aide-code").hidden = true; $("code").value = ""; $("codeReprise").hidden = true; }
  $("deconnexion").hidden = !connecte;
  $("utilisateur").textContent = connecte ? s.user.email : "";
  if (!$("etat").classList.contains("erreur")) info("");
  chargerJardin();
});


/* ================== Écran 4 : jardin ================== */

function majJardinUI() {
  const connecte = Boolean(session);
  $("bloc-jardin").hidden = !connecte;
  const g = jardinActif();
  const c = g && g.climate_key ? climats[g.climate_key] : null;
  $("titreJardin").textContent = g && g.name ? g.name : "Mon jardin";
  const puce = $("puceClimat");
  puce.textContent = c ? c.label : "Choisir un climat";
  puce.classList.toggle("a-renseigner", !c);
  puce.hidden = !connecte;

  const sj = $("selJardin");
  sj.innerHTML = jardins.map(j => `<option value="${j.id}">${esc(j.name)}</option>`).join("");
  if (g) sj.value = g.id;

  const sc = $("selClimat");
  sc.innerHTML = '<option value="">Non renseigné</option>'
    + Object.values(climats).sort((a, b) => a.position - b.position)
        .map(x => `<option value="${x.key}">${esc(x.label)}</option>`).join("");
  sc.value = g && g.climate_key ? g.climate_key : "";
  $("descClimat").textContent = c ? c.description : "";
  $("decalClimat").textContent = c && (c.shift_spring || c.shift_autumn)
    ? `Décalage appliqué au calendrier : ${demiEnTexte(c.shift_spring)} au premier semestre, ${demiEnTexte(c.shift_autumn)} au second.`
    : "";
  rendreEspaces();
}

function demiEnTexte(d) {
  if (d === 0) return "aucun";
  return (d > 0 ? "plus tard de " : "plus tôt de ")
    + Math.abs(d) + (Math.abs(d) > 1 ? " quinzaines" : " quinzaine");
}

function rendreEspaces() {
  const z = $("listeEspaces");
  if (!z) return;
  z.innerHTML = "";
  if (!espaces.length) {
    z.innerHTML = '<p class="vide">Aucun espace. Ajoutez-en un pour découper ce jardin.</p>';
    return;
  }
  espaces.forEach(zo => {
    const membres = [...sel].filter(id => espacesDe(id).includes(zo.id))
      .map(id => plantes.find(p => p.id === id)).filter(Boolean)
      .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
    const d = document.createElement("div");
    d.className = "carte-espace";
    d.innerHTML = `<div class="tete-espace"><b>${esc(zo.name)}</b><span class="nb">${membres.length}</span>`
      + `<button class="lien" data-act="renommer">Renommer</button>`
      + `<button class="lien" data-act="supprimer">Supprimer</button></div>`;
    const corps = document.createElement("div");
    corps.className = "corps-espace";
    membres.forEach(p => {
      const r = (aff.get(p.id) || []).find(x => x.espace_id === zo.id) || {};
      const l = document.createElement("div");
      l.className = "ligne-espace";
      l.innerHTML = `<span class="nom-espace">${esc(p.nom)}</span>`
        + `<input class="qte" type="number" min="0" max="32000" placeholder="qté" value="${r.quantity ?? ""}">`
        + `<input class="notes" type="text" maxlength="200" placeholder="note" value="${esc(r.notes ?? "")}">`;
      const enr = () => majAffectation(p.id, zo.id,
        l.querySelector(".qte").value, l.querySelector(".notes").value);
      l.querySelector(".qte").addEventListener("change", enr);
      l.querySelector(".notes").addEventListener("change", enr);
      corps.appendChild(l);
    });
    if (!membres.length) {
      corps.innerHTML = '<p class="vide">Aucune plante rattachée. Ouvrez Réglages puis Mes plantes pour en rattacher.</p>';
    }
    d.appendChild(corps);
    d.querySelector('[data-act="renommer"]').addEventListener("click", () => renommerEspace(zo));
    d.querySelector('[data-act="supprimer"]').addEventListener("click", () => supprimerEspace(zo));
    z.appendChild(d);
  });
}

async function majAffectation(plantId, espaceId, qte, notes) {
  const q = qte === "" ? null : Number(qte);
  const n = notes.trim() === "" ? null : notes.trim();
  const { error } = await db.from("garden_plant_espaces").update({ quantity: q, notes: n })
    .eq("garden_id", jardinId).eq("plant_id", plantId).eq("espace_id", espaceId);
  if (error) { info("Enregistrement refusé : " + error.message, true); return; }
  const r = (aff.get(plantId) || []).find(x => x.espace_id === espaceId);
  if (r) { r.quantity = q; r.notes = n; }
  info("");
}

async function creerEspace(nom) {
  const { data, error } = await db.from("espaces")
    .insert({ garden_id: jardinId, name: nom, position: espaces.length }).select().single();
  if (error) { info("Espace non créé : " + error.message, true); return; }
  espaces.push(data);
  construireChips(); majJardinUI(); rendreTout();
}

async function renommerEspace(zo) {
  const nom = prompt("Nouveau nom de l'espace", zo.name);
  if (!nom || nom.trim() === "" || nom.trim() === zo.name) return;
  const { error } = await db.from("espaces").update({ name: nom.trim() }).eq("id", zo.id);
  if (error) { info("Renommage refusé : " + error.message, true); return; }
  zo.name = nom.trim();
  construireChips(); majJardinUI(); rendreTout();
}

async function supprimerEspace(zo) {
  if (!confirm(`Supprimer l'espace ${zo.name} ? Les plantes restent dans le jardin, elles deviennent non classées.`)) return;
  const { error } = await db.from("espaces").delete().eq("id", zo.id);
  if (error) { info("Suppression refusée : " + error.message, true); return; }
  espaces = espaces.filter(x => x.id !== zo.id);
  aff.forEach((v, k) => aff.set(k, v.filter(r => r.espace_id !== zo.id)));
  if (espaceChoisi === zo.id) espaceChoisi = null;
  construireChips(); majJardinUI(); rendreTout();
}

sur("form-espace", "submit", e => {
  e.preventDefault();
  const n = $("nomEspace").value.trim();
  if (!n || !jardinId) return;
  $("nomEspace").value = "";
  creerEspace(n);
});

sur("selJardin", "change", async function () {
  jardinId = this.value;
  espaceChoisi = null;
  await chargerContenuJardin();
});

sur("selClimat", "change", async function () {
  const g = jardinActif();
  if (!g) return;
  const v = this.value || null;
  const { error } = await db.from("gardens").update({ climate_key: v }).eq("id", g.id);
  if (error) { info("Climat non enregistré : " + error.message, true); return; }
  g.climate_key = v;
  await chargerAdaptations();
  majJardinUI(); rendreTout();
});

sur("nouveauJardin", "click", async () => {
  const nom = prompt("Nom du nouveau jardin");
  if (!nom || !nom.trim()) return;
  const { data, error } = await db.rpc("create_garden", { p_name: nom.trim() });
  if (error) { info("Jardin non créé : " + error.message, true); return; }
  await listerJardins();
  jardinId = data;
  espaceChoisi = null;
  await chargerContenuJardin();
});

sur("renommerJardin", "click", async () => {
  const g = jardinActif();
  if (!g) return;
  const nom = prompt("Nouveau nom du jardin", g.name);
  if (!nom || !nom.trim() || nom.trim() === g.name) return;
  const { error } = await db.from("gardens").update({ name: nom.trim() }).eq("id", g.id);
  if (error) { info("Renommage refusé : " + error.message, true); return; }
  g.name = nom.trim();
  majJardinUI();
});

/* ================== Amorçage ================== */

function rendreTout() {
  if (!plantes.length) return;
  rendreSelection();
  rendreMaintenant();
  rendrePlanning();
  rendreEspaces();
}

window.addEventListener("resize", () => { placerMarqueur(); majMois(); });
majCompte();
try { await chargerCatalogue(); }
catch (e) { info("Catalogue indisponible : " + e.message, true); }
const { data: { session: s0 } } = await db.auth.getSession();
if (!s0) $("zone-connexion").hidden = false;

// Le lien reçu par courrier électronique s'ouvre dans le navigateur, jamais dans
// l'application ajoutée à l'écran d'accueil, qui dispose de son propre stockage.
// La saisie du code ouvre la session dans le contexte où elle est saisie.
// Le lien reçu s'ouvre toujours dans le navigateur, jamais dans l'application ajoutée
// à l'écran d'accueil, qui dispose de son propre stockage. Coller le lien, ou saisir le
// code quand le modèle de courriel en fournit un, ouvre la session dans ce contexte.
const CODE_REPRISE = /^[A-Z2-9]{9}$/;
const nettoyerCode = v => (v || "").toUpperCase().replace(/[^A-Z2-9]/g, "");

// Un code de reprise est échangé contre un jeton par la fonction de bord, qui seule
// détient la clé de service. Aucun courriel n'intervient.
async function reprendreParCode(code) {
  const { data, error } = await db.functions.invoke("reprise", {
    body: { action: "utiliser", code },
  });
  if (error) {
    let detail = error.message;
    try { detail = (await error.context.json()).error || detail; } catch (e) { /* corps illisible */ }
    return { error: { message: detail } };
  }
  if (!data || !data.token_hash) return { error: { message: "réponse inattendue" } };
  return db.auth.verifyOtp({ token_hash: data.token_hash, type: "magiclink" });
}

function validerEntree(valeur, email) {
  const v = valeur.trim();
  if (!/^https?:\/\//i.test(v)) {
    const propre = nettoyerCode(v);
    if (CODE_REPRISE.test(propre) && !/^\d{6}$/.test(v.replace(/\s+/g, ""))) {
      return reprendreParCode(propre);
    }
    if (!email) return Promise.resolve({ error: { message: "adresse électronique manquante" } });
    return db.auth.verifyOtp({ email, token: v.replace(/\s+/g, ""), type: "email" });
  }
  let u;
  try { u = new URL(v); } catch (err) { return Promise.resolve({ error: { message: "lien illisible" } }); }
  const frag = new URLSearchParams((u.hash || "").replace(/^#/, ""));
  if (frag.get("access_token") && frag.get("refresh_token")) {
    return db.auth.setSession({
      access_token: frag.get("access_token"),
      refresh_token: frag.get("refresh_token"),
    });
  }
  const jeton = u.searchParams.get("token_hash") || u.searchParams.get("token");
  if (!jeton) return Promise.resolve({ error: { message: "aucun jeton dans ce lien" } });
  return db.auth.verifyOtp({ token_hash: jeton, type: u.searchParams.get("type") || "magiclink" });
}

sur("form-code", "submit", async e => {
  e.preventDefault();
  const saisie = $("code").value;
  if (!saisie.trim()) return;
  const n = $("note-connexion");
  n.hidden = false; n.classList.remove("erreur"); n.textContent = "Vérification en cours.";
  const { error } = await validerEntree(saisie, $("email").value.trim());
  if (error) {
    n.classList.add("erreur");
    n.textContent = "Connexion refusée : " + error.message;
    return;
  }
  n.hidden = true; n.textContent = "";
});

sur("genererReprise", "click", async () => {
  const z = $("codeReprise");
  z.hidden = false; z.classList.remove("erreur"); z.textContent = "Génération en cours.";
  const { data, error } = await db.functions.invoke("reprise", { body: { action: "creer" } });
  if (error || !data || !data.code) {
    z.classList.add("erreur");
    z.textContent = "Code non généré : " + ((error && error.message) || "réponse inattendue");
    return;
  }
  const c = data.code;
  z.innerHTML = `Code de reprise : <b class="code-reprise">${esc(c.slice(0, 3))} ${esc(c.slice(3, 6))} ${esc(c.slice(6))}</b>`
    + `<br>Valable ${data.validite_minutes} minutes, une seule fois. Saisissez-le dans le champ de connexion de l'autre appareil.`;
});

sur("puceClimat", "click", () => afficher("jardin"));

/* ================== Feuille de détail ================== */

function ouvrirFeuille(p) {
  $("feuille-titre").innerHTML = esc(p.nom)
    + (p.latin ? `<span class="feuille-latin"><i>${esc(p.latin)}</i>${p.famille ? ` · ${esc(p.famille)}` : ""}</span>` : "");
  $("feuille-corps").innerHTML = ficheHTML(p);
  $("feuille-corps").scrollTop = 0;
  $("voile").hidden = false;
  $("feuille").hidden = false;
  document.body.classList.add("fige");
  requestAnimationFrame(() => {
    $("voile").classList.add("visible");
    $("feuille").classList.add("ouverte");
    $("feuille").focus();
  });
}

function fermerFeuille() {
  if ($("feuille").hidden) return;
  $("voile").classList.remove("visible");
  $("feuille").classList.remove("ouverte");
  document.body.classList.remove("fige");
  setTimeout(() => { $("feuille").hidden = true; $("voile").hidden = true; }, 220);
}

sur("voile", "click", fermerFeuille);
sur("fermerFeuille", "click", fermerFeuille);
document.addEventListener("keydown", e => { if (e.key === "Escape") fermerFeuille(); });

/* ================== Mise en sourdine ================== */





// Une sourdine de quinzaine tombe au changement de quinzaine, une sourdine de
// période tient jusqu'à la fin de la fenêtre, une sourdine définitive ne tombe jamais.
function sourdineActive(p, k) {
  const r = sourdines.get(cleSourdine(p, k));
  if (!r) return null;
  if (r.portee === "toujours") return r;
  if (r.annee !== anneeCourante()) return null;
  if (r.portee === "quinzaine") return r.demi === demi ? r : null;
  if (r.portee === "periode") return demi <= r.fin ? r : null;
  return null;
}

async function mettreEnSourdine(p, k, portee, fin) {
  if (!jardinId) return;
  const ligne = {
    garden_id: jardinId, plant_id: p.id, phase: k, portee,
    demi: portee === "quinzaine" ? demi : null,
    fin: portee === "periode" ? fin : null,
    annee: portee === "toujours" ? null : anneeCourante(),
  };
  sourdines.set(cleSourdine(p, k), ligne);
  rendreTout();
  const { error } = await db.from("sourdines").upsert(ligne, { onConflict: "garden_id,plant_id,phase" });
  if (error) { sourdines.delete(cleSourdine(p, k)); rendreTout(); info("Masquage non enregistré : " + error.message, true); }
}

async function leverSourdine(p, k) {
  const memo = sourdines.get(cleSourdine(p, k));
  sourdines.delete(cleSourdine(p, k));
  rendreTout();
  const { error } = await db.from("sourdines").delete()
    .eq("garden_id", jardinId).eq("plant_id", p.id).eq("phase", k);
  if (error && memo) { sourdines.set(cleSourdine(p, k), memo); rendreTout(); info("Réaffichage refusé : " + error.message, true); }
}

async function leverToutesSourdines(p) {
  const cles = [...sourdines.keys()].filter(c => c.startsWith(p.id + "|"));
  cles.forEach(c => sourdines.delete(c));
  rendreTout();
  const { error } = await db.from("sourdines").delete().eq("garden_id", jardinId).eq("plant_id", p.id);
  if (error) info("Réaffichage refusé : " + error.message, true);
}

/* ================== Glissement latéral ================== */

let glissiereOuverte = null;

function fermerTiroirs() {
  if (!glissiereOuverte) return;
  glissiereOuverte.style.transform = "";
  glissiereOuverte = null;
}

// Tolérance volontairement large : le geste est reconnu dès que l'horizontale
// domine, même de peu, pour rester praticable sur une liste qui défile.
function brancherGlissement(rangee, glissiere, gauche, droite) {
  let x0 = 0, y0 = 0, dx = 0, actif = false, verrouVertical = false;
  const lg = () => gauche ? gauche.offsetWidth : 0;
  const ld = () => droite ? droite.offsetWidth : 0;

  const debut = e => {
    if (glissiereOuverte && glissiereOuverte !== glissiere) fermerTiroirs();
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
    dx = 0; actif = false; verrouVertical = false;
    glissiere.style.transition = "none";
  };

  const bouge = e => {
    if (verrouVertical) return;
    const ex = e.touches[0].clientX - x0, ey = e.touches[0].clientY - y0;
    if (!actif) {
      if (Math.abs(ey) > 16 && Math.abs(ey) > Math.abs(ex) * 1.5) { verrouVertical = true; return; }
      if (Math.abs(ex) < 8) return;
      actif = true;
      rangee.classList.add("en-glissement");
    }
    const base = glissiereOuverte === glissiere ? (dx < 0 ? -lg() : ld()) : 0;
    dx = Math.max(-lg(), Math.min(ld(), base + ex));
    glissiere.style.transform = `translateX(${dx}px)`;
  };

  const fin = () => {
    glissiere.style.transition = "";
    rangee.classList.remove("en-glissement");
    if (!actif) return;
    if (dx < -lg() / 2 && gauche) {
      glissiere.style.transform = `translateX(${-lg()}px)`; glissiereOuverte = glissiere;
    } else if (dx > ld() / 2 && droite) {
      glissiere.style.transform = `translateX(${ld()}px)`; glissiereOuverte = glissiere;
    } else {
      glissiere.style.transform = "";
      if (glissiereOuverte === glissiere) glissiereOuverte = null;
    }
    // Un glissement ne doit pas déclencher l'ouverture de la feuille.
    glissiere.dataset.glisse = "1";
    setTimeout(() => { delete glissiere.dataset.glisse; }, 320);
  };

  glissiere.addEventListener("touchstart", debut, { passive: true });
  glissiere.addEventListener("touchmove", bouge, { passive: true });
  glissiere.addEventListener("touchend", fin);
  glissiere.addEventListener("touchcancel", fin);
}

document.addEventListener("click", e => {
  if (glissiereOuverte && !glissiereOuverte.parentElement.contains(e.target)) fermerTiroirs();
}, true);

function majFiltresMoment() {
  const cles = ORDRE_MAINTENANT.filter(k => phases[k]);
  let n = 0;
  if (cles.length && cles.some(k => !etatPhaseM[k])) n++;
  if (espaceChoisi !== null) n++;
  const e = $("nbFiltresM");
  if (!e) return;
  e.textContent = n;
  e.hidden = n === 0;
  $("basculeFiltresM").setAttribute("aria-pressed", String(n > 0));
}

sur("basculeFiltresM", "click", function () {
  const ouvert = $("corpsFiltresM").hidden;
  $("corpsFiltresM").hidden = !ouvert;
  this.setAttribute("aria-expanded", String(ouvert));
});
