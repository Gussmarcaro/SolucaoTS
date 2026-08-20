import { Prisma } from '@prisma/client';
import { tenantAtual } from '@/shared/contexto';
import { MODELS_COM_CLIENTE } from './extensaoAuditoria';

/**
 * Isolamento multi-tenant: nenhuma consulta enxerga dados de outro órgão.
 *
 * Fica na camada de dados, e não nos repositórios, pela mesma razão da
 * auditoria — vale para **todo** caminho que consulte, inclusive código futuro,
 * sem depender de alguém lembrar de escrever o filtro. Um repositório novo que
 * esquecesse a cláusula não falharia em teste nenhum: funcionaria perfeitamente
 * para quem o escreveu, e para os outros órgãos também.
 *
 * O filtro é aplicado só nas **raízes de tenant** (`MODELS_COM_CLIENTE`, 13
 * models derivados do schema) e em `Cliente`. Os outros 44 models são sempre
 * alcançados a partir de uma raiz — os blocos da prestação pelo id da
 * prestação, os itens do ajuste pelo id do ajuste —, então filtrar a raiz
 * fecha o caminho inteiro. Denormalizar `clienteId` nas 44 tabelas responderia
 * com uma coluna o que a relação já responde.
 *
 * **O limite conhecido disto:** buscar um filho direto por id, com um id de
 * outro órgão, passa. Na prática são UUID v4, que não se adivinha, mas
 * "não se adivinha" não é isolamento — quando um filho ganhar rota própria de
 * consulta por id, ela precisa conferir o dono pela raiz.
 */

/** Operações cujo `where` exige campo único — nelas o filtro entra por spread. */
const POR_CHAVE_UNICA = new Set(['findUnique', 'findUniqueOrThrow', 'update', 'delete', 'upsert']);

/** Operações que aceitam `where` livre e são filtradas por AND. */
const POR_FILTRO_LIVRE = new Set([
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
  'updateMany',
  'deleteMany',
]);

export type ArgsPrisma = {
  where?: Record<string, unknown>;
  create?: Record<string, unknown>;
  [k: string]: unknown;
};

/**
 * Models sem coluna própria que **mesmo assim** precisam do recorte, porque
 * alguma consulta os alcança sem passar pelo pai.
 *
 * A regra geral continua valendo — filho chegado pelo id do pai já está
 * protegido, e denormalizar `clienteId` em 44 tabelas seria responder com uma
 * coluna o que a relação responde. O que muda aqui é que alguns filhos são
 * consultados **direto**, e para esses "o pai já foi filtrado" é falso:
 *
 * - **`PrestacaoContas`** é a porta de ~28 blocos. Todo caso de uso de bloco
 *   começa por `garantirPrestacao(id)`, então recortar a prestação fecha a
 *   subárvore inteira de uma vez — sem tocar em nenhum dos blocos.
 * - **`TermoAditivo`** e **`DocumentoRegularidade`** são varridos pelo sino
 *   (`PrismaAlertaRepository`) sem nenhuma amarra com o pai: sem isto, o alerta
 *   de um órgão aparecia para outro.
 * - Os demais são varridos **por CPF** pelo relatório do titular da LGPD
 *   (`PrismaTitularRepository`) — uma busca que, sem recorte, encontraria a
 *   mesma pessoa nos dados de todos os clientes.
 *
 * O valor é uma função porque o filtro carrega o órgão da requisição.
 */
