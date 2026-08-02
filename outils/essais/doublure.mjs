// Faux client Supabase : sert les données réelles figées dans fixtures.json,
// pour contrôler le rendu de la fiche sans réseau.
const FX = window.__FIXTURES__;
const TABLES = {
  phases: FX.phases, plants_full: FX.plants, climates: FX.climates,
  climate_phase_shifts: FX.shifts, arrosage_plante_quinzaine: FX.eau,
  catalog_meta: [{ plant_count: FX.plants.length, updated_at: "2026-07-31" }],
  plant_climates: FX.plants.map(p => ({ plant_id: p.id, level: "adapte", note: null, climate_key: "oceanique" })),
  gardens: [{ id: "g1", owner: "u1", name: "Le jardin de Jérôme", climate_key: "oceanique_degrade",
              altitude: null, last_opened_at: null, code_postal: "21500", commune: "Fain-lès-Moutiers",
              lat: 47.58371, lon: 4.21265, sol_texture: null, station_num: "21425001",
              code_postal_reel: "21500" }],
  garden_plants: FX.plants.map(p => ({ garden_id: "g1", plant_id: p.id })),
  espaces: [], garden_plant_espaces: [], sourdines: [],
  saison_vegetation: FX.saison || [],
  releves_eau: (window.__RELEVES__ || []),
  stations_meteo: [{ num: "21425001", nom: "MONTBARD_SAPC", lat: 47.6167, lon: 4.3333,
                     dernier_jour: "2026-07-30" }],
  pluie_station: (window.__PLUIES__ || []),
  vigilance: (window.__VIGILANCE__ || []),
  glossaire: (window.__GLOSSAIRE__ || []),
};
function requete(table) {
  let lignes = (TABLES[table] || []).slice();
  const api = {
    select() { return api; },
    eq(col, v) { lignes = lignes.filter(l => String(l[col]) === String(v)); return api; },
    in(col, vs) { lignes = lignes.filter(l => vs.map(String).includes(String(l[col]))); return api; },
    gte(col, v) { lignes = lignes.filter(l => String(l[col]) >= String(v)); return api; },
    update(v) { Object.assign(TABLES[table][0] || {}, v); window.__ECRITS__ = (window.__ECRITS__ || []).concat([{ table, op: "update", v }]); return api; },
    upsert(v) {
      window.__ECRITS__ = (window.__ECRITS__ || []).concat([{ table, op: "upsert", v }]);
      const t = TABLES[table] = TABLES[table] || [];
      const i = t.findIndex(l => l.garden_id === v.garden_id && l.jour === v.jour);
      if (i >= 0) t[i] = v; else t.push(v);
      return Promise.resolve({ data: [v], error: null });
    },
    delete() {
      window.__ECRITS__ = (window.__ECRITS__ || []).concat([{ table, op: "delete" }]);
      return { eq() { return this; }, then(res) { return Promise.resolve({ data: [], error: null }).then(res); } };
    },
    order() { return api; },
    limit() { return api; },
    single() { return Promise.resolve({ data: lignes[0] || null, error: null }); },
    then(res) { return Promise.resolve({ data: lignes, error: null }).then(res); },
  };
  return api;
}
export const createClient = () => ({
  from: requete,
  auth: {
    getSession: async () => ({ data: { session: { user: { id: "u1", email: "jerome@exemple.fr" } } } }),
    onAuthStateChange(cb) {
      // Le vrai client émet l'état initial ; le faux doit le faire aussi.
      setTimeout(() => cb("INITIAL_SESSION", { user: { id: "u1", email: "jerome@exemple.fr" } }), 0);
      return { data: { subscription: { unsubscribe() {} } } };
    },
    signInWithOtp: async () => ({ error: null }),
    signOut: async () => ({}),
    verifyOtp: async () => ({ error: null }),
    setSession: async () => ({ error: null }),
  },
  functions: { invoke: async () => ({ data: null, error: null }) },
});
