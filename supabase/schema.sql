-- ============================================================
-- Schéma Supabase pour LumiCut V3
-- À exécuter dans l'éditeur SQL de votre projet Supabase
-- ============================================================

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  customer_address jsonb,
  billing_address jsonb,
  config jsonb,              -- toute la config du panneau (size, material, motif, led...)
  items jsonb,               -- détail des articles commandés
  dxf_url text,              -- URL du DXF stocké dans Supabase Storage
  preview_url text,          -- URL du SVG preview
  subtotal numeric(10,2),
  shipping_cost numeric(10,2) default 0,
  price_ht numeric(10,2),
  price_ttc numeric(10,2),
  currency text default 'EUR',
  status text default 'pending',  -- pending | paid | failed | shipped | delivered | refunded
  production_stage text,          -- cutting | assembly | ready
  payment_intent_id text,
  stripe_payment_id text,
  paid_at timestamptz,
  refunded_at timestamptz,
  notes text,
  status_history jsonb default '[]'::jsonb
);

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
  source text default 'local',   -- 'local' | 'iconify'
  last_used_at timestamptz
);

-- Colonnes motifs à ajouter si la table existe déjà :
-- alter table motifs add column if not exists source text default 'local';
-- alter table motifs add column if not exists last_used_at timestamptz;

-- ============================================================
-- Colonnes Sprint 4 — à ajouter si la table orders existe déjà
-- ============================================================
-- alter table orders add column if not exists subtotal numeric(10,2);
-- alter table orders add column if not exists shipping_cost numeric(10,2) default 0;
-- alter table orders add column if not exists customer_phone text;
-- alter table orders add column if not exists customer_address jsonb;
-- alter table orders add column if not exists billing_address jsonb;
-- alter table orders add column if not exists items jsonb;        -- détail des articles
-- alter table orders add column if not exists paid_at timestamptz;
-- alter table orders add column if not exists refunded_at timestamptz;
-- alter table orders add column if not exists payment_intent_id text;
-- alter table orders add column if not exists currency text default 'EUR';

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

-- Fonction RPC pour incrémenter times_ordered de façon atomique
create or replace function increment_motif_usage(motif_id text)
returns void language sql as $$
  update motifs set times_ordered = times_ordered + 1 where id = motif_id;
$$;

-- ============================================================
-- Sprint 5 — Emails transactionnels
-- ============================================================

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

create index if not exists idx_email_logs_order on email_logs(order_id, email_type);

-- Cron pour les demandes d'avis J+10 (activer l'extension pg_cron dans Supabase Dashboard)
-- select cron.schedule(
--   'send-review-requests',
--   '0 10 * * *',
--   $$ select net.http_post(
--     url := 'https://TON_PROJECT.supabase.co/functions/v1/send-review-requests',
--     headers := '{"Authorization":"Bearer TON_ANON_KEY"}'::jsonb
--   ) $$
-- );

-- ============================================================

-- Index pour les requêtes fréquentes
create index if not exists orders_status_idx on orders(status);
create index if not exists orders_created_at_idx on orders(created_at desc);
create index if not exists orders_customer_email_idx on orders(customer_email);
create index if not exists reviews_published_idx on reviews(published);
create index if not exists referrals_referrer_code_idx on referrals(referrer_code);
