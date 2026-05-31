-- Account sharing: lets a user share individual accounts with
-- other platform members (e.g. spouse, child). The grantee can
-- optionally fold shared accounts into their own portfolio total.

CREATE TABLE finance.account_shares (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  grantee_user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id           UUID NOT NULL REFERENCES finance.accounts(id) ON DELETE CASCADE,
  -- Grantee controls whether this account rolls into their net position
  include_in_portfolio BOOLEAN NOT NULL DEFAULT false,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(owner_user_id, grantee_user_id, account_id),
  CHECK (owner_user_id <> grantee_user_id)
);

ALTER TABLE finance.account_shares ENABLE ROW LEVEL SECURITY;

-- Owner: full control over shares they created
CREATE POLICY "owner_all" ON finance.account_shares
  USING (auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = owner_user_id);

-- Grantee: can read shares directed at them
CREATE POLICY "grantee_select" ON finance.account_shares FOR SELECT
  USING (auth.uid() = grantee_user_id);

-- Grantee: can update only include_in_portfolio on their own shares
CREATE POLICY "grantee_update" ON finance.account_shares FOR UPDATE
  USING (auth.uid() = grantee_user_id)
  WITH CHECK (auth.uid() = grantee_user_id);

-- Index for fast lookup from either side
CREATE INDEX account_shares_owner_idx   ON finance.account_shares (owner_user_id);
CREATE INDEX account_shares_grantee_idx ON finance.account_shares (grantee_user_id);
CREATE INDEX account_shares_account_idx ON finance.account_shares (account_id);
