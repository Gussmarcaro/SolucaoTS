import type { IPermissoesLeitor } from './IContagemRepository';
import {
  RECURSO_DA_PENDENCIA,
  type ChavePendencia,
  type IPendenciasRepository,
  type Pendencia,
} from './IPendenciasRepository';

const TODAS = Object.keys(RECURSO_DA_PENDENCIA) as ChavePendencia[];

/**
 * O trabalho acumulado, **recortado pelo que o grupo pode ler** e pelo órgão
 * escolhido.
 *
 * Duas recusas, ambas no servidor:
 *
 * - **Sem órgão no contexto** (Suporte antes de escolher qual atender) não se
 *   conta nada. A extension não filtra quando não há órgão, e o número sairia
 *   somado de todos os clientes — um atalho dizendo "38 notas sem arquivo"
 *   que não são de órgão nenhum que a pessoa esteja vendo.
 * - **Sem permissão na tela** a contagem não é feita, pela mesma regra da
 *   faixa de cadastros: quem não pode abrir a tela não fica sabendo quanto há
 *   nela.
 */
export class ContarPendenciasUseCase {
  constructor(
    private readonly repo: IPendenciasRepository,
    private readonly permissoes: IPermissoesLeitor,
  ) {}

  async execute(grupoNome: string | null, orgaoId: string | null): Promise<Pendencia[]> {
    if (!orgaoId) return [];
    const legiveis = await this.permissoes.recursosLegiveis(grupoNome);
    // `null` = grupo nunca configurado, que neste RBAC libera tudo.
    const permitidas =
      legiveis === null ? TODAS : TODAS.filter((c) => legiveis.has(RECURSO_DA_PENDENCIA[c]));
    if (permitidas.length === 0) return [];
    return this.repo.contar(permitidas);
  }
}
