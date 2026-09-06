import { Prisma, prisma } from '@trotebox/db';
import { hashSubject } from './crypto';

function safeAuditFailure(cause: unknown) {
  if (cause instanceof Prisma.PrismaClientKnownRequestError) {
    return { name: cause.name, code: cause.code };
  }
  if (cause instanceof Error) return { name: cause.name };
  return { name: 'UnknownError' };
}

export async function audit(input: {
  request?: Request;
  userId?: string;
  actorType?: string;
  action: string;
  targetType: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}) {
  const forwarded = input.request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const data: Prisma.AuditLogUncheckedCreateInput = {
    actorType: input.actorType ?? (input.userId ? 'USER' : 'SYSTEM'),
    action: input.action,
    targetType: input.targetType,
    ...(input.userId !== undefined ? { userId: input.userId } : {}),
    ...(input.targetId !== undefined ? { targetId: input.targetId } : {}),
    ...(forwarded ? { ipHash: hashSubject(forwarded) } : {}),
    ...(input.metadata !== undefined ? { metadata: input.metadata as Prisma.InputJsonValue } : {})
  };
  await prisma.auditLog.create({ data }).catch((cause) => {
    console.error('audit_failed', safeAuditFailure(cause));
  });
}
