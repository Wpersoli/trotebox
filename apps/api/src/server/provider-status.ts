import { CallStatus } from '@trotebox/db';

export function mapTwilioStatus(value: string): CallStatus | undefined {
  switch (value) {
    case 'queued': return CallStatus.QUEUED;
    case 'initiated': return CallStatus.DIALING;
    case 'ringing': return CallStatus.RINGING;
    case 'in-progress': return CallStatus.ANSWERED;
    case 'completed': return CallStatus.COMPLETED;
    case 'busy':
    case 'failed':
    case 'no-answer': return CallStatus.FAILED;
    case 'canceled': return CallStatus.CANCELED;
    default: return undefined;
  }
}

export function mapVonageStatus(value: string): CallStatus | undefined {
  switch (value) {
    case 'started': return CallStatus.DIALING;
    case 'ringing': return CallStatus.RINGING;
    case 'answered': return CallStatus.ANSWERED;
    case 'completed': return CallStatus.COMPLETED;
    case 'cancelled': return CallStatus.CANCELED;
    case 'busy':
    case 'unanswered':
    case 'rejected':
    case 'failed':
    case 'timeout': return CallStatus.FAILED;
    default: return undefined;
  }
}
