import { env } from './env';
import { AppError } from './http';

const BREVO_TRANSACTIONAL_EMAIL_URL = 'https://api.brevo.com/v3/smtp/email';
const EMAIL_DELIVERY_TIMEOUT_MS = 10_000;

export type AuthEmailPayload = {
  sender: { name: string; email: string };
  to: Array<{ email: string }>;
  subject: string;
  htmlContent: string;
};

export function buildAuthEmailPayload(params: {
  recipientEmail: string;
  code: string;
  ttlMinutes: number;
  senderName: string;
  senderAddress: string;
}): AuthEmailPayload {
  const { recipientEmail, code, ttlMinutes, senderName, senderAddress } = params;
  return {
    sender: { name: senderName, email: senderAddress },
    to: [{ email: recipientEmail }],
    subject: 'Seu código de acesso TroteBox',
    htmlContent: `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;background:#f7f5ff;font-family:Arial,Helvetica,sans-serif;color:#17163f">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f5ff;padding:24px 12px">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border:1px solid #ebe7f7;border-radius:18px;padding:32px">
            <tr><td style="font-size:24px;font-weight:800;padding-bottom:10px">TroteBox</td></tr>
            <tr><td style="font-size:18px;font-weight:700;padding-bottom:12px">Seu código de acesso</td></tr>
            <tr><td style="font-size:14px;line-height:1.6;color:#615f7d;padding-bottom:18px">Use o código abaixo para entrar no seu espaço exclusivo.</td></tr>
            <tr><td align="center" style="font-size:34px;font-weight:800;letter-spacing:9px;background:#f3efff;border-radius:14px;padding:18px 8px">${code}</td></tr>
            <tr><td style="font-size:13px;line-height:1.6;color:#615f7d;padding-top:18px">O código expira em ${ttlMinutes} minutos e pode ser usado somente uma vez.</td></tr>
            <tr><td style="font-size:12px;line-height:1.6;color:#87849c;padding-top:16px">Se você não solicitou este acesso, ignore esta mensagem. Não encaminhe nem compartilhe este código.</td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
  };
}

export async function deliverAuthCode(email: string, code: string) {
  const config = env();

  if (config.AUTH_DELIVERY === 'console') {
    if (config.NODE_ENV === 'production') {
      throw new AppError(503, 'AUTH_DELIVERY_NOT_CONFIGURED', 'Entrega de código não configurada.');
    }
    console.info('development_auth_code', { email, code });
    return { devCode: code };
  }

  if (!config.BREVO_API_KEY || !config.EMAIL_FROM_ADDRESS) {
    throw new AppError(503, 'EMAIL_NOT_CONFIGURED', 'Serviço de e-mail não configurado.');
  }

  const payload = buildAuthEmailPayload({
    recipientEmail: email,
    code,
    ttlMinutes: config.AUTH_CODE_TTL_MINUTES,
    senderName: config.EMAIL_FROM_NAME,
    senderAddress: config.EMAIL_FROM_ADDRESS
  });

  let response: Response;
  try {
    response = await fetch(BREVO_TRANSACTIONAL_EMAIL_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'api-key': config.BREVO_API_KEY
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(EMAIL_DELIVERY_TIMEOUT_MS)
    });
  } catch {
    throw new AppError(502, 'EMAIL_PROVIDER_UNAVAILABLE', 'Não foi possível enviar o código de acesso.');
  }

  if (!response.ok) {
    console.error('brevo_email_delivery_failed', { status: response.status });
    throw new AppError(502, 'EMAIL_DELIVERY_FAILED', 'Não foi possível enviar o código de acesso.');
  }

  return {};
}
