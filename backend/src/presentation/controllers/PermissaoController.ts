import type { Request, Response, NextFunction } from 'express';
import { PermissaoUseCases } from '@/application/permissao/PermissaoUseCases';
import { PrismaPermissaoRepository } from '@/infrastructure/database/PrismaPermissaoRepository';
import { permissoesDoGrupo, sistemaSemPermissoes } from '@/infrastructure/database/permissoesCache';
import { RECURSOS, nivelDasAcoes } from '@/core/permissao/Recurso';

const casos = new PermissaoUseCases(new PrismaPermissaoRepository());

export class PermissaoController {
  /** `GET /permissoes/recursos` — catálogo para montar a matriz. */
  async recursos(_req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(casos.recursos());
    } catch (e) {
      return next(e);
    }
  }

  /** `GET /permissoes/:grupoId` — o que o grupo pode hoje. */
  async doGrupo(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(await casos.doGrupo(req.params.grupoId));
    } catch (e) {
      return next(e);
    }
  }

  /** `PUT /permissoes/:grupoId` — grava a matriz inteira do grupo. */
  async salvar(req: Request, res: Response, next: NextFunction) {
    try {
      await casos.salvar(req.params.grupoId, req.body?.acessos ?? []);
      return res.status(204).end();
    } catch (e) {
      return next(e);
    }
  }

  /**
   * `GET /permissoes/eu/resumo` — o que o usuário logado pode fazer.
   *
   * Aberta a qualquer autenticado, e de propósito: é o que permite ao menu
   * esconder o que não interessa e aos botões sumirem. Esconder é conveniência
   * de interface — quem barra continua sendo o gate do servidor —, então
   * devolver o próprio resumo não afrouxa nada.
   */
  async minhas(req: Request, res: Response, next: NextFunction) {
    try {
      // Sistema ainda sem permissão configurada: a interface mostra tudo, na
      // mesma regra que o gate aplica. Fossem diferentes, o menu esconderia
      // telas que a API está liberando — ou pior, mostraria as que ela barra.
      if (await sistemaSemPermissoes())
        return res.json(
          RECURSOS.map((r) => ({ recursoId: r.id, nivel: 'TOTAL', aprovacao: true })),
        );

      const grupo = req.usuario?.grupo;
      const concessoes = grupo ? await permissoesDoGrupo(grupo) : new Map();

      return res.json(
        RECURSOS.map((r) => {
          const acoes = concessoes.get(r.id) ?? new Set<string>();
          return {
            recursoId: r.id,
            nivel: nivelDasAcoes(acoes as Set<never>),
            aprovacao: acoes.has('APPROVE'),
          };
        }),
      );
    } catch (e) {
      return next(e);
    }
  }
}
