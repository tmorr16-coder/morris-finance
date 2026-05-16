import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { importJWK, jwtVerify } from 'jose';
import { plaidClient } from '@/lib/plaid';
import { syncItem } from '@/lib/sync';

export const runtime = 'nodejs';

// Cache Plaid's JWK public keys (they rotate periodically)
const keyCache = new Map<string, { jwk: any; fetchedAt: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

async function getPlaidPublicKey(kid: string) {
  const cached = keyCache.get(kid);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.jwk;
  }
  const { data } = await plaidClient.webhookVerificationKeyGet({ key_id: kid });
  keyCache.set(kid, { jwk: data.key, fetchedAt: Date.now() });
  return data.key;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signedJwt = req.headers.get('plaid-verification');

  if (!signedJwt) {
    return NextResponse.json({ error: 'missing signature' }, { status: 401 });
  }

  try {
    // Decode header (without verifying) to get the key id
    const [headerB64] = signedJwt.split('.');
    const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));

    if (header.alg !== 'ES256') {
      return NextResponse.json({ error: 'unsupported alg' }, { status: 401 });
    }

    const jwk = await getPlaidPublicKey(header.kid);
    const publicKey = await importJWK(jwk, 'ES256');

    const { payload } = await jwtVerify(signedJwt, publicKey, { algorithms: ['ES256'] });

    // Verify the body hash matches what Plaid signed
    const bodyHash = createHash('sha256').update(rawBody).digest('hex');
    if (payload.request_body_sha256 !== bodyHash) {
      return NextResponse.json({ error: 'body hash mismatch' }, { status: 401 });
    }

    const event = JSON.parse(rawBody);

    // SYNC_UPDATES_AVAILABLE is the modern transactions webhook (paired with /transactions/sync)
    if (
      event.webhook_type === 'TRANSACTIONS' &&
      (event.webhook_code === 'SYNC_UPDATES_AVAILABLE' ||
        event.webhook_code === 'INITIAL_UPDATE' ||
        event.webhook_code === 'DEFAULT_UPDATE' ||
        event.webhook_code === 'HISTORICAL_UPDATE')
    ) {
      // Look up internal item id by Plaid item_id
      const { createServiceClient } = await import('@/lib/supabase/server');
      const supabase = createServiceClient();
      const { data: item } = await supabase
        .schema('finance')
        .from('plaid_items')
        .select('id')
        .eq('plaid_item_id', event.item_id)
        .single();

      if (item) {
        // Fire and forget — don't block the webhook response
        syncItem(item.id).catch((e) => console.error('[webhook sync]', e));
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('[webhook]', error?.message ?? error);
    return NextResponse.json({ error: 'invalid webhook' }, { status: 401 });
  }
}
