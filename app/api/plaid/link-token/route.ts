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
    const { data } = await plaidClient.linkTokenCreate({
      user: { client_user_id: user.id },
      client_name: 'morrisai.family',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
      webhook: `${process.env.NEXT_PUBLIC_APP_URL}/api/plaid/webhook`,
      // For OAuth institutions (Chase, Capital One), Plaid requires a redirect URI.
      // This must match what's registered in the Plaid dashboard.
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/oauth-callback`,
    });

    return NextResponse.json({ link_token: data.link_token });
  } catch (error: any) {
    console.error('[link-token]', error?.response?.data ?? error.message);
    return NextResponse.json({ error: 'failed to create link token' }, { status: 500 });
  }
}
