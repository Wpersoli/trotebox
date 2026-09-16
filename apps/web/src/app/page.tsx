import { HomeExperience } from '@/components/HomeExperience';
import { Brand } from '@/components/Brand';
import { SkipLink } from '@/components/SkipLink';

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
  ['Existe exemplo em áudio?', 'Sim. Os cartões de experiências oferecem uma demonstração narrada pela voz do seu dispositivo, com transcrição. Essa amostra ilustra o estilo de humor; o áudio da chamada pode ser diferente.']
];

export default function HomePage() {
  return (
    <>
      <SkipLink targetId="home-content">Pular para o conteúdo principal</SkipLink>
      <main id="home-content" tabIndex={-1}>
        <HomeExperience />

        <section id="catalogo" className="home-info-section">
          <div className="container">
            <div>
              <span className="eyebrow">Conheça antes de começar</span>
              <h2>Roteiros com personalidade, duração e custo claros.</h2>
              <p>Explore as histórias e confira a duração e o custo em créditos antes de escolher.</p>
            </div>
            <div className="home-step-grid">
              {publicScripts.map((script) => (
                <article className="home-step-card" key={script.title}>
                  <b>{script.category}</b>
                  <h3>{script.title}</h3>
                  <p>{script.description}</p>
                  <small>{script.duration} · {script.credits} créditos</small>
                  <a className="button secondary" href="/catalog/">Escolher roteiro →</a>
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
                <article className={`home-step-card home-price-card${pack.highlight ? ' home-price-featured' : ''}`} key={pack.name}>
                  <b>{pack.highlight ? 'EM DESTAQUE' : 'PACOTE'}</b>
                  <h3>{pack.name}</h3>
                  <p><strong>{pack.credits} créditos</strong></p>
                  <p className="home-price-value"><strong>{pack.price}</strong></p>
                  <small>{pack.unit}</small>
                  <a className="button secondary" href="/wallet/">Ver créditos →</a>
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
          <Brand dark />
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
