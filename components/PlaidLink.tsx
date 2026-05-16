'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePlaidLink, type PlaidLinkOnSuccess } from 'react-plaid-link';

/**
 * Drop this into any page where users connect banks:
 *
 *   import { PlaidLink } from '@/components/PlaidLink';
 *   <PlaidLink onConnected={() => router.refresh()} />
 */
export function PlaidLink({ onConnected }: { onConnected?: () => void }) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/plaid/link-token', { method: 'POST' })
      .then((r) => r.json())
      .then((d) => setLinkToken(d.link_token))
      .catch((e) => console.error('link token fetch failed', e));
  }, []);

  const onSuccess = useCallback<PlaidLinkOnSuccess>(
    async (public_token, metadata) => {
      setLoading(true);
      try {
        await fetch('/api/plaid/exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            public_token,
            institution: metadata.institution,
          }),
        });
        onConnected?.();
      } finally {
        setLoading(false);
      }
    },
    [onConnected]
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
  });

  const disabled = !ready || !linkToken || loading;

  return (
    <button
      onClick={() => open()}
      disabled={disabled}
      className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50"
    >
      {loading ? 'Connecting…' : 'Connect a bank'}
    </button>
  );
}
