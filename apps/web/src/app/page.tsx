import Image from 'next/image';
import Link from 'next/link';
import { Brand } from '@/components/Brand';

export default function HomePage() {
  return (
    <>
      <header className="hero-nav">
        <div className="container hero-nav-inner">
          <Brand priority />
          <nav className="nav-links" aria-label="Navegação da página inicial">
            <a href="#como-funciona">Como funciona</a>
            <a href="#seguranca">Segurança</a>
            <a href="#plataformas">Plataformas</a>
          </nav>
          <Link href="/login/" className="button secondary">Entrar</Link>
        </div>
      </header>

      <main>
        <section className="landing-hero">
          <div className="container">
            <div className="hero-grid">
              <div className="hero-copy">
                <span className="eyebrow">Comédia por telefone, do seu jeito</span>
                <Image
                  src="/brand/logo-wordmark.png"
                  alt="TroteBox"
                  width={975}
                  height={325}
                  className="hero-wordmark"
                  sizes="(max-width: 700px) 90vw, (max-width: 1100px) 520px, 570px"
                  priority
                />
                <p className="hero-slogan">Riso na linha. <strong>Surpresa na caixa.</strong></p>
                <h1>Abra a caixa.<br/><span>Solte a risada.</span></h1>
                <p className="hero-description">Escolha um trote, prepare a surpresa e acompanhe tudo em uma experiência simples, responsiva e criada para funcionar na web, Android e iPhone.</p>
                <div className="hero-actions">
                  <Link href="/login/" className="button">Abrir a TroteBox</Link>
                  <a href="#como-funciona" className="button secondary">Ver como funciona</a>
                </div>
                <div className="hero-note">
                  <span>Roteiros originais</span>
                  <span>Créditos transparentes</span>
                  <span>Proteções antiabuso</span>
                </div>
              </div>

              <div className="hero-mascot-stage" aria-label="Mascote TroteBox saindo de uma caixa e segurando um telefone">
                <div className="hero-orbit hero-orbit-one" />
                <div className="hero-orbit hero-orbit-two" />
                <Image
                  className="hero-mascot"
                  src="/brand/mascot-hero.png"
                  alt="Mascote TroteBox rindo ao telefone"
                  width={685}
                  height={845}
                  sizes="(max-width: 700px) 90vw, (max-width: 1100px) 460px, 540px"
                  priority
                />
                <span className="hero-confetti hero-confetti-a" aria-hidden="true" />
                <span className="hero-confetti hero-confetti-b" aria-hidden="true" />
                <span className="hero-confetti hero-confetti-c" aria-hidden="true" />
              </div>
            </div>
          </div>
        </section>

        <section id="como-funciona" className="feature-section">
          <div className="container">
            <div className="section-heading">
              <span className="eyebrow">Riso na linha. Surpresa na caixa.</span>
              <h2>Três passos. Uma boa história para contar.</h2>
              <p>A experiência foi desenhada para ser rápida para quem envia, divertida para quem participa e tecnicamente controlada do início ao fim.</p>
            </div>
            <div className="feature-grid">
              <article className="card feature-card orange-card"><div className="feature-icon">01</div><h3>Escolha o trote</h3><p>Navegue por roteiros autorais com categoria, duração e custo em créditos claramente indicados.</p></article>
              <article className="card feature-card purple-card"><div className="feature-icon">02</div><h3>Prepare a surpresa</h3><p>Informe o contato autorizado, revise as regras e confirme os detalhes antes de iniciar.</p></article>
              <article className="card feature-card green-card"><div className="feature-icon">03</div><h3>Acompanhe o resultado</h3><p>Status, histórico e créditos ficam organizados em um único painel, em qualquer dispositivo.</p></article>
            </div>
          </div>
        </section>

        <section className="personality-section">
          <div className="container personality-grid">
            <div>
              <span className="eyebrow">Personalidade TroteBox</span>
              <h2>Irreverente na medida. Profissional onde importa.</h2>
            </div>
            <div className="personality-pills" aria-label="Atributos da marca">
              <span>Divertida</span><span>Surpreendente</span><span>Fácil</span><span>Colorida</span><span>Segura</span><span>Memorável</span>
            </div>
          </div>
        </section>

        <section id="seguranca" className="feature-section soft-section">
          <div className="container split-section">
            <div className="section-heading">
              <span className="eyebrow">Diversão com limites claros</span>
              <h2>O trote é engraçado. A infraestrutura é séria.</h2>
              <p>Saldo controlado no servidor, webhooks validados, idempotência, bloqueios de emergência, limites de uso e trilha de auditoria fazem parte da arquitetura.</p>
            </div>
            <div className="trust-stack">
              <div><b>01</b><span>Sem alteração de saldo pelo navegador</span></div>
              <div><b>02</b><span>Telefonia e pagamentos isolados do frontend</span></div>
              <div><b>03</b><span>Consentimento e controles contra abuso</span></div>
            </div>
          </div>
        </section>

        <section id="plataformas" className="feature-section">
          <div className="container">
            <div className="section-heading">
              <span className="eyebrow">Uma TroteBox em cada tela</span>
              <h2>PC, Mac, iPhone e Android.</h2>
              <p>O mesmo frontend responsivo atende navegadores e é preparado para empacotamento nativo com Capacitor, mantendo API, telefonia e pagamentos em camadas separadas.</p>
            </div>
            <div className="platform-row"><span>Web</span><span>Windows</span><span>macOS</span><span>iOS</span><span>Android</span></div>
          </div>
        </section>
      </main>

      <footer className="footer"><div className="container"><Brand /><p>TroteBox — Riso na linha. Surpresa na caixa.</p><small>Projeto autoral em desenvolvimento. Uso sujeito a termos, consentimentos e regras locais aplicáveis.</small></div></footer>
    </>
  );
}
