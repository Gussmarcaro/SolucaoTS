import type { MontarPrestacaoUseCase } from '@/application/montador/MontarPrestacaoUseCase';
import type { ITcespGateway } from './ITcespGateway';
import type { ITransmissaoRepository } from './ITransmissaoRepository';
import type { Ambiente, Credenciais, ResultadoEnvio } from './dtos';
import { BusinessError, NotFoundError } from '@/shared/errors';
import { DECLARACAO_NEGATIVA } from '@/application/montador/MontarPrestacaoUseCase';
import { bloqueioDeEnvio } from '@/core/prestacao/trava';

/**
 * Transmite a prestação ao Audesp: monta o JSON, autentica, envia (multipart)
 * e registra o envio — protocolo, ambiente e **o JSON exato que foi**. NÃO
 * consulta o status final — use ConsultarStatus.
 */
export class TransmitirPrestacaoUseCase {
  constructor(
    private readonly montador: MontarPrestacaoUseCase,
    private readonly gateway: ITcespGateway,
    private readonly repo: ITransmissaoRepository,
  ) {}

  async execute(
    prestacaoId: string,
    ambiente: Ambiente,
    credenciais: Credenciais,
  ): Promise<{ envio: ResultadoEnvio; avisos: string[] }> {
    if (!credenciais?.usuario?.trim() || !credenciais?.senha?.trim())
      throw new BusinessError('Informe usuário e senha do WebService Audesp.');

    const prestacao = await this.repo.carregar(prestacaoId);
    if (!prestacao) throw new NotFoundError('Prestação não encontrada.');

    // Reenviar à produção o que já está lá vira rejeição no Tribunal (ou envio
    // duplicado): melhor dizer aqui, antes de gastar a chamada.
    const bloqueio = bloqueioDeEnvio(prestacao, ambiente);
    if (bloqueio) throw new BusinessError(bloqueio);

    const { documento, avisos, erros } = await this.montador.execute(prestacaoId);
    if (erros.length)
      throw new BusinessError(
        `Corrija ${erros.length} pendência(s) antes de transmitir:\n- ${erros.slice(0, 10).join('\n- ')}${erros.length > 10 ? '\n- …' : ''}`,
      );

    const token = await this.gateway.autenticar(ambiente, credenciais);
    const envio = await this.gateway.enviar({
      ambiente,
      token,
      // A negativa tem rota própria no Audesp (`/f5/declaracao-negativa`).
      tipoAjuste: prestacao.declaracaoNegativa ? DECLARACAO_NEGATIVA : prestacao.tipoAjuste,
      documento,
    });

    if (envio.aceito && envio.protocolo)
      await this.repo.registrarEnvio(prestacaoId, {
        protocolo: envio.protocolo,
        ambiente,
        retificacao: prestacao.ehRetificacao,
        documento,
      });

    return { envio, avisos };
  }
}
