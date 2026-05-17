import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Set in production to .morrisai.family so the auth cookie is shared across
// hub / health / finance subdomains (SSO). Leave unset on preview / localhost.
const COOKIE_DOMAIN = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;

/**
 * SSR client for authenticated user-facing routes.
 * Honors RLS — only sees what the logged-in user is allowed to see.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
              })
            );
          } catch {
            // ignore in read-only contexts (server components)
          }
        },
      },
    }
  );
}

/**
 * Service-role client for privileged operations (cron, webhook, encryption flows).
 * Bypasses RLS. Use only in API routes that have already validated auth or run as system jobs.
 */
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    }
  );
}
