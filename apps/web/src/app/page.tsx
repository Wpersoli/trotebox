import Image from 'next/image';
import { Brand } from '@/components/Brand';
import { HomeAccess } from '@/components/HomeAccess';

export default function HomePage() {
  return (
    <>
      <header className="hero-nav home-nav">
        <div className="container hero-nav-inner">
          <Brand priority />
          <nav className="nav-links" aria-label="Navegação da página inicial">
            <a href="#como-funciona">Como funciona</a>
            <a href="#seguranca">Segurança</a>
            <a href="#plataformas">Plataformas</a>
          </nav>
          <a href="#acesso" className="button secondary home-login-button">Entrar</a>
        </div>
      </header>

      <main>
        <section className="home-access-hero" aria-label="Apresentação e acesso TroteBox">
          <div className="container home-access-grid">
            <div className="home-showcase">
              <div className="home-hero-image-wrap">
                <Image
                  src="/brand/trotebox-hero.webp"
                  alt="TroteBox — mascote rindo ao telefone, saindo de uma caixa"
                  width={1500}
                  height={844}
                  className="home-hero-image"
                  sizes="(max-width: 980px) 94vw, 57vw"
                  priority
                />
                <div className="home-hero-copy-overlay">Escolha um trote, prepare a surpresa e acompanhe tudo em uma experiência simples, responsável e criada para funcionar na web, Android e iPhone.</div>
              </div>

              <div className="home-showcase-actions">
                <a href="#como-funciona" className="button secondary compact-button">Ver como funciona</a>
                <div className="home-trust-row" aria-label="Destaques da plataforma">
                  <span>✓ Roteiros originais</span>
                  <span>✓ Créditos transparentes</span>
                  <span>✓ Proteções antiabuso</span>
                </div>
              </div>

              <div id="como-funciona" className="home-step-grid">
                <article className="home-step-card orange-step"><b>01</b><h2>Escolha o trote</h2><p>Navegue por roteiros autorais com categoria, duração e custo em créditos claramente indicados.</p></article>
                <article className="home-step-card purple-step"><b>02</b><h2>Prepare a surpresa</h2><p>Revise as regras, confirme o contato autorizado e valide os detalhes antes de iniciar.</p></article>
                <article className="home-step-card green-step"><b>03</b><h2>Acompanhe o resultado</h2><p>Status, histórico e créditos ficam organizados no seu espaço exclusivo, em qualquer dispositivo.</p></article>
              </div>
            </div>

            <div className="home-access-column">
              <HomeAccess />
              <div className="home-access-assurance" aria-label="Informações de segurança do acesso">
                <span><b>OTP</b> de uso único</span>
                <span>Sessão protegida</span>
                <span>Saldo controlado no servidor</span>
              </div>
            </div>
          </div>
        </section>

        <section id="seguranca" className="home-info-section">
          <div className="container home-info-grid">
            <div>
              <span className="eyebrow">Diversão com limites claros</span>
              <h2>O trote é engraçado. A infraestrutura é séria.</h2>
              <p>Créditos são controlados no servidor, pagamentos dependem de confirmação do provedor e operações sensíveis permanecem fora do navegador.</p>
            </div>
            <div className="home-info-points">
              <span><b>01</b> Saldo nunca é alterado diretamente pelo cliente</span>
              <span><b>02</b> Login sem senha, com código temporário por e-mail</span>
              <span><b>03</b> Idempotência, auditoria e controles antiabuso</span>
            </div>
          </div>
        </section>

        <section id="plataformas" className="home-platform-section">
          <div className="container home-platform-row">
            <div><span className="eyebrow">Uma TroteBox em cada tela</span><h2>Web, iPhone e Android.</h2></div>
            <div className="platform-row"><span>Web</span><span>Windows</span><span>macOS</span><span>iOS</span><span>Android</span></div>
          </div>
        </section>
      </main>

      <footer className="footer home-footer">
        <div className="container">
          <Brand />
          <p>TroteBox — Riso na linha. Surpresa na caixa.</p>
          <small>Projeto autoral em desenvolvimento. Uso sujeito a termos, consentimentos e regras locais aplicáveis.</small>
        </div>
      </footer>
    </>
  );
}
