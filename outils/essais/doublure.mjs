// Faux client Supabase : sert les données réelles figées dans fixtures.json,
// pour contrôler le rendu de la fiche sans réseau.
const FX = window.__FIXTURES__;
const TABLES = {
  phases: FX.phases, plants_full: FX.plants, climates: FX.climates,
  climate_phase_shifts: FX.shifts, arrosage_plante_quinzaine: FX.eau,
  catalog_meta: [{ plant_count: FX.plants.length, updated_at: "2026-07-31" }],
  plant_climates: FX.plants.map(p => ({ plant_id: p.id, level: "adapte", note: null, climate_key: "oceanique" })),
  gardens: [{ id: "g1", owner: "u1", name: "Le jardin de Jérôme",
              climate_key: window.__CLIMAT__ || "oceanique_degrade",
              altitude: null, last_opened_at: null, code_postal: "21500", commune: "Fain-lès-Moutiers",
              lat: 47.58371, lon: 4.21265, sol_texture: null, station_num: "21425001",
              code_postal_reel: "21500" }],
  garden_plants: (window.__JARDIN__ || FX.plants.map(p => p.id))
    .map(id => ({ garden_id: "g1", plant_id: id })),
  espaces: (window.__ESPACES__ || []).map((e, i) =>
    ({ id: e.id, garden_id: "g1", name: e.name, position: e.position ?? i, color: e.color || null,
       parent_id: e.parent_id || null, surface_m2: e.surface_m2 ?? null,
       support: e.support || null, exposition: e.exposition || null,
       sol_texture: e.sol_texture || null })),
  garden_plant_espaces: (window.__PLACEMENTS__ || []).map(p =>
    ({ garden_id: "g1", plant_id: p.plant_id, espace_id: p.espace_id,
       quantity: p.quantity ?? null, notes: p.notes ?? null })),
  sourdines: (window.__SOURDINES__ || []),
  saison_vegetation: FX.saison || [],
  releves_eau: (window.__RELEVES__ || []),
  stations_meteo: [{ num: "21425001", nom: "MONTBARD_SAPC", lat: 47.6167, lon: 4.3333,
                     dernier_jour: "2026-07-30" }],
  pluie_station: (window.__PLUIES__ || []),
  vigilance: (window.__VIGILANCE__ || []),
  glossaire: (window.__GLOSSAIRE__ || []),
  plant_images: (window.__PHOTOS__ || []),
  avis_photo: (window.__AVIS__ || []),
  observations: (window.__CARNET__ || []),
  observation_photos: (window.__PHOTOS_CARNET__ || []),
};

/* Le compartiment privé des photographies du jardinier, tenu en mémoire : les
   essais contrôlent ce qui est déposé, son chemin et son poids, sans réseau et
   sans adresse signée à obtenir. */
const PIXEL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1"
  + "HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=";
window.__STOCKAGE__ = window.__STOCKAGE__ || {};
const stockage = {
  from() {
    return {
      async upload(chemin, blob, o) {
        window.__STOCKAGE__[chemin] = { poids: (blob && blob.size) || 0,
                                        type: (o || {}).contentType || "" };
        window.__ECRITS__ = (window.__ECRITS__ || []).concat([{ table: "stockage", op: "upload", v: chemin }]);
        return { data: { path: chemin }, error: null };
      },
      async remove(chemins) {
        [].concat(chemins).forEach(c => { delete window.__STOCKAGE__[c]; });
        window.__ECRITS__ = (window.__ECRITS__ || []).concat([{ table: "stockage", op: "remove", v: chemins }]);
        return { data: [], error: null };
      },
      async createSignedUrls(chemins) {
        return { data: [].concat(chemins).map(p => ({ path: p, signedUrl: PIXEL })), error: null };
      },
      async createSignedUrl(chemin) {
        return { data: { path: chemin, signedUrl: PIXEL }, error: null };
      },
    };
  },
};
/* La base recalcule les compteurs, le score et le retrait à chaque avis, par un
   déclencheur. La doublure en fait autant, sans quoi rien de ce que l'avis
   commande ne serait contrôlable : le poids est de un, l'utilisateur figé
   n'étant pas mainteneur. */
