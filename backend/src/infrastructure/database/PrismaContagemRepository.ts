import { prisma } from './prisma';
import { grupoSemPermissoes, permissoesDoGrupo } from './permissoesCache';
import type {
  ChaveCadastro,
  Contagem,
  IContagemRepository,
  IPermissoesLeitor,
} from '@/application/dashboard/IContagemRepository';

/**
 * Como contar cada cadastro.
 *
 * `temAtivo: false` em Bens Cedidos não é esquecimento: `BemCedidoCadastro` não
 * tem a coluna. A tela antiga pedia `filtros: { ativo: true }` para ele mesmo
 * assim, e recebia o total de volta — exibindo "todos ativos" sobre um cadastro
 * que não conhece a distinção.
 */
const COMO_CONTAR: Record<
  ChaveCadastro,
  { contar: (where?: { ativo: boolean }) => Promise<number>; temAtivo: boolean }
> = {
  entidades: { contar: (w) => prisma.entidadeBeneficiaria.count({ where: w }), temAtivo: true },
  fornecedores: { contar: (w) => prisma.fornecedor.count({ where: w }), temAtivo: true },
  colaboradores: { contar: (w) => prisma.colaborador.count({ where: w }), temAtivo: true },
  contratos: { contar: (w) => prisma.contratoFirmado.count({ where: w }), temAtivo: true },
  bens: { contar: () => prisma.bemCedidoCadastro.count(), temAtivo: false },
  servidores: { contar: (w) => prisma.servidorCedidoCadastro.count({ where: w }), temAtivo: true },
};

export class PrismaContagemRepository implements IContagemRepository {
  /**
   * Todas as contagens em paralelo.
   *
   * Continuam sendo até doze `count`, mas agora numa **requisição só** e sobre a
   * mesma conexão. O custo que importava nunca foi o do banco — `count` com
   * índice é barato; era a ida e volta HTTP, multiplicada por doze, no
   * carregamento da tela de entrada.
   *
   * O recorte por órgão entra pela extension de tenant, como em qualquer
   * consulta: nenhum `clienteId` escrito à mão aqui.
   */
  async contar(cadastros: ChaveCadastro[]): Promise<Contagem[]> {
    return Promise.all(
      cadastros.map(async (chave): Promise<Contagem> => {
        const { contar, temAtivo } = COMO_CONTAR[chave];
        const [total, ativos] = await Promise.all([
          contar(),
          temAtivo ? contar({ ativo: true }) : Promise.resolve(null),
        ]);
        return { chave, total, ativos };
      }),
    );
  }
}

/**
 * Adapter do port de permissões.
 *
 * Traduz o cache de concessões para a pergunta que o caso de uso faz — "o que
 * este grupo pode ler?" — sem que `application` precise conhecer o formato
 * `Map<modulo, Set<acao>>` nem a regra do grupo nunca configurado.
 */
export class PermissoesLeitor implements IPermissoesLeitor {
  async recursosLegiveis(grupoNome: string | null): Promise<Set<string> | null> {
    // Sem grupo no token (tokens anteriores ao campo) o comportamento é o
    // mesmo do resto do sistema: cai na regra do grupo não configurado.
    if (!grupoNome) return null;
    if (await grupoSemPermissoes(grupoNome)) return null;

    const concessoes = await permissoesDoGrupo(grupoNome);
    const legiveis = new Set<string>();
    for (const [modulo, acoes] of concessoes) {
      if (acoes.has('READ')) legiveis.add(modulo);
    }
    return legiveis;
  }
}
