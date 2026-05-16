import { NextResponse } from 'next/server';
import { CountryCode, Products } from 'plaid';
import { plaidClient } from '@/lib/plaid';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    // OAuth institutions (Chase, Capital One) require redirect_uri AND webhook,
    // both registered in the Plaid dashboard. For sandbox testing with non-OAuth
    // banks (First Platypus, etc.) we skip both — set PLAID_USE_OAUTH=true once
    // the redirect URI and webhook are registered in the Plaid dashboard.
    const useOAuth = process.env.PLAID_USE_OAUTH === 'true';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

    const { data } = await plaidClient.linkTokenCreate({
      user: { client_user_id: user.id },
      client_name: 'morrisai.family',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
      ...(useOAuth && appUrl
        ? {
            webhook: `${appUrl}/api/plaid/webhook`,
            redirect_uri: `${appUrl}/oauth-callback`,
          }
        : {}),
    });

    return NextResponse.json({ link_token: data.link_token });
  } catch (error: unknown) {
    const errObj = error as { response?: { data?: unknown }; message?: string };
    console.error('[link-token]', errObj.response?.data ?? errObj.message);
    return NextResponse.json({ error: 'failed to create link token' }, { status: 500 });
  }
}
