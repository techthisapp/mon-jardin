-- Chargement d'un lot de lignes versé au dépôt, lu à son adresse brute sur
-- GitHub. Forme de référence, à recopier en changeant le nom du fichier et la
-- projection.
--
-- Deux points que l'expérience a imposés.
--
-- L'extension va dans un schéma qui lui est propre et non dans `public`. Créée
-- dans `public`, elle y laisse une fonction de requête sortante accessible aux
-- rôles clients, et la révoquer par `revoke all on all functions in schema
-- public` retire du même coup la permission d'exécution de toutes les fonctions
-- du schéma, dont `ensure_garden` et `create_garden` que l'application appelle
-- à la connexion. Un schéma dédié, sur le chemin de recherche d'aucun rôle,
-- puis supprimé en fin de transaction, n'a rien à révoquer.
--
-- Le rang libre se numérote par lot. Le sous-select qui cherche le premier rang
-- libre est évalué sur l'état d'avant l'instruction : deux lignes visant le même
-- organe recevraient le même rang et l'unicité échouerait. La numérotation par
-- `row_number` sur la partition, puis le n-ième rang libre, règle le cas.

begin;

set local app.motif = 'chargement du lot <à nommer>';

create schema chargement;
create extension http with schema chargement;

with brut as (
  select content::jsonb as j
  from chargement.http_get(
    'https://raw.githubusercontent.com/techthisapp/mon-jardin/main/outils/photos/<fichier>.json')
), candidat as (
  select (e->>'p')::uuid as plant_id, e->>'o' as organe, e->>'u' as url,
         e->>'a' as auteur, e->>'l' as licence, e->>'s' as source
  from brut, jsonb_array_elements(brut.j) as e
), neuves as (
  select c.*, row_number() over (partition by c.plant_id, c.organe order by c.url) as n
  from candidat c
  where not exists (select 1 from plant_images i
                     where i.plant_id = c.plant_id and i.url = c.url)
), place as (
  select n.*,
         (select g from generate_series(1, 12) g
           where not exists (select 1 from plant_images i
                              where i.plant_id = n.plant_id and i.organe = n.organe
                                and i.rang = g)
           order by g offset n.n - 1 limit 1) as rang
  from neuves n
)
insert into plant_images (plant_id, organe, rang, url, auteur, licence, source, fonds)
select plant_id, organe, rang, url, auteur, licence, source, 'commons'
from place where rang is not null;

drop extension http;
drop schema chargement;

commit;

-- Contrôle après chargement. La première ligne doit rendre zéro, les deux
-- suivantes doivent rendre vrai.
select (select count(*) from pg_extension where extname = 'http') as extension_restante,
       has_function_privilege('authenticated', 'public.ensure_garden()', 'EXECUTE') as ensure_garden,
       has_function_privilege('authenticated', 'public.create_garden(text)', 'EXECUTE') as create_garden;
