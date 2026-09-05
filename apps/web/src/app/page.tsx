import Image from 'next/image';
import { Brand } from '@/components/Brand';
import { HomeAccess } from '@/components/HomeAccess';

const publicScripts = [
  { title: 'Entrega impossível', category: 'Comédia leve', description: 'Uma entrega completamente absurda vira o centro de uma conversa divertida, com encerramento claramente humorístico.', credits: 3, duration: '1m05s' },
  { title: 'Pesquisa muito séria', category: 'Humor nonsense', description: 'Uma pesquisa fictícia começa normal e rapidamente descamba para perguntas improváveis e respostas inesperadas.', credits: 4, duration: '1m18s' },
  { title: 'Vizinho premiado', category: 'Surpresa', description: 'Um prêmio de vizinhança fictício cria uma sequência de situações engraçadas sem pedir dados sensíveis.', credits: 5, duration: '1m32s' },
  { title: 'Clube dos atrasados', category: 'Cotidiano', description: 'Um clube muito exclusivo tenta recrutar a pessoa por um motivo tão específico quanto improvável.', credits: 3, duration: '1m10s' },
  { title: 'Assistente confuso', category: 'Tecnologia', description: 'Um assistente virtual atrapalhado tenta resolver um problema simples e transforma tudo em uma pequena comédia.', credits: 4, duration: '1m22s' },
  { title: 'Mensagem do futuro', category: 'Ficção', description: 'Uma personagem fictícia do futuro traz uma mensagem urgente que, na verdade, é totalmente ridícula.', credits: 5, duration: '1m36s' }
];

const publicPacks = [
  { name: 'Caixinha', credits: 5, price: 'R$ 14,90', unit: 'R$ 2,98/crédito' },
  { name: 'Risada', credits: 15, price: 'R$ 29,90', unit: 'R$ 1,99/crédito', highlight: true },
  { name: 'Gargalhada', credits: 35, price: 'R$ 59,90', unit: 'R$ 1,71/crédito' }
];

const faq = [
  ['Quem paga a ligação?', 'A chamada é iniciada pela infraestrutura do TroteBox. O usuário não precisa fazer a ligação pelo próprio celular.'],
  ['Quando meu crédito é consumido?', 'O crédito é primeiro reservado no servidor. A liquidação acontece de acordo com o resultado da chamada; em falhas terminais a reserva pode ser liberada.'],
  ['Preciso de uma senha?', 'Não. O acesso usa um código temporário enviado ao e-mail, com sessão protegida e revogável.'],
  ['Posso gravar a chamada?', 'Somente quando a gravação estiver habilitada e houver consentimento específico. O acesso às gravações é protegido e temporário.'],
  ['Por que uma chamada pode demorar?', 'Linhas ocupadas, tentativas do provedor e estados de telefonia podem fazer uma chamada levar mais tempo para chegar a um estado final.'],
  ['O que acontece quando a telefonia está indisponível?', 'O backend bloqueia a operação antes da reserva de crédito e informa que a telefonia está temporariamente indisponível.'],
  ['Como funciona o Pix?', 'O pagamento é criado no backend e confirmado por eventos do provedor, com vínculo ao usuário, pacote e transação.'],
  ['O que o TroteBox bloqueia?', 'Destinos de emergência, padrões especiais, números em supressão e outras situações de risco são rejeitados antes do processamento.'],
  ['Onde vejo minhas chamadas?', 'No espaço autenticado do TroteBox, com histórico, status e créditos organizados por chamada.'],
  ['Existe exemplo em áudio?', 'A vitrine pública já apresenta os roteiros e suas características. Exemplos em áudio serão publicados somente depois da revisão e aprovação final dos arquivos de demonstração.']
];

export default function HomePage() {
  return (
    <>
      <header className="hero-nav home-nav">
        <div className="container hero-nav-inner">
          <Brand priority />
          <nav className="nav-links" aria-label="Navegação da página inicial">
            <a href="#como-funciona">Como funciona</a>
            <a href="#experiencias">Experiências</a>
            <a href="#precos">Preços</a>
            <a href="#seguranca">Segurança</a>
            <a href="#faq">FAQ</a>
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
                <a href="#experiencias" className="button primary compact-button">Conhecer os trotes</a>
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

            <div id="acesso" className="home-access-column">
              <HomeAccess />
              <div className="home-access-assurance" aria-label="Informações de segurança do acesso">
                <span><b>OTP</b> de uso único</span>
                <span>Sessão protegida</span>
                <span>Saldo controlado no servidor</span>
              </div>
            </div>
          </div>
        </section>

        <section id="experiencias" className="home-info-section">
          <div className="container">
            <div>
              <span className="eyebrow">Conheça antes de começar</span>
              <h2>Roteiros com personalidade, duração e custo claros.</h2>
              <p>O catálogo público mostra o que cada experiência entrega. Os exemplos em áudio entram depois da revisão final dos arquivos de demonstração, sem criar expectativa falsa sobre um recurso ainda não publicado.</p>
            </div>
            <div className="home-step-grid">
              {publicScripts.map((script) => (
                <article className="home-step-card" key={script.title}>
                  <b>{script.category}</b>
                  <h3>{script.title}</h3>
                  <p>{script.description}</p>
                  <small>{script.duration} · {script.credits} créditos</small>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="precos" className="home-platform-section">
          <div className="container">
            <div>
              <span className="eyebrow">Créditos</span>
              <h2>Escolha o pacote que combina com a sua próxima surpresa.</h2>
              <p>Valores exibidos abaixo correspondem aos pacotes comerciais atuais do catálogo e são cobrados somente após confirmação do provedor.</p>
            </div>
            <div className="home-step-grid">
              {publicPacks.map((pack) => (
                <article className="home-step-card" key={pack.name}>
                  <b>{pack.highlight ? 'MAIS ESCOLHIDO' : 'PACOTE'}</b>
                  <h3>{pack.name}</h3>
                  <p><strong>{pack.credits} créditos</strong></p>
                  <p><strong>{pack.price}</strong></p>
                  <small>{pack.unit}</small>
                </article>
              ))}
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
              <span><b>04</b> Destinos de emergência e números suprimidos são bloqueados</span>
            </div>
          </div>
        </section>

        <section id="bloquear-numero" className="home-platform-section">
          <div className="container home-platform-row">
            <div>
              <span className="eyebrow">Não quer receber?</span>
              <h2>O bloqueio de número faz parte do nosso modelo de segurança.</h2>
            </div>
            <p>O fluxo automatizado deve confirmar que a pessoa realmente controla o número antes de colocá-lo em supressão. Não criamos um formulário aberto que permita a terceiros bloquear telefones de outras pessoas.</p>
          </div>
        </section>

        <section id="faq" className="home-info-section">
          <div className="container">
            <span className="eyebrow">Perguntas frequentes</span>
            <h2>As respostas que você precisa antes de usar.</h2>
            <div className="home-info-points">
              {faq.map(([question, answer]) => (
                <details key={question}>
                  <summary><b>{question}</b></summary>
                  <p>{answer}</p>
                </details>
              ))}
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
          <nav aria-label="Links de confiança">
            <a href="#precos">Preços</a>{' · '}
            <a href="#faq">FAQ</a>{' · '}
            <a href="#bloquear-numero">Bloquear meu número</a>{' · '}
            <a href="#seguranca">Segurança</a>
          </nav>
          <small>Projeto autoral. Uso sujeito a consentimento, termos e regras locais aplicáveis. Não use o serviço para ameaça, perseguição, fraude ou assédio.</small>
        </div>
      </footer>
    </>
  );
}
