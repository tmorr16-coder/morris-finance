-- Optional 4-digit PIN stored in hub.preferences.
-- Null = no PIN required. This is a UX barrier only, not a security
-- boundary — the data is already protected by Supabase Auth.

alter table hub.preferences
  add column if not exists finance_pin text check (finance_pin is null or finance_pin ~ '^\d{4}$');
