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
const CACHE = "monjardin.catalogue.v6";

let phases = {};
let plantes = [];
let saison = {};
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
// Position de lecture de l'écran du moment : null pour la vue d'ensemble,
// { t:"tache", k } pour une tâche ouverte, { t:"tout" } pour la liste complète.
// L'état voyage dans l'historique, le geste de retour du téléphone ramène donc
// à la vue d'ensemble.
let vueDetail = null;
let scrollEnsemble = 0;
let obsSections = null;
/* Vigilance météorologique. Les identifiants d'aléa et les couleurs suivent le
   descriptif technique de Météo-France. Le vert n'est pas une alerte, il ne
   s'affiche pas. */
const ALEA = { 1: "vent violent", 2: "pluie et inondation", 3: "orages", 4: "crues",
  5: "neige et verglas", 6: "canicule", 7: "grand froid", 8: "avalanches",
  9: "vagues et submersion" };
const VIGI_NOM = { 2: "jaune", 3: "orange", 4: "rouge" };
// Ce que chaque aléa demande au jardin, dit en une consigne.
const VIGI_GESTE = {
  1: "tuteurer, rentrer les potées et les voiles",
  2: "dégager les écoulements, surélever les semis en godets",
  3: "rentrer ce qui peut voler, la grêle abîme le feuillage",
  4: "ne pas travailler les parcelles basses",
  5: "voiler les cultures fragiles, secouer la neige des branches",
  6: "arroser tôt, ombrer les jeunes plants, pailler",
  7: "protéger les souches et les potées, l'eau du sol gèle",
  8: "",
  9: "rentrer le mobilier, l'embrun brûle le feuillage",
};
let vigilance = [];

// Département d'un code postal. Outre-mer sur trois chiffres, Corse sur deux lettres.
const departementDe = cp => {
  const v = String(cp || "");
  if (v.length < 2) return null;
  if (v.startsWith("97") || v.startsWith("98")) return v.slice(0, 3);
  return v.slice(0, 2);
};

// Coefficient cultural moyen du jardin par quinzaine, et mesures du jardinier.
let kcParQuinzaine = {};
let releves = new Map();
// Pluie mesurée au poste rattaché au jardin, et signalement du poste.
let pluieStation = new Map();
let station = null;

/* Réserve utile du sol, en millimètres par mètre de profondeur. Milieux des
   fourchettes du tableau 19 du bulletin FAO 56, recoupées par les capacités de
   rétention publiées par l'université de Californie : sableux 55 à 105,
   limoneux 130 à 180, argileux 130 à 200. */
const RESERVE_SOL = { sableux: 80, limoneux: 155, argileux: 165 };
const SOL_LIBELLE = { sableux: "Sableux", limoneux: "Limoneux", argileux: "Argileux" };
// Profondeur de référence de la zone racinaire du potager, en mètres. Le tableau
// 22 du même bulletin place les légumes de plein champ entre 0,3 et 0,6 mètre.
const ZR_M = 0.40;
// Fraction de la réserve épuisable sans contrainte, valeur du tableau 22 pour la
// tomate, entre la laitue à 0,30 et le concombre à 0,50.
const P_BASE = 0.40;
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

/* Tracés repris de la maquette, sans retouche. */

const GLF = {
  "abri": "<path d=\"M2.6 16.4h14.8\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\"/><path d=\"M4.4 16.4a5.6 5.6 0 0 1 11.2 0\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\"/><path d=\"M10 16.4v-3.8\" stroke=\"currentColor\" stroke-width=\"1.4\" stroke-linecap=\"round\"/><path d=\"M10 13.6c0-1.7-1.3-3-3-3 0 1.7 1.3 3 3 3z\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.3\" stroke-linejoin=\"round\"/>",
  "semis": "<path d=\"M2.4 15.2h15.2\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\"/><ellipse cx=\"6.2\" cy=\"8.6\" rx=\"1.8\" ry=\"2.4\" transform=\"rotate(-22 6.2 8.6)\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.35\"/><ellipse cx=\"10\" cy=\"5.2\" rx=\"1.8\" ry=\"2.4\" transform=\"rotate(8 10 5.2)\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.35\"/><ellipse cx=\"13.8\" cy=\"9\" rx=\"1.8\" ry=\"2.4\" transform=\"rotate(26 13.8 9)\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.35\"/>",
  "plant": "<path d=\"M2.4 16.4h15.2\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\"/><path d=\"M10 16.4V7.4\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\"/><path d=\"M10 9.6C10 6.8 8 4.8 5.2 4.8c0 2.8 2 4.8 4.8 4.8z\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.4\" stroke-linejoin=\"round\"/><path d=\"M10 11.4c0-2.4 1.8-4.2 4.2-4.2 0 2.4-1.8 4.2-4.2 4.2z\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.4\" stroke-linejoin=\"round\"/>",
  "bouture": "<path d=\"M1.4 17.0h6.6M12.0 17.0h6.6\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\"/><path d=\"M4.8 17.0V8.6\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\"/><path d=\"M4.8 11.0C4.8 8.8 3.0 7.0 0.8 7.0c0 2.2 1.8 4.0 4.0 4.0z\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.3\" stroke-linejoin=\"round\"/><path d=\"M4.8 9.0c0-1.6 1.3-2.9 2.9-2.9 0 1.6-1.3 2.9-2.9 2.9z\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.25\" stroke-linejoin=\"round\"/><path d=\"M15.2 17.0V8.6\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\"/><path d=\"M15.2 11.0c0-2.2 1.8-4.0 4.0-4.0 0 2.2-1.8 4.0-4.0 4.0z\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.3\" stroke-linejoin=\"round\"/><path d=\"M15.2 9.0c0-1.6-1.3-2.9-2.9-2.9 0 1.6 1.3 2.9 2.9 2.9z\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.25\" stroke-linejoin=\"round\"/>",
  "secateur": "<path d=\"M4.4 0.5C6.4 2.1 8.0 4.2 9.2 6.6L5.6 6.7C5.2 4.6 4.7 2.5 4.4 0.5Z\" fill=\"currentColor\"/><path d=\"M0.2 2.4C1.4 4.8 3.2 6.9 5.5 8.4L4.2 10.5C1.9 8.8 0.6 5.9 0.2 2.4Z\" fill=\"currentColor\"/><path d=\"M4.6 6.5L10.5 6.1L10.5 10.5L5.6 10.6Z M5.6 9.8L8.6 9.8L9.0 12.4L6.2 12.8Z M6.65 8.2a0.95 0.95 0 1 0 1.9 0a0.95 0.95 0 1 0 -1.9 0Z\" fill=\"currentColor\" fill-rule=\"evenodd\"/><path d=\"M10.5 5.8h1.8v5.0h-1.8z\" fill=\"currentColor\"/><path d=\"M12.6 7.6C15.4 7.8 17.6 8.6 18.9 10.0\" stroke=\"currentColor\" stroke-width=\"2.8\" stroke-linecap=\"round\" fill=\"none\"/><path d=\"M7.4 12.0C8.4 14.4 9.5 16.6 10.6 18.6\" stroke=\"currentColor\" stroke-width=\"2.8\" stroke-linecap=\"round\" fill=\"none\"/>",
  "engrais": "<path d=\"M2.6 16.6h14.8\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\"/><path d=\"M4.6 16.6c0-3 2.4-5.4 5.4-5.4s5.4 2.4 5.4 5.4z\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linejoin=\"round\"/><circle cx=\"6.3\" cy=\"6.6\" r=\"1.15\" fill=\"currentColor\"/><circle cx=\"10\" cy=\"4.3\" r=\"1.15\" fill=\"currentColor\"/><circle cx=\"13.7\" cy=\"7\" r=\"1.15\" fill=\"currentColor\"/>",
  "flocon": "<path d=\"M10 1.8v16.4M2.9 5.9l14.2 8.2M17.1 5.9 2.9 14.1\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\"/><path d=\"M10 5.4 8.1 3.5M10 5.4l1.9-1.9M10 14.6l-1.9 1.9M10 14.6l1.9 1.9\" stroke=\"currentColor\" stroke-width=\"1.3\" stroke-linecap=\"round\"/><path d=\"M5.2 7.2 4.5 4.6M5.2 7.2 2.6 7.9M14.8 12.8l.7 2.6M14.8 12.8l2.6.7\" stroke=\"currentColor\" stroke-width=\"1.3\" stroke-linecap=\"round\"/><path d=\"M14.8 7.2l.7-2.6M14.8 7.2l2.6.7M5.2 12.8l-.7 2.6M5.2 12.8l-2.6.7\" stroke=\"currentColor\" stroke-width=\"1.3\" stroke-linecap=\"round\"/>",
  "ombrage": "<circle cx=\"10\" cy=\"7.4\" r=\"3.2\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\"/><path d=\"M10 1.6v1.8M4.6 2.6l1.3 1.3M15.4 2.6l-1.3 1.3M2 7.4h1.8M16.2 7.4H18\" stroke=\"currentColor\" stroke-width=\"1.4\" stroke-linecap=\"round\"/><path d=\"M2.8 14.4h14.4\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\"/><path d=\"M5.6 17.4l1.6-2.4M10 17.4l1.6-2.4M14.4 17.4l1.6-2.4\" stroke=\"currentColor\" stroke-width=\"1.25\" stroke-linecap=\"round\"/>",
  "fleur": "<g fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.35\"><ellipse cx=\"10\" cy=\"5.1\" rx=\"1.9\" ry=\"3\"/><ellipse cx=\"14.66\" cy=\"8.49\" rx=\"1.9\" ry=\"3\" transform=\"rotate(72 14.66 8.49)\"/><ellipse cx=\"12.88\" cy=\"13.96\" rx=\"1.9\" ry=\"3\" transform=\"rotate(144 12.88 13.96)\"/><ellipse cx=\"7.12\" cy=\"13.96\" rx=\"1.9\" ry=\"3\" transform=\"rotate(216 7.12 13.96)\"/><ellipse cx=\"5.34\" cy=\"8.49\" rx=\"1.9\" ry=\"3\" transform=\"rotate(288 5.34 8.49)\"/></g><circle cx=\"10\" cy=\"10\" r=\"1.9\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\"/>",
  "panier": "<path d=\"M2.8 8h14.4l-1.5 8.2a1.8 1.8 0 0 1-1.8 1.5H6.1a1.8 1.8 0 0 1-1.8-1.5z\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.55\" stroke-linejoin=\"round\"/><path d=\"M6.6 8a3.4 3.4 0 0 1 6.8 0\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.4\"/><path d=\"M7.6 11.2v3.4M10 11.2v3.4M12.4 11.2v3.4\" stroke=\"currentColor\" stroke-width=\"1.2\" stroke-linecap=\"round\"/>",
};

const MOTIF = {
  "arbre": "<path d=\"M100 22c23 0 42 12 48 29 17 4 28 19 28 36 0 23-19 40-44 40H68c-25 0-44-17-44-40 0-17 11-32 28-36 6-17 25-29 48-29z\" opacity=\".13\"/><path d=\"M100 40c16 0 30 9 34 21 12 3 20 13 20 26 0 16-14 28-32 28H78c-18 0-32-12-32-28 0-13 8-23 20-26 4-12 18-21 34-21z\" opacity=\".07\"/><path d=\"M93 120h14v70a7 7 0 0 1-14 0z\" opacity=\".22\"/><path d=\"M100 152l-24-18 5-7 19 15 19-15 5 7z\" opacity=\".18\"/>",
  "fruit": "<path d=\"M100 34c35 0 61 25 61 56 0 33-27 58-61 58s-61-25-61-58c0-31 26-56 61-56z\" opacity=\".12\"/><path d=\"M100 52c22 0 39 17 39 39 0 23-17 40-39 40s-39-17-39-40c0-22 17-39 39-39z\" opacity=\".07\"/><path d=\"M96 138h9v52h-9z\" opacity=\".20\"/><path d=\"M100 168l-20-16 4-6 16 13 16-13 4 6z\" opacity=\".16\"/><circle cx=\"76\" cy=\"126\" r=\"9.5\" opacity=\".23\"/><circle cx=\"126\" cy=\"104\" r=\"9.5\" opacity=\".23\"/><circle cx=\"103\" cy=\"146\" r=\"8\" opacity=\".21\"/>",
  "ornement": "<g opacity=\".12\"><ellipse cx=\"104\" cy=\"42\" rx=\"17\" ry=\"30\"/><ellipse cx=\"139\" cy=\"61\" rx=\"17\" ry=\"30\" transform=\"rotate(60 139 61)\"/><ellipse cx=\"139\" cy=\"99\" rx=\"17\" ry=\"30\" transform=\"rotate(120 139 99)\"/><ellipse cx=\"104\" cy=\"118\" rx=\"17\" ry=\"30\"/><ellipse cx=\"69\" cy=\"99\" rx=\"17\" ry=\"30\" transform=\"rotate(60 69 99)\"/><ellipse cx=\"69\" cy=\"61\" rx=\"17\" ry=\"30\" transform=\"rotate(120 69 61)\"/></g><circle cx=\"104\" cy=\"80\" r=\"19\" opacity=\".23\"/><path d=\"M99 98h10v92H99z\" opacity=\".17\"/><path d=\"M104 158c-33-6-51-29-51-53 33 2 51 25 51 53z\" opacity=\".11\"/>",
  "legume": "<path d=\"M100 192c-40-8-64-40-64-78 0-22 10-40 24-50 0 34 8 76 40 128z\" opacity=\".10\"/><path d=\"M100 192c40-8 64-40 64-78 0-22-10-40-24-50 0 34-8 76-40 128z\" opacity=\".10\"/><path d=\"M100 192c-18-26-28-60-28-92 0-24 10-44 28-56 18 12 28 32 28 56 0 32-10 66-28 92z\" opacity=\".17\"/><path d=\"M96 34h9v22h-9z\" opacity=\".23\"/>",
  "aromatique": "<path d=\"M96 44h9v146h-9z\" opacity=\".19\"/><g opacity=\".12\"><ellipse cx=\"60\" cy=\"84\" rx=\"34\" ry=\"16\" transform=\"rotate(-24 60 84)\"/><ellipse cx=\"141\" cy=\"106\" rx=\"34\" ry=\"16\" transform=\"rotate(24 141 106)\"/><ellipse cx=\"62\" cy=\"134\" rx=\"30\" ry=\"14\" transform=\"rotate(-24 62 134)\"/><ellipse cx=\"139\" cy=\"154\" rx=\"30\" ry=\"14\" transform=\"rotate(24 139 154)\"/></g>",
};

const MOTIF_SPAN = {
  "arbre": [22, 190],
  "fruit": [34, 190],
  "ornement": [12, 190],
  "legume": [34, 192],
  "aromatique": [44, 190],
};

const FLEUR = {
  "blanc": ["#ffffff", "#a8a498"],
  "creme": ["#fdf6e3", "#b5ac8c"],
  "beige": ["#e8dcc0", "#c3b48c"],
  "jaune": ["#f2c018", "#c99a00"],
  "orange": ["#ee8b2b", "#c56a12"],
  "rouge": ["#d33d3d", "#a52a2a"],
  "rose": ["#e88bb0", "#c4638a"],
  "mauve": ["#b58ad4", "#8f66ae"],
  "violet": ["#7a5cc4", "#5b3fa0"],
  "pourpre": ["#8c3f6b", "#6d2d52"],
  "bleu": ["#4f8fd8", "#2f6cb0"],
  "vert": ["#6aa84f", "#4d7f38"],
  "brun": ["#8a6a4a", "#6b5037"],
  "noir": ["#3a3a38", "#1c1c1a"],
  "multicolore": ["#d9a6c9", "#a97a9a"],
};

const TEINTE = {
  "abri": "#9cbf3a",
  "terre": "#22a352",
  "plant": "#0f9187",
  "multiplication": "#1f6b46",
  "taille": "#3f7fd0",
  "fertilisation": "#7d5ad4",
  "protection": "#59b4d8",
  "protection_ete": "#1f4f8f",
  "floraison": "#d96aa8",
  "recolte": "#eb6834",
};

// La couleur d'une tâche vient de la palette validée, non de la base : elle est
// la même dans la synthèse, la liste, les filtres et la frise.
const teinteK = k => TEINTE[k] || ((phases[k] || {}).color) || "#4C8C3F";