const SEUIL_RETRAIT = 3;
function recalculerAvis(image_id) {
  const avis = (TABLES.avis_photo || []).filter(a => a.image_id === image_id);
  const i = (TABLES.plant_images || []).find(x => x.id === image_id);
  if (!i) return;
  /* Les avis des autres comptes, que la doublure ne fait pas vivre, sont posés
     à même la ligne : c'est le seul moyen d'éprouver un seuil qui demande trois
     personnes avec un seul utilisateur figé. */
  const autres = i.avis_ailleurs || {};
  const n = a => avis.filter(x => x.avis === a).length + (autres[a] || 0);
  const s = n("supprimer"), m = n("moyenne"), b = n("bonne");
  i.n_supprimer = s; i.n_moyenne = m; i.n_bonne = b;
  i.score = 2 * b - 3 * m - 6 * s;
  if (i.retrait_motif === "relecture" || i.verrou) return;
  const net = s - b;
  i.retenue = !(net >= SEUIL_RETRAIT);
  i.retrait_motif = net >= SEUIL_RETRAIT ? "avis" : null;
}

/* Les filtres arrivent après le verbe dans la chaîne du client réel : une
   écriture est donc mise de côté et jouée à l'attente, sur les seules lignes
   retenues. Sans cela une modification portant sur une clé à trois colonnes
   toucherait la première ligne venue. */
let fauxNumero = 0;
function requete(table) {
  const filtres = [];
  let op = null;
  const passe = l => filtres.every(f => f(l));
  const lues = () => (TABLES[table] || []).filter(passe);
  function executer() {
    const t = TABLES[table] = TABLES[table] || [];
    if (!op) return { data: lues(), error: null };
    window.__ECRITS__ = (window.__ECRITS__ || []).concat([{ table, op: op.kind, v: op.v }]);
    if (op.kind === "insert") {
      const neuves = [].concat(op.v).map(l => ({ ...l, id: l.id || "faux-" + (++fauxNumero) }));
      neuves.forEach(l => t.push(l));
      return { data: neuves, error: null };
    }
    if (op.kind === "update") {
      const touchees = t.filter(passe);
      touchees.forEach(l => Object.assign(l, op.v));
      return { data: touchees, error: null };
    }
    if (op.kind === "delete") {
      const partis = t.filter(passe);
      TABLES[table] = t.filter(l => !passe(l));
      if (table === "avis_photo") partis.forEach(l => recalculerAvis(l.image_id));
      return { data: partis, error: null };
    }
    /* Deux clés d'unicité selon la table : le jour pour un relevé, la
       photographie pour un avis, l'auteur étant toujours le même ici. */
    const i = table === "avis_photo"
      ? t.findIndex(l => l.image_id === op.v.image_id)
      : t.findIndex(l => l.garden_id === op.v.garden_id && l.jour === op.v.jour);
    if (i >= 0) t[i] = { ...t[i], ...op.v }; else t.push(op.v);
    if (table === "avis_photo") recalculerAvis(op.v.image_id);
    return { data: [op.v], error: null };
  }
  const api = {
    select() { return api; },
    eq(col, v) { filtres.push(l => String(l[col]) === String(v)); return api; },
    in(col, vs) { const s = vs.map(String); filtres.push(l => s.includes(String(l[col]))); return api; },
    gte(col, v) { filtres.push(l => String(l[col]) >= String(v)); return api; },
    insert(v) { op = { kind: "insert", v }; return api; },
    update(v) { op = { kind: "update", v }; return api; },
    upsert(v) { op = { kind: "upsert", v }; return api; },
    delete() { op = { kind: "delete" }; return api; },
    order() { return api; },
    limit() { return api; },
    single() { const r = executer(); return Promise.resolve({ data: r.data[0] || null, error: r.error }); },
    then(res) { return Promise.resolve(executer()).then(res); },
  };
  return api;
}
export const createClient = () => ({
  from: requete,
  storage: stockage,
  auth: {
    getSession: async () => ({ data: { session: window.__SANS_SESSION__ ? null
      : { user: { id: "u1", email: "jerome@exemple.fr" } } } }),
    onAuthStateChange(cb) {
      // Le vrai client émet l'état initial ; le faux doit le faire aussi.
      setTimeout(() => cb("INITIAL_SESSION", window.__SANS_SESSION__ ? null
        : { user: { id: "u1", email: "jerome@exemple.fr" } }), 0);
      return { data: { subscription: { unsubscribe() {} } } };
    },
    signInWithOtp: async () => ({ error: null }),
    signOut: async () => ({}),
    verifyOtp: async () => ({ error: null }),
    setSession: async () => ({ error: null }),
  },
  functions: { invoke: async () => ({ data: null, error: null }) },
});
