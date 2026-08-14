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

    // Garante o catálogo das combinações usadas antes de vincular.
    const ids = new Map<string, string>();
    for (const { recursoId, acao } of comMarca) {
      const chave = `${recursoId}:${acao}`;
      if (ids.has(chave)) continue;
      const permissao = await prisma.permissao.upsert({
        where: { modulo_acao: { modulo: recursoId, acao } },
        update: {},
        create: {
          modulo: recursoId,
          acao,
          descricao: `${acao} em ${RECURSOS_POR_ID.get(recursoId)?.rotulo ?? recursoId}`,
        },
        select: { id: true },
      });
      ids.set(chave, permissao.id);
    }

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
