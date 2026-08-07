import type { ITcespGateway } from './ITcespGateway';
import type { ITransmissaoRepository } from './ITransmissaoRepository';
import type { Ambiente, Credenciais, StatusConsulta } from './dtos';
import { BusinessError } from '@/shared/errors';
import { mapearEstado } from './estado';

/**
 * Consulta o estado de um protocolo no Audesp e persiste o status resultante
 * (ARMAZENADO/REJEITADO/…) + inconformidades na PrestacaoContas.
 */
export class ConsultarStatusUseCase {
  constructor(
    private readonly gateway: ITcespGateway,
    private readonly repo: ITransmissaoRepository,
  ) {}

  async execute(
    prestacaoId: string,
    ambiente: Ambiente,
    credenciais: Credenciais,
    protocolo: string,
  ): Promise<StatusConsulta> {
    if (!credenciais?.usuario?.trim() || !credenciais?.senha?.trim())
      throw new BusinessError('Informe usuário e senha do WebService Audesp.');
    if (!protocolo?.trim()) throw new BusinessError('Informe o número de protocolo.');

    const token = await this.gateway.autenticar(ambiente, credenciais);
    const status = await this.gateway.consultar({ ambiente, token, protocolo: protocolo.trim() });

    const mapeado = mapearEstado(status.estado);
    if (mapeado) await this.repo.registrarStatus(prestacaoId, mapeado, status.inconformidades);

    return status;
  }
}