const GJ = {
  "soleil": "<circle cx=\"10\" cy=\"10\" r=\"4\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\"/><path d=\"M10 1.5v2.5M10 16v2.5M1.5 10H4M16 10h2.5M4 4l1.8 1.8M14.2 14.2 16 16M16 4l-1.8 1.8M5.8 14.2 4 16\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\"/>",
  "goutte": "<path d=\"M10 2.4c3.5 4 5.5 6.8 5.5 9.3a5.5 5.5 0 0 1-11 0c0-2.5 2-5.3 5.5-9.3z\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linejoin=\"round\"/>",
  "butineur": "<ellipse cx=\"10\" cy=\"12.2\" rx=\"3.6\" ry=\"4.4\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\"/><path d=\"M6.6 11.2h6.8M7 14h6\" stroke=\"currentColor\" stroke-width=\"1.4\"/><path d=\"M7.5 8.2C5.1 5.6 2.3 6.4 2.8 8.7c.4 1.9 2.8 2.5 4.7 1.3z\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linejoin=\"round\"/><path d=\"M12.5 8.2c2.4-2.6 5.2-1.8 4.7.5-.4 1.9-2.8 2.5-4.7 1.3z\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linejoin=\"round\"/><path d=\"M8.8 7.4 8 5.3M11.2 7.4 12 5.3\" stroke=\"currentColor\" stroke-width=\"1.4\" stroke-linecap=\"round\"/>",
  "flocon": "<path d=\"M10 1.8v16.4M2.9 5.9l14.2 8.2M17.1 5.9 2.9 14.1\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\"/><path d=\"M10 5.4 8.1 3.5M10 5.4l1.9-1.9M10 14.6l-1.9 1.9M10 14.6l1.9 1.9\" stroke=\"currentColor\" stroke-width=\"1.4\" stroke-linecap=\"round\"/><path d=\"M5.2 7.2 4.5 4.6M5.2 7.2 2.6 7.9M14.8 12.8l.7 2.6M14.8 12.8l2.6.7\" stroke=\"currentColor\" stroke-width=\"1.4\" stroke-linecap=\"round\"/><path d=\"M14.8 7.2l.7-2.6M14.8 7.2l2.6.7M5.2 12.8l-.7 2.6M5.2 12.8l-2.6.7\" stroke=\"currentColor\" stroke-width=\"1.4\" stroke-linecap=\"round\"/>",
};

const ADJ = {
  "blanc": "blanches",
  "creme": "crème",
  "beige": "beiges",
  "jaune": "jaunes",
  "orange": "orange",
  "rouge": "rouges",
  "rose": "roses",
  "mauve": "mauves",
  "violet": "violettes",
  "pourpre": "pourpres",
  "bleu": "bleues",
  "vert": "vertes",
  "brun": "brunes",
  "noir": "noires",
  "multicolore": "multicolores",
};

const PHF = {
  "abri": ["Semis à l'abri", "place", "abri"],
  "terre": ["Semis en pleine terre", "place", "semis"],
  "plant": ["Plantation", "place", "plant"],
  "multiplication": ["Multiplication", "place", "bouture"],
  "taille": ["Taille", "tend", "secateur"],
  "fertilisation": ["Fertilisation", "tend", "engrais"],
  "protection": ["Protection hiver", "tend", "flocon"],
  "protection_ete": ["Protection été", "tend", "ombrage"],
  "floraison": ["Floraison", "yield", "fleur"],
  "recolte": ["Récolte", "yield", "panier"],
};

const ORDRE_FICHE = ["abri", "terre", "plant", "multiplication", "taille",
  "fertilisation", "protection", "protection_ete", "floraison", "recolte"];
const ETATS_FICHE = ["floraison"];
const MOIS_ABR = ["janv","févr","mars","avr","mai","juin","juil","août","sept","oct","nov","déc"];
const MOIS_PLEIN = ["janvier","février","mars","avril","mai","juin","juillet","août",
  "septembre","octobre","novembre","décembre"];

const PIPS_EXPO = { soleil: 3, soleil_mi_ombre: 3, mi_ombre: 2, mi_ombre_ombre: 2, ombre: 1 };
const PIPS_EAU  = { faible: 1, modere: 2, regulier: 3, soutenu: 3 };
const PIPS_BUT  = { nul: 0, faible: 1, moyen: 2, fort: 3 };
const MOTIF_TYPO = { "Ornement": "ornement", "Aromatiques": "aromatique", "Légumes": "legume" };

// Une fenêtre peut être à cheval sur le 1er janvier, sa borne de début dépasse
// alors sa borne de fin. Tout test d'appartenance passe par ici.
const dansFenetre = (q, s, e) => (s <= e ? (q >= s && q <= e) : (q >= s || q <= e));

const demiTexte = q => (q % 2 ? "début " : "fin ") + MOIS_PLEIN[Math.ceil(q / 2) - 1];

// Motif de typologie, agrandi puis fondu : il tient lieu d'illustration sans
// prétendre représenter l'espèce.

// Un verbe par tâche, pour écrire la synthèse d'accueil en phrases.
// La multiplication prend le verbe exact du mode porté par la fiche.
const VERBE = {
  taille: "Tailler", fertilisation: "Amender", recolte: "Récolter",
  abri: "Semer à l'abri", terre: "Semer", plant: "Planter",
  protection: "Protéger", protection_ete: "Ombrer", multiplication: "Multiplier",
};
const VERBE_MULTI = {
  division: "Diviser", tubercule: "Diviser", bouture: "Bouturer",
  marcotte: "Marcotter", greffe: "Greffer", semis: "Semer",
  spontanee: "Laisser se ressemer",
};
const verbeDe = (p, k) => k === "multiplication"
  ? (VERBE_MULTI[p.propagation] || VERBE.multiplication) : VERBE[k];

// « la glycine », « l'ail », « le pommier ». Sans article connu, le nom seul.
function nomAvecArticle(p) {
  const nom = p.nom.split(",")[0].toLowerCase();
  if (!p.article) return nom;
  return p.article === "l'" ? "l'" + nom : p.article + " " + nom;
}

// Trois plantes nommées, puis le compte : au delà, la synthèse redevient une liste.
function enumerer(noms, max) {
  const n = max || 3;
  const vus = noms.slice(0, n), reste = noms.length - vus.length;
  let t = vus.length > 1 ? vus.slice(0, -1).join(", ") + " et " + vus[vus.length - 1] : vus[0];
  if (reste) t = vus.join(", ") + " et " + reste + " autre" + (reste > 1 ? "s" : "");
  return t;
}

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

/* ================== Glossaire du métier ==================
   Le référentiel emploie des mots précis, canne, collet, éclat, praliner. Les
   gloser dans chaque texte alourdirait la lecture. Ils sont repérés dans les
   textes de la fiche, leur définition s'ouvre au toucher. */
const LETTRE_FR = "A-Za-zÀ-ÖØ-öø-ÿŒœ";
let glossaire = [];
let regGloss = null;
let gloseOuverte = null;
const formeGloss = new Map();
const defGloss = new Map();

/* Une seule expression pour tout le vocabulaire, les formes les plus longues en
   tête pour que « porte-greffe » l'emporte sur « greffe ». Le mot est borné par
   des caractères qui ne sont ni lettre ni trait d'union, la limite de mot des
   expressions régulières ignorant les lettres accentuées. */
function compilerGlossaire() {
  formeGloss.clear(); defGloss.clear();
  const formes = [];
  glossaire.forEach(g => {
    defGloss.set(g.terme, g.definition);
    [g.terme].concat(g.variantes || []).forEach(f => {
      formeGloss.set(String(f).toLowerCase(), g.terme);
      formes.push(String(f));
    });
  });
  formes.sort((a, b) => b.length - a.length);
  const motif = formes.map(f => f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  regGloss = formes.length
    ? new RegExp(`(^|[^${LETTRE_FR}-])(${motif})(?![${LETTRE_FR}-])`, "gi")
    : null;
}

// Texte échappé, dont les termes du glossaire deviennent touchables.
function marquerTermes(txt) {
  const t = esc(txt);
  if (!regGloss || !t) return t;
  return t.replace(regGloss, (m, avant, mot) => {
    const terme = formeGloss.get(mot.toLowerCase());
    return terme
      ? `${avant}<button type="button" class="terme" data-terme="${esc(terme)}">${mot}</button>`
      : m;
  });
}

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
      saison = c.saison || {};
      apresCatalogue();
      verifierFraicheur(c.empreinte);
      return;
    }
  } catch (e) { /* cache indisponible */ }
  await lireCatalogue();
}

