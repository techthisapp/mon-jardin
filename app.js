import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ORDRE = ["abri", "terre", "plant", "floraison", "recolte", "taille", "multiplication"];
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
let categories = [];
let sel = new Set();
let jardinId = null;
let session = null;
let tri = "categorie";
let jardinSeul = false;
let moisChoisi = null;

const etatPhase = {}, etatTypo = {}, etatCat = {};      // écran Mes plantes
const etatTypoP = {}, etatCatP = {};                     // écran Planning
ORDRE.forEach(k => etatPhase[k] = true);

const $ = id => document.getElementById(id);
// Un élément absent ne doit jamais interrompre le chargement du module.
const sur = (id, ev, fn) => { const e = $(id); if (e) e.addEventListener(ev, fn); else console.warn("élément absent :", id); };
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
    db.from("phases").select("*").order("position"),
    db.from("plants_full").select("*").eq("is_active", true),
    db.from("catalog_meta").select("*").single(),
    db.from("climates").select("*").order("position"),
    db.from("climate_phase_shifts").select("*"),
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

async function listerJardins() {
  const { data, error } = await db.from("gardens").select(COL_JARDIN)
    .order("last_opened_at", { ascending: false, nullsFirst: false })
    .order("created_at");
  if (error) { info("Jardins inaccessibles : " + error.message, true); return false; }
  jardins = data || [];
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
  const [rp, rz, ra] = await Promise.all([
    db.from("garden_plants").select("plant_id").eq("garden_id", jardinId),
    db.from("espaces").select("*").eq("garden_id", jardinId).order("position").order("name"),
    db.from("garden_plant_espaces").select("plant_id,espace_id,quantity,notes").eq("garden_id", jardinId),
  ]);
  if (rp.error) { info("Sélection illisible : " + rp.error.message, true); return; }
  sel = new Set((rp.data || []).map(r => r.plant_id));
  espaces = rz.data || [];
  aff = new Map();
  (ra.data || []).forEach(r => {
    if (!aff.has(r.plant_id)) aff.set(r.plant_id, []);
    aff.get(r.plant_id).push(r);
  });
  if (espaceChoisi !== null && espaceChoisi !== "0" && !espaces.some(z => z.id === espaceChoisi)) espaceChoisi = null;
  await chargerAdaptations();
  majCompte(); majJardinUI(); construireChips(); rendreTout();
}

async function chargerAdaptations() {
  adapt = {};
  const g = jardinActif();
  if (!g || !g.climate_key) return;
  const { data } = await db.from("plant_climates").select("plant_id,level,note").eq("climate_key", g.climate_key);
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
const CONFIG = ["selection", "jardin"];
const onglets = [...document.querySelectorAll(".onglet")];
const sousOnglets = [...document.querySelectorAll(".sous-onglet")];
let ecranCourant = "maintenant";
let ecranConfig = "selection";

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
    etatTypo[p.typo] && etatCat[p.cat] && (!q || p.nom.toLowerCase().includes(q)));
}

