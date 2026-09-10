import nodemailer, { type Transporter } from 'nodemailer';
import type { IEmailService } from '@/application/auth/IEmailService';
import { registrar } from '@/shared/log';

/**
 * Envio real por SMTP.
 *
 * O único e-mail que o sistema manda é o de redefinição de senha — e ele
 * precisa chegar, porque é a única saída de quem não consegue mais entrar. Sem
 * este adapter, o link ia para o console do servidor: funciona no
 * desenvolvimento, e em produção significa que ninguém recupera a senha sozinho.
 *
 * **Nada de agenda por aqui.** O lembrete de compromisso continua sendo só o
 * sino, por decisão registrada em CLAUDE.md: um canal de e-mail que nada
 * dispara é pior que canal nenhum, porque o usuário passa a confiar num aviso
 * que não vem.
 */
export class SmtpEmailService implements IEmailService {
  private readonly transporte: Transporter;

  constructor(
    private readonly config: {
      host: string;
      port: number;
      secure: boolean;
      user: string;
      pass: string;
      remetente: string;
    },
  ) {
    this.transporte = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.pass },
    });
  }

  async enviarRecuperacaoSenha({
    para,
    nome,
    link,
    validadeMinutos,
  }: {
    para: string;
    nome: string;
    link: string;
    validadeMinutos: number;
  }): Promise<void> {
    const primeiroNome = nome.trim().split(/\s+/)[0] || nome;

    await this.transporte.sendMail({
      from: this.config.remetente,
      to: para,
      subject: 'Redefinição de senha — Solução TS',
      text: textoSimples(primeiroNome, link, validadeMinutos),
      html: corpoHtml(primeiroNome, link, validadeMinutos),
    });

    // Sem o endereço e sem o link: o log é lugar clássico de vazamento, e o
    // link **é** a credencial — quem o lê troca a senha da pessoa.
    registrar('info', 'email-enviado', { tipo: 'recuperacao-senha' });
  }
}

/**
 * Versão em texto puro.
 *
 * Não é enfeite: cliente que bloqueia HTML mostraria uma mensagem vazia, e
 * filtro de spam trata mensagem só-HTML com mais rigor. Aqui isso importa mais
 * que de costume, porque quem espera este e-mail está trancado para fora.
 */
function textoSimples(nome: string, link: string, minutos: number): string {
  return [
    `Olá, ${nome}.`,
    '',
    'Recebemos um pedido para redefinir a sua senha no Solução TS.',
    'Abra o endereço abaixo para escolher uma nova senha:',
    '',
    link,
    '',
    `O link vale por ${minutos} minutos e só pode ser usado uma vez.`,
    '',
    'Se não foi você que pediu, ignore esta mensagem — a sua senha atual continua valendo.',
    '',
    'Solução TS — Prestação de contas ao Terceiro Setor',
  ].join('\n');
}

/** O mesmo conteúdo em HTML, com estilo embutido (cliente de e-mail ignora CSS externo). */
function corpoHtml(nome: string, link: string, minutos: number): string {
  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:24px;background:#f4f5f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2937;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
      <tr><td>
        <h1 style="margin:0 0 16px;font-size:18px;color:#111827;">Redefinição de senha</h1>
        <p style="margin:0 0 12px;font-size:14px;line-height:1.6;">Olá, ${escapar(nome)}.</p>
        <p style="margin:0 0 20px;font-size:14px;line-height:1.6;">
          Recebemos um pedido para redefinir a sua senha no <strong>Solução TS</strong>.
          Clique no botão abaixo para escolher uma nova.
        </p>
        <p style="margin:0 0 20px;">
          <a href="${escapar(link)}"
             style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:600;">
            Redefinir minha senha
          </a>
        </p>
        <p style="margin:0 0 20px;font-size:13px;line-height:1.6;color:#6b7280;">
          O link vale por <strong>${minutos} minutos</strong> e só pode ser usado uma vez.
          Se o botão não funcionar, copie e cole este endereço no navegador:<br>
          <span style="word-break:break-all;color:#2563eb;">${escapar(link)}</span>
        </p>
        <p style="margin:0;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;line-height:1.6;color:#6b7280;">
          Se não foi você que pediu, ignore esta mensagem — a sua senha atual continua valendo.
        </p>
      </td></tr>
    </table>
  </body>
</html>`;
}

/**
 * O nome vem do cadastro e entra no HTML; o link, da montagem do token.
 * Nenhum dos dois deveria trazer marcação, mas escapar custa uma linha e
 * dispensa confiar nisso.
 */
function escapar(valor: string): string {
  return valor
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