async function lireCatalogue() {
  const [rp, rl, rm, rc, rs, rv] = await Promise.all([
    avecReprise(() => db.from("phases").select("*").order("position")),
    avecReprise(() => db.from("plants_full").select("*").eq("is_active", true)),
    avecReprise(() => db.from("catalog_meta").select("*").single()),
    avecReprise(() => db.from("climates").select("*").order("position")),
    avecReprise(() => db.from("climate_phase_shifts").select("*")),
    avecReprise(() => db.from("saison_vegetation").select("*")),
  ]);
  climats = {}; shifts = {}; saison = {};
  (rv.data || []).forEach(v => saison[v.climate_key] = v);
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
    guide_periode: p.guide_periode || {},
    latin: p.latin || "", famille: p.family || "",
    // colonnes lues par la fiche détaillée
    port: p.habit || "", expo: p.exposure || "", eauNiv: p.water_need || "",
    nectar: p.nectar || "", pollen: p.pollen || "", gel: p.frost_min_c,
    hmin: p.height_min_cm, hmax: p.height_max_cm,
    couleurs: p.flower_colors || [], pic: p.floraison_pic_q, picNote: p.floraison_pic_note || "",
    article: p.nom_article || "", propagation: p.propagation || "",
  })).sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  try {
    localStorage.setItem(CACHE, JSON.stringify({
      phases, plantes, climats, shifts, saison, empreinte: rm.data ? `${rm.data.plant_count}|${rm.data.updated_at}` : "",
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

const COL_JARDIN = "id,name,climate_key,altitude,last_opened_at,code_postal,commune,lat,lon,sol_texture,station_num";
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
  await lireEauDuJour(cle);
  await Promise.all([lireReleves(), lireStation(), lireVigilance()]);
  majCompte(); majJardinUI(); construireChips(); rendreTout();
  // La météo arrive après le premier rendu : la synthèse doit être refaite,
  // son pied porte la décision d'arrosage tirée du bilan du sol.
  lireMeteo(jardinActif()).then(() => rendreMaintenant());
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
    couleur: k => teinteK(k),
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
    couleur: k => teinteK(k),
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
  // Changer d'écran principal rend la vue d'ensemble, jamais une tâche ouverte.
  if (vueDetail !== null) { vueDetail = null; rendreMaintenant(); }
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
    + (ad ? jaugeClim(ad.level, ad.note) : "")
    + `<span class="voir-fiche" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></span>`;
  // Le rond coche, le nom ouvre la fiche : deux gestes sur la même rangée.
  b.addEventListener("click", ev => {
    if (ev.target.closest(".rond")) { basculer(p.id); return; }
    ouvrirFeuille(p);
  });
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

// Douze traits pour l'année, un seul plein : la position se lit sans lire.
function construireRegle() {
  const r = $("regleAnnee");
  if (r.childElementCount) return;
  MOIS.forEach((m, i) => {
    const d = document.createElement("i");
    d.className = i < auj.getMonth() ? "passe" : i === auj.getMonth() ? "ici" : "";
    d.title = m;
    r.appendChild(d);
  });
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
    // L'identifiant de la fenêtre suit le décalage : c'est lui qui rattache
    // la période à son conseil propre.
    return [borne(v[0] + d), borne(v[1] + d), v[2], v[3]];
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

const actif = (p, k) => (segsDe(p, k) || []).some(v => dansFenetre(demi, v[0], v[1]));
/* Le conseil de la période en cours l'emporte sur celui de la tâche entière.
   Une plante taillée deux fois dans l'année ne reçoit pas le texte d'hiver au
   mois d'août. */
const conseilPeriode = (p, k) => {
  const g = p.guide_periode;
  if (!g) return "";
  const seg = (segsDe(p, k) || []).find(v => dansFenetre(demi, v[0], v[1]));
  return seg && seg[3] !== undefined && seg[3] !== null ? (g[seg[3]] || "") : "";
};

const texteAction = (p, k) => conseilPeriode(p, k)
  || (k === "taille" ? (p.guide.taille || p.attr.taille || "")
    : k === "multiplication" ? (p.guide.multiplication || p.attr.multiplication || "")
    : (p.guide[k] || ""));

function majNiveau() {
  const ouvert = vueDetail !== null;
  $("vueEnsemble").hidden = ouvert;
  $("niveauDetail").hidden = !ouvert;
  const tm = $("teteMeteo");
  if (tm && tm.innerHTML) tm.hidden = ouvert;
}

function ouvrirDetail(d) {
  if (vueDetail === null) scrollEnsemble = window.scrollY;
  vueDetail = d;
  try { history.pushState({ detail: d }, ""); } catch (e) { /* historique indisponible */ }
  rendreMaintenant();
  window.scrollTo(0, 0);
}

function revenirEnsemble() {
  if (history.state && history.state.detail) { history.back(); return; }
  vueDetail = null;
  rendreMaintenant();
  window.scrollTo(0, scrollEnsemble);
}

// La feuille pose son entrée d'historique par-dessus le niveau courant, qu'elle
// conserve : refermer la feuille rend la tâche ouverte, non la vue d'ensemble.
function poserEtatFeuille() {
  if (history.state && history.state.feuille) return;
  try { history.pushState({ detail: vueDetail, feuille: true }, ""); }
  catch (e) { /* historique indisponible */ }
}

// L'historique fait foi : l'affichage se remet dans l'état de l'entrée courante.
window.addEventListener("popstate", () => {
  const e = history.state || {};
  if (!e.feuille) fermerFeuille();
  const avant = vueDetail;
  vueDetail = e.detail || null;
  if (avant === vueDetail) return;
  rendreMaintenant();
  window.scrollTo(0, vueDetail ? 0 : scrollEnsemble);
});

function rendreMaintenant() {
  appliquerSaison();
  const zone = $("maintenant");
  zone.innerHTML = "";
  $("barreNiveau").innerHTML = "";
  $("pagerTache").innerHTML = "";
  $("zoneMasquees").innerHTML = "";
  $("videMoment").innerHTML = "";
  if (obsSections) { obsSections.disconnect(); obsSections = null; }

  if (!sel.size) {
    vueDetail = null; majNiveau();
    $("synthese").hidden = true;
    $("piedVue").hidden = true;
    $("videMoment").innerHTML = '<p class="vide">Aucune plante retenue. Ouvrez Réglages puis Mes plantes pour indiquer ce que vous cultivez.</p>';
    return;
  }
  const mien = plantes.filter(p => sel.has(p.id) && passeEspace(p));

  const MOIS_LONGS = ["janvier","février","mars","avril","mai","juin",
    "juillet","août","septembre","octobre","novembre","décembre"];
  const bornePrint = h => (h % 2 ? "mi-" : "fin ") + MOIS_LONGS[Math.ceil(h / 2) - 1];

  const finFenetre = (p, k) => {
    const seg = (segsDe(p, k) || []).find(v => dansFenetre(demi, v[0], v[1]));
    return seg ? seg[1] : 99;
  };
  const etatFenetre = (p, k) => {
    if (k === "floraison") return "";
    const seg = (segsDe(p, k) || []).find(v => dansFenetre(demi, v[0], v[1]));
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
      ? `<span class="pt" style="background:${teinteK(k)}"></span>${esc(phases[k].label)}`
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
  const muettesPar = {};
  ORDRE_MAINTENANT.forEach(k => {
    if (!phases[k] || !etatPhaseM[k]) return;
    mien.filter(p => actif(p, k)).forEach(p => {
      const muet = Boolean(sourdineActive(p, k));
      if (muet) { muettes++; muettesPar[k] = (muettesPar[k] || 0) + 1; }
      if (!muet || voirSourdines) paires.push({ p, k, muet });
    });
  });

  if (!paires.length) {
    vueDetail = null; majNiveau();
    $("bilanMoment").innerHTML = "";
    $("synthese").hidden = true;
    $("piedVue").hidden = true;
    majFiltresMoment();
    $("videMoment").innerHTML = '<div class="vide-soigne">'
      + '<svg viewBox="0 0 1024 1024" aria-hidden="true">'
      + '<path d="M 512 824 C 512 720 512 660 512 470" fill="none" stroke="currentColor" stroke-width="52" stroke-linecap="round"/>'
      + '<path d="M 512 620 C 466 522 372 448 268 452 C 300 560 386 632 512 620 Z" fill="currentColor" opacity=".55"/>'
      + '<path d="M 512 512 C 560 404 656 340 764 336 C 736 452 644 528 512 512 Z" fill="currentColor"/></svg>'
      + '<p><b>Rien à faire cette quinzaine</b>Le jardin travaille sans vous. Période de repos ou de simple surveillance.</p></div>';
    return;
  }

  rendreBandeau();
  rendreSynthese(paires);

  const audibles = paires.filter(x => !x.muet);
  // L'urgence est déjà portée par la phrase de tête et par chaque ligne, le
  // décompte du pied ne mesure donc que la longueur de la liste.
  $("bilanMoment").innerHTML =
    `<b>${audibles.length}</b> action${audibles.length > 1 ? "s" : ""} sur `
    + `<b>${new Set(audibles.map(x => x.p.id)).size}</b> plantes`;
  $("piedVue").hidden = false;

  const bascule = $("basculeVue");
  bascule.innerHTML = "";
  [["tache", "Tâche"], ["espace", "Espace"]].forEach(([v, lib]) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "vue" + (vueMoment === v ? " active" : "");
    b.textContent = lib;
    b.addEventListener("click", () => {
      vueMoment = v;
      try { localStorage.setItem("monjardin.vue", v); } catch (err) { /* stockage indisponible */ }
      if (vueDetail && vueDetail.t === "tache") vueDetail = { t: "tout" };
      rendreMaintenant();
    });
    bascule.appendChild(b);
  });
  majFiltresMoment();

  // Un filtre qui vide la tâche ouverte ramène à la vue d'ensemble.
  if (vueDetail && vueDetail.t === "tache" && !paires.some(x => x.k === vueDetail.k)) vueDetail = null;
  majNiveau();
  if (!vueDetail) return;

  const carreTache = k => `<span class="pt-tache" style="background:${teinteK(k)}">`
    + `<svg viewBox="0 0 24 24" aria-hidden="true">${PICTOS[k] || ""}</svg></span>`;
  const titreTache = k => VERBE[k] || phases[k].label;

  const boutonRetour = () => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "retour"; b.setAttribute("aria-label", "Vue d'ensemble");
    b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7"/></svg>';
    b.addEventListener("click", revenirEnsemble);
    return b;
  };

  // L'œil des masquées se pose au pied de la liste, là où le manque se constate.
  // Le compte porte sur ce que l'on regarde : la tâche ouverte, ou la liste entière.
  const poserMasquees = n => {
    if (!n && !voirSourdines) return;
    const b = document.createElement("button");
    b.type = "button";
    b.className = "bascule-sourdine" + (voirSourdines ? " active" : "");
    b.innerHTML = OEIL_BARRE + `<span>${voirSourdines ? "Cacher les actions masquées"
      : n + " action" + (n > 1 ? "s" : "") + " masquée" + (n > 1 ? "s" : "")}</span>`;
    b.addEventListener("click", () => { voirSourdines = !voirSourdines; rendreMaintenant(); });
    $("zoneMasquees").appendChild(b);
  };

  const clesPresentes = ORDRE_MAINTENANT.filter(k => paires.some(x => x.k === k));

  if (vueDetail.t === "tache") {
    const k = vueDetail.k;
    const lot = paires.filter(x => x.k === k);
    const barre = $("barreNiveau");
    barre.className = "barre-niveau";
    $("niveauDetail").classList.remove("mode-tout");
    barre.appendChild(boutonRetour());
    const t = document.createElement("span");
    t.className = "titre-niveau";
    t.innerHTML = carreTache(k) + `<span class="nom-niveau">${esc(titreTache(k))}</span>`;
    barre.appendChild(t);
    const n = document.createElement("span");
    n.className = "nb-niveau";
    n.textContent = lot.length + (lot.length > 1 ? " plantes" : " plante");
    barre.appendChild(n);

    if (k === "floraison") {
      const bloc = document.createElement("div");
      bloc.className = "bloc-puces";
      lot.forEach(x => {
        const d = document.createElement("div");
        d.className = "enveloppe-puce";
        d.innerHTML = `<button class="puce nom-action">${nomAvecMarque(x.p)}</button>`;
        d.querySelector(".nom-action").addEventListener("click", () => ouvrirFeuille(x.p));
        bloc.appendChild(d);
      });
      zone.appendChild(bloc);
    } else {
      // Ce qui se termine passe en tête, le reste suit la date de fin puis l'alphabet.
      lot.slice()
        .sort((a, b) => (etatFenetre(b.p, k) === "derniere") - (etatFenetre(a.p, k) === "derniere")
          || finFenetre(a.p, k) - finFenetre(b.p, k)
          || a.p.nom.localeCompare(b.p.nom, "fr"))
        .forEach(x => zone.appendChild(ligneAction(x.p, k, "tache")));
    }
    poserMasquees(muettesPar[k] || 0);

    const pager = $("pagerTache");
    const retour = document.createElement("button");
    retour.type = "button"; retour.className = "pas";
    retour.innerHTML = '<svg class="fl" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7"/></svg>'
      + "<span>Vue d'ensemble</span>";
    retour.addEventListener("click", revenirEnsemble);
    pager.appendChild(retour);
    const i = clesPresentes.indexOf(k);
    const suivant = clesPresentes[(i + 1) % clesPresentes.length];
    if (suivant && suivant !== k) {
      const s = document.createElement("button");
      s.type = "button"; s.className = "pas";
      s.innerHTML = carreTache(suivant) + `<span>${esc(titreTache(suivant))}</span>`
        + '<svg class="fl" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
      s.addEventListener("click", () => {
        vueDetail = { t: "tache", k: suivant };
        try { history.replaceState({ detail: vueDetail }, ""); } catch (e) { /* historique indisponible */ }
        rendreMaintenant();
        window.scrollTo(0, 0);
      });
      pager.appendChild(s);
    }
    return;
  }

  // ---- Liste complète, rail de sections collant ----
  const barre = $("barreNiveau");
  barre.className = "barre-niveau barre-rail";
  $("niveauDetail").classList.add("mode-tout");
  barre.appendChild(boutonRetour());
  const rail = document.createElement("div");
  rail.className = "rail";
  barre.appendChild(rail);

  const sections = [];
  if (vueMoment === "espace") {
    const tous = espaces.map(z => ({ cle: z.id, nom: z.name }))
      .concat([{ cle: "0", nom: "Non classées" }]);
    const groupes = espaceChoisi === null ? tous : tous.filter(g => g.cle === espaceChoisi);
    groupes.forEach(g => {
      const dedans = p => g.cle === "0" ? !espacesDe(p.id).length : espacesDe(p.id).indexOf(g.cle) !== -1;
      const lot = paires.filter(x => dedans(x.p));
      if (!lot.length) return;
      const ids = [...new Set(lot.map(x => x.p.id))];
      const corps = document.createElement("div");
      corps.className = "corps-section";
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
      sections.push({ nom: g.nom, teinte: (espaces.find(z => z.id === g.cle) || {}).color || "#4C8C3F",
        compte: `${ids.length} plantes, ${lot.length} actions`, corps });
    });
  } else {
    clesPresentes.forEach(k => {
      const lot = paires.filter(x => x.k === k);
      const corps = document.createElement("div");
      corps.className = "corps-section";
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
          .sort((a, b) => (etatFenetre(b.p, k) === "derniere") - (etatFenetre(a.p, k) === "derniere")
            || finFenetre(a.p, k) - finFenetre(b.p, k)
            || a.p.nom.localeCompare(b.p.nom, "fr"))
          .forEach(x => corps.appendChild(ligneAction(x.p, k, "tache")));
      }
      sections.push({ cle: k, nom: titreTache(k), teinte: teinteK(k),
        compte: String(lot.length), corps });
    });
  }

  const puces = [];
  sections.forEach((s, i) => {
    const bloc = document.createElement("section");
    bloc.className = "section-liste";
    const tete = document.createElement("div");
    tete.className = "tete-liste";
    tete.innerHTML = (s.cle ? carreTache(s.cle)
      : `<span class="pt-tache" style="background:${s.teinte}"></span>`)
      + `<span class="nom-niveau">${esc(s.nom)}</span>`
      + `<span class="nb-niveau">${esc(s.compte)}</span>`;
    bloc.appendChild(tete);
    bloc.appendChild(s.corps);
    zone.appendChild(bloc);

    const puce = document.createElement("button");
    puce.type = "button";
    puce.className = "puce-rail" + (i === 0 ? " ici" : "");
    puce.innerHTML = `<i style="background:${s.teinte}"></i>${esc(s.nom)}`;
    puce.addEventListener("click", () => {
      const y = bloc.getBoundingClientRect().top + window.scrollY - barre.offsetHeight - 6;
      window.scrollTo({ top: y, behavior: "smooth" });
    });
    rail.appendChild(puce);
    puces.push({ puce, bloc });
  });
  poserMasquees(muettes);

  // La puce du rail suit la section lue, et le rail la ramène à sa vue.
  if (window.IntersectionObserver) {
    obsSections = new IntersectionObserver(entrees => {
      entrees.forEach(e => {
        const t = puces.find(x => x.bloc === e.target);
        if (!t || !e.isIntersecting) return;
        puces.forEach(x => x.puce.classList.toggle("ici", x === t));
        rail.scrollTo({ left: Math.max(0, t.puce.offsetLeft - 44), behavior: "smooth" });
      });
    }, { rootMargin: "-92px 0px -72% 0px", threshold: 0 });
    puces.forEach(x => obsSections.observe(x.bloc));
  }
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
    // Une fenêtre à cheval sur le 1er janvier se dessine en deux morceaux.
    const morceaux = it.s <= it.e ? [[it.s, it.e]] : [[it.s, 24], [1, it.e]];
    return morceaux.map(([a, b]) => {
      const g = (a - 1) / 24 * 100, w = (b - a + 1) / 24 * 100;
      return `<span class="seg" style="left:${g}%;width:${w}%;background:${teinteK(it.k)}" title="${esc(phases[it.k].label)}"></span>`;
    }).join("");
  }).join("") + `</div>`).join("");
}

/* ================== Fiche de plante, rendu détaillé ==================
   Repris de la maquette validée : motif de typologie fondu dans l'en-tête,
   jauges normalisées, calendrier annuel en ruban ou en roue avec une teinte
   par action, besoin en eau, taille à maturité rapportée à une silhouette. */

function cleMotif(p) {
  if (p.typo === "Fruits") return p.port === "arbre" ? "arbre" : "fruit";
  return MOTIF_TYPO[p.typo] || "ornement";
}

function motifFiche(p) {
  const m = MOTIF[cleMotif(p)];
  if (!m) return "";
  return `<span class="f-motif" aria-hidden="true"><svg viewBox="0 0 200 200">${m}</svg></span>`;
}

function pips(n, max) {
  let s = "";
  for (let i = 1; i <= (max || 3); i++) s += `<i class="${i <= n ? "plein" : ""}"></i>`;
  return `<span class="f-pips${n === 0 ? " zero" : ""}">${s}</span>`;
}

function jaugesFiche(p) {
  const g = [];
  const ligne = (icone, n, texte) => `<div class="f-jauge">`
    + `<span class="f-ji" aria-hidden="true"><svg viewBox="0 0 20 20">${GJ[icone]}</svg></span>`
    + pips(n) + `<span class="f-jt">${esc(texte)}</span></div>`;

  if (p.expo) g.push(ligne("soleil", PIPS_EXPO[p.expo] || 2, p.attr.exposition || ""));
  if (p.eauNiv) {
    const t = { faible: "Arrosage faible", modere: "Besoin modéré",
      regulier: "Arrosage régulier", soutenu: "Arrosage soutenu" }[p.eauNiv] || "";
    g.push(ligne("goutte", PIPS_EAU[p.eauNiv] || 2, t));
  }
  if (p.nectar || p.pollen) {
    const n = PIPS_BUT[p.nectar] || 0, po = PIPS_BUT[p.pollen] || 0;
    const t = (n && po) ? "Nectar et pollen" : n ? "Surtout du nectar"
      : po ? "Surtout du pollen" : "Rien pour les butineurs";
    g.push(ligne("butineur", Math.max(n, po), t));
  }
  if (p.gel !== null && p.gel !== undefined) {
    const v = Number(p.gel);
    const t = v >= 0 ? "Gèle dès " + v.toString().replace(".", ",") + " °C"
      : "Tient " + ("−" + Math.abs(v).toString().replace(".", ",")) + " °C";
    g.push(ligne("flocon", v <= -15 ? 3 : v <= -7 ? 2 : 1, t));
  }
  return g.length ? `<div class="f-jauges">${g.join("")}</div>` : "";
}

// Une voie par action, dans un ordre fixe d'une fiche à l'autre, pour que deux
// plantes se comparent d'un coup d'oeil.
function voiesFiche(p) {
  const out = [];
  ORDRE_FICHE.forEach(k => {
    if (!phases[k]) return;
    const seg = segsDe(p, k);
    if (seg && seg.length) out.push({ k, seg });
  });
  return out;
}

const couleurAction = (p, k) => k === "floraison"
  ? (FLEUR[(p.couleurs || [])[0]] || FLEUR.rose) : [TEINTE[k], TEINTE[k]];

function rubanSVG(p) {
  const V = voiesFiche(p);
  if (!V.length) return "";
  const G = 102, W = 242, LH = 23, H = V.length * LH + 20;
  const x = r => G + (r - 1) / 24 * W;
  const s = [`<svg class="f-svg" viewBox="0 0 ${G + W} ${H + 14}" role="img" aria-label="Calendrier annuel">`];
  for (let m = 0; m < 12; m++) {
    const r = m * 2 + 1;
    s.push(`<line x1="${x(r).toFixed(1)}" y1="0" x2="${x(r).toFixed(1)}" y2="${H - 6}" stroke="var(--f-grille)"/>`);
    if (m % 2 === 0) s.push(`<text class="f-tk" x="${(x(r) + W / 24).toFixed(1)}" y="${H + 8}" text-anchor="middle">${MOIS_ABR[m]}</text>`);
  }
  s.push(`<rect x="${x(demi).toFixed(1)}" y="-3" width="${(W / 24).toFixed(1)}" height="${H}" fill="#14140f" opacity=".07"/>`);
  [x(demi), x(demi) + W / 24].forEach(xb =>
    s.push(`<line x1="${xb.toFixed(1)}" y1="-4" x2="${xb.toFixed(1)}" y2="${H - 2}" stroke="var(--f-ink3)" stroke-width="1.2"/>`));

  V.forEach((v, i) => {
    const y = i * LH + 4, gl = PHF[v.k][2];
    const on = v.seg.some(t => dansFenetre(demi, t[0], t[1]));
    const flo = v.k === "floraison";
    const [col, cerne] = couleurAction(p, v.k);
    s.push(`<rect x="${G}" y="${y}" width="${W}" height="14" rx="4" fill="#14140f" opacity=".035"/>`);
    v.seg.forEach(t => {
      const parts = t[0] <= t[1] ? [[t[0], t[1]]] : [[t[0], 24], [1, t[1]]];
      parts.forEach(q => {
        const X = x(q[0]), Wd = x(q[1] + 1) - x(q[0]);
        s.push(`<rect x="${X.toFixed(1)}" y="${y}" width="${Math.max(Wd - 2, 5).toFixed(1)}" height="14" rx="4"`
          + ` fill="${col}" stroke="${cerne}" stroke-width="${flo ? 1 : 0}" opacity="${on ? 1 : .82}"/>`);
      });
    });
    if (flo && p.pic) s.push(`<circle cx="${(x(p.pic) + W / 48).toFixed(1)}" cy="${y + 7}" r="3.4" fill="${cerne}"/>`);
    s.push(`<g transform="translate(2,${y + 1}) scale(0.62)" class="f-ic">${GLF[gl]}</g>`);
    // Le libellé de la tâche porte parfois deux mots séparés par une virgule,
    // la voie n'en garde que le premier, la légende de la roue les garde tous.
    const lbl = phases[v.k].label.split(",")[0];
    const gras = on ? ' style="fill:var(--f-ink);font-weight:600"' : "";
    if (lbl.length <= 13 || lbl.indexOf(" ") === -1) {
      s.push(`<text class="f-lane" x="${G - 8}" y="${y + 11}" text-anchor="end"${gras}>${esc(lbl)}</text>`);
    } else {
      const c = lbl.indexOf(" ");
      s.push(`<text class="f-lane" x="${G - 8}" y="${y + 3.5}" text-anchor="end"${gras}>${esc(lbl.slice(0, c))}`
        + `<tspan x="${G - 8}" dy="9.2">${esc(lbl.slice(c + 1))}</tspan></text>`);
    }
  });
  return s.join("") + "</svg>";
}

