import { prisma } from './prisma';
import { MARCA_CONFIGURADO, limparCachePermissoes } from './permissoesCache';
import { RECURSOS_POR_ID, type AcaoPermissao } from '@/core/permissao/Recurso';
import type { IPermissaoRepository } from '@/application/permissao/PermissaoUseCases';

/**
 * Permissões sobre as tabelas `Permissao` e `GrupoUsuarioPermissao`.
 *
 * `Permissao` é o catálogo (recurso + ação) e existe desde o início do schema,
 * sem nunca ter sido preenchido. As linhas são criadas sob demanda, na primeira
 * vez que a combinação é concedida — evita um seed que precisaria ser rodado de
 * novo a cada recurso novo.
 */
export class PrismaPermissaoRepository implements IPermissaoRepository {
  async concessoes(grupoId: string): Promise<Map<string, Set<AcaoPermissao>>> {
    const linhas = await prisma.grupoUsuarioPermissao.findMany({
      where: { grupoId },
      select: { permissao: { select: { modulo: true, acao: true } } },
    });

    const mapa = new Map<string, Set<AcaoPermissao>>();
    for (const l of linhas) {
      const { modulo, acao } = l.permissao;
      if (!mapa.has(modulo)) mapa.set(modulo, new Set());
      mapa.get(modulo)!.add(acao as AcaoPermissao);
    }
    return mapa;
  }

  async nomeDoGrupo(grupoId: string): Promise<string | null> {
    const g = await prisma.grupoUsuario.findUnique({
      where: { id: grupoId },
      select: { nome: true },
    });
    return g?.nome ?? null;
  }

  async substituir(
    grupoId: string,
    acoes: { recursoId: string; acao: AcaoPermissao }[],
  ): Promise<void> {
    // A marca entra sempre, mesmo quando a matriz é salva toda em "sem acesso".
    // É ela que separa "grupo nunca configurado" — que acessa tudo — de "grupo
    // configurado para não acessar nada". Sem isso, restringir um grupo até o
    // fim o liberaria por completo, o oposto exato da intenção de quem salvou.
    const comMarca = [...acoes, { recursoId: MARCA_CONFIGURADO, acao: 'READ' as AcaoPermissao }];

    /*
     * Garante o catálogo das combinações usadas antes de vincular.
     *
     * Em **duas** consultas, e não uma por combinação: a matriz tem ~30
     * recursos × até 4 ações, então o laço de `upsert` fazia até 120 idas ao
     * banco em sequência para salvar uma tela — e o tempo disso é o que o
     * usuário sente ao clicar em Salvar.
     *
     * `createMany` com `skipDuplicates` se apoia no `@@unique([modulo, acao])`:
     * o que já existe é ignorado sem erro, e o que falta nasce. Depois um
     * `findMany` traz os ids de todas de uma vez. O resultado é o mesmo do
     * `upsert`, inclusive na primeira execução com o catálogo vazio.
     */
    const combinacoes = [...new Map(comMarca.map((c) => [`${c.recursoId}:${c.acao}`, c])).values()];

    await prisma.permissao.createMany({
      data: combinacoes.map(({ recursoId, acao }) => ({
        modulo: recursoId,
        acao,
        descricao: `${acao} em ${RECURSOS_POR_ID.get(recursoId)?.rotulo ?? recursoId}`,
      })),
      skipDuplicates: true,
    });

    const existentes = await prisma.permissao.findMany({
      where: { OR: combinacoes.map(({ recursoId, acao }) => ({ modulo: recursoId, acao })) },
      select: { id: true, modulo: true, acao: true },
    });

    const ids = new Map(existentes.map((p) => [`${p.modulo}:${p.acao}`, p.id]));

    // Apagar e recriar dentro de uma transação: a matriz é substituída inteira,
    // e uma falha no meio deixaria o grupo com acesso parcial — pior que
    // nenhuma alteração.
    await prisma.$transaction([
      prisma.grupoUsuarioPermissao.deleteMany({ where: { grupoId } }),
      prisma.grupoUsuarioPermissao.createMany({
        data: [...ids.values()].map((permissaoId) => ({ grupoId, permissaoId })),
        skipDuplicates: true,
      }),
    ]);

    // O gate lê de um cache de 30s; sem isto a alteração pareceria não pegar.
    limparCachePermissoes();
  }
}
