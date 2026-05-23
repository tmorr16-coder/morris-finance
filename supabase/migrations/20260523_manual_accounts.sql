-- Manual / imported accounts for institutions not connectable via Plaid
-- (401k via Alight, HSA, brokerage statements, etc.)

create table if not exists finance.manual_accounts (
  id           uuid         primary key default gen_random_uuid(),
  user_id      uuid         not null references auth.users(id) on delete cascade,
  name         text         not null,
  institution  text,
  account_type text         not null default 'investment',
  balance      numeric(14,2),
  as_of_date   date,
  currency     text         not null default 'USD',
  notes        text,
  holdings     jsonb,       -- [{name, value, pct, shares, price}]
  source       text         not null default 'import',  -- 'import' | 'manual'
  created_at   timestamptz  not null default now(),
  updated_at   timestamptz  not null default now()
);

create index if not exists manual_accounts_user on finance.manual_accounts(user_id);

alter table finance.manual_accounts enable row level security;

create policy "manual_accounts: read own"   on finance.manual_accounts for select using (auth.uid() = user_id);
create policy "manual_accounts: insert own" on finance.manual_accounts for insert with check (auth.uid() = user_id);
create policy "manual_accounts: update own" on finance.manual_accounts for update using (auth.uid() = user_id);
create policy "manual_accounts: delete own" on finance.manual_accounts for delete using (auth.uid() = user_id);
