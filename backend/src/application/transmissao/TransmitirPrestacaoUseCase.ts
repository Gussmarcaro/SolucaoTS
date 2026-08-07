import type { MontarPrestacaoUseCase } from '@/application/montador/MontarPrestacaoUseCase';
import type { ITcespGateway } from './ITcespGateway';
import type { ITransmissaoRepository } from './ITransmissaoRepository';
import type { Ambiente, Credenciais, ResultadoEnvio } from './dtos';
import { BusinessError, NotFoundError } from '@/shared/errors';

/**
 * Transmite a prestação ao Audesp: monta o JSON, autentica, envia (multipart)
 * e persiste o protocolo. NÃO consulta o status final — use ConsultarStatus.
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

    const { documento, avisos } = await this.montador.execute(prestacaoId);

    const token = await this.gateway.autenticar(ambiente, credenciais);
    const envio = await this.gateway.enviar({
      ambiente,
      token,
      tipoAjuste: prestacao.tipoAjuste,
      documento,
    });

    if (envio.aceito && envio.protocolo) await this.repo.registrarEnvio(prestacaoId, envio.protocolo);

    return { envio, avisos };
  }
}
