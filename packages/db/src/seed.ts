import { prisma } from './client';

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('db:seed é destinado a ambientes de desenvolvimento e homologação; produção deve usar apenas migrações e dados operacionais aprovados.');
  }

  const scripts = [
    {
      slug: 'entrega-impossivel',
      title: 'Entrega impossível',
      category: 'Comédia leve',
      description: 'Uma entrega completamente absurda vira o centro de uma conversa divertida, com encerramento claramente humorístico.',
      body: 'Olá! Esta é uma experiência de entretenimento TroteBox. Temos uma entrega um pouco... diferente para você. [roteiro autoral a ser produzido, revisado e aprovado].',
      creditCost: 3,
      durationSeconds: 65,
      accent: 'orange'
    },
    {
      slug: 'pesquisa-muito-seria',
      title: 'Pesquisa muito séria',
      category: 'Humor nonsense',
      description: 'Uma pesquisa fictícia começa normal e rapidamente descamba para perguntas improváveis e respostas inesperadas.',
      body: 'Olá! Esta é uma experiência de entretenimento TroteBox. Estamos realizando uma pesquisa muito séria sobre um assunto nada sério. [roteiro autoral].',
      creditCost: 4,
      durationSeconds: 78,
      accent: 'purple'
    },
    {
      slug: 'vizinho-premiado',
      title: 'Vizinho premiado',
      category: 'Surpresa',
      description: 'Um prêmio de vizinhança fictício cria uma sequência de situações engraçadas sem pedir dados sensíveis.',
      body: 'Olá! Esta é uma experiência de entretenimento TroteBox. Temos uma notícia sobre um prêmio de vizinhança muito especial. [roteiro autoral].',
      creditCost: 5,
      durationSeconds: 92,
      accent: 'green'
    },
    {
      slug: 'clube-dos-atrasados',
      title: 'Clube dos atrasados',
      category: 'Cotidiano',
      description: 'Um clube muito exclusivo tenta recrutar a pessoa por um motivo tão específico quanto improvável.',
      body: 'Olá! Esta é uma experiência de entretenimento TroteBox. Seu nome apareceu em uma seleção muito especial do Clube dos Atrasados. [roteiro autoral].',
      creditCost: 3,
      durationSeconds: 70,
      accent: 'yellow'
    },
    {
      slug: 'assistente-confuso',
      title: 'Assistente confuso',
      category: 'Tecnologia',
      description: 'Um assistente virtual atrapalhado tenta resolver um problema simples e transforma tudo em uma pequena comédia.',
      body: 'Olá! Esta é uma experiência de entretenimento TroteBox. Sou um assistente virtual tentando resolver uma situação que ficou um pouco confusa. [roteiro autoral].',
      creditCost: 4,
      durationSeconds: 82,
      accent: 'red'
    },
    {
      slug: 'mensagem-do-futuro',
      title: 'Mensagem do futuro',
      category: 'Ficção',
      description: 'Uma personagem fictícia do futuro traz uma mensagem urgente que, na verdade, é totalmente ridícula.',
      body: 'Olá! Esta é uma experiência de entretenimento TroteBox. Uma personagem fictícia do futuro deixou uma mensagem para você. [roteiro autoral].',
      creditCost: 5,
      durationSeconds: 96,
      accent: 'purple'
    }
  ];

  for (const script of scripts) {
    await prisma.script.upsert({
      where: { slug: script.slug },
      update: script,
      create: script
    });
  }

  const packs = [
    { code: 'starter', name: 'Caixinha', credits: 5, priceCents: 1490, sortOrder: 1 },
    { code: 'plus', name: 'Risada', credits: 15, priceCents: 2990, sortOrder: 2 },
    { code: 'pro', name: 'Gargalhada', credits: 35, priceCents: 5990, sortOrder: 3 }
  ];

  for (const pack of packs) {
    await prisma.creditPack.upsert({
      where: { code: pack.code },
      update: pack,
      create: pack
    });
  }

  const user = await prisma.user.upsert({
    where: { email: 'demo@trotebox.local' },
    update: { displayName: 'Conta Demonstração' },
    create: { email: 'demo@trotebox.local', displayName: 'Conta Demonstração' }
  });

  await prisma.walletAccount.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, balanceCredits: 30 }
  });

  console.log('Seed TroteBox concluído.');
}

main().finally(() => prisma.$disconnect());
