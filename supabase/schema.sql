-- ============================================================
-- Schéma Supabase pour LumiCut
-- À exécuter EN ENTIER dans l'éditeur SQL du projet Supabase (SQL Editor → New query → Run).
-- Le script peut être relancé sans risque : il crée ce qui manque et remet les règles d'accès à jour.
-- Mise en route complète (comptes, secrets, fonctions, Stripe) : voir MISE-EN-ROUTE.md
-- ============================================================

-- ------------------------------------------------------------
-- Tables
-- ------------------------------------------------------------

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  customer_address jsonb,
  billing_address jsonb,
  config jsonb,              -- résumé du premier panneau (format historique lu par l'admin)
  items jsonb,               -- tous les panneaux commandés : dimensions, matière, éclairage, options, design vérifié, prix
  dxf_url text,              -- URL du DXF stocké dans Supabase Storage
  preview_url text,          -- URL du SVG preview
  subtotal numeric(10,2),
  shipping_cost numeric(10,2) default 0,
  price_ht numeric(10,2),
  price_ttc numeric(10,2),
  currency text default 'EUR',
  status text default 'pending',  -- pending | failed | paid | in_production | shipped | delivered | cancelled
  production_stage text,          -- cutting | assembly | ready
  payment_intent_id text,
  stripe_payment_id text,
  paid_at timestamptz,
  refunded_at timestamptz,
  notes text,
  status_history jsonb default '[]'::jsonb
);

-- Colonnes ajoutées au fil des versions (sans effet si elles existent déjà)
alter table orders add column if not exists subtotal numeric(10,2);
alter table orders add column if not exists shipping_cost numeric(10,2) default 0;
alter table orders add column if not exists customer_phone text;
alter table orders add column if not exists customer_address jsonb;
alter table orders add column if not exists billing_address jsonb;
alter table orders add column if not exists items jsonb;
alter table orders add column if not exists paid_at timestamptz;
alter table orders add column if not exists refunded_at timestamptz;
alter table orders add column if not exists payment_intent_id text;
alter table orders add column if not exists currency text default 'EUR';
-- Passage en caisse d'où vient la commande : un seul paiement par passage, même après des allers-retours
alter table orders add column if not exists checkout_id uuid;
-- Alerte de paiement à vérifier avant de produire (ex. montant encaissé différent du montant commandé)
alter table orders add column if not exists payment_issue text;

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  city text,
  referral_code text unique,
  total_orders int default 0,
  total_spent numeric(10,2) default 0,
  created_at timestamptz default now()
);

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id),
  customer_name text,
  rating int check (rating between 1 and 5),
  comment text,
  photo_url text,
  published bool default false,
  featured bool default false,
  created_at timestamptz default now()
);

create table if not exists motifs (
  id text primary key,
  name text not null,
  category text,
  svg_content text,
  creator_id uuid,
  price_surcharge numeric(10,2) default 0,
  active bool default true,
  times_ordered int default 0,
  source text default 'local',   -- 'local' | 'iconify' | 'library'
  last_used_at timestamptz,
  -- Bibliothèque de motifs réels (scripts/library) : origine et licence de chaque dessin
  author text,
  license text,                  -- 'CC0-1.0' | 'PDM-1.0' | 'CC-BY-3.0' | 'CC-BY-4.0' | 'BSD-3-Clause' | 'domaine-public'
  license_url text,
  source_url text,
  tags text[]
);

alter table motifs add column if not exists source text default 'local';
alter table motifs add column if not exists last_used_at timestamptz;
alter table motifs add column if not exists author text;
alter table motifs add column if not exists license text;
alter table motifs add column if not exists license_url text;
alter table motifs add column if not exists source_url text;
alter table motifs add column if not exists tags text[];
-- Import de la bibliothèque : node scripts/library/to-sql.mjs > supabase/seed-library.sql

create table if not exists creators (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text unique,
  portfolio_url text,
  svg_sample_url text,
  status text default 'pending',  -- pending | approved | rejected
  revenue_share numeric(4,2) default 0.70,
  created_at timestamptz default now()
);

