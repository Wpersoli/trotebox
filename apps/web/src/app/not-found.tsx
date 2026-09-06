import Link from 'next/link';

export default function NotFound() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '32px', textAlign: 'center' }}>
      <section aria-labelledby="not-found-title" style={{ maxWidth: '560px' }}>
        <p style={{ margin: 0, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>TroteBox</p>
        <h1 id="not-found-title" style={{ margin: '12px 0 10px', fontSize: 'clamp(2rem, 7vw, 4rem)' }}>Página não encontrada.</h1>
        <p style={{ margin: '0 0 24px', lineHeight: 1.6 }}>O endereço pode ter mudado ou a página não existe mais.</p>
        <Link href="/" style={{ display: 'inline-flex', minHeight: '48px', alignItems: 'center', justifyContent: 'center', padding: '0 20px', borderRadius: '14px', fontWeight: 700, textDecoration: 'none', border: '1px solid currentColor' }}>
          Voltar para a página inicial
        </Link>
      </section>
    </main>
  );
}
