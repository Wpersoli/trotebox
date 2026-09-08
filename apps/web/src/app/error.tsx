'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('TroteBox route error', { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '32px', textAlign: 'center' }}>
      <section aria-labelledby="error-title" style={{ maxWidth: '600px' }}>
        <p style={{ margin: 0, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>TroteBox</p>
        <h1 id="error-title" style={{ margin: '12px 0 10px', fontSize: 'clamp(2rem, 7vw, 4rem)' }}>Algo saiu do lugar.</h1>
        <p style={{ margin: '0 0 24px', lineHeight: 1.6 }}>A operação não foi concluída. Tente novamente; seu saldo e suas operações protegidas continuam sob controle do servidor.</p>
        <button type="button" onClick={() => reset()} style={{ minHeight: '48px', padding: '0 20px', borderRadius: '14px', font: 'inherit', fontWeight: 700, cursor: 'pointer' }}>
          Tentar novamente
        </button>
      </section>
    </main>
  );
}