create table if not exists referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_code text not null,
  referred_email text not null,
  order_id uuid references orders(id),
  reward_sent bool default false,
  created_at timestamptz default now()
);

-- Emails transactionnels envoyés (un seul email de chaque type par commande)
create table if not exists email_logs (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid references orders(id) on delete set null,
  email_type  text not null,   -- confirmation | production | shipped | review_request | referral_reward
  recipient   text not null,
  resend_id   text,            -- ID Resend pour tracking
  status      text default 'sent',  -- sent | error
  error_message text,
  sent_at     timestamptz default now()
);

-- Événements Stripe déjà reçus : un événement renvoyé par Stripe n'est traité qu'une fois
create table if not exists stripe_events (
  id           text primary key,
  type         text not null,
  result       text,
  received_at  timestamptz default now(),
  processed_at timestamptz
);

-- Compteurs d'appels des fonctions publiques (conseiller IA, passage en caisse) : limite les abus
create table if not exists rate_limits (
  bucket       text not null,        -- ex. « advisor:<empreinte de l'IP> »
  window_start timestamptz not null,
  count        int not null default 0,
  primary key (bucket, window_start)
);

-- Comptes autorisés à l'administration (comptes Supabase Auth)
create table if not exists admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text,
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- Index
-- ------------------------------------------------------------

create unique index if not exists orders_checkout_id_key on orders(checkout_id);
create index if not exists orders_payment_intent_idx on orders(payment_intent_id);
create index if not exists orders_status_idx on orders(status);
create index if not exists orders_created_at_idx on orders(created_at desc);
create index if not exists orders_customer_email_idx on orders(customer_email);
create index if not exists reviews_published_idx on reviews(published);
create index if not exists referrals_referrer_code_idx on referrals(referrer_code);
create index if not exists idx_email_logs_order on email_logs(order_id, email_type);

-- ------------------------------------------------------------
-- Fonctions
-- ------------------------------------------------------------

-- Vrai si la personne connectée est administrateur (utilisée par les règles d'accès et par l'admin)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- Changement de statut d'une commande par le webhook Stripe, avec trace dans l'historique.
-- p_to : nouveau statut (null : seulement une note) ; p_from : statuts de départ autorisés (null : tous).
-- Renvoie la commande modifiée, ou rien si elle n'était pas dans un statut de départ autorisé :
-- c'est ce qui empêche de confirmer deux fois une commande ou de repasser « en échec » une commande payée.
create or replace function public.order_event(
  p_order_id uuid,
  p_to text default null,
  p_from text[] default null,
  p_note text default null,
  p_issue text default null,
  p_payment_intent text default null
)
returns setof public.orders
language sql
as $$
  update public.orders o
     set status = coalesce(p_to, o.status),
         paid_at = case when p_to = 'paid' then now() else o.paid_at end,
         refunded_at = case when p_to = 'cancelled' then now() else o.refunded_at end,
         payment_issue = coalesce(p_issue, o.payment_issue),
         payment_intent_id = coalesce(p_payment_intent, o.payment_intent_id),
         stripe_payment_id = case when p_to = 'paid' then coalesce(p_payment_intent, o.stripe_payment_id) else o.stripe_payment_id end,
         status_history = coalesce(o.status_history, '[]'::jsonb) || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
           'status', coalesce(p_to, o.status),
           'timestamp', now(),
           'source', 'stripe',
           'note', p_note
         )))
   where o.id = p_order_id
     and (p_from is null or o.status = any (p_from))
  returning o.*;
$$;

-- Compte un appel dans la fenêtre de temps en cours ; vrai tant que la limite n'est pas dépassée
create or replace function public.hit_rate_limit(p_bucket text, p_limit int, p_window_seconds int)
returns boolean
language plpgsql
as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_count int;
begin
  insert into public.rate_limits (bucket, window_start, count)
  values (p_bucket, v_window, 1)
  on conflict (bucket, window_start) do update set count = public.rate_limits.count + 1
  returning count into v_count;
  -- Ménage de temps en temps : les fenêtres de plus de deux jours ne servent plus
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '2 days';
  end if;
  return v_count <= p_limit;
end;
$$;

