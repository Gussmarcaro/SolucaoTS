import type { IEmailService } from '@/application/auth/IEmailService';
import { ConsoleEmailService } from './ConsoleEmailService';
import { SmtpEmailService } from './SmtpEmailService';
import { registrar } from '@/shared/log';

/**
 * Qual adapter de e-mail usar — decidido pela configuração, não por uma flag
 * de ambiente.
 *
 * Mesmo padrão do assistente (`ANTHROPIC_API_KEY`) e do Sentry (`SENTRY_DSN`):
 * **com as variáveis, envia; sem elas, cai no console.** Quem clona o projeto
 * para mexer no frontend não precisa de servidor SMTP, e ninguém precisa
 * lembrar de virar uma chave ao publicar — configurar já é ligar.
 *
 * O aviso no boot existe porque o modo console é indistinguível do envio bem
 * sucedido pela tela: a resposta ao usuário é a mesma mensagem genérica nos
 * dois casos. Sem a linha no log, um `.env` incompleto em produção só apareceria
 * quando alguém não conseguisse recuperar a senha.
 */
export function criarEmailService(): IEmailService {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS;
  const remetente = process.env.SMTP_FROM?.trim() || (user ? `Solução TS <${user}>` : '');

  if (!host || !user || !pass) {
    registrar('aviso', 'email-sem-configuracao', {
      detalhe: 'SMTP_HOST, SMTP_USER ou SMTP_PASS ausentes — o link de recuperação vai para o console, não para o e-mail do usuário.',
    });
    return new ConsoleEmailService();
  }

  /*
   * A porta decide o modo, e errar isso é a falha mais comum de SMTP:
   * 465 fala TLS desde o primeiro byte (`secure: true`); 587 começa em texto
   * puro e sobe para TLS com STARTTLS (`secure: false`, que o nodemailer
   * negocia sozinho). Trocar os dois dá um travamento até o timeout, sem
   * mensagem que explique.
   */
  const port = Number(process.env.SMTP_PORT ?? 465);
  const secure = process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE === 'true'
    : port === 465;

  registrar('info', 'email-configurado', { host, port, secure });
  return new SmtpEmailService({ host, port, secure, user, pass, remetente });
}