function roueSVG(p) {
  const V = voiesFiche(p);
  if (!V.length) return "";
  const n = V.length, R0 = 44, anneau = 11, ecart = 3.4, LEG = 132;
  const Rmax = R0 + n * (anneau + ecart), S = 2 * (Rmax + 24), C = S / 2;
  const ang = q => (q - 1) / 24 * 2 * Math.PI - Math.PI / 2;
  const pt = (r, a) => [C + r * Math.cos(a), C + r * Math.sin(a)];
  const f = v => v.toFixed(1);
  const s = [`<svg class="f-svg" viewBox="0 0 ${(S + LEG).toFixed(0)} ${S.toFixed(0)}" role="img" aria-label="Année en roue">`];

  const a1 = ang(demi), a2 = ang(demi + 1);
  const [p1, p2, p3, p4] = [pt(R0 - 8, a1), pt(Rmax + 7, a1), pt(Rmax + 7, a2), pt(R0 - 8, a2)];
  s.push(`<path d="M ${f(p1[0])} ${f(p1[1])} L ${f(p2[0])} ${f(p2[1])} A ${f(Rmax + 7)} ${f(Rmax + 7)} 0 0 1 `
    + `${f(p3[0])} ${f(p3[1])} L ${f(p4[0])} ${f(p4[1])} Z" fill="#14140f" opacity=".09"/>`);
  for (let m = 0; m < 12; m++) {
    const a = ang(m * 2 + 1), q1 = pt(R0 - 8, a), q2 = pt(Rmax + 7, a);
    s.push(`<line x1="${f(q1[0])}" y1="${f(q1[1])}" x2="${f(q2[0])}" y2="${f(q2[1])}" stroke="var(--f-grille)"/>`);
    const t = pt(Rmax + 18, ang(m * 2 + 2));
    s.push(`<text class="f-tk" x="${f(t[0])}" y="${f(t[1] + 3)}" text-anchor="middle">${MOIS_ABR[m]}</text>`);
  }
  [a1, a2].forEach(a => {
    const q1 = pt(R0 - 8, a), q2 = pt(Rmax + 7, a);
    s.push(`<line x1="${f(q1[0])}" y1="${f(q1[1])}" x2="${f(q2[0])}" y2="${f(q2[1])}" stroke="var(--f-ink3)" stroke-width="1.2"/>`);
  });

  V.forEach((v, i) => {
    const r = Rmax - i * (anneau + ecart), gl = PHF[v.k][2];
    const on = v.seg.some(t => dansFenetre(demi, t[0], t[1]));
    const flo = v.k === "floraison";
    const [col, cerne] = couleurAction(p, v.k);
    const op = on ? 1 : .82;
    s.push(`<circle cx="${f(C)}" cy="${f(C)}" r="${f(r)}" fill="none" stroke="#14140f" stroke-width="${anneau}" opacity=".05"/>`);
    v.seg.forEach(t => {
      const b = t[0] <= t[1] ? t[1] : 24 + t[1];
      if (b + 1 - t[0] >= 24) {
        if (flo) s.push(`<circle cx="${f(C)}" cy="${f(C)}" r="${f(r)}" fill="none" stroke="${cerne}" stroke-width="${anneau + 2}" opacity="${op}"/>`);
        s.push(`<circle cx="${f(C)}" cy="${f(C)}" r="${f(r)}" fill="none" stroke="${col}" stroke-width="${anneau}" opacity="${op}"/>`);
        return;
      }
      const A1 = ang(t[0]), A2 = ang(b + 1);
      const s1 = pt(r, A1), s2 = pt(r, A2), big = (A2 - A1) > Math.PI ? 1 : 0;
      if (flo) s.push(`<path d="M ${f(s1[0])} ${f(s1[1])} A ${f(r)} ${f(r)} 0 ${big} 1 ${f(s2[0])} ${f(s2[1])}" `
        + `fill="none" stroke="${cerne}" stroke-width="${anneau + 2}" stroke-linecap="round" opacity="${op}"/>`);
      s.push(`<path d="M ${f(s1[0])} ${f(s1[1])} A ${f(r)} ${f(r)} 0 ${big} 1 ${f(s2[0])} ${f(s2[1])}" `
        + `fill="none" stroke="${col}" stroke-width="${anneau}" stroke-linecap="round" opacity="${op}"/>`);
    });
    if (flo && p.pic) {
      const mp = pt(r, ang(p.pic) + 2 * Math.PI / 48);
      s.push(`<circle cx="${f(mp[0])}" cy="${f(mp[1])}" r="3.2" fill="${cerne}" stroke="var(--f-carte)" stroke-width="1.2"/>`);
    }
    const mk = pt(r, ang(1)), rr = anneau / 2 + 1.6;
    s.push(`<circle cx="${f(mk[0])}" cy="${f(mk[1])}" r="${f(rr)}" fill="var(--f-carte)" stroke="${cerne}" stroke-width="1.1"/>`);
    s.push(`<g transform="translate(${f(mk[0] - 5.2)},${f(mk[1] - 5.2)}) scale(0.52)" style="color:${cerne}">${GLF[gl]}</g>`);
  });

  const y0 = C - (n * 19) / 2 + 9;
  s.push(`<text class="f-tk" x="${(S + 6).toFixed(0)}" y="${f(y0 - 15)}">de l'extérieur au centre</text>`);
  V.forEach((v, i) => {
    const [, cerne] = couleurAction(p, v.k), yy = y0 + i * 19, gl = PHF[v.k][2];
    s.push(`<circle cx="${(S + 12).toFixed(0)}" cy="${f(yy - 2)}" r="7.6" fill="var(--f-carte)" stroke="${cerne}" stroke-width="1.1"/>`);
    s.push(`<g transform="translate(${f(S + 6.8)},${f(yy - 7.2)}) scale(0.52)" style="color:${cerne}">${GLF[gl]}</g>`);
    s.push(`<text class="f-lane" x="${(S + 24).toFixed(0)}" y="${f(yy + 2)}">${esc(phases[v.k].label)}</text>`);
  });

  const ra = R0 - 1, e1 = ang(1) - 1.28, e2 = ang(1) + 1.14;
  const q1 = pt(ra, e1), q2 = pt(ra, e2);
  s.push(`<path d="M ${f(q1[0])} ${f(q1[1])} A ${f(ra)} ${f(ra)} 0 0 1 ${f(q2[0])} ${f(q2[1])}" `
    + `fill="none" stroke="var(--f-ink3)" stroke-width="1.6" opacity=".5"/>`);
  const h1 = pt(ra - 3.6, e2), h2 = pt(ra + 3.6, e2), h3 = pt(ra, e2 + 0.145);
  s.push(`<path d="M ${f(h1[0])} ${f(h1[1])} L ${f(h2[0])} ${f(h2[1])} L ${f(h3[0])} ${f(h3[1])} Z" fill="var(--f-ink3)" opacity=".5"/>`);
  s.push(`<circle cx="${f(C)}" cy="${f(C)}" r="${f(R0 - 12)}" fill="var(--f-plan)"/>`);
  s.push(`<text x="${f(C)}" y="${f(C - 3)}" text-anchor="middle" class="f-tk">quinzaine</text>`);
  s.push(`<text x="${f(C)}" y="${f(C + 12)}" text-anchor="middle" class="f-centre">${demiTexte(demi)}</text>`);
  return s.join("") + "</svg>";
}

// Silhouette d'une seule pièce, tracée dans un repère de hauteur 100.
const CORPS_HUMAIN = "M-1.6 0.6C2.4 -0.6 5.6 2.4 5.8 7.2C6.0 11.0 5.0 14.4 3.4 17.0"
  + "C3.6 19.0 3.9 20.6 4.6 21.6C8.8 22.8 11.4 25.8 12.0 30.6"
  + "C12.6 35.4 12.2 42.0 11.4 48.4C11.0 52.0 10.4 55.4 10.0 58.6"
  + "C10.4 66.0 9.8 75.4 9.0 83.6C8.5 89.4 8.0 94.8 7.6 99.4L2.8 99.6"
  + "C2.4 92.0 2.0 84.2 1.4 76.8C1.2 73.6 0.6 71.8 0.2 70.6"
  + "C-0.3 71.8 -0.9 73.6 -1.2 76.8C-1.8 84.2 -2.4 92.0 -2.8 99.6L-7.6 99.4"
  + "C-8.0 94.8 -8.5 89.4 -9.0 83.6C-9.8 75.4 -10.4 66.0 -10.0 58.6"
  + "C-10.4 55.4 -11.0 52.0 -11.4 48.4C-12.2 42.0 -12.6 35.4 -12.0 30.6"
  + "C-11.4 25.8 -8.8 22.8 -4.6 21.6C-3.9 20.6 -3.6 19.0 -3.4 17.0"
  + "C-5.0 14.4 -6.0 11.0 -5.8 7.2C-5.6 2.4 -4.0 0.0 -1.6 0.6Z";

// Le motif est densifié : fondu dans l'écran il disparaîtrait à cette taille.
function densifie(m, k) {
  return m.replace(/opacity="\.(\d+)"/g, (t, d) =>
    `opacity="${Math.min(0.85, (Number("0." + d) * k)).toFixed(3)}"`);
}

function matureSVG(p) {
  if (!p.hmin || !p.hmax) return "";
  const W = 344, H = 104, G = 102;
  const hautMax = Math.max(p.hmax, 180) * 1.12;
  const y = cm => H - Math.min(H - 6, (cm / hautMax) * (H - 6));
  const s = [`<svg class="f-svg" viewBox="0 0 ${W} ${H + 16}" role="img" aria-label="Taille à maturité">`];
  s.push(`<line x1="0" y1="${H}" x2="${W}" y2="${H}" stroke="var(--f-ink3)" opacity=".45"/>`);
  const yh = y(p.hmax), yb = y(p.hmin);
  s.push(`<rect x="${G}" y="${yh.toFixed(1)}" width="${296 - G}" height="${(yb - yh).toFixed(1)}" fill="${TEINTE.plant}" opacity=".12"/>`);
  s.push(`<line x1="${G}" y1="${yh.toFixed(1)}" x2="296" y2="${yh.toFixed(1)}" stroke="${TEINTE.plant}" stroke-width="2"/>`);
  s.push(`<text class="f-cote fort" x="304" y="${(yh + 4).toFixed(1)}">${(p.hmax / 100).toFixed(1).replace(".", ",")} m</text>`);
  if (p.hmin !== p.hmax) {
    s.push(`<line x1="${G}" y1="${yb.toFixed(1)}" x2="296" y2="${yb.toFixed(1)}" stroke="${TEINTE.plant}" stroke-width="2" stroke-dasharray="4 3"/>`);
    s.push(`<text class="f-cote" x="304" y="${(yb + 4).toFixed(1)}">${(p.hmin / 100).toFixed(1).replace(".", ",")} m</text>`);
  }
  // silhouette humaine à l'échelle, 1,70 m
  const kh = (H - y(170)) / 100;
  s.push(`<g transform="translate(46,${(H - (H - y(170))).toFixed(2)}) scale(${kh.toFixed(4)})" fill="var(--f-ink3)"><path d="${CORPS_HUMAIN}"/></g>`);
  s.push(`<text class="f-cote" x="46" y="${(y(170) - 6).toFixed(1)}" text-anchor="middle">1,70 m</text>`);
  // motif de la plante, sommet calé sur le milieu de la plage
  const cle = cleMotif(p), sp = MOTIF_SPAN[cle] || [20, 190];
  const milieu = (p.hmin + p.hmax) / 2;
  const k = (H - y(milieu)) / (sp[1] - sp[0]);
  s.push(`<g transform="translate(${(196 - 100 * k).toFixed(2)},${(H - sp[1] * k).toFixed(2)}) scale(${k.toFixed(4)})" `
    + `fill="${TEINTE.plant}">${densifie(MOTIF[cle], 2.8)}</g>`);
  return s.join("") + "</svg>";
}

function eauSVG(p, lignes) {
  const G = 102, W = 242, H = 92, hm = 72;
  const vals = [];
  for (let q = 1; q <= 24; q++) {
    const r = lignes.find(l => l.quinzaine === q);
    vals.push(r && r.litres_jour_m2 !== null ? Number(r.litres_jour_m2) : null);
  }
  const dispo = vals.filter(v => v !== null);
  if (!dispo.length) return "";
  const mx = Math.max(...dispo);
  const x = q => G + (q - 1) / 24 * W + W / 48;
  const y = v => H - (v / mx) * hm;
  const s = [`<svg class="f-svg" viewBox="0 0 ${G + W} ${H + 26}" role="img" aria-label="Besoin en eau">`];
  for (let m = 0; m < 12; m++) {
    const q = m * 2 + 1;
    s.push(`<line x1="${(G + (q - 1) / 24 * W).toFixed(1)}" y1="0" x2="${(G + (q - 1) / 24 * W).toFixed(1)}" y2="${H}" stroke="var(--f-grille)"/>`);
    if (m % 2 === 0) s.push(`<text class="f-tk" x="${x(q + 1).toFixed(1)}" y="${H + 14}" text-anchor="middle">${MOIS_ABR[m]}</text>`);
  }
  s.push(`<rect x="${(G + (demi - 1) / 24 * W).toFixed(1)}" y="0" width="${(W / 24).toFixed(1)}" height="${H}" fill="#14140f" opacity=".07"/>`);
  [G + (demi - 1) / 24 * W, G + demi / 24 * W].forEach(xb =>
    s.push(`<line x1="${xb.toFixed(1)}" y1="0" x2="${xb.toFixed(1)}" y2="${H}" stroke="var(--f-ink3)" stroke-width="1.2"/>`));
  s.push(`<line x1="0" y1="${H}" x2="${G + W}" y2="${H}" stroke="var(--f-ink3)" opacity=".45"/>`);

  let d = "", aire = "", debut = null, fin = null;
  vals.forEach((v, i) => {
    if (v === null) return;
    const q = i + 1;
    d += (d ? " L " : "M ") + x(q).toFixed(1) + " " + y(v).toFixed(1);
    if (debut === null) debut = q;
    fin = q;
  });
  if (debut !== null) {
    aire = `M ${x(debut).toFixed(1)} ${H} L ` + d.slice(2) + ` L ${x(fin).toFixed(1)} ${H} Z`;
    s.push(`<path d="${aire}" fill="${TEINTE.taille}" opacity=".14"/>`);
    s.push(`<path d="${d}" fill="none" stroke="${TEINTE.taille}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>`);
  }
  const qp = vals.indexOf(mx) + 1;
  s.push(`<circle cx="${x(qp).toFixed(1)}" cy="${y(mx).toFixed(1)}" r="3.4" fill="${TEINTE.taille}"/>`);
  s.push(`<text class="f-tk" x="${G - 8}" y="${(H - hm - 9).toFixed(1)}" text-anchor="end">pic</text>`);
  s.push(`<text class="f-pic" x="${G - 8}" y="${(H - hm + 8).toFixed(1)}" text-anchor="end">`
    + `${mx.toFixed(1).replace(".", ",")} L</text>`);
  s.push(`<text class="f-tk" x="${G - 8}" y="${(H - hm + 22).toFixed(1)}" text-anchor="end">${demiTexte(qp)}</text>`);
  return s.join("") + "</svg>";
}

// Barre d'avancement dans la fenêtre du geste, repère à la quinzaine en cours.
function avancement(seg, teinte) {
  const [d, f] = seg;
  const total = ((f - d) % 24 + 24) % 24 + 1;
  const fait = ((demi - d) % 24 + 24) % 24 + 1;
  const pct = Math.max(4, Math.min(100, Math.round(fait / total * 100)));
  return `<div class="f-prog" style="color:${teinte}"><div class="f-track"><i style="width:${pct}%"></i>`
    + `<b style="left:${pct}%"></b></div>`
    + `<div class="f-bornes"><span>${demiTexte(d)}</span><span>${demiTexte(f)}</span></div></div>`;
}

function ficheMoment(p) {
  const h = [];
  const actives = [];
  ORDRE_MAINTENANT.forEach(k => {
    if (!phases[k]) return;
    (segsDe(p, k) || []).forEach(t => { if (dansFenetre(demi, t[0], t[1])) actives.push({ k, t }); });
  });
  if (p.eauMode === "sans_arrosage" || (p.eauLignes && !p.eauLignes.length)) {
    h.push(`<div class="f-hero"><div class="f-lbl">Besoin en eau</div>`
      + `<div class="f-val"><span class="f-num">0</span><span class="f-unit">arrosage à prévoir</span></div>`
      + `<p class="f-note">Plante installée, aucun arrosage prévu</p></div>`);
  } else if (p.eauLignes && p.eauLignes.length) {
    const r = p.eauLignes.find(l => l.quinzaine === demi);
    const vals = p.eauLignes.map(l => Number(l.litres_jour_m2 || 0));
    const mx = Math.max(...vals, 0);
    if (r && r.litres_jour_m2) {
      const v = Number(r.litres_jour_m2);
      h.push(`<div class="f-hero"><div class="f-lbl">Besoin en eau aujourd'hui</div>`
        + `<div class="f-val"><span class="f-num">${v.toFixed(1).replace(".", ",")}</span>`
        + `<span class="f-unit">L par jour et par m²</span></div>`
        + `<p class="f-note">${mx ? Math.round(v / mx * 100) + " % du pic de l'année" : ""}</p></div>`);
    } else if (r && r.reprise_dose_litres) {
      h.push(`<div class="f-hero"><div class="f-lbl">Besoin en eau</div>`
        + `<div class="f-val"><span class="f-num">${Number(r.reprise_dose_litres).toFixed(0)}</span>`
        + `<span class="f-unit">L à la plantation</span></div>`
        + `<p class="f-note">Arrosage à la reprise seulement, tous les ${r.reprise_intervalle_jours || 10} jours la première saison</p></div>`);
    } else {
      h.push(`<div class="f-hero"><div class="f-lbl">Besoin en eau</div>`
        + `<div class="f-val"><span class="f-num">0</span><span class="f-unit">arrosage à prévoir</span></div>`
        + `<p class="f-note">Hors de la période où la plante demande de l'eau</p></div>`);
    }
  }

  actives.filter(a => ETATS_FICHE.indexOf(a.k) !== -1).forEach(a => {
    const [, cerne] = couleurAction(p, a.k);
    h.push(`<div class="f-etat"><span class="f-ai" style="color:${cerne}"><svg viewBox="0 0 20 20">${GLF[PHF[a.k][2]]}</svg></span>`
      + `<span class="f-et">${esc(phases[a.k].label)} en cours</span>`
      + `<span class="f-ed">${demiTexte(a.t[0])} à ${demiTexte(a.t[1])}</span></div>`);
  });

  const gestes = actives.filter(a => ETATS_FICHE.indexOf(a.k) === -1);
  if (gestes.length) {
    h.push('<div class="f-gestes">');
    gestes.forEach(a => {
      const t = texteAction(p, a.k), c = TEINTE[a.k];
      h.push(`<div class="f-acte"><div class="f-ai" style="color:${c}"><svg viewBox="0 0 20 20">${GLF[PHF[a.k][2]]}</svg></div><div>`
        + `<h4>${esc(phases[a.k].label)}</h4>${avancement(a.t, c)}${t ? `<p>${marquerTermes(t)}</p>` : ""}</div></div>`);
    });
    h.push("</div>");
  }
  if (!actives.length) h.push('<p class="f-vide">Rien à faire sur cette plante en ce moment.</p>');
  return h.join("");
}