-- Fonction RPC pour incrémenter times_ordered de façon atomique (serveur uniquement)
create or replace function public.increment_motif_usage(motif_id text)
returns void
language sql
as $$
  update public.motifs set times_ordered = times_ordered + 1 where id = motif_id;
$$;

-- Supprime les commandes jamais payées après p_days jours (données personnelles inutiles, RGPD).
-- À lancer à la main ou chaque nuit avec pg_cron (voir plus bas).
create or replace function public.purge_abandoned_orders(p_days int default 30)
returns int
language sql
as $$
  with deleted as (
    delete from public.orders o
     where o.status in ('pending', 'failed')
       and o.created_at < now() - make_interval(days => p_days)
       and not exists (select 1 from public.reviews r where r.order_id = o.id)
       and not exists (select 1 from public.referrals f where f.order_id = o.id)
    returning 1
  )
  select count(*)::int from deleted;
$$;

-- Fonctions réservées au serveur (clé de service) : personne ne peut les appeler depuis le navigateur
revoke all on function public.order_event(uuid, text, text[], text, text, text) from public, anon, authenticated;
revoke all on function public.hit_rate_limit(text, int, int) from public, anon, authenticated;
revoke all on function public.increment_motif_usage(text) from public, anon, authenticated;
revoke all on function public.purge_abandoned_orders(int) from public, anon, authenticated;
grant execute on function public.order_event(uuid, text, text[], text, text, text) to service_role;
grant execute on function public.hit_rate_limit(text, int, int) to service_role;
grant execute on function public.increment_motif_usage(text) to service_role;
grant execute on function public.purge_abandoned_orders(int) to service_role;
-- is_admin : seulement pour les personnes connectées
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;

-- ------------------------------------------------------------
-- Règles d'accès (RLS)
-- Sans règle, personne n'accède à une table depuis le navigateur, connecté ou non.
-- Les fonctions serveur utilisent la clé de service, qui passe outre ces règles.
-- ------------------------------------------------------------

alter table orders enable row level security;
alter table customers enable row level security;
alter table reviews enable row level security;
alter table motifs enable row level security;
alter table creators enable row level security;
alter table referrals enable row level security;
alter table email_logs enable row level security;
alter table stripe_events enable row level security;
alter table rate_limits enable row level security;
alter table admins enable row level security;

-- Administrateurs : accès complet aux données de la boutique
drop policy if exists "admin : accès complet" on orders;
create policy "admin : accès complet" on orders for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin : accès complet" on customers;
create policy "admin : accès complet" on customers for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin : accès complet" on reviews;
create policy "admin : accès complet" on reviews for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin : accès complet" on motifs;
create policy "admin : accès complet" on motifs for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin : accès complet" on creators;
create policy "admin : accès complet" on creators for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin : accès complet" on referrals;
create policy "admin : accès complet" on referrals for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin : accès complet" on email_logs;
create policy "admin : accès complet" on email_logs for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Chaque compte peut vérifier s'il est administrateur (rien de plus)
drop policy if exists "admin : sa propre ligne" on admins;
create policy "admin : sa propre ligne" on admins for select to authenticated
  using (user_id = auth.uid());

-- stripe_events et rate_limits : aucune règle, réservées au serveur

-- ------------------------------------------------------------
-- Tâches planifiées (facultatif : activer l'extension pg_cron dans Database → Extensions)
-- ------------------------------------------------------------

-- Purge des commandes jamais payées, chaque nuit à 3 h 17 :
-- select cron.schedule('purge-abandoned-orders', '17 3 * * *', $$ select public.purge_abandoned_orders(30) $$);

-- Demandes d'avis J+10 (extensions pg_cron et pg_net). La clé de service reste dans la base :
-- ne jamais coller ce texte ailleurs.
-- select cron.schedule(
--   'send-review-requests',
--   '43 9 * * *',
--   $$ select net.http_post(
--     url := 'https://TON_PROJET.supabase.co/functions/v1/send-review-requests',
--     headers := '{"Authorization":"Bearer TA_CLE_DE_SERVICE"}'::jsonb
--   ) $$
-- );
