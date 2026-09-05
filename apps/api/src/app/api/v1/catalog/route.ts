import { prisma } from '@trotebox/db';
import { handleError, okPublic } from '@/server/http';
import { platformCapabilities } from '@/server/capabilities';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [scripts, packs] = await Promise.all([
      prisma.script.findMany({ where: { active: true }, orderBy: [{ category: 'asc' }, { title: 'asc' }] }),
      prisma.creditPack.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } })
    ]);
    return okPublic({
      scripts: scripts.map(({ id, slug, title, category, description, creditCost, durationSeconds, accent }) => ({ id, slug, title, category, description, creditCost, durationSeconds, accent })),
      packs: packs.map(({ code, name, credits, priceCents, currency }, index) => ({ code, name, credits, priceCents, currency, highlight: index === 1 })),
      capabilities: platformCapabilities()
    });
  } catch (cause) { return handleError(cause); }
}
