import type { IUsuarioRepository } from '@/application/usuario/IUsuarioRepository';
import type { IEmailService } from './IEmailService';
import type { SolicitarRecuperacaoDTO } from './dtos';
import { gerarResetToken } from '@/shared/auth/resetToken';
import { registrar } from '@/shared/log';

const APP_URL = process.env.APP_URL ?? 'http://localhost:5173';
const TTL_MIN = Number(process.env.RESET_TOKEN_TTL_MIN ?? 30);

export class SolicitarRecuperacaoUseCase {
  constructor(
    private readonly repo: IUsuarioRepository,
    private readonly email: IEmailService,
  ) {}

  /**
   * Sempre resolve sem erro (resposta genérica na camada HTTP) para não
   * revelar se o e-mail existe. Só envia o e-mail se o usuário existir.
   */
  async execute({ email }: SolicitarRecuperacaoDTO): Promise<void> {
    const emailNorm = (email ?? '').trim().toLowerCase();
    const usuario = await this.repo.buscarAuthPorEmail(emailNorm);
    if (!usuario) return;

    const { token, tokenHash, expiresAt } = gerarResetToken();
    await this.repo.definirResetToken(usuario.id, tokenHash, expiresAt);

    const link = `${APP_URL}/redefinir-senha?token=${token}`;

    /*
     * Falha de envio **não** pode virar erro na resposta.
     *
     * A resposta é a mesma mensagem genérica exista ou não o e-mail — é o que
     * impede descobrir quem tem conta. Mas o envio só acontece quando o usuário
     * existe: deixar a exceção subir devolveria 500 justamente para os
     * endereços cadastrados e 200 para os demais, entregando a lista pelo
     * código de status. O cuidado de cima seria desfeito pela falha de baixo.
     *
     * Então o erro fica no log do servidor, com nível `erro` — que é o que o
     * Sentry recolhe. É o operador que precisa saber que o SMTP caiu; para o
     * usuário não há nada de útil a dizer, e para o atacante, nada.
     */
    try {
      await this.email.enviarRecuperacaoSenha({
        para: usuario.email,
        nome: usuario.nome,
        link,
        validadeMinutos: TTL_MIN,
      });
    } catch (erro) {
      registrar('erro', 'email-recuperacao-falhou', {
        motivo: erro instanceof Error ? erro.message : String(erro),
      });
    }
  }
}