function ficheAnnee(p) {
  const h = [];
  const seg = `<div class="f-seg"><button type="button" class="actif" data-forme="ruban">Ruban</button>`
    + `<button type="button" data-forme="roue">Roue</button></div>`;
  const clim = (climats[(jardinActif() || {}).climate_key] || {}).label;
  h.push(`<div class="f-carte"><div class="f-carte-tete"><h3>L'année de la plante`
    + (clim ? `<span class="f-sub">climat ${esc(clim.toLowerCase())}</span>` : "") + `</h3>${seg}</div>`
    + `<div class="f-forme f-ruban">${rubanSVG(p)}</div>`
    + `<div class="f-forme f-roue" hidden>${roueSVG(p)}</div>`);
  const c = (p.couleurs || [])[0];
  const flo = (segsDe(p, "floraison") || [])[0];
  if (c && flo) {
    const [rempli, cerne] = FLEUR[c] || FLEUR.rose;
    h.push(`<p class="f-legende"><i style="background:${rempli};border-color:${cerne}"></i>`
      + `Fleurs ${esc(ADJ[c] || c)}, de ${demiTexte(flo[0])} à ${demiTexte(flo[1])}</p>`);
  }
  h.push("</div>");

  h.push(`<div class="f-carte f-eau"><div class="f-carte-tete"><h3>Besoin en eau`
    + `<span class="f-sub">L par jour et par m²</span></h3></div>`
    + `<div class="f-eau-corps"><p class="f-note">Lecture en cours.</p></div></div>`);

  if (p.pic) {
    h.push(`<div class="f-carte"><div class="f-carte-tete"><h3>Pic de floraison</h3></div>`
      + `<p class="f-txt">Le point marque le pic, ${demiTexte(p.pic)}.`
      + (p.picNote ? " " + esc(p.picNote) : "") + `</p></div>`);
  }
  const mat = matureSVG(p);
  if (mat) h.push(`<div class="f-carte"><div class="f-carte-tete"><h3>Taille à maturité</h3></div>${mat}</div>`);
  return h.join("");
}

function ficheBlocs(p) {
  const a = p.attr || {};
  const kv = rows => rows.filter(r => r[1]).map(r =>
    `<dt>${esc(r[0])}</dt><dd>${marquerTermes(r[1])}</dd>`).join("");
  const bloc = (titre, rows) => {
    const c = kv(rows);
    return c ? `<section class="f-bloc"><h3>${esc(titre)}</h3><dl class="f-kv">${c}</dl></section>` : "";
  };
  return bloc("Identité", [
    ["Famille", p.famille], ["Cycle", a.type], ["Hauteur", a.hauteur],
    ["Écartement", p.espacement], ["Première récolte", a.recolte],
  ]) + bloc("Culture", [
    ["Sol", a.sol], ["Eau", a.arrosage], ["Fertilité", a.fertilisation],
    ["Profondeur", p.prof], ["Pollinisation", a.pollinisation], ["Multiplication", a.multiplication],
  ]) + bloc("Au jardin", [
    ["Nectar", a.mellifere], ["Parfum", a.parfum], ["Fleurs", a.couleur],
    ["Feuillage", a.feuillage], ["Usage", a.usage], ["Associations", p.assoc],
  ]);
}

function ficheHTML(p) {
  const ad = adapt[p.id];
  const tox = p.attr.toxicite && !/^non toxique/i.test(p.attr.toxicite);
  return `<div class="fiche-v2">
    <div class="f-entete">${motifFiche(p)}
      <div class="f-chips"><span class="f-chip">${esc(p.typo || p.cat)}</span>
      ${ad ? `<span class="f-chip">${esc(NIVEAUX[ad.level].court)} sous ce climat</span>` : ""}</div>
      ${jaugesFiche(p)}
      ${tox ? `<p class="f-tox"><span aria-hidden="true">&#9670;</span>${esc(p.attr.toxicite)}</p>` : ""}
    </div>
    <div class="f-onglets" role="tablist">
      <button type="button" role="tab" class="actif" data-pan="moment">En ce moment</button>
      <button type="button" role="tab" data-pan="annee">Toute l'année</button>
    </div>
    <div class="f-pan f-pan-moment">${ficheMoment(p)}</div>
    <div class="f-pan f-pan-annee" hidden>${ficheAnnee(p)}${ficheBlocs(p)}</div>
  </div>`;
}

/* ================== Bandeau du jour ==================
   Quatre tuiles lisibles d'un coup d'oeil, chacune ouvrant une feuille de
   détail. La météo vient des modèles de Météo-France servis par Open-Meteo,
   le lieu de la Base Adresse Nationale, l'évapotranspiration est celle du
   bulletin FAO 56 calculée au point du jardin. */

const METEO_CACHE = "monjardin.meteo.v3";
const METEO_TTL = 3600 * 1000;   // une heure, la prévision ne bouge pas plus vite

// Codes de temps sensible de l'Organisation météorologique mondiale.
const TEMPS = [
  [[0], "Ciel clair", "soleil"], [[1, 2], "Éclaircies", "soleil_nuage"],
  [[3], "Couvert", "nuage"], [[45, 48], "Brouillard", "brume"],
  [[51, 53, 55, 56, 57], "Bruine", "pluie"], [[61, 63, 65, 66, 67], "Pluie", "pluie"],
  [[71, 73, 75, 77, 85, 86], "Neige", "neige"], [[80, 81, 82], "Averses", "averse"],
  [[95, 96, 99], "Orage", "orage"],
];
const tempsDe = c => (TEMPS.find(t => t[0].indexOf(c) !== -1) || [[], "Temps variable", "nuage"]);

const GM = {
  soleil: '<circle cx="12" cy="12" r="4.6"/><path d="M12 2v2.6M12 19.4V22M2 12h2.6M19.4 12H22'
    + 'M4.9 4.9l1.9 1.9M17.2 17.2l1.9 1.9M19.1 4.9l-1.9 1.9M6.8 17.2l-1.9 1.9"/>',
  soleil_nuage: '<circle cx="9" cy="9" r="3.4"/><path d="M9 2.6v1.8M2.6 9h1.8M4.8 4.8l1.3 1.3M13.2 4.8l-1.3 1.3"/>'
    + '<path d="M8.4 19.4h9.2a3.6 3.6 0 0 0 .3-7.2 5 5 0 0 0-9.6 1.2 3 3 0 0 0 .1 6z"/>',
  nuage: '<path d="M7.4 19.4h9.2a3.8 3.8 0 0 0 .3-7.6 5.3 5.3 0 0 0-10.1 1.3 3.2 3.2 0 0 0 .6 6.3z"/>',
  brume: '<path d="M7.4 15.4h9.2a3.8 3.8 0 0 0 .3-7.6A5.3 5.3 0 0 0 6.8 9.1a3.2 3.2 0 0 0 .6 6.3z"/>'
    + '<path d="M4 18.6h16M6.5 21.4h11"/>',
  pluie: '<path d="M7.4 15h9.2a3.8 3.8 0 0 0 .3-7.6A5.3 5.3 0 0 0 6.8 8.7a3.2 3.2 0 0 0 .6 6.3z"/>'
    + '<path d="M9 18.4l-.9 2.6M13 18.4l-.9 2.6M17 18.4l-.9 2.6"/>',
  averse: '<path d="M7.4 14.2h9.2a3.8 3.8 0 0 0 .3-7.6A5.3 5.3 0 0 0 6.8 7.9a3.2 3.2 0 0 0 .6 6.3z"/>'
    + '<path d="M9.4 17.4l-1.2 3.4M13.4 17.4l-1.2 3.4"/><path d="M17.4 17.4l-2.6 2.4h2.6l-2.6 2"/>',
  orage: '<path d="M7.4 13.6h9.2a3.8 3.8 0 0 0 .3-7.6A5.3 5.3 0 0 0 6.8 7.3a3.2 3.2 0 0 0 .6 6.3z"/>'
    + '<path d="M13.4 16l-3.4 4.2h3l-2 3.4" stroke-linejoin="round"/>',
  neige: '<path d="M7.4 14.6h9.2a3.8 3.8 0 0 0 .3-7.6A5.3 5.3 0 0 0 6.8 8.3a3.2 3.2 0 0 0 .6 6.3z"/>'
    + '<path d="M9 18v3.4M7.4 18.9l3.2 1.6M10.6 18.9l-3.2 1.6M16 18v3.4M14.4 18.9l3.2 1.6M17.6 18.9l-3.2 1.6"/>',
  goutte: '<path d="M12 3.4c4.2 4.8 6.6 8.2 6.6 11.2a6.6 6.6 0 0 1-13.2 0c0-3 2.4-6.4 6.6-11.2z"/>',
  arc: '<path d="M3 18h18"/><path d="M6.2 18a5.8 5.8 0 0 1 11.6 0"/><path d="M12 6.4V4M5.2 9.2L3.6 7.6M18.8 9.2l1.6-1.6"/>',
  feuille: '<path d="M20 4c0 9-5.4 14-12 14-1.4 0-2.6-.2-3.6-.6C5.6 9.6 11.4 4.6 20 4z"/>'
    + '<path d="M4 21c1.6-4.6 4.4-8.2 8.4-10.8"/>',
  alerte: '<path d="M12 3.6 21.4 20H2.6z" stroke-linejoin="round"/><path d="M12 9.6v4.6M12 17.2v.1"/>',
};
const icoM = (n, cls) => `<svg class="${cls || "bd-ic"}" viewBox="0 0 24 24" aria-hidden="true" `
  + `fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">${GM[n] || ""}</svg>`;

let meteo = null;      // charge brute, telle que rendue par le service

async function lireMeteo(g) {
  if (!g || g.lat === null || g.lat === undefined) { meteo = null; return; }
  const cle = `${g.lat},${g.lon}`;
  try {
    const c = JSON.parse(localStorage.getItem(METEO_CACHE) || "null");
    if (c && c.cle === cle && Date.now() - c.t < METEO_TTL) { meteo = c.d; return; }
  } catch (e) { /* cache indisponible */ }
  // Le modèle n'est pas forcé. Météo-France seul s'arrête à quatre jours et rend
  // des valeurs vides ensuite ; la sélection automatique d'Open-Meteo prend AROME
  // sur les premiers jours puis prolonge, et couvre la semaine entière.
  const base = "https://api.open-meteo.com/v1/forecast?latitude=" + g.lat + "&longitude=" + g.lon
    + "&timezone=Europe%2FParis";
  // Trente jours d'antériorité : le bilan hydrique a besoin d'une mise en route
  // assez longue pour que l'état initial du réservoir ne pèse plus sur le résultat.
  const u = base
    + "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,"
    + "precipitation_probability_max,wind_speed_10m_max,et0_fao_evapotranspiration,"
    + "sunrise,sunset,daylight_duration"
    + "&past_days=30&forecast_days=7";
  // L'heure en cours dans un appel séparé : le quotidien porte le maximum du jour,
  // qui n'est pas ce qu'il fait dehors quand on ouvre l'application le soir.
  const uh = base + "&hourly=temperature_2m,weather_code,wind_speed_10m&forecast_days=1";
  try {
    const [r, rh] = await Promise.all([fetch(u), fetch(uh).catch(() => null)]);
    if (!r.ok) throw new Error(r.status);
    meteo = await r.json();
    if (rh && rh.ok) {
      const h = await rh.json();
      if (h && h.hourly) meteo.hourly = h.hourly;
    }
    localStorage.setItem(METEO_CACHE, JSON.stringify({ cle, t: Date.now(), d: meteo }));
  } catch (e) { meteo = null; }
}

// Index du jour dans la série, sept jours de passé précèdent aujourd'hui.
const iJour = () => {
  if (!meteo) return -1;
  const h = new Date().toISOString().slice(0, 10);
  return meteo.daily.time.indexOf(h);
};

// Index de l'heure en cours dans la série horaire, quand elle est disponible.
const iHeure = () => {
  if (!meteo || !meteo.hourly) return -1;
  const d = new Date();
  const cle = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-"
    + String(d.getDate()).padStart(2, "0") + "T" + String(d.getHours()).padStart(2, "0") + ":00";
  return meteo.hourly.time.indexOf(cle);
};

// Les nombres s'écrivent avec la virgule, et sans décimale au delà de dix.
const nombreFr = v => (Math.abs(v) >= 10 ? Math.round(v).toString() : v.toFixed(1).replace(".", ","));

const hhmm = s => {
  const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60);
  return h + " h " + String(m).padStart(2, "0");
};

// Bilan des sept derniers jours : ce qui est tombé face à ce que l'air a pris.
// Quinzaine d'une date de la série météo.
function quinzaineDe(iso) {
  const j = new Date(iso + "T12:00");
  return j.getMonth() * 2 + (j.getDate() <= 15 ? 1 : 2);
}

/* Lame d'eau du jour, par ordre de confiance décroissante : ce que le jardinier
   a lu dans son pluviomètre, puis ce qu'a mesuré le poste rattaché, puis la
   sortie du modèle. Le poste publie avec deux jours de retard, le modèle couvre
   donc toujours les journées les plus récentes. */
function lameDuJour(iso, modele) {
  const r = releves.get(iso);
  const perso = r && r.pluie_mm !== null && r.pluie_mm !== undefined ? Number(r.pluie_mm) : null;
  const poste = pluieStation.has(iso) ? pluieStation.get(iso) : null;
  const source = perso !== null ? "pluviometre" : poste !== null ? "station" : "modele";
  const pluie = perso !== null ? perso : poste !== null ? poste : (modele || 0);
  return { pluie, source, mesuree: source !== "modele",
           arrosage: r && r.arrosage_mm !== null && r.arrosage_mm !== undefined ? Number(r.arrosage_mm) : 0 };
}

/* Bilan hydrique du bulletin FAO 56, chapitre 8. Le sol est un réservoir dont on
   suit l'épuisement jour après jour : Dr = Dr veille moins la pluie et l'arrosage,
   plus la consommation de la culture. L'excédent au-dessus de la capacité au champ
   draine, l'épuisement ne descend pas sous zéro. Le calcul démarre trente jours en
   arrière, à la moitié de la réserve, valeur que la pluie du mois efface. */
