-- ============================================================
-- finance schema for finance.morrisai.family
-- Isolated from health.* — same Supabase project, separate namespace
-- ============================================================

create schema if not exists finance;

-- ------------------------------------------------------------
-- plaid_items : one row per bank connection (Chase, Capital One, Elements)
-- access_token is encrypted at the application layer before insert
-- ------------------------------------------------------------
create table finance.plaid_items (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users(id) on delete cascade,
  family_member_id        uuid, -- optional FK to your existing family table
  plaid_item_id           text not null unique,
  institution_id          text not null,
  institution_name        text not null,
  access_token_encrypted  text not null,
  sync_cursor             text,
  status                  text not null default 'active' check (status in ('active','login_required','error','disconnected')),
  last_synced_at          timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index plaid_items_user_idx on finance.plaid_items(user_id);

-- ------------------------------------------------------------
-- accounts : individual accounts within an item
-- ------------------------------------------------------------
create table finance.accounts (
  id                  uuid primary key default gen_random_uuid(),
  item_id             uuid not null references finance.plaid_items(id) on delete cascade,
  plaid_account_id    text not null unique,
  name                text not null,
  official_name       text,
  type                text not null,     -- depository, credit, loan, investment
  subtype             text,              -- checking, savings, credit card, etc.
  mask                text,              -- last 4 digits
  current_balance     numeric(14,2),
  available_balance   numeric(14,2),
  iso_currency_code   text default 'USD',
  balance_as_of       timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index accounts_item_idx on finance.accounts(item_id);

-- ------------------------------------------------------------
-- transactions : the workhorse
-- ------------------------------------------------------------
create table finance.transactions (
  id                          uuid primary key default gen_random_uuid(),
  account_id                  uuid not null references finance.accounts(id) on delete cascade,
  plaid_transaction_id        text not null unique,
  amount                      numeric(14,2) not null,
  iso_currency_code           text default 'USD',
  date                        date not null,
  authorized_date             date,
  merchant_name               text,
  name                        text not null,
  payment_channel             text,           -- online | in store | other
  pending                     boolean not null default false,
  category                    text[],         -- Plaid legacy category hierarchy
  personal_finance_category   jsonb,          -- Plaid PFC (preferred)
  category_override           text,           -- your custom categorization
  location                    jsonb,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create index tx_account_date_idx     on finance.transactions(account_id, date desc);
create index tx_date_idx              on finance.transactions(date desc);
create index tx_merchant_idx          on finance.transactions(merchant_name);
create index tx_pfc_idx               on finance.transactions using gin(personal_finance_category);

-- ------------------------------------------------------------
-- balance_snapshots : daily roll-up for trending and AI reasoning
-- ------------------------------------------------------------
create table finance.balance_snapshots (
  id                  uuid primary key default gen_random_uuid(),
  account_id          uuid not null references finance.accounts(id) on delete cascade,
  snapshot_date       date not null,
  current_balance     numeric(14,2),
  available_balance   numeric(14,2),
  created_at          timestamptz not null default now(),
  unique(account_id, snapshot_date)
);

create index snapshots_account_date_idx on finance.balance_snapshots(account_id, snapshot_date desc);

-- ------------------------------------------------------------
-- audit_log : every Plaid call, every AI query, every access
-- ------------------------------------------------------------
create table finance.audit_log (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id),
  action          text not null,        -- plaid_sync | plaid_exchange | ai_query | data_access
  resource_type   text,                  -- transaction | account | item
  resource_id     uuid,
  metadata        jsonb,
  ip_address      inet,
  created_at      timestamptz not null default now()
);

create index audit_user_idx   on finance.audit_log(user_id, created_at desc);
create index audit_action_idx on finance.audit_log(action, created_at desc);

-- ------------------------------------------------------------
-- Row Level Security
-- Users may SELECT their own rows; all writes go through service role
-- ------------------------------------------------------------
alter table finance.plaid_items        enable row level security;
alter table finance.accounts           enable row level security;
alter table finance.transactions       enable row level security;
alter table finance.balance_snapshots  enable row level security;
alter table finance.audit_log          enable row level security;

create policy "select own items" on finance.plaid_items
  for select using (auth.uid() = user_id);

create policy "select own accounts" on finance.accounts
  for select using (
    item_id in (select id from finance.plaid_items where user_id = auth.uid())
  );

create policy "select own transactions" on finance.transactions
  for select using (
    account_id in (
      select a.id from finance.accounts a
      join finance.plaid_items i on a.item_id = i.id
      where i.user_id = auth.uid()
    )
  );

create policy "select own snapshots" on finance.balance_snapshots
  for select using (
    account_id in (
      select a.id from finance.accounts a
      join finance.plaid_items i on a.item_id = i.id
      where i.user_id = auth.uid()
    )
  );

create policy "select own audit" on finance.audit_log
  for select using (auth.uid() = user_id);

-- Expose finance schema to PostgREST (so the JS client can query it)
grant usage on schema finance to anon, authenticated, service_role;
grant select on all tables in schema finance to authenticated;
grant all on all tables in schema finance to service_role;

-- updated_at trigger
create or replace function finance.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on finance.plaid_items
  for each row execute function finance.set_updated_at();
create trigger set_updated_at before update on finance.accounts
  for each row execute function finance.set_updated_at();
create trigger set_updated_at before update on finance.transactions
  for each row execute function finance.set_updated_at();
