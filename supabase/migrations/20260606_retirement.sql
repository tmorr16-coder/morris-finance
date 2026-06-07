-- Retirement planning module tables in finance schema.
-- Six tables: profiles, accounts, incomes, expenses, debts, scenarios.

create table if not exists finance.retirement_profiles (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade unique,
  current_age         int default 40,
  retirement_age      int default 65,
  life_expectancy     int default 90,
  spouse_enabled      bool default false,
  spouse_name         text,
  spouse_age          int,
  spouse_retirement_age int,
  base_return         numeric(5,3) default 0.070,
  inflation_rate      numeric(5,3) default 0.030,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create table if not exists finance.retirement_accounts (
  id                  uuid primary key default gen_random_uuid(),
  profile_id          uuid not null references finance.retirement_profiles(id) on delete cascade,
  name                text not null,
  type                text default '401k',
  owner               text default 'self',
  balance             numeric(14,2) default 0,
  monthly_contribution numeric(10,2) default 0,
  employer_match_pct  numeric(5,2) default 0,
  return_override     numeric(5,3),
  plaid_account_id    text,
  sort_order          int default 0,
  created_at          timestamptz default now()
);

create table if not exists finance.retirement_incomes (
  id                  uuid primary key default gen_random_uuid(),
  profile_id          uuid not null references finance.retirement_profiles(id) on delete cascade,
  name                text not null,
  type                text default 'salary',
  owner               text default 'self',
  monthly_amount      numeric(10,2) default 0,
  start_age           int,
  end_age             int,
  ss_claim_age        int,
  sort_order          int default 0,
  created_at          timestamptz default now()
);

create table if not exists finance.retirement_expenses (
  id                  uuid primary key default gen_random_uuid(),
  profile_id          uuid not null references finance.retirement_profiles(id) on delete cascade,
  name                text not null,
  monthly_amount      numeric(10,2) default 0,
  essential           bool default true,
  category            text,
  sort_order          int default 0,
  created_at          timestamptz default now()
);

create table if not exists finance.retirement_debts (
  id                    uuid primary key default gen_random_uuid(),
  profile_id            uuid not null references finance.retirement_profiles(id) on delete cascade,
  name                  text not null,
  subtype               text default 'loan',
  type                  text default 'other',
  balance               numeric(14,2),
  rate_pct              numeric(5,3),
  monthly_payment       numeric(10,2),
  lease_monthly_payment numeric(10,2),
  lease_term_months     int,
  lease_months_remaining int,
  lease_residual        numeric(10,2),
  lease_mileage_allowance int,
  lease_overage_cpm     numeric(6,4),
  lease_disposition_fee numeric(8,2),
  lease_end_decision    text,
  sort_order            int default 0,
  created_at            timestamptz default now()
);

create table if not exists finance.retirement_scenarios (
  id                      uuid primary key default gen_random_uuid(),
  profile_id              uuid not null references finance.retirement_profiles(id) on delete cascade unique,
  selected_scenario       text default 'balanced',
  lean_monthly_spend      numeric(10,2) default 4500,
  balanced_monthly_spend  numeric(10,2) default 7000,
  abundant_monthly_spend  numeric(10,2) default 12000,
  custom_monthly_spend    numeric(10,2) default 7000,
  annual_travel           numeric(10,2) default 5000,
  legacy_goal             numeric(14,2) default 0,
  housing_windfall        numeric(14,2) default 0,
  monthly_health_premium  numeric(10,2) default 600,
  survivor_spend_pct      numeric(5,2) default 75,
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);

-- ── RLS ──────────────────────────────────────────────────────────────────────

alter table finance.retirement_profiles  enable row level security;
alter table finance.retirement_accounts  enable row level security;
alter table finance.retirement_incomes   enable row level security;
alter table finance.retirement_expenses  enable row level security;
alter table finance.retirement_debts     enable row level security;
alter table finance.retirement_scenarios enable row level security;

-- profiles: users own their own row
create policy "retirement_profiles_self"
  on finance.retirement_profiles
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- helper: check profile ownership before allowing access to child tables
create policy "retirement_accounts_owner"
  on finance.retirement_accounts
  for all
  using (profile_id in (select id from finance.retirement_profiles where user_id = auth.uid()))
  with check (profile_id in (select id from finance.retirement_profiles where user_id = auth.uid()));

create policy "retirement_incomes_owner"
  on finance.retirement_incomes
  for all
  using (profile_id in (select id from finance.retirement_profiles where user_id = auth.uid()))
  with check (profile_id in (select id from finance.retirement_profiles where user_id = auth.uid()));

create policy "retirement_expenses_owner"
  on finance.retirement_expenses
  for all
  using (profile_id in (select id from finance.retirement_profiles where user_id = auth.uid()))
  with check (profile_id in (select id from finance.retirement_profiles where user_id = auth.uid()));

create policy "retirement_debts_owner"
  on finance.retirement_debts
  for all
  using (profile_id in (select id from finance.retirement_profiles where user_id = auth.uid()))
  with check (profile_id in (select id from finance.retirement_profiles where user_id = auth.uid()));

create policy "retirement_scenarios_owner"
  on finance.retirement_scenarios
  for all
  using (profile_id in (select id from finance.retirement_profiles where user_id = auth.uid()))
  with check (profile_id in (select id from finance.retirement_profiles where user_id = auth.uid()));

-- ── Grants ───────────────────────────────────────────────────────────────────

grant usage on schema finance to authenticated;
grant all on finance.retirement_profiles  to authenticated;
grant all on finance.retirement_accounts  to authenticated;
grant all on finance.retirement_incomes   to authenticated;
grant all on finance.retirement_expenses  to authenticated;
grant all on finance.retirement_debts     to authenticated;
grant all on finance.retirement_scenarios to authenticated;