function bilanHydrique() {
  const i = iJour();
  if (i < 1) return null;
  const g = jardinActif() || {};
  const texture = RESERVE_SOL[g.sol_texture] ? g.sol_texture : "limoneux";
  const taw = RESERVE_SOL[texture] * ZR_M;
  const d = meteo.daily;
  const kcDe = iso => kcParQuinzaine[quinzaineDe(iso)]
    || kcParQuinzaine[demi] || 0.85;

  let dr = taw / 2;
  const serie = [];
  for (let k = 0; k <= i; k++) {
    const l = lameDuJour(d.time[k], d.precipitation_sum[k]);
    const et0 = Number(d.et0_fao_evapotranspiration[k]) || 0;
    const etc = et0 * kcDe(d.time[k]);
    dr = Math.min(taw, Math.max(0, dr - l.pluie - l.arrosage + etc));
    serie.push({ jour: d.time[k], pluie: l.pluie, mesuree: l.mesuree, source: l.source,
                 arrosage: l.arrosage, et0, etc, dr });
  }

  // Seuil de confort, ajusté à la demande du jour comme le prévoit le bulletin.
  const etcJour = serie[serie.length - 1].etc;
  const p = Math.min(0.8, Math.max(0.1, P_BASE + 0.04 * (5 - etcJour)));
  const raw = p * taw;

  // Projection sur la prévision : combien de jours avant d'atteindre le seuil,
  // et quelle pluie est annoncée d'ici là.
  let sec = 0, cumulPluie = 0, drProj = dr;
  for (let k = i + 1; k < d.time.length; k++) {
    const pl = d.precipitation_sum[k] || 0;
    cumulPluie += pl;
    if (d.et0_fao_evapotranspiration[k] === null) break;
    drProj = Math.min(taw, Math.max(0, drProj - pl + (Number(d.et0_fao_evapotranspiration[k]) || 0) * kcDe(d.time[k])));
    if (drProj < raw) sec++; else break;
  }
  const prevue2 = (d.precipitation_sum[i + 1] || 0) + (d.precipitation_sum[i + 2] || 0);

  // Cumuls de la semaine écoulée, pour la lecture d'ensemble.
  let pluie7 = 0, demande7 = 0, apporte7 = 0;
  serie.slice(-7).forEach(x => { pluie7 += x.pluie; demande7 += x.etc; apporte7 += x.arrosage; });

  // La dose ne dépasse pas la fraction facilement utilisable : au-delà, l'eau
  // traverse la zone racinaire sans profiter à la culture.
  const dose = Math.min(dr, raw);
  const arroser = dr >= raw;
  const attendre = arroser && prevue2 >= dose * 0.8;
  return {
    texture, taw, raw, dr, p, etcJour, serie,
    reserve: Math.max(0, 1 - dr / taw),
    jours: arroser ? 0 : Math.max(1, sec),
    apport: Math.round(dose * 10) / 10,
    epuise: dr >= taw - 0.5,
    prevue: Math.round(prevue2 * 10) / 10,
    pluie7: Math.round(pluie7 * 10) / 10,
    demande7: Math.round(demande7 * 10) / 10,
    apporte7: Math.round(apporte7 * 10) / 10,
    etat: attendre ? "attendre" : arroser ? "arroser" : "confort",
  };
}

// Alertes du jour et des deux jours suivants, croisées avec le jardin.
/* Les alertes calculées ne répètent pas ce que la vigilance annonce déjà : une
   vigilance canicule couvre l'alerte de chaleur, et ainsi de suite. */
const VIGI_COUVRE = { 1: "vent", 2: "eau", 6: "chaud", 7: "froid" };

function alertesMeteo() {
  const i = iJour();
  if (i < 0) return [];
  const vg = vigilanceDuJour();
  const couverts = vg ? vg.ids.map(x => VIGI_COUVRE[x]).filter(Boolean) : [];
  const d = meteo.daily, out = [];
  const quand = k => k === i ? "aujourd'hui" : k === i + 1 ? "demain"
    : new Date(d.time[k] + "T12:00").toLocaleDateString("fr-FR", { weekday: "long" });
  for (let k = i; k <= Math.min(i + 2, d.time.length - 1); k++) {
    const tmin = d.temperature_2m_min[k], tmax = d.temperature_2m_max[k];
    if (tmin !== null && tmin <= 2) {
      const risque = [...sel].map(id => plantes.find(p => p.id === id)).filter(Boolean)
        .filter(p => p.gel !== null && p.gel !== undefined && Number(p.gel) > tmin)
        .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
      out.push({ ton: "froid", texte: `${Math.round(tmin)} °C ${quand(k)}`
        + (risque.length ? `, ${enumerer(risque.map(nomAvecArticle))} ne passe`
            + (risque.length > 1 ? "nt" : "") + " pas" : ", protéger les plus fragiles") });
      break;
    }
    if (tmax !== null && tmax >= 32) {
      out.push({ ton: "chaud", texte: `${Math.round(tmax)} °C ${quand(k)}, arroser tôt et ombrer les jeunes plants` });
      break;
    }
  }
  const v = d.wind_speed_10m_max[i];
  if (v !== null && v >= 60) out.push({ ton: "vent", texte: `Vent à ${Math.round(v)} km/h, tuteurer et rentrer les potées` });
  const p = d.precipitation_sum[i];
  if (p !== null && p >= 15) out.push({ ton: "eau", texte: `${Math.round(p)} mm attendus, inutile d'arroser` });
  return out.filter(x => couverts.indexOf(x.ton) === -1).slice(0, 2);
}

/* Le niveau retenu est le plus élevé des deux échéances : une vigilance orange
   annoncée pour demain compte autant qu'une vigilance en cours. */
function vigilanceDuJour() {
  const lot = vigilance.filter(v => v.couleur > 1);
  if (!lot.length) return null;
  const couleur = Math.max(...lot.map(v => v.couleur));
  const ids = [];
  lot.forEach(v => (v.phenomenes || []).forEach(p => {
    if (p.couleur === couleur && ids.indexOf(p.id) === -1) ids.push(p.id);
  }));
  if (!ids.length) return null;
  const demainSeul = !lot.some(v => v.echeance === "J" && v.couleur === couleur);
  return {
    couleur, ids,
    libelle: enumerer(ids.map(i => ALEA[i] || "phénomène " + i)) + (demainSeul ? ", demain" : ""),
    geste: ids.map(i => VIGI_GESTE[i]).filter(Boolean)[0] || "",
  };
}

// La pastille d'eau porte la décision du jour, non un écart à combler.
function puceEau(b) {
  if (!b) return ["eau", "réserve inconnue"];
  if (b.etat === "arroser") return [nombreFr(b.apport) + " mm", "à apporter"];
  if (b.etat === "attendre") return [nombreFr(b.prevue) + " mm", "annoncés, attendre"];
  return [b.jours + (b.jours > 1 ? " jours" : " jour"), "de réserve"];
}

function rendreBandeau() {
  const z = $("bandeau");
  if (!z) return;
  const g = jardinActif();
  if (!g) { z.hidden = true; return; }
  const tm = $("teteMeteo");
  if (tm) { tm.hidden = true; tm.innerHTML = ""; }
  if (!meteo || iJour() < 0) {
    // Sans position, la tuile de lumière et celle de saison restent calculables.
    z.innerHTML = g.code_postal ? "" : `<button type="button" class="bd-invite" data-vue="lieu">`
      + icoM("arc") + `<span>Situer le jardin pour la météo et l'arrosage réel</span></button>`;
    z.hidden = !z.innerHTML;
    brancherBandeau();
    return;
  }
  const d = meteo.daily, i = iJour();
  const [, lib, ico] = tempsDe(d.weather_code[i]);
  const b = bilanHydrique();
  const dur = d.daylight_duration[i], veille = d.daylight_duration[i - 1];
  const delta = Math.round((dur - veille) / 60);
  const sais = positionSaison();

  const tuile = (vue, icone, val, sous, ton) =>
    `<button type="button" class="bd-tuile${ton ? " t-" + ton : ""}" data-vue="${vue}">`
    + icoM(icone) + `<span class="bd-val">${val}</span><span class="bd-sous">${esc(sous)}</span></button>`;

  // La météo tient dans l'en-tête, en pastilles ; le corps ne porte que l'alerte.
  const t = $("teteMeteo");
  const puce = (vue, icone, val, sous) =>
    `<button type="button" class="tm-puce" data-vue="${vue}">${icoM(icone, "tm-ic")}`
    + `<b>${esc(val)}</b><span>${esc(sous)}</span></button>`;
  // Grand chiffre : la température de l'heure. Le code du jour est celui de la
  // condition la plus sévère des vingt-quatre heures, il annoncerait de la pluie
  // pour un dixième de millimètre tombé à midi.
  const ih = iHeure();
  const maintenant = ih >= 0
    ? { deg: meteo.hourly.temperature_2m[ih], lib: tempsDe(meteo.hourly.weather_code[ih])[1],
        vent: meteo.hourly.wind_speed_10m[ih] }
    : { deg: d.temperature_2m_max[i], lib, vent: d.wind_speed_10m_max[i] };
  t.innerHTML = `<button type="button" class="tm-temps" data-vue="temps">`
    + `<span class="tm-deg">${Math.round(maintenant.deg)}°</span>`
    + `<span class="tm-etat">${esc(maintenant.lib)}<small>`
    + `${Math.round(d.temperature_2m_max[i])}° le jour, ${Math.round(d.temperature_2m_min[i])}° la nuit, `
    + `vent ${Math.round(maintenant.vent)} km/h</small></span></button>`
    + `<div class="tm-puces">`
    + puce("eau", "goutte", ...puceEau(b))
    + puce("lumiere", "arc", hhmm(dur), (delta >= 0 ? "+" : "−") + Math.abs(delta) + " min")
    + puce("saison", "feuille", sais.court.toLowerCase(), sais.sous)
    + `</div>`;
  t.hidden = false;
  t.querySelectorAll("[data-vue]").forEach(x =>
    x.addEventListener("click", () => ouvrirVue(x.dataset.vue)));

  const h = [];
  // La vigilance de Météo-France passe avant les alertes calculées : elle porte
  // un avis officiel, les autres ne sont qu'une lecture de la prévision.
  const vg = vigilanceDuJour();
  if (vg) h.push(`<button type="button" class="bd-alerte bd-vigi v-${vg.couleur}" data-vue="vigilance">`
    + icoM("alerte", "bd-ia")
    + `<span><b>Vigilance ${esc(VIGI_NOM[vg.couleur])}</b>, ${esc(vg.libelle)}`
    + (vg.geste ? `<small>${esc(vg.geste)}</small>` : "") + `</span></button>`);
  alertesMeteo().forEach(a => h.push(`<p class="bd-alerte a-${a.ton}">${icoM("alerte", "bd-ia")}`
    + `<span>${esc(a.texte)}</span></p>`));
  z.innerHTML = h.join("");
  z.hidden = !h.length;
  brancherBandeau();
}

function brancherBandeau() {
  const z = $("bandeau");
  z.querySelectorAll("[data-vue]").forEach(b =>
    b.addEventListener("click", () => ouvrirVue(b.dataset.vue)));
}

// Position dans la saison de végétation et compte à rebours de la première gelée.
function positionSaison() {
  const s = saison[(jardinActif() || {}).climate_key];
  if (!s) return { court: "quinzaine " + demi, sous: "sur 24" };
  const etape = demi < s.debut_q ? "Repos" : demi < s.pleine_q ? "Reprise"
    : demi < s.senescence_q ? "Pleine" : demi <= s.fin_q ? "Déclin" : "Repos";
  const long = { Repos: "repos végétatif", Reprise: "reprise de végétation",
    Pleine: "pleine saison", "Déclin": "ralentissement" }[etape];
  const reste = ((s.fin_q - demi) % 24 + 24) % 24;
  const m = MOIS_ABR[Math.ceil(s.fin_q / 2) - 1];
  return { court: etape, long,
    sous: reste ? "gelée " + (s.fin_q % 2 ? "début " : "fin ") + m : "gelée imminente" };
}

/* ---------- Deuxième profondeur, en feuille ---------- */

function ouvrirVue(vue) {
  fermerGlose();
  const rendus = { temps: vueTemps, eau: vueEau, lumiere: vueLumiere,
                   saison: vueSaison, lieu: vueLieu, vigilance: vueVigilance };
  const f = (rendus[vue] || vueLieu)();
  $("feuille-titre").innerHTML = esc(f.titre)
    + (f.sous ? `<span class="feuille-latin">${esc(f.sous)}</span>` : "");
  $("feuille-corps").innerHTML = `<div class="fiche-v2">${f.corps}</div>`;
  $("feuille-corps").scrollTop = 0;
  poserEtatFeuille();
  $("voile").hidden = false;
  $("feuille").hidden = false;
  document.body.classList.add("fige");
  requestAnimationFrame(() => {
    $("voile").classList.add("visible");
    $("feuille").classList.add("ouverte");
    $("feuille").focus();
  });
  if (typeof f.brancher === "function") f.brancher();
  if (vue === "lieu") brancherLieu();
}

const jourCourt = t => new Date(t + "T12:00")
  .toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "");

function vueTemps() {
  const d = meteo.daily, i = iJour();
  const lignes = [];
  for (let k = i; k <= Math.min(i + 6, d.time.length - 1); k++) {
    // Une journée sans température n'est pas une journée à zéro degré : au-delà
    // de son horizon le modèle ne rend rien, et la ligne ne doit pas exister.
    const tx = d.temperature_2m_max[k], tn = d.temperature_2m_min[k];
    if (tx === null || tx === undefined) continue;
    const [, lib, ico] = tempsDe(d.weather_code[k]);
    const p = d.precipitation_sum[k];
    lignes.push(`<tr><th>${k === i ? "aujourd'hui" : esc(jourCourt(d.time[k]))}</th>`
      + `<td class="mt-ic">${icoM(ico)}</td><td class="mt-lib">${esc(lib)}</td>`
      + `<td class="mt-t"><b>${Math.round(tx)}°</b> `
      + `<span>${tn === null || tn === undefined ? "" : Math.round(tn) + "°"}</span></td>`
      + `<td class="mt-p">${p >= 0.2 ? p.toFixed(1).replace(".", ",") + " mm" : ""}</td></tr>`);
  }
  return { titre: lignes.length > 1 ? lignes.length + " jours" : "Aujourd'hui",
    sous: (jardinActif() || {}).commune || "",
    corps: `<table class="mt-table">${lignes.join("")}</table>`
      + `<p class="f-note">Prévision Open-Meteo, combinaison automatique des meilleurs `
      + `modèles disponibles au point du jardin. Relecture toutes les heures.</p>` };
}

