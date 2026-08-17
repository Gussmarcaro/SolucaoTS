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

/** O model está sujeito ao filtro? `Cliente` entra por um caminho próprio. */
export function ehRaizDeTenant(model: string): boolean {
  return model === 'Cliente' || MODELS_COM_CLIENTE.has(model);
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
  if (!tenant || !ehRaizDeTenant(model)) return args;

  // O próprio órgão se identifica pelo id, não por uma coluna `clienteId` que
  // ele não tem: um usuário só enxerga o Cliente que é o dele.
  const filtro = model === 'Cliente' ? { id: tenant } : { clienteId: tenant };
  const a: ArgsPrisma = { ...(args ?? {}) };

  if (POR_CHAVE_UNICA.has(operation)) {
    // Aqui o `where` precisa manter a chave única no topo (o Prisma exige ao
    // menos uma), então o filtro entra ao lado dela em vez de dentro de um AND.
    // Registro de outro órgão vira "não encontrado" — que é também a resposta
    // certa do ponto de vista de não revelar o que existe.
    a.where = { ...(a.where ?? {}), ...filtro };
    // `upsert` cria quando não acha: o registro novo nasce do órgão certo.
    if (operation === 'upsert' && a.create) a.create = { ...a.create, ...filtro };
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
