const labels: Record<string, string> = {
  VALIDATING: 'Validando', CREDIT_RESERVED: 'Crédito reservado', QUEUED: 'Confirmando envio',
  DIALING: 'Chamando', RINGING: 'Tocando', ANSWERED: 'Atendido',
  RECORDING_PROCESSING: 'Preparando gravação', COMPLETED: 'Concluído',
  FAILED: 'Falhou', CANCELED: 'Cancelado', EXPIRED: 'Expirado', REFUNDED: 'Estornado'
};
const finalStates = new Set(['COMPLETED', 'FAILED', 'CANCELED', 'EXPIRED', 'REFUNDED']);
export function callStatusLabel(status: unknown) { return labels[String(status)] ?? 'Aguardando atualização'; }
export function isCallActive(status: unknown) { return !finalStates.has(String(status)); }
export function callCreditLabel(status: unknown) {
  return status === 'COMPLETED' ? 'consumidos' : isCallActive(status) ? 'reservados' : 'devolvidos';
}
