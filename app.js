import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ORDRE = ["abri", "terre", "plant", "floraison", "recolte", "taille"];
const ORDRE_TYPO = ["Légumes", "Fruits", "Aromatiques", "Ornement"];
const MOIS = ["Janvier","Février","Mars","Avril","Mai","Juin",
              "Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const ABR = ["Janv","Févr","Mars","Avr","Mai","Juin","Juil","Août","Sept","Oct","Nov","Déc"];
const CHECK = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
const CACHE = "monjardin.catalogue.v1";

let phases = {};
let plantes = [];
let sel = new Set();       // identifiants de plantes retenues
let jardinId = null;
let session = null;
let jardinSeul = false;
const etatPhase = {};
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

/* ------------------ Catalogue ------------------ */

async function chargerCatalogue() {
  try {
    const brut = localStorage.getItem(CACHE);
    if (brut) {
      const c = JSON.parse(brut);
      phases = c.phases; plantes = c.plantes;
      rendreTout();
      verifierFraicheur(c.empreinte);
      return;
    }
  } catch (e) { /* cache indisponible, on lit le réseau */ }
  await lireCatalogue();
}

async function lireCatalogue() {
  const [rp, rl, rm] = await Promise.all([
    db.from("phases").select("*").order("position"),
    db.from("plants_full").select("*").eq("is_active", true),
    db.from("catalog_meta").select("*").single(),
  ]);
  if (rp.error || rl.error) {
    info("Catalogue indisponible. Vérifiez la connexion.", true);
    return;
  }
  phases = {};
  rp.data.forEach(p => phases[p.key] = { label: p.label, color: p.color });
  plantes = rl.data
    .map(p => ({
      id: p.id, slug: p.slug, nom: p.name, cat: p.category, typo: p.typology,
      espacement: p.spacing, prof: p.depth, assoc: p.companions, conseil: p.advice,
      attr: p.attributes || {}, phases: p.phases || {}, guide: p.guide || {},
    }))
    .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  try {
    localStorage.setItem(CACHE, JSON.stringify({
      phases, plantes, empreinte: rm.data ? `${rm.data.plant_count}|${rm.data.updated_at}` : "",
    }));
  } catch (e) { /* stockage indisponible */ }
  rendreTout();
}

async function verifierFraicheur(empreinte) {
  const { data } = await db.from("catalog_meta").select("*").single();
  if (data && `${data.plant_count}|${data.updated_at}` !== empreinte) await lireCatalogue();
}

/* ------------------ Jardin ------------------ */

async function chargerJardin() {
  if (!session) { sel = new Set(); majCompte(); rendreTout(); return; }
  const { data: gid, error } = await db.rpc("ensure_garden");
  if (error) { info("Jardin inaccessible : " + error.message, true); return; }
  jardinId = gid;
  const { data, error: e2 } = await db.from("garden_plants").select("plant_id").eq("garden_id", jardinId);
  if (e2) { info("Sélection illisible : " + e2.message, true); return; }
  sel = new Set(data.map(r => r.plant_id));
  majCompte();
  rendreTout();
}

async function basculer(plantId) {
  if (!session) {
    info("Connectez-vous pour enregistrer votre jardin.");
    $("email")?.focus();
    return;
  }
  const present = sel.has(plantId);
  present ? sel.delete(plantId) : sel.add(plantId);
  majCompte(); rendreTout();                       // affichage immédiat
  const req = present
    ? db.from("garden_plants").delete().eq("garden_id", jardinId).eq("plant_id", plantId)
    : db.from("garden_plants").insert({ garden_id: jardinId, plant_id: plantId });
  const { error } = await req;
  if (error) {                                     // retour arrière si le serveur refuse
    present ? sel.add(plantId) : sel.delete(plantId);
    majCompte(); rendreTout();
    info("Modification non enregistrée : " + error.message, true);
  }
}

function majCompte() {
  const t = sel.size ? (sel.size > 1 ? `${sel.size} plantes` : "1 plante") : "aucune plante";
  $("compte").textContent = t + " dans mon jardin";
  $("compte2").textContent = t + " sélectionnée" + (sel.size > 1 ? "s" : "");
}

/* ------------------ Authentification ------------------ */

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

$("deconnexion").addEventListener("click", async () => {
  await db.auth.signOut();
});

db.auth.onAuthStateChange((_e, s) => {
  session = s;
  const connecte = Boolean(s);
  $("zone-connexion").hidden = connecte;
  $("deconnexion").hidden = !connecte;
  $("utilisateur").textContent = connecte ? s.user.email : "";
  info("");
  chargerJardin();
});

/* ------------------ Onglets ------------------ */

const onglets = [...document.querySelectorAll(".onglet")];
onglets.forEach(o => o.addEventListener("click", () => {
  onglets.forEach(x => x.setAttribute("aria-selected", String(x === o)));
  ["selection", "maintenant", "planning"].forEach(n => {
    $("ec-" + n).hidden = (n !== o.dataset.ecran);
  });
  window.scrollTo(0, 0);
}));

/* ------------------ Écran 1 : ma sélection ------------------ */

function rendreSelection() {
  const q = $("rech").value.trim().toLowerCase();
  const zone = $("listes");
  zone.innerHTML = "";
  ORDRE_TYPO.forEach(t => {
    const lot = plantes.filter(p => p.typo === t && (!q || p.nom.toLowerCase().includes(q)));
    if (!lot.length) return;
    const h = document.createElement("p");
    h.className = "groupe-titre"; h.textContent = t;
    zone.appendChild(h);
    const g = document.createElement("div");
    g.className = "liste";
    lot.forEach(p => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "item";
      b.setAttribute("aria-pressed", String(sel.has(p.id)));
      b.innerHTML = `<span class="rond">${CHECK}</span><span>${esc(p.nom)}</span>`;
      b.addEventListener("click", () => basculer(p.id));
      g.appendChild(b);
    });
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

/* ------------------ Écran 2 : en ce moment ------------------ */

const auj = new Date();
const demi = auj.getMonth() * 2 + (auj.getDate() <= 15 ? 1 : 2);
$("dateJour").textContent =
  auj.toLocaleDateString("fr-FR", { weekday:"long", day:"numeric", month:"long", year:"numeric" }) +
  " : " + (auj.getDate() <= 15 ? "première" : "seconde") + " quinzaine de " +
  MOIS[auj.getMonth()].toLowerCase() + ".";

const actif = (p, k) => (p.phases[k] || []).some(s => s[0] <= demi && s[1] >= demi);
const texteAction = (p, k) => k === "taille" ? (p.guide.taille || p.attr.taille || "") : (p.guide[k] || "");

function rendreMaintenant() {
  const zone = $("maintenant");
  zone.innerHTML = "";
  if (!sel.size) {
    zone.innerHTML = '<p class="vide">Aucune plante sélectionnée. Ouvrez l\'onglet Ma sélection pour indiquer ce que vous cultivez.</p>';
    return;
  }
  const mien = plantes.filter(p => sel.has(p.id));
  let blocs = 0;
  ORDRE.forEach(k => {
    const lot = mien.filter(p => actif(p, k));
    if (!lot.length) return;
    blocs++;
    const bloc = document.createElement("div");
    bloc.className = "bloc";
    const corps = k === "floraison"
      ? `<div class="puces">${lot.map(p => `<span class="puce">${esc(p.nom)}</span>`).join("")}</div>`
      : lot.map(p => `<div class="action"><b>${esc(p.nom)}</b>${esc(texteAction(p, k))}</div>`).join("");
    bloc.innerHTML = `<h2><span class="pastille" style="background:${phases[k].color}"></span>${esc(phases[k].label)}</h2>${corps}`;
    zone.appendChild(bloc);
  });
  if (!blocs) zone.innerHTML = '<p class="vide">Rien de particulier à faire en ce moment sur vos plantes. Période de repos ou de simple surveillance.</p>';
}

/* ------------------ Écran 3 : planning ------------------ */

function construireFiltres() {
  const fp = $("filtresPhase");
  fp.innerHTML = "";
  ORDRE.forEach(k => {
    if (!phases[k]) return;
    const b = document.createElement("button");
    b.type = "button"; b.className = "chip";
    b.setAttribute("aria-pressed", String(etatPhase[k]));
    b.innerHTML = `<i class="pastille" style="background:${phases[k].color}"></i>${esc(phases[k].label)}`;
    b.addEventListener("click", () => {
      if (etatPhase[k]) ORDRE.forEach(x => etatPhase[x] = (x === k));
      else etatPhase[k] = true;
      construireFiltres(); rendrePlanning();
    });
    fp.appendChild(b);
  });
  const r = document.createElement("button");
  r.type = "button"; r.className = "lien"; r.textContent = "Tout afficher";
  r.addEventListener("click", () => {
    ORDRE.forEach(x => etatPhase[x] = true);
    construireFiltres(); rendrePlanning();
  });
  fp.appendChild(r);
}

function construireMois() {
  const gm = $("grilleMois");
  if (gm.childElementCount) return;
  MOIS.forEach((m, i) => {
    const d = document.createElement("div");
    d.className = "mois-btn" + (i === auj.getMonth() ? " actuel" : "");
    d.dataset.court = m[0]; d.title = m;
    d.innerHTML = `<span>${ABR[i]}</span>`;
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

function rendrePlanning() {
  const zone = $("rangees");
  zone.innerHTML = "";
  let n = 0;
  plantes.forEach(p => {
    if (jardinSeul && !sel.has(p.id)) return;
    if (!ORDRE.some(k => etatPhase[k] && p.phases[k])) return;
    n++;
    const a = p.attr || {};
    const actes = ORDRE.filter(k => p.phases[k] && phases[k]).map(k => {
      const t = texteAction(p, k);
      return t ? `<li><span class="pt" style="background:${phases[k].color}"></span><span><b>${esc(phases[k].label)}.</b> ${esc(t)}</span></li>` : "";
    }).join("");
    const r = document.createElement("div");
    r.className = "rangee";
    r.innerHTML = `
      <button class="etiquette" aria-expanded="false">${esc(p.nom)}<small>${esc(p.cat)}</small></button>
      <div class="piste">${segs(p)}</div>
      <div class="fiche">
        <div class="tags"><span class="tag">${esc(a.type || p.cat)}</span><span class="tag">${esc(a.exposition || "")}</span><span class="tag">${esc(a.rusticite || "")}</span></div>
        <dl class="carac">
          <dt>Famille</dt><dd>${esc(a.famille || "")}</dd>
          ${a.hauteur ? `<dt>Hauteur</dt><dd>${esc(a.hauteur)}</dd>` : ""}
          ${a.couleur ? `<dt>Couleur</dt><dd>${esc(a.couleur)}</dd>` : ""}
          ${a.parfum ? `<dt>Parfum</dt><dd>${esc(a.parfum)}</dd>` : ""}
          <dt>Espacement</dt><dd>${esc(p.espacement || "")}</dd>
          <dt>Arrosage</dt><dd>${esc(a.arrosage || "")}</dd>
          <dt>Fertilisation</dt><dd>${esc(a.fertilisation || "")}</dd>
          ${p.phases.taille ? "" : `<dt>Taille</dt><dd>${esc(a.taille || "")}</dd>`}
          ${a.toxicite ? `<dt>Toxicité</dt><dd>${esc(a.toxicite)}</dd>` : ""}
          <dt>Associations</dt><dd>${esc(p.assoc || "")}</dd>
        </dl>
        <p class="cgen">${esc(p.conseil || "")}</p>
        <ul class="actes">${actes}</ul>
      </div>`;
    r.querySelector(".etiquette").addEventListener("click", function () {
      const o = r.classList.toggle("ouverte");
      this.setAttribute("aria-expanded", String(o));
    });
    zone.appendChild(r);
  });
  const v = $("videPlanning");
  v.hidden = n > 0;
  v.textContent = (jardinSeul && !sel.size)
    ? "Aucune plante sélectionnée. Ouvrez l'onglet Ma sélection pour composer votre jardin."
    : "Aucune plante ne correspond à ces filtres.";
}

$("filtreJardin").addEventListener("click", function () {
  jardinSeul = !jardinSeul;
  this.setAttribute("aria-pressed", String(jardinSeul));
  rendrePlanning();
});

/* ------------------ Amorçage ------------------ */

function rendreTout() {
  if (!plantes.length) return;
  construireFiltres();
  construireMois();
  rendreSelection();
  rendreMaintenant();
  rendrePlanning();
}

majCompte();
await chargerCatalogue();
const { data: { session: s0 } } = await db.auth.getSession();
if (!s0) { $("zone-connexion").hidden = false; }