const POR_RELACAO: Record<string, (tenant: string) => Record<string, unknown>> = {
  PrestacaoContas: (t) => ({ ajuste: { clienteId: t } }),
  TermoAditivo: (t) => ({ ajuste: { clienteId: t } }),
  DocumentoRegularidade: (t) => ({ entidade: { clienteId: t } }),
  MembroDiretoria: (t) => ({ entidade: { clienteId: t } }),
  MembroConselho: (t) => ({ entidade: { clienteId: t } }),
  AtaDiretoriaArquivo: (t) => ({ entidade: { clienteId: t } }),
  RelacaoEmpregado: (t) => ({ prestacao: { ajuste: { clienteId: t } } }),
  ServidorCedido: (t) => ({ prestacao: { ajuste: { clienteId: t } } }),
  EmpenhoPrestacao: (t) => ({ prestacao: { ajuste: { clienteId: t } } }),
  DocumentoFiscal: (t) => ({ prestacao: { ajuste: { clienteId: t } } }),
};

/** O model está sujeito ao filtro? `Cliente` entra por um caminho próprio. */
export function ehRaizDeTenant(model: string): boolean {
  return model === 'Cliente' || MODELS_COM_CLIENTE.has(model);
}

/** O model é filtrado por relação, sem ter coluna própria? */
export function ehFiltradoPorRelacao(model: string): boolean {
  return model in POR_RELACAO;
}

/**
 * Aplica o recorte por órgão aos argumentos de uma operação do Prisma.
 *
 * Função pura, e separada da extension de propósito: é a regra inteira do
 * isolamento, e `verificar:tenant` consegue exercitá-la sem banco. Devolve os
 * argumentos originais quando não há nada a filtrar.
 */
export function aplicarTenant(
  model: string,
  operation: string,
  args: ArgsPrisma | undefined,
  tenant: string | null,
): ArgsPrisma | undefined {
  if (!tenant || (!ehRaizDeTenant(model) && !ehFiltradoPorRelacao(model))) return args;

  // Três formas de chegar ao órgão, em ordem de precisão: o próprio id (o
  // `Cliente`), a coluna própria (as raízes) e a relação até uma raiz.
  const filtro =
    model === 'Cliente'
      ? { id: tenant }
      : ehRaizDeTenant(model)
        ? { clienteId: tenant }
        : POR_RELACAO[model](tenant);
  const a: ArgsPrisma = { ...(args ?? {}) };

  if (POR_CHAVE_UNICA.has(operation)) {
    // Aqui o `where` precisa manter a chave única no topo (o Prisma exige ao
    // menos uma), então o filtro entra ao lado dela em vez de dentro de um AND.
    // Registro de outro órgão vira "não encontrado" — que é também a resposta
    // certa do ponto de vista de não revelar o que existe.
    a.where = { ...(a.where ?? {}), ...filtro };
    // `upsert` cria quando não acha: o registro novo nasce do órgão certo.
    //
    // Só nas raízes. Num model filtrado por relação, o "filtro" é
    // `{ ajuste: { clienteId } }` — uma condição de leitura, que como dado de
    // criação seria inválida. Lá o órgão vem do pai, que já está no payload.
    if (operation === 'upsert' && a.create && ehRaizDeTenant(model) && model !== 'Cliente') {
      a.create = { ...a.create, ...filtro };
    }
    return a;
  }

  if (POR_FILTRO_LIVRE.has(operation)) {
    // AND em vez de spread: assim um filtro do chamador com a mesma chave não
    // sobrescreve o do tenant. Aqui a segurança vale mais que a legibilidade da
    // consulta gerada.
    a.where = a.where ? { AND: [a.where, filtro] } : filtro;
    return a;
  }

  // `create`/`createMany` recebem o carimbo do órgão na extension de auditoria,
  // junto do `criadoPor`. O resto passa sem alteração.
  return args;
}

export const extensaoTenant = Prisma.defineExtension({
  name: 'tenant',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        // Sem órgão no contexto não há o que filtrar. Acontece nos seeds, nos
        // scripts e no startup da API — que precisam enxergar tudo — e, por
        // ora, em tokens antigos e usuários ainda sem órgão atribuído. Essa
        // última parte é transitória e fecha na fase 4.
        return query(aplicarTenant(model, operation, args as ArgsPrisma, tenantAtual()) as typeof args);
      },
    },
  },
});