function carteItem(p) {
  const bloc = document.createElement("div");
  bloc.className = "item-bloc";
  const b = document.createElement("button");
  b.type = "button"; b.className = "item";
  b.setAttribute("aria-pressed", String(sel.has(p.id)));
  const ad = adapt[p.id];
  const marque = ad && ad.level !== "adapte"
    ? `<span class="pastille-niv niv-${ad.level}" title="${esc(NIVEAUX[ad.level].long)}"></span>` : "";
  const sousTitre = tri === "alpha" ? `<span class="cat-mini">${esc(p.cat)}</span>` : "";
  b.innerHTML = `<span class="rond">${CHECK}</span><span>${marque}${esc(p.nom)}${sousTitre}</span>`;
  b.addEventListener("click", () => basculer(p.id));
  bloc.appendChild(b);
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

function rendreSelection() {
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
  categories.forEach(c => {
    const sous = lot.filter(p => p.cat === c);
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
}

sur("rech", "input", rendreSelection);
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

const auj = new Date();
const demi = auj.getMonth() * 2 + (auj.getDate() <= 15 ? 1 : 2);
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
  const base = p.phases[k];
  if (!base) return null;
  const sh = shiftPour(k);
  if (!sh.s && !sh.a) return base;
  return base.map(v => {
    const d = v[0] <= 12 ? sh.s : sh.a;
    return [borne(v[0] + d), borne(v[1] + d)];
  });
}

const NIVEAUX = {
  adapte:      { court: "Adaptée",  long: "Adaptée à ce climat" },
  protection:  { court: "Protéger", long: "Cultivable avec précautions" },
  abri:        { court: "Abri",     long: "Exige un abri ou une rentrée hivernale" },
  deconseille: { court: "Déconseillée", long: "Déconseillée sous ce climat" },
};

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
  const zone = $("maintenant");
  zone.innerHTML = "";
  if (!sel.size) {
    zone.innerHTML = '<p class="vide">Aucune plante retenue. Ouvrez Réglages puis Mes plantes pour indiquer ce que vous cultivez.</p>';
    return;
  }
  const mien = plantes.filter(p => sel.has(p.id) && passeEspace(p));
  let blocs = 0;
  ORDRE.forEach(k => {
    if (!phases[k]) return;
    const lot = mien.filter(p => actif(p, k));
    if (!lot.length) return;
    blocs++;
    const carte = document.createElement("div");
    carte.className = "carte-tache";
    const corps = k === "floraison"
      ? `<div class="puces">${lot.map(p => `<span class="puce">${esc(p.nom)}</span>`).join("")}</div>`
      : lot.map(p => `<div class="action"><b>${esc(p.nom)}</b>${esc(texteAction(p, k))}</div>`).join("");
    carte.innerHTML =
      `<h2><span class="pastille" style="background:${phases[k].color}"></span>${esc(phases[k].label)}`
      + `<span class="nb">${lot.length}</span></h2><div class="corps-tache">${corps}</div>`;
    zone.appendChild(carte);
  });
  if (!blocs) zone.innerHTML = '<p class="vide">Rien à faire en ce moment sur ces plantes. Période de repos ou de simple surveillance.</p>';
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
  let h = "";
  // Un mois sélectionné ne conserve que les périodes qui le recouvrent.
  const h1 = moisChoisi === null ? 0 : moisChoisi * 2 + 1;
  const h2 = moisChoisi === null ? 0 : moisChoisi * 2 + 2;
  ORDRE.forEach(k => {
    let seg = segsDe(p, k);
    if (!seg || !etatPhase[k] || !phases[k]) return;
    if (moisChoisi !== null) {
      seg = seg.filter(v => v[0] <= h2 && v[1] >= h1);
      if (!seg.length) return;
    }
    const v = seg.map(s => {
      const g = (s[0] - 1) / 24 * 100, w = (s[1] - s[0] + 1) / 24 * 100;
      return `<span class="seg" style="left:${g}%;width:${w}%;background:${phases[k].color}" title="${esc(phases[k].label)}"></span>`;
    }).join("");
    h += `<div class="voie">${v}</div>`;
  });
  return h || '<div class="voie"></div>';
}

function ficheHTML(p) {
  const a = p.attr || {};
  const actes = ORDRE.filter(k => p.phases[k] && phases[k]).map(k => {
    const t = texteAction(p, k);
    return t ? `<li><span class="pt" style="background:${phases[k].color}"></span><span><b>${esc(phases[k].label)}.</b> ${esc(t)}</span></li>` : "";
  }).join("");
  const tag = v => v ? `<span class="tag">${esc(v)}</span>` : "";
  const ad = adapt[p.id];
  const tagClim = ad
    ? `<span class="tag niv-${ad.level}" title="${esc(ad.note || NIVEAUX[ad.level].long)}">${esc(NIVEAUX[ad.level].court)}</span>`
    : "";
  const ligne = (t, v) => v ? `<dt>${t}</dt><dd>${esc(v)}</dd>` : "";
  return `<div class="fiche">
    <div class="tags">${tagClim}${tag(a.type || p.cat)}${tag(a.exposition)}${tag(a.rusticite)}</div>
    ${ad && ad.note ? `<p class="note-clim">${esc(ad.note)}</p>` : ""}
    <dl class="carac">
      ${ligne("Famille", a.famille)}${ligne("Hauteur", a.hauteur)}${ligne("Couleur", a.couleur)}
      ${ligne("Parfum", a.parfum)}${ligne("Espacement", p.espacement)}${ligne("Profondeur", p.prof)}
      ${ligne("Arrosage", a.arrosage)}${ligne("Fertilisation", a.fertilisation)}
      ${p.phases.taille ? "" : ligne("Taille", a.taille)}
      ${ligne("Toxicité", a.toxicite)}${ligne("Multiplication", a.multiplication)}
      ${ligne("Associations", p.assoc)}
    </dl>
    ${p.conseil ? `<p class="cgen">${esc(p.conseil)}</p>` : ""}
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
    r.className = "rangee" + (sel.has(p.id) ? " retenue" : "");
    r.innerHTML =
      `<button class="nom-plante" aria-expanded="false">${esc(p.nom)}<small>${esc(p.cat)}</small></button>`
      + `<div class="piste">${segs(p)}</div>` + ficheHTML(p);
    r.querySelector(".nom-plante").addEventListener("click", function () {
      const o = r.classList.toggle("ouverte");
      this.setAttribute("aria-expanded", String(o));
    });
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
  const note = $("note-connexion");
  note.hidden = false;
  note.textContent = error ? "Envoi impossible : " + error.message
                           : "Lien envoyé. Ouvrez votre boîte de réception.";
});

sur("deconnexion", "click", () => db.auth.signOut());

db.auth.onAuthStateChange((_e, s) => {
  session = s;
  const connecte = Boolean(s);
  $("zone-connexion").hidden = connecte;
  $("deconnexion").hidden = !connecte;
  $("utilisateur").textContent = connecte ? s.user.email : "";
  if (!$("etat").classList.contains("erreur")) info("");
  chargerJardin();
});


/* ================== Écran 4 : jardin ================== */

function majJardinUI() {
  const connecte = Boolean(session);
  $("videJardin").hidden = connecte;
  $("bloc-jardin").hidden = !connecte;
  const g = jardinActif();
  const c = g && g.climate_key ? climats[g.climate_key] : null;
  $("tete-climat").textContent = c ? c.label : "Climat non renseigné";

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

const demiEnTexte = d => d === 0 ? "aucun"
  : (d > 0 ? "plus tard de " : "plus tôt de ") + Math.abs(d) + (Math.abs(d) > 1 ? " quinzaines" : " quinzaine");

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