function vueEau() {
  const b = bilanHydrique(), d = meteo.daily, i = iJour();
  if (!b) return { titre: "L'eau", corps: "" };

  // Huit jours passés et trois annoncés, la pluie mesurée se distingue de la
  // pluie du modèle par un aplat plein.
  const barres = [];
  for (let k = Math.max(0, i - 7); k <= Math.min(i + 3, d.time.length - 1); k++) {
    const l = lameDuJour(d.time[k], d.precipitation_sum[k]);
    const pl = k > i ? (d.precipitation_sum[k] || 0) : l.pluie + l.arrosage;
    const e = (d.et0_fao_evapotranspiration[k] || 0)
      * (kcParQuinzaine[quinzaineDe(d.time[k])] || kcParQuinzaine[demi] || 0.85);
    const m = Math.max(8, pl, e);
    const ton = k > i ? "" : l.source === "pluviometre" ? " mesure"
      : l.source === "station" ? " poste" : "";
    barres.push(`<div class="mt-col${k === i ? " ce-jour" : ""}${k > i ? " a-venir" : ""}">`
      + `<span class="mt-duo">`
      + `<i class="mt-bp${ton}" style="height:${(pl / m * 46).toFixed(0)}px" `
      + `title="${nombreFr(pl)} mm"></i>`
      + `<i class="mt-be" style="height:${(e / m * 46).toFixed(0)}px" title="${nombreFr(e)} mm repris"></i>`
      + `</span><span class="mt-j">${esc(jourCourt(d.time[k]))}</span></div>`);
  }

  const nbMesures = b.serie.slice(-30).filter(x => x.source === "station").length;
  const pleine = Math.round(b.reserve * 100);
  const seuil = Math.round((1 - b.raw / b.taw) * 100);
  const conseil = b.etat === "arroser"
    ? `Le sol est sous son seuil de confort. Apporter <b>${nombreFr(b.apport)} mm</b>, `
      + `soit ${nombreFr(b.apport)} litres par mètre carré. Au-delà, l'eau passe sous les racines.`
    : b.etat === "attendre"
      ? `Le seuil est atteint, mais il est annoncé <b>${nombreFr(b.prevue)} mm</b> dans les deux jours. Attendre.`
      : `La réserve tient encore <b>${b.jours}</b> jour${b.jours > 1 ? "s" : ""} `
        + `avant d'atteindre le seuil. Rien à apporter.`;

  const lignes = [];
  for (let k = i; k >= Math.max(0, i - 2); k--) {
    const iso = d.time[k], r = releves.get(iso) || {};
    const nom = k === i ? "aujourd'hui" : k === i - 1 ? "hier" : "avant-hier";
    lignes.push(`<div class="rel-ligne" data-jour="${esc(iso)}">`
      + `<span class="rel-j">${esc(nom)}<small>modèle ${nombreFr(d.precipitation_sum[k] || 0)} mm</small></span>`
      + `<label class="rel-ch"><input type="number" step="0.5" min="0" max="400" `
      + `inputmode="decimal" class="rel-pluie" aria-label="Pluie relevée ${esc(nom)}" `
      + `value="${r.pluie_mm === null || r.pluie_mm === undefined ? "" : r.pluie_mm}"><span>pluie</span></label>`
      + `<label class="rel-ch"><input type="number" step="0.5" min="0" max="200" `
      + `inputmode="decimal" class="rel-arros" aria-label="Arrosage apporté ${esc(nom)}" `
      + `value="${r.arrosage_mm === null || r.arrosage_mm === undefined ? "" : r.arrosage_mm}"><span>arrosage</span></label>`
      + `</div>`);
  }

  const sols = Object.keys(RESERVE_SOL).map(t =>
    `<button type="button" class="sol-opt${t === b.texture ? " actif" : ""}" data-sol="${t}">`
    + `${esc(SOL_LIBELLE[t])}<small>${RESERVE_SOL[t]} mm/m</small></button>`).join("");

  return { titre: "L'eau", sous: "réserve du sol",
    corps: `<div class="f-carte">`
      + `<div class="jauge-sol" style="--pleine:${pleine}%;--seuil:${seuil}%">`
      + `<i class="js-eau"></i><i class="js-seuil"></i></div>`
      + `<p class="js-leg"><b>${pleine} %</b> de la réserve<span>seuil de confort à ${seuil} %</span></p>`
      + `</div>`
      + `<p class="f-txt">${conseil}</p>`
      + `<div class="f-carte"><div class="mt-barres">${barres.join("")}</div>`
      + `<p class="mt-leg"><i class="p"></i>modèle <i class="s"></i>poste `
      + `<i class="m"></i>votre relevé <i class="e"></i>consommation</p></div>`
      + `<p class="f-txt">Sur sept jours, <b>${nombreFr(b.pluie7)} mm</b> sont tombés`
      + (b.apporte7 ? ` et <b>${nombreFr(b.apporte7)} mm</b> ont été apportés` : "")
      + `, les cultures en ont repris <b>${nombreFr(b.demande7)} mm</b>.</p>`
      + (station
        ? `<div class="f-carte"><div class="f-carte-tete"><h3>Poste de mesure</h3></div>`
          + `<p class="f-txt"><b>${esc(station.libelle)}</b>, à ${nombreFr(station.km)} km. `
          + `${nbMesures} des trente derniers jours viennent de ses relevés, le reste du modèle, `
          + `le poste publiant avec deux jours de retard.</p>`
          + `<p class="f-note">Fichiers ouverts de Météo-France publiés sur data.gouv.fr, `
          + `relevés chaque matin. Les valeurs douteuses sont écartées.</p></div>`
        : `<p class="f-note">Aucun poste de mesure rattaché à ce jardin, la pluie vient du modèle. `
          + `Renseignez la commune pour rattacher le poste le plus proche.</p>`)
      + `<div class="f-carte"><div class="f-carte-tete"><h3>Vos relevés</h3></div>`
      + `<p class="f-note">Un millimètre vaut un litre par mètre carré. Ce que vous mesurez `
      + `remplace la lame d'eau du modèle. Le calcul ne connaît que ce qui est enregistré, `
      + `notez vos arrosages pour qu'il reste juste.</p>`
      + `<div class="rel-table">${lignes.join("")}</div>`
      + `<p class="f-note" id="rel-note"></p></div>`
      + `<div class="f-carte"><div class="f-carte-tete"><h3>Texture du sol</h3></div>`
      + `<div class="sol-choix">${sols}</div>`
      + `<p class="f-note" id="sol-note">Elle fixe la réserve utile. Sur ${esc(ZR_M * 100)} cm `
      + `de profondeur, votre sol retient ${nombreFr(b.taw)} mm.</p></div>`
      + `<p class="f-note">Bilan hydrique du bulletin FAO 56, chapitre 8. Évapotranspiration de `
      + `référence calculée au point du jardin, coefficient cultural moyen des plantes retenues, `
      + `seuil de confort ajusté à la demande du jour. Le litrage par plante de la fiche reste `
      + `calé sur la normale de saison.</p>`,
    brancher: brancherEau };
}

// Saisie des relevés et choix de la texture, dans la feuille de l'eau.
function brancherEau() {
  const note = $("rel-note");
  const enregistrer = async ligne => {
    const jour = ligne.dataset.jour;
    const lire = s => {
      const v = ligne.querySelector(s).value.trim();
      if (v === "") return null;
      const n = Number(v.replace(",", "."));
      return Number.isFinite(n) && n >= 0 ? Math.round(n * 10) / 10 : null;
    };
    const r = await ecrireReleve(jour, lire(".rel-pluie"), lire(".rel-arros"));
    if (r && r.error) { note.textContent = "Enregistrement refusé : " + r.error.message; return; }
    note.textContent = "Relevé enregistré.";
    rendreBandeau();
  };
  // La saisie enregistre au fil de l'eau, la feuille ne se redessine qu'une fois
  // le tableau quitté : redessiner à chaque champ ferait perdre la frappe suivante.
  const table = document.querySelector(".rel-table");
  if (table) {
    table.querySelectorAll("input").forEach(c =>
      c.addEventListener("change", () => enregistrer(c.closest(".rel-ligne"))));
    table.addEventListener("focusout", e => {
      if (table.contains(e.relatedTarget)) return;
      setTimeout(() => { if (!$("feuille").hidden && document.querySelector(".rel-table")) ouvrirVue("eau"); }, 0);
    });
  }
  document.querySelectorAll(".sol-opt").forEach(b => b.addEventListener("click", async () => {
    const g = jardinActif();
    if (!g || !session) { $("sol-note").textContent = "Connectez-vous pour enregistrer la texture."; return; }
    const { error } = await db.from("gardens").update({ sol_texture: b.dataset.sol }).eq("id", g.id);
    if (error) { $("sol-note").textContent = "Enregistrement refusé : " + error.message; return; }
    g.sol_texture = b.dataset.sol;
    document.querySelectorAll(".sol-opt").forEach(x => x.classList.toggle("actif", x === b));
    rendreBandeau();
    ouvrirVue("eau");
  }));
}

function vueLumiere() {
  const d = meteo.daily, i = iJour();
  const dur = d.daylight_duration[i];
  const delta = Math.round((dur - d.daylight_duration[i - 1]) / 60);
  const solstice = Math.max(...d.daylight_duration);
  const lever = d.sunrise[i].slice(11, 16).replace(":", " h ");
  const coucher = d.sunset[i].slice(11, 16).replace(":", " h ");
  const sens = delta >= 0 ? "s'allongent" : "raccourcissent";
  return { titre: "La lumière", sous: hhmm(dur) + " de jour",
    corps: `<dl class="f-kv"><dt>Lever</dt><dd>${esc(lever)}</dd>`
      + `<dt>Coucher</dt><dd>${esc(coucher)}</dd>`
      + `<dt>Durée</dt><dd>${esc(hhmm(dur))}</dd>`
      + `<dt>Variation</dt><dd>${delta >= 0 ? "+" : "−"}${Math.abs(delta)} min par jour</dd></dl>`
      + `<p class="f-txt">Les jours ${sens} de ${Math.abs(delta)} minutes. `
      + `La lumière décide de la montée à graine des salades et des épinards, et de la `
      + `date à partir de laquelle un semis sous abri ne rattrape plus son retard.</p>`
      + `<p class="f-note">Lever et coucher calculés au point du jardin.</p>` };
}

function vueSaison() {
  const s = saison[(jardinActif() || {}).climate_key];
  const p = positionSaison();
  const froid = [...sel].map(id => plantes.find(x => x.id === id)).filter(Boolean)
    .filter(x => x.gel !== null && x.gel !== undefined && Number(x.gel) >= -2)
    .sort((a, b) => Number(b.gel) - Number(a.gel)).slice(0, 6);
  return { titre: "La saison", sous: p.long || p.court,
    corps: (s ? `<dl class="f-kv"><dt>Reprise</dt><dd>${esc(demiTexte(s.debut_q))}</dd>`
      + `<dt>Pleine saison</dt><dd>${esc(demiTexte(s.pleine_q))}</dd>`
      + `<dt>Ralentissement</dt><dd>${esc(demiTexte(s.senescence_q))}</dd>`
      + `<dt>Première gelée</dt><dd>${esc(demiTexte(s.fin_q))}</dd></dl>` : "")
      + (froid.length ? `<p class="f-txt">Les plus exposées à la première gelée : `
        + `${esc(enumerer(froid.map(nomAvecArticle), 6))}.</p>` : "")
      + `<p class="f-note">Bornes de saison par climat, table du référentiel. `
      + `Le seuil de gel est celui de chaque fiche.</p>` };
}

function vueVigilance() {
  const vg = vigilanceDuJour();
  const g = jardinActif() || {};
  if (!vg) return { titre: "Vigilance", corps: `<p class="f-txt">Aucune vigilance en cours.</p>` };
  const quand = e => e === "J" ? "aujourd'hui" : "demain";
  const lignes = vigilance.filter(v => v.couleur > 1).map(v =>
    `<div class="vg-ligne v-${v.couleur}"><span class="vg-pastille"></span>`
    + `<span class="vg-txt"><b>${esc(quand(v.echeance))}</b>, vigilance ${esc(VIGI_NOM[v.couleur])} `
    + `${esc(enumerer((v.phenomenes || []).map(p => ALEA[p.id] || "phénomène " + p.id)))}</span></div>`).join("");
  const bulletin = (vigilance.find(v => v.texte) || {}).texte;
  const emis = (vigilance.find(v => v.emis_le) || {}).emis_le;
  const gestes = vg.ids.map(i => VIGI_GESTE[i]).filter(Boolean);
  return { titre: "Vigilance " + VIGI_NOM[vg.couleur], sous: g.commune || "",
    corps: `<div class="f-carte">${lignes}</div>`
      + (gestes.length ? `<p class="f-txt"><b>Au jardin</b> : ${esc(gestes.join(". "))}.</p>` : "")
      + (bulletin ? `<div class="f-carte"><div class="f-carte-tete"><h3>Bulletin du département</h3></div>`
          + `<p class="f-txt">${esc(bulletin)}</p></div>` : "")
      + `<p class="f-note">Vigilance météorologique de Météo-France pour le département `
      + `${esc(departementDe(g.code_postal) || "")}`
      + (emis ? `, émise le ${esc(new Date(emis).toLocaleString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }))}` : "")
      + `. Fichiers ouverts publiés sur data.gouv.fr, relus toutes les deux heures.</p>` };
}

function vueLieu() {
  const g = jardinActif() || {};
  return { titre: "Situer le jardin", sous: g.commune || "",
    corps: `<p class="f-txt">La commune sert à lire la météo du lieu plutôt que la `
      + `normale du climat, et à corriger l'arrosage de la pluie tombée.</p>`
      + `<form class="mt-form" id="form-lieu"><input id="cp" type="text" `
      + `placeholder="Nom de commune ou code postal" value="${esc(g.commune || g.code_postal || "")}" `
      + `aria-label="Commune ou code postal"><button class="bouton" type="submit">Chercher</button></form>`
      + `<div id="cp-liste"></div>`
      + `<p class="f-note" id="cp-note">Un code postal couvre souvent plusieurs communes, `
      + `il faut donc choisir la vôtre. Recherche par la Base Adresse Nationale, `
      + `api-adresse.data.gouv.fr. Aucune position précise n'est demandée.</p>` };
}

function brancherLieu() {
  const f = $("form-lieu");
  if (!f) return;
  const note = $("cp-note"), liste = $("cp-liste");

  const retenir = async t => {
    const [lon, lat] = t.geometry.coordinates;
    const g = jardinActif();
    const val = { code_postal: t.properties.postcode || null,
      commune: t.properties.city || t.properties.name || t.properties.label,
      lat: Number(lat.toFixed(5)), lon: Number(lon.toFixed(5)) };
    const { error } = await db.from("gardens").update(val).eq("id", g.id);
    if (error) { note.textContent = "Enregistrement refusé : " + error.message; return; }
    Object.assign(g, val);
    liste.innerHTML = "";
    note.textContent = val.commune + ", position enregistrée.";
    await lireMeteo(g);
    rendreMaintenant();
    majJardinUI();
    setTimeout(sortirFeuille, 700);
  };

  f.addEventListener("submit", async e => {
    e.preventDefault();
    const v = ($("cp").value || "").trim();
    if (v.length < 2) { note.textContent = "Saisissez un nom de commune ou un code postal."; return; }
    note.textContent = "Recherche...";
    liste.innerHTML = "";
    try {
      const r = await fetch("https://api-adresse.data.gouv.fr/search/?type=municipality&limit=10&q="
        + encodeURIComponent(v));
      const j = await r.json();
      const lot = j.features || [];
      if (!lot.length) { note.textContent = "Aucune commune trouvée."; return; }
      if (lot.length === 1) { await retenir(lot[0]); return; }
      // Plusieurs communes partagent le code : le choix revient au jardinier.
      note.textContent = lot.length + " communes correspondent, choisissez la vôtre.";
      lot.forEach(t => {
        const b = document.createElement("button");
        b.type = "button"; b.className = "cp-choix";
        b.innerHTML = `<b>${esc(t.properties.city || t.properties.name)}</b>`
          + `<span>${esc(t.properties.postcode || "")}</span>`;
        b.addEventListener("click", () => retenir(t));
        liste.appendChild(b);
      });
    } catch (err) { note.textContent = "Service indisponible, réessayez plus tard."; }
  });
}

/* ================== Synthèse d'accueil ==================
   Ce qu'il y a à faire, en phrases. Une action qui se termine cette quinzaine
   ouvre la synthèse, le reste suit en lignes de verbe. La floraison n'est pas
   un geste, elle passe en pied. L'eau est un chiffre, elle a sa ligne. */

