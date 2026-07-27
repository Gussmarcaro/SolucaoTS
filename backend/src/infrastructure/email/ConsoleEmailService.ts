import type { IEmailService } from '@/application/auth/IEmailService';

/**
 * Implementação de desenvolvimento: registra o e-mail no console em vez de
 * enviá-lo de fato. Em produção, troque por um adapter real (Nodemailer/SES/etc.)
 * mantendo a mesma interface IEmailService.
 */
export class ConsoleEmailService implements IEmailService {
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
    console.log('\n===== [E-MAIL DEV] Recuperação de senha =====');
    console.log(`Para: ${nome} <${para}>`);
    console.log(`Assunto: Redefinição de senha — Solução TS`);
    console.log(`Validade: ${validadeMinutos} minutos`);
    console.log(`Link: ${link}`);
    console.log('=============================================\n');
  }
}
