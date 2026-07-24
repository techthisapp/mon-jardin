import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ORDRE = ["abri", "terre", "plant", "floraison", "recolte", "taille"];
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
const CACHE = "monjardin.catalogue.v2";

let phases = {};
let plantes = [];
let categories = [];
let sel = new Set();
let jardinId = null;
let session = null;
let tri = "categorie";
let jardinSeul = false;

const etatPhase = {}, etatTypo = {}, etatCat = {};      // écran Ma sélection
const etatTypoP = {}, etatCatP = {};                     // écran Planning
ORDRE.forEach(k => etatPhase[k] = true);

const $ = id => document.getElementById(id);
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
      phases = c.phases; plantes = c.plantes;
      apresCatalogue();
      verifierFraicheur(c.empreinte);
      return;
    }
  } catch (e) { /* cache indisponible */ }
  await lireCatalogue();
}

async function lireCatalogue() {
  const [rp, rl, rm] = await Promise.all([
    db.from("phases").select("*").order("position"),
    db.from("plants_full").select("*").eq("is_active", true),
    db.from("catalog_meta").select("*").single(),
  ]);
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
      phases, plantes, empreinte: rm.data ? `${rm.data.plant_count}|${rm.data.updated_at}` : "",
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

async function chargerJardin() {
  if (!session) { sel = new Set(); majCompte(); rendreTout(); return; }
  const { data: gid, error } = await db.rpc("ensure_garden");
  if (error) { info("Jardin inaccessible : " + error.message, true); return; }
  jardinId = gid;
  const { data, error: e2 } = await db.from("garden_plants").select("plant_id").eq("garden_id", jardinId);
  if (e2) { info("Sélection illisible : " + e2.message, true); return; }
  sel = new Set(data.map(r => r.plant_id));
  majCompte(); rendreTout();
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
  }
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
  // Écran Ma sélection
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
}

/* ================== Onglets ================== */

const onglets = [...document.querySelectorAll(".onglet")];
onglets.forEach(o => o.addEventListener("click", () => {
  onglets.forEach(x => x.setAttribute("aria-selected", String(x === o)));
  ["selection", "maintenant", "planning"].forEach(n => { $("ec-" + n).hidden = (n !== o.dataset.ecran); });
  window.scrollTo(0, 0);
  if (o.dataset.ecran === "planning") placerMarqueur();
}));

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
  const b = document.createElement("button");
  b.type = "button"; b.className = "item";
  b.setAttribute("aria-pressed", String(sel.has(p.id)));
  const sousTitre = tri === "alpha" ? `<span class="cat-mini">${esc(p.cat)}</span>` : "";
  b.innerHTML = `<span class="rond">${CHECK}</span><span>${esc(p.nom)}${sousTitre}</span>`;
  b.addEventListener("click", () => basculer(p.id));
  return b;
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

$("rech").addEventListener("input", rendreSelection);
$("vider").addEventListener("click", async () => {
  if (!sel.size || !session) return;
  const copie = new Set(sel);
  sel = new Set(); majCompte(); rendreTout();
  const { error } = await db.from("garden_plants").delete().eq("garden_id", jardinId);
  if (error) { sel = copie; majCompte(); rendreTout(); info("Suppression refusée : " + error.message, true); }
});

/* ================== Écran 2 : en ce moment ================== */

const auj = new Date();
const demi = auj.getMonth() * 2 + (auj.getDate() <= 15 ? 1 : 2);
$("dateJour").textContent =
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

const actif = (p, k) => (p.phases[k] || []).some(s => s[0] <= demi && s[1] >= demi);
const texteAction = (p, k) => k === "taille" ? (p.guide.taille || p.attr.taille || "") : (p.guide[k] || "");

function rendreMaintenant() {
  const zone = $("maintenant");
  zone.innerHTML = "";
  if (!sel.size) {
    zone.innerHTML = '<p class="vide">Aucune plante retenue. Ouvrez Ma sélection pour indiquer ce que vous cultivez.</p>';
    return;
  }
  const mien = plantes.filter(p => sel.has(p.id));
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
  if (!blocs) zone.innerHTML = '<p class="vide">Rien à faire en ce moment sur vos plantes. Période de repos ou de simple surveillance.</p>';
}

/* ================== Écran 3 : planning ================== */

function construireMois() {
  const gm = $("grilleMois");
  if (gm.childElementCount) return;
  MOIS.forEach((m, i) => {
    const d = document.createElement("div");
    d.className = "mois-case" + (i === auj.getMonth() ? " en-cours" : "");
    d.dataset.court = m[0];
    d.textContent = ABR[i].toUpperCase();
    d.title = m;
    gm.appendChild(d);
  });
}

function segs(p) {
  let h = "";
  ORDRE.forEach(k => {
    if (!p.phases[k] || !etatPhase[k] || !phases[k]) return;
    const v = p.phases[k].map(s => {
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
  const ligne = (t, v) => v ? `<dt>${t}</dt><dd>${esc(v)}</dd>` : "";
  return `<div class="fiche">
    <div class="tags">${tag(a.type || p.cat)}${tag(a.exposition)}${tag(a.rusticite)}</div>
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
    if (!etatTypoP[p.typo] || !etatCatP[p.cat]) return false;
    return ORDRE.some(k => etatPhase[k] && p.phases[k]);
  });
  $("bilanPlan").textContent = `${lot.length} sur ${plantes.length} affichées`;

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
    ? "Aucune plante retenue. Ouvrez Ma sélection pour composer votre jardin."
    : "Aucune plante ne correspond à ces filtres.";
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

$("filtreJardin").addEventListener("click", function () {
  jardinSeul = !jardinSeul;
  this.setAttribute("aria-pressed", String(jardinSeul));
  rendrePlanning();
});

/* ================== Authentification ================== */

$("form-connexion").addEventListener("submit", async e => {
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

$("deconnexion").addEventListener("click", () => db.auth.signOut());

db.auth.onAuthStateChange((_e, s) => {
  session = s;
  const connecte = Boolean(s);
  $("zone-connexion").hidden = connecte;
  $("deconnexion").hidden = !connecte;
  $("utilisateur").textContent = connecte ? s.user.email : "";
  info("");
  chargerJardin();
});

/* ================== Amorçage ================== */

function rendreTout() {
  if (!plantes.length) return;
  rendreSelection();
  rendreMaintenant();
  rendrePlanning();
}

window.addEventListener("resize", placerMarqueur);
majCompte();
await chargerCatalogue();
const { data: { session: s0 } } = await db.auth.getSession();
if (!s0) $("zone-connexion").hidden = false;