function rendreSynthese(paires) {
  const z = $("synthese");
  if (!z) return;
  const audibles = paires.filter(x => !x.muet);
  if (!audibles.length) { z.hidden = true; z.innerHTML = ""; return; }

  // Une entrée par verbe et non par tâche : la multiplication porte le mode de
  // chaque fiche, on ne divise pas un pêcher qui se greffe.
  const ferme = (p, k) => (segsDe(p, k) || [])
    .some(t => dansFenetre(demi, t[0], t[1]) && t[1] === demi);
  const groupes = [];
  ORDRE_MAINTENANT.forEach(k => {
    if (!phases[k]) return;
    const parVerbe = new Map();
    audibles.filter(x => x.k === k).forEach(x => {
      const v = verbeDe(x.p, k);
      if (!parVerbe.has(v)) parVerbe.set(v, new Map());
      parVerbe.get(v).set(x.p.id, x.p);
    });
    parVerbe.forEach((m, v) => {
      const plantes = [...m.values()].sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
      groupes.push({ k, verbe: v, plantes, presse: plantes.filter(p => ferme(p, k)) });
    });
  });
  const gestes = groupes.filter(g => ETATS_FICHE.indexOf(g.k) === -1);
  const etats = groupes.filter(g => ETATS_FICHE.indexOf(g.k) !== -1);
  if (!gestes.length && !etats.length) { z.hidden = true; z.innerHTML = ""; return; }

  // La phrase de tête ne porte que ce qui se termine, et ne nomme que ces
  // plantes-là. Sans rien qui presse, elle prend la tâche la moins rattrapable.
  const urgents = gestes.filter(g => g.presse.length);
  const tete = (urgents.length ? urgents : gestes).slice(0, 2)
    .map(g => ({ g, plantes: urgents.length ? g.presse : g.plantes, presse: Boolean(urgents.length) }));

  const bout = liste => enumerer(liste.map(nomAvecArticle));
  // Quatre plantes nommées par ligne au total, quel que soit le nombre de verbes.
  const texteLigne = l => {
    if (l.parts.length === 1) return bout(l.parts[0].plantes);
    let budget = 4, dits = [], reste = 0;
    l.parts.forEach(pa => {
      const pris = pa.plantes.slice(0, Math.max(0, budget));
      reste += pa.plantes.length - pris.length;
      budget -= pris.length;
      if (pris.length) dits.push(pa.verbe.toLowerCase() + " " + enumerer(pris.map(nomAvecArticle), 4));
    });
    return dits.join(", ") + (reste ? " et " + reste + " autre" + (reste > 1 ? "s" : "") : "");
  };
  const h = [];
  if (tete.length) {
    // Le verbe de la phrase de tête ouvre lui aussi sa tâche : une tâche dont
    // toutes les plantes sont citées ici n'a pas de ligne en dessous.
    const phrases = tete.map(t => `<button type="button" class="syn-verbe" data-tache="${esc(t.g.k)}">`
      + `${esc(t.g.verbe.toLowerCase())}</button> ${esc(bout(t.plantes))}`);
    h.push(`<p class="syn-tete">En ce moment, ${phrases.join(" et ")}`
      + (tete[0].presse ? ' <span class="fin">avant la fin de la quinzaine</span>' : "") + ".</p>");
  }

  // Les lignes reprennent le reste, la plante déjà nommée en tête n'y revient pas.
  // Une ligne par tâche. Quand la tâche porte plusieurs verbes, cas de la
  // multiplication, la ligne prend le verbe générique et chaque verbe exact
  // reste devant ses plantes : on ne divise pas un pêcher qui se greffe.
  let lignes = [];
  gestes.forEach(g => {
    const dit = tete.find(t => t.g === g);
    let reste = dit ? g.plantes.filter(p => dit.plantes.indexOf(p) === -1) : g.plantes;
    if (!reste.length) return;
    const presse = !dit && g.presse.length > 0;
    if (presse) reste = g.presse.concat(reste.filter(p => g.presse.indexOf(p) === -1));
    const deja = lignes.find(l => l.k === g.k);
    if (deja) {
      deja.parts.push({ verbe: g.verbe, plantes: reste });
      deja.total += reste.length;
      deja.presse = deja.presse || presse;
    } else {
      lignes.push({ k: g.k, verbe: VERBE[g.k], parts: [{ verbe: g.verbe, plantes: reste }],
                    total: reste.length, presse });
    }
  });
  // Au delà de six lignes la synthèse redevient la liste. Ce qui saute est le
  // geste qui porte le moins de plantes, jamais celui dont la fenêtre se ferme,
  // sans quoi la récolte d'août tomberait la première pour être en fin d'ordre.
  const MAX_LIGNES = 6;
  let trop = [];
  if (lignes.length > MAX_LIGNES) {
    const gardees = lignes.slice()
      .sort((a, b) => (Number(b.presse) - Number(a.presse)) || (b.total - a.total))
      .slice(0, MAX_LIGNES);
    trop = lignes.filter(l => gardees.indexOf(l) === -1);
    lignes = lignes.filter(l => gardees.indexOf(l) !== -1);
  }
  // Le compte porté par la ligne est celui de la tâche entière, il annonce donc
  // exactement ce que le niveau de détail affichera.
  const compteK = {};
  audibles.forEach(x => { compteK[x.k] = (compteK[x.k] || 0) + 1; });
  const CHEVRON = '<svg class="syn-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
  if (lignes.length) {
    h.push('<div class="syn-lignes">' + lignes.map(l =>
      `<button type="button" class="syn-ligne" data-tache="${esc(l.k)}">`
      + `<span class="syn-pt" style="background:${teinteK(l.k)}">`
      + `<svg viewBox="0 0 24 24" aria-hidden="true">${PICTOS[l.k] || ""}</svg></span>`
      + `<span class="syn-txt"><span class="v">${esc(l.parts.length > 1 ? l.verbe : l.parts[0].verbe)}</span> `
      + `<span class="l">${esc(texteLigne(l))}`
      + (l.presse ? ' <span class="fin">· dernière quinzaine</span>' : "")
      + `</span></span><span class="syn-nb">${compteK[l.k] || l.total}</span>${CHEVRON}</button>`).join("")
      + (trop.length ? `<button type="button" class="syn-ligne syn-plus" data-tache="">`
        + `<span class="syn-pt syn-pt-vide"></span>`
        + `<span class="syn-txt"><span class="l">et ${trop.length} autre${trop.length > 1 ? "s" : ""} geste`
        + `${trop.length > 1 ? "s" : ""} : ${esc(trop.map(l => (l.parts.length > 1 ? l.verbe : l.parts[0].verbe).toLowerCase()).join(", "))}`
        + `</span></span><span class="syn-nb">${trop.reduce((a, l) => a + (compteK[l.k] || 0), 0)}</span>${CHEVRON}</button>` : "")
      + "</div>");
  }

  const pied = [];
  etats.forEach(g => {
    const n = g.plantes.length;
    // Au delà de quatre, nommer les plantes en fleur devient une liste.
    pied.push(n > 4 ? n + " plantes sont en fleur"
      : bout(g.plantes) + (n > 1 ? " sont en fleur" : " est en fleur"));
  });
  // L'eau du pied dit la décision du jour, tirée du bilan du sol. Sans position
  // du jardin, elle retombe sur le besoin moyen de la normale de saison.
  const bh = meteo ? bilanHydrique() : null;
  if (bh && bh.etat === "arroser") {
    pied.push(`arroser environ <b>${nombreFr(bh.apport)} litres par m²</b> sur les cultures arrosées`);
  } else if (bh && bh.etat === "attendre") {
    pied.push(`ne pas arroser, il est annoncé <b>${nombreFr(bh.prevue)} mm</b>`);
  } else if (bh) {
    pied.push(`ne pas arroser, la réserve du sol tient <b>${bh.jours} jour${bh.jours > 1 ? "s" : ""}</b>`);
  } else {
    const eau = besoinEauDuJour();
    if (eau) pied.push(`compter <b>${esc(eau)}</b> et par jour sur les cultures arrosées`);
  }
  if (pied.length) {
    const t = pied.join(", ");
    h.push(`<p class="syn-pied">${t.charAt(0).toUpperCase() + t.slice(1)}.</p>`);
  }

  z.innerHTML = h.join("");
  z.hidden = false;
  // Un clic sur une ligne ouvre la tâche, la ligne de reste ouvre la liste complète.
  z.querySelectorAll(".syn-ligne,.syn-verbe").forEach(b => b.addEventListener("click", e => {
    e.stopPropagation();
    const k = b.dataset.tache;
    ouvrirDetail(k ? { t: "tache", k } : { t: "tout" });
  }));
}

// Besoin en eau de la quinzaine, une seule ligne par plante retenue.
let eauJour = [];

async function lireEauDuJour(cle) {
  eauJour = [];
  kcParQuinzaine = {};
  if (!cle || !sel.size) return;
  // Le bilan hydrique remonte à trente jours et se projette sur une semaine, il
  // traverse donc jusqu'à trois quinzaines.
  const qs = [-2, -1, 0, 1].map(d => ((demi - 1 + d + 24) % 24) + 1);
  const { data } = await avecReprise(() => db.from("arrosage_plante_quinzaine")
    .select("plant_id,quinzaine,kc,litres_jour_m2").eq("climate_key", cle)
    .in("quinzaine", qs).in("plant_id", [...sel]));
  const lot = data || [];
  eauJour = lot.filter(r => r.quinzaine === demi && r.litres_jour_m2 !== null);
  // Coefficient cultural moyen du jardin, quinzaine par quinzaine. Les plantes
  // sans calcul, contenants et cultures sans arrosage, ne comptent pas.
  qs.forEach(q => {
    const v = lot.filter(r => r.quinzaine === q && r.kc !== null).map(r => Number(r.kc));
    if (v.length) kcParQuinzaine[q] = v.reduce((s, x) => s + x, 0) / v.length;
  });
}

// Vocabulaire horticole, lu une fois au démarrage et indépendant du jardin.
async function lireGlossaire() {
  const { data } = await avecReprise(() => db.from("glossaire")
    .select("terme,variantes,definition").order("terme"));
  glossaire = data || [];
  compilerGlossaire();
}

async function lireVigilance() {
  vigilance = [];
  const g = jardinActif();
  const dep = g && departementDe(g.code_postal);
  if (!dep) return;
  const { data } = await avecReprise(() => db.from("vigilance")
    .select("echeance,couleur,phenomenes,debut,fin,texte,emis_le").eq("departement", dep));
  vigilance = (data || []).sort((a, b) => a.echeance.localeCompare(b.echeance));
}

// Distance à vol d'oiseau entre deux points, en kilomètres.
const distanceKm = (la, lo, lb, ob) => {
  const r = Math.PI / 180;
  return 6371 * Math.acos(Math.min(1,
    Math.sin(la * r) * Math.sin(lb * r) +
    Math.cos(la * r) * Math.cos(lb * r) * Math.cos((ob - lo) * r)));
};

// Poste de mesure du jardin et sa pluie sur la fenêtre du bilan. Le poste est
// rattaché en base au plus proche de la commune, à moins de quarante kilomètres.
async function lireStation() {
  pluieStation = new Map(); station = null;
  const g = jardinActif();
  if (!g || !g.station_num) return;
  const depuis = new Date(Date.now() - 40 * 86400000).toISOString().slice(0, 10);
  const [rs, rp] = await Promise.all([
    avecReprise(() => db.from("stations_meteo")
      .select("num,nom,lat,lon,dernier_jour").eq("num", g.station_num).single()),
    avecReprise(() => db.from("pluie_station")
      .select("jour,rr_mm,qualite").eq("num", g.station_num).gte("jour", depuis)),
  ]);
  if (rs && rs.data) {
    station = rs.data;
    station.km = Math.round(distanceKm(g.lat, g.lon, station.lat, station.lon) * 10) / 10;
    // Le nom du poste est écrit en capitales dans la source, avec des suffixes
    // de réseau qui n'apprennent rien au jardinier.
    station.libelle = String(station.nom).replace(/_[A-Z]+$/, "")
      .toLowerCase().replace(/(^|[\s-])([a-zà-ÿ])/g, (m, s, c) => s + c.toUpperCase());
  }
  // Une valeur douteuse ou filtrée n'entre pas dans le bilan.
  (rp && rp.data ? rp.data : []).forEach(r => {
    if (r.rr_mm !== null && (r.qualite === null || r.qualite <= 1)) pluieStation.set(r.jour, Number(r.rr_mm));
  });
}

// Relevés du jardinier sur la fenêtre du bilan, indexés par jour.
async function lireReleves() {
  releves = new Map();
  const g = jardinActif();
  if (!g || !session) return;
  const depuis = new Date(Date.now() - 40 * 86400000).toISOString().slice(0, 10);
  const { data } = await avecReprise(() => db.from("releves_eau")
    .select("jour,pluie_mm,arrosage_mm").eq("garden_id", g.id).gte("jour", depuis));
  (data || []).forEach(r => releves.set(r.jour, r));
}

// Une saisie efface sa ligne quand les deux mesures sont vides.
async function ecrireReleve(jour, pluie, arrosage) {
  const g = jardinActif();
  if (!g || !session) return { error: { message: "Connectez-vous pour enregistrer un relevé." } };
  if (pluie === null && arrosage === null) {
    releves.delete(jour);
    return await db.from("releves_eau").delete().eq("garden_id", g.id).eq("jour", jour);
  }
  const ligne = { garden_id: g.id, jour, pluie_mm: pluie, arrosage_mm: arrosage };
  const r = await db.from("releves_eau").upsert(ligne, { onConflict: "garden_id,jour" });
  if (!r.error) releves.set(jour, ligne);
  return r;
}

// Moyenne des besoins calculés, les plantes sans calcul ne comptent pas.
function besoinEauDuJour() {
  if (!eauJour.length) return "";
  const m = eauJour.reduce((a, r) => a + Number(r.litres_jour_m2), 0) / eauJour.length;
  return m.toFixed(1).replace(".", ",") + " L par m²";
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

  const vc = $("valCommune");
  if (vc) vc.textContent = g && g.commune
    ? g.commune + (g.code_postal ? ", " + g.code_postal : "") : "non renseignée";

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
      l.innerHTML = `<button type="button" class="nom-espace">${esc(p.nom)}</button>`
        + `<input class="qte" type="number" min="0" max="32000" placeholder="qté" value="${r.quantity ?? ""}">`
        + `<input class="notes" type="text" maxlength="200" placeholder="note" value="${esc(r.notes ?? "")}">`;
      l.querySelector(".nom-espace").addEventListener("click", () => ouvrirFeuille(p));
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
lireGlossaire().catch(() => { /* glossaire indisponible, les textes restent bruts */ });
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
sur("btnCommune", "click", () => ouvrirVue("lieu"));

/* ================== Feuille de détail ================== */

// Le besoin en eau se lit à l'ouverture, une requête par plante et par climat.
async function chargerEau(p) {
  const g = jardinActif();
  const cle = (g && g.climate_key) || "oceanique_degrade";
  if (p.eauCle === cle) return;
  const { data } = await avecReprise(() => db.from("arrosage_plante_quinzaine")
    .select("quinzaine,litres_jour_m2,unite,niveau,irrigation_mode,reprise_dose_litres,reprise_intervalle_jours")
    .eq("plant_id", p.id).eq("climate_key", cle).order("quinzaine"));
  p.eauCle = cle;
  p.eauLignes = data || [];
  p.eauMode = p.eauLignes.length ? p.eauLignes[0].irrigation_mode : null;
}

function brancherFiche(p) {
  const c = $("feuille-corps");
  const onglets = [...c.querySelectorAll(".f-onglets button")];
  onglets.forEach(b => b.addEventListener("click", () => {
    fermerGlose();
    onglets.forEach(x => x.classList.toggle("actif", x === b));
    c.querySelector(".f-pan-moment").hidden = b.dataset.pan !== "moment";
    c.querySelector(".f-pan-annee").hidden = b.dataset.pan !== "annee";
  }));
  const formes = [...c.querySelectorAll(".f-seg button")];
  formes.forEach(b => b.addEventListener("click", () => {
    formes.forEach(x => x.classList.toggle("actif", x === b));
    c.querySelector(".f-ruban").hidden = b.dataset.forme !== "ruban";
    c.querySelector(".f-roue").hidden = b.dataset.forme !== "roue";
  }));
}

// Le besoin en eau arrive après le premier rendu, seules deux zones changent.
function majEau(p) {
  const c = $("feuille-corps");
  if (!c) return;
  fermerGlose();
  const carte = c.querySelector(".f-eau");
  const svg = p.eauLignes && p.eauLignes.length ? eauSVG(p, p.eauLignes) : "";
  if (carte) {
    if (svg) carte.querySelector(".f-eau-corps").innerHTML = svg
      + '<p class="f-note">Calcul FAO 56, évapotranspiration Météo-France.</p>';
    else carte.hidden = true;
  }
  const m = c.querySelector(".f-pan-moment");
  if (m) m.innerHTML = ficheMoment(p);
}

function ouvrirFeuille(p) {
  fermerGlose();
  $("feuille-titre").innerHTML = esc(p.nom)
    + (p.latin ? `<span class="feuille-latin"><i>${esc(p.latin)}</i>${p.famille ? ` · ${esc(p.famille)}` : ""}</span>` : "");
  $("feuille-corps").innerHTML = ficheHTML(p);
  brancherFiche(p);
  chargerEau(p).then(() => majEau(p)).catch(() => {});
  $("feuille-corps").scrollTop = 0;
  poserEtatFeuille();
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
  fermerGlose();
  $("voile").classList.remove("visible");
  $("feuille").classList.remove("ouverte");
  document.body.classList.remove("fige");
  setTimeout(() => { $("feuille").hidden = true; $("voile").hidden = true; }, 220);
}

// La fermeture passe par l'historique quand la feuille y a posé son entrée,
// pour que le geste de retour du téléphone et la croix aient le même effet.
function sortirFeuille() {
  if ($("feuille").hidden) return;
  if (history.state && history.state.feuille) { history.back(); return; }
  fermerFeuille();
}

/* La définition se pose sous le mot touché, dans le repère du corps de la
   feuille : elle suit donc le défilement sans calcul supplémentaire. Sa largeur
   est bornée à celle du corps pour qu'elle ne déborde jamais de l'écran. */
function ouvrirGlose(bouton) {
  fermerGlose();
  const corps = $("feuille-corps");
  const def = defGloss.get(bouton.dataset.terme);
  if (!corps || !def) return;
  const g = document.createElement("div");
  g.className = "glose";
  g.setAttribute("role", "note");
  g.innerHTML = `<b>${esc(bouton.dataset.terme)}</b><p>${esc(def)}</p>`;
  corps.appendChild(g);
  const rb = bouton.getBoundingClientRect(), rc = corps.getBoundingClientRect();
  const x = rb.left - rc.left + corps.scrollLeft;
  g.style.left = Math.round(Math.max(8, Math.min(x, corps.clientWidth - g.offsetWidth - 8))) + "px";
  // Sous le mot, au-dessus quand le bas de la feuille est trop proche.
  const dessous = rb.bottom + 6 + g.offsetHeight <= rc.bottom
    || rb.top - 6 - g.offsetHeight < rc.top;
  const y = dessous ? rb.bottom - rc.top + 6 : rb.top - rc.top - 6 - g.offsetHeight;
  g.style.top = Math.round(y + corps.scrollTop) + "px";
  bouton.classList.add("ouvert");
  gloseOuverte = g;
}

function fermerGlose() {
  if (!gloseOuverte) return;
  gloseOuverte.remove();
  gloseOuverte = null;
  document.querySelectorAll(".terme.ouvert").forEach(b => b.classList.remove("ouvert"));
}

document.addEventListener("click", e => {
  const b = e.target.closest ? e.target.closest(".terme") : null;
  if (b) { ouvrirGlose(b); return; }
  if (gloseOuverte && !(e.target.closest && e.target.closest(".glose"))) fermerGlose();
});

sur("voile", "click", sortirFeuille);
sur("fermerFeuille", "click", sortirFeuille);
// La touche d'échappement referme d'abord la définition, ensuite la feuille.
document.addEventListener("keydown", e => {
  if (e.key !== "Escape") return;
  if (gloseOuverte) { fermerGlose(); return; }
  sortirFeuille();
});

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

sur("btnTout", "click", () => ouvrirDetail({ t: "tout" }));
