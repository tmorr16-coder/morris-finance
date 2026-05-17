-- Allow hiding specific accounts from dashboards + insights without
-- disconnecting them from Plaid. Users may have accounts they don't
-- want to track (joint accounts, business cards, etc.).

alter table finance.accounts
  add column if not exists is_hidden boolean not null default false;

create index if not exists accounts_visible_idx
  on finance.accounts(item_id)
  where is_hidden = false;
