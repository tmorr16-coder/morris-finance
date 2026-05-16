// One-time: retro-add the webhook URL to items that were connected before
// the link-token started including it. Run once after enabling webhooks.
import { createClient } from '@supabase/supabase-js';
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import { createDecipheriv } from 'crypto';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf8');
const getEnv = (k) => env.match(new RegExp(`^${k}=(.+)$`, 'm'))?.[1];

const supa = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));
const plaid = new PlaidApi(new Configuration({
  basePath: PlaidEnvironments[getEnv('PLAID_ENV') ?? 'sandbox'],
  baseOptions: { headers: {
    'PLAID-CLIENT-ID': getEnv('PLAID_CLIENT_ID'),
    'PLAID-SECRET': getEnv('PLAID_SECRET'),
  } },
}));

function decrypt(payload) {
  const key = Buffer.from(getEnv('TOKEN_ENCRYPTION_KEY'), 'hex');
  const data = Buffer.from(payload, 'base64');
  const iv = data.subarray(0, 12);
  const tag = data.subarray(12, 28);
  const ciphertext = data.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

const { data: items } = await supa
  .schema('finance')
  .from('plaid_items')
  .select('id, institution_name, access_token_encrypted')
  .eq('status', 'active');

const webhookUrl = `${getEnv('NEXT_PUBLIC_APP_URL')}/api/plaid/webhook`;
console.log(`Setting webhook URL: ${webhookUrl}`);
console.log(`Updating ${items?.length ?? 0} item(s):\n`);

for (const it of items ?? []) {
  try {
    const accessToken = decrypt(it.access_token_encrypted);
    const { data } = await plaid.itemWebhookUpdate({
      access_token: accessToken,
      webhook: webhookUrl,
    });
    console.log(`  ✓ ${it.institution_name} — webhook set to ${data.item.webhook}`);
  } catch (e) {
    const msg = e?.response?.data?.error_message ?? e?.message ?? 'unknown';
    console.log(`  ✗ ${it.institution_name} — ${msg}`);
  }
}
