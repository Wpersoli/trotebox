'use client';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
        <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '32px', textAlign: 'center' }}>
          <section aria-labelledby="global-error-title" style={{ maxWidth: '620px' }}>
            <p style={{ margin: 0, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>TroteBox</p>
            <h1 id="global-error-title" style={{ margin: '12px 0 10px', fontSize: 'clamp(2rem, 7vw, 4rem)' }}>Temporariamente indisponível.</h1>
            <p style={{ margin: '0 0 24px', lineHeight: 1.6 }}>Encontramos uma falha inesperada. Nenhuma ação financeira ou chamada deve ser considerada concluída apenas por esta tela.</p>
            <button type="button" onClick={() => reset()} style={{ minHeight: '48px', padding: '0 20px', borderRadius: '14px', font: 'inherit', fontWeight: 700, cursor: 'pointer' }}>
              Recarregar experiência
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
